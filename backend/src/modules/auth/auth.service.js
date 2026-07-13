const crypto = require('node:crypto');
const {
  hashToken,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  tokenExpiresAt,
} = require('./token.service');

function httpError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

function parseJson(value, fallback) {
  if (value == null) return fallback;
  return typeof value === 'string' ? JSON.parse(value) : value;
}

function normalizeIdentity(provider, value) {
  if (provider === 'email') return String(value || '').trim().toLowerCase();
  if (provider === 'phone') {
    const digits = String(value || '').replace(/\D/g, '');
    if (digits.length === 11 && digits.startsWith('8')) return `7${digits.slice(1)}`;
    if (digits.length === 10) return `7${digits}`;
    return digits;
  }
  return String(value || '').trim();
}

function challengeHash(code) {
  const secret = process.env.CHALLENGE_SECRET;
  if (!secret) throw new Error('CHALLENGE_SECRET is required');
  return crypto.createHmac('sha256', secret).update(String(code)).digest('hex');
}

function safeEqual(left, right) {
  const a = Buffer.from(left, 'hex');
  const b = Buffer.from(right, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function getProject(db, slug) {
  const project = await db('projects as p')
    .join('project_auth_settings as s', 's.project_id', 'p.id')
    .where({ 'p.slug': slug, 'p.status': 'active' })
    .first(['p.id', 'p.slug', 'p.name', 's.enabled_providers', 's.required_verification']);
  if (!project) throw httpError(404, 'PROJECT_NOT_FOUND', 'Проект не найден');
  return {
    ...project,
    enabledProviders: parseJson(project.enabled_providers, []),
    requiredVerification: parseJson(project.required_verification, { mode: 'one_of', channels: [] }),
  };
}

async function audit(db, event) {
  await db('audit_log').insert({
    project_id: event.projectId || null,
    user_id: event.userId || null,
    actor_type: event.actorType || 'user',
    actor_id: event.actorId || null,
    action: event.action,
    entity_type: event.entityType || null,
    entity_id: event.entityId || null,
    ip_address: event.ip || null,
    user_agent: event.userAgent || null,
    metadata: JSON.stringify(event.metadata || {}),
  });
}

async function assertActiveSession(db, auth) {
  const session = await db('sessions').where({
    id: auth.sid,
    user_id: auth.sub,
    project_id: auth.projectId,
    status: 'active',
  }).whereNull('revoked_at').first();
  if (!session) throw httpError(401, 'SESSION_REVOKED', 'Сессия завершена');
  return session;
}

async function register(db, input, meta) {
  const project = await getProject(db, input.projectSlug);
  if (!input.consents?.personalData) {
    throw httpError(400, 'PERSONAL_DATA_CONSENT_REQUIRED', 'Требуется согласие на обработку персональных данных');
  }

  const requested = [
    input.email && { provider: 'email', value: normalizeIdentity('email', input.email) },
    input.phone && { provider: 'phone', value: normalizeIdentity('phone', input.phone) },
  ].filter(Boolean).filter((item) => project.enabledProviders.includes(item.provider));

  if (!requested.length) {
    throw httpError(400, 'IDENTITY_REQUIRED', 'Укажите разрешённый email или телефон');
  }

  try {
    return await db.transaction(async (trx) => {
      const [user] = await trx('users').insert({
        project_id: project.id,
        display_name: String(input.displayName || '').trim() || null,
        status: 'pending_verification',
        consents: JSON.stringify(input.consents),
      }).returning(['id', 'status']);

      for (const identity of requested) {
        await trx('auth_identities').insert({
          project_id: project.id,
          user_id: user.id,
          provider: identity.provider,
          provider_user_id: identity.value,
          normalized_value: identity.value,
          verified: false,
        });
      }

      await audit(trx, {
        projectId: project.id,
        userId: user.id,
        action: 'user.registration.started',
        entityType: 'user',
        entityId: user.id,
        ip: meta.ip,
        userAgent: meta.userAgent,
      });

      const required = project.requiredVerification.channels || [];
      return {
        userId: user.id,
        status: user.status,
        availableVerificationChannels: requested.map((item) => item.provider).filter((provider) => required.includes(provider)),
      };
    });
  } catch (error) {
    if (error.code === '23505') throw httpError(409, 'IDENTITY_ALREADY_EXISTS', 'Этот способ входа уже зарегистрирован');
    throw error;
  }
}

async function createChallenge(db, { project, userId, provider, purpose, targetValue }, meta) {
  if (process.env.AUTH_DEMO_MODE !== 'true') {
    throw httpError(
      503,
      'VERIFICATION_PROVIDER_NOT_CONFIGURED',
      'Канал подтверждения ещё не настроен',
    );
  }

  const code = String(crypto.randomInt(100000, 1000000));
  const expiresAt = new Date(Date.now() + Number(process.env.VERIFICATION_TTL_SECONDS || 600) * 1000);
  const [challenge] = await db('verification_challenges').insert({
    project_id: project.id,
    user_id: userId,
    provider,
    purpose,
    challenge_hash: challengeHash(code),
    target_value: targetValue,
    status: 'pending',
    expires_at: expiresAt,
    metadata: JSON.stringify({ ip: meta.ip || null }),
  }).returning(['id', 'status', 'expires_at']);

  return {
    challengeId: challenge.id,
    provider,
    status: 'code_sent',
    expiresAt: challenge.expires_at,
    demoCode: code,
  };
}

async function startVerification(db, input, meta) {
  const project = await getProject(db, input.projectSlug);
  if (!project.enabledProviders.includes(input.provider)) {
    throw httpError(400, 'PROVIDER_DISABLED', 'Способ подтверждения отключён для проекта');
  }
  const identity = await db('auth_identities')
    .where({ project_id: project.id, user_id: input.userId, provider: input.provider })
    .first();
  if (!identity) throw httpError(404, 'IDENTITY_NOT_FOUND', 'Способ входа не найден');
  return createChallenge(db, {
    project,
    userId: input.userId,
    provider: input.provider,
    purpose: input.purpose || 'registration',
    targetValue: identity.normalized_value,
  }, meta);
}

async function issueSession(trx, user, meta) {
  const [session] = await trx('sessions').insert({
    project_id: user.project_id,
    user_id: user.id,
    user_agent: meta.userAgent || null,
    ip_address: meta.ip || null,
    device_name: meta.deviceName || null,
    status: 'active',
    last_seen_at: trx.fn.now(),
  }).returning(['id']);

  const accessToken = signAccessToken({ userId: user.id, projectId: user.project_id, sessionId: session.id });
  const refreshToken = signRefreshToken({ userId: user.id, projectId: user.project_id, sessionId: session.id });
  await trx('refresh_tokens').insert({
    session_id: session.id,
    user_id: user.id,
    project_id: user.project_id,
    token_hash: hashToken(refreshToken),
    expires_at: tokenExpiresAt(refreshToken),
  });
  return { accessToken, refreshToken };
}

async function confirmVerification(db, input, meta) {
  const result = await db.transaction(async (trx) => {
    const project = await getProject(trx, input.projectSlug);
    const challenge = await trx('verification_challenges')
      .where({ id: input.challengeId, project_id: project.id })
      .forUpdate()
      .first();
    if (!challenge || challenge.status !== 'pending') {
      throw httpError(400, 'CHALLENGE_INVALID', 'Подтверждение недействительно');
    }
    if (new Date(challenge.expires_at).getTime() <= Date.now()) {
      await trx('verification_challenges').where({ id: challenge.id }).update({ status: 'expired' });
      return { expired: true };
    }
    if (challenge.attempts_count >= challenge.max_attempts) {
      throw httpError(429, 'CHALLENGE_ATTEMPTS_EXCEEDED', 'Превышено число попыток');
    }

    const valid = safeEqual(challengeHash(input.code), challenge.challenge_hash);
    await trx('verification_challenges').where({ id: challenge.id }).update({
      attempts_count: challenge.attempts_count + 1,
      ...(valid ? { status: 'verified', confirmed_at: trx.fn.now() } : {}),
    });
    if (!valid) return { invalidCode: true };

    await trx('auth_identities').where({
      project_id: project.id,
      user_id: challenge.user_id,
      provider: challenge.provider,
    }).update({ verified: true, verified_at: trx.fn.now(), updated_at: trx.fn.now() });

    const [user] = await trx('users').where({ id: challenge.user_id }).update({
      status: 'active',
      verified_at: trx.fn.now(),
      updated_at: trx.fn.now(),
    }).returning(['id', 'project_id', 'display_name', 'status']);

    const tokens = await issueSession(trx, user, meta);
    await audit(trx, {
      projectId: project.id,
      userId: user.id,
      action: 'identity.verified',
      entityType: 'auth_identity',
      ip: meta.ip,
      userAgent: meta.userAgent,
      metadata: { provider: challenge.provider, purpose: challenge.purpose },
    });
    return { status: 'verified', user, tokens };
  });
  if (result.expired) throw httpError(400, 'CHALLENGE_EXPIRED', 'Срок подтверждения истёк');
  if (result.invalidCode) throw httpError(400, 'CODE_INVALID', 'Неверный код подтверждения');
  return result;
}

async function login(db, input, meta) {
  const project = await getProject(db, input.projectSlug);
  if (!project.enabledProviders.includes(input.provider)) {
    throw httpError(400, 'PROVIDER_DISABLED', 'Способ входа отключён для проекта');
  }
  if (process.env.AUTH_DEMO_MODE !== 'true') {
    throw httpError(503, 'VERIFICATION_PROVIDER_NOT_CONFIGURED', 'Канал подтверждения ещё не настроен');
  }
  const value = normalizeIdentity(input.provider, input.login);
  const identity = await db('auth_identities').where({
    project_id: project.id,
    provider: input.provider,
    normalized_value: value,
    verified: true,
  }).first();
  if (!identity) {
    return { status: 'verification_required', provider: input.provider, message: 'Если аккаунт существует, подтверждение будет отправлено.' };
  }
  return createChallenge(db, {
    project,
    userId: identity.user_id,
    provider: input.provider,
    purpose: 'login',
    targetValue: identity.normalized_value,
  }, meta);
}

async function getMe(db, auth) {
  const session = await assertActiveSession(db, auth);
  const user = await db('users').where({ id: auth.sub, project_id: auth.projectId }).first([
    'id', 'display_name', 'status', 'created_at',
  ]);
  if (!user) throw httpError(404, 'USER_NOT_FOUND', 'Пользователь не найден');
  const identities = await db('auth_identities').where({ user_id: user.id }).select([
    'id', 'provider', 'verified', 'verified_at', 'created_at',
  ]);
  return { user, identities, session: { id: session.id, createdAt: session.created_at, lastSeenAt: session.last_seen_at } };
}

async function refresh(db, refreshToken, meta) {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch (error) {
    throw httpError(401, 'INVALID_REFRESH_TOKEN', 'Refresh token недействителен');
  }
  const result = await db.transaction(async (trx) => {
    const stored = await trx('refresh_tokens').where({ token_hash: hashToken(refreshToken) }).forUpdate().first();
    if (!stored) return { invalid: true };
    if (stored.revoked_at || stored.used_at) {
      await trx('refresh_tokens').where({ session_id: stored.session_id }).whereNull('revoked_at').update({ revoked_at: trx.fn.now() });
      await trx('sessions').where({ id: stored.session_id }).update({ status: 'revoked', revoked_at: trx.fn.now() });
      return { reused: true };
    }
    if (new Date(stored.expires_at).getTime() <= Date.now()) {
      await trx('refresh_tokens').where({ id: stored.id }).update({ revoked_at: trx.fn.now() });
      return { invalid: true };
    }
    const session = await trx('sessions').where({ id: payload.sid, user_id: payload.sub, status: 'active' }).forUpdate().first();
    if (!session) throw httpError(401, 'SESSION_REVOKED', 'Сессия завершена');

    const accessToken = signAccessToken({ userId: payload.sub, projectId: payload.projectId, sessionId: payload.sid });
    const nextRefreshToken = signRefreshToken({ userId: payload.sub, projectId: payload.projectId, sessionId: payload.sid });
    await trx('refresh_tokens').where({ id: stored.id }).update({ used_at: trx.fn.now(), revoked_at: trx.fn.now() });
    await trx('refresh_tokens').insert({
      session_id: payload.sid,
      user_id: payload.sub,
      project_id: payload.projectId,
      token_hash: hashToken(nextRefreshToken),
      previous_token_hash: stored.token_hash,
      expires_at: tokenExpiresAt(nextRefreshToken),
    });
    await trx('sessions').where({ id: payload.sid }).update({ last_seen_at: trx.fn.now(), ip_address: meta.ip || session.ip_address });
    return { accessToken, refreshToken: nextRefreshToken };
  });
  if (result.reused) throw httpError(401, 'REFRESH_TOKEN_REUSED', 'Обнаружено повторное использование refresh token; сессия завершена');
  if (result.invalid) throw httpError(401, 'INVALID_REFRESH_TOKEN', 'Refresh token недействителен');
  return result;
}

async function logout(db, refreshToken) {
  const stored = await db('refresh_tokens').where({ token_hash: hashToken(refreshToken) }).first();
  if (!stored) return { ok: true };
  await db.transaction(async (trx) => {
    await trx('refresh_tokens').where({ session_id: stored.session_id }).update({ revoked_at: trx.fn.now() });
    await trx('sessions').where({ id: stored.session_id }).update({ status: 'revoked', revoked_at: trx.fn.now() });
  });
  return { ok: true };
}

async function listSessions(db, auth) {
  await assertActiveSession(db, auth);
  const sessions = await db('sessions')
    .where({ user_id: auth.sub, project_id: auth.projectId })
    .whereNull('revoked_at')
    .orderBy('created_at', 'desc')
    .select(['id', 'device_name', 'user_agent', 'ip_address', 'status', 'created_at', 'last_seen_at']);
  return {
    sessions: sessions.map((session) => ({
      ...session,
      current: session.id === auth.sid,
    })),
  };
}

async function revokeSession(db, auth, sessionId) {
  return db.transaction(async (trx) => {
    await assertActiveSession(trx, auth);
    const session = await trx('sessions').where({
      id: sessionId,
      user_id: auth.sub,
      project_id: auth.projectId,
    }).forUpdate().first();
    if (!session) throw httpError(404, 'SESSION_NOT_FOUND', 'Сессия не найдена');
    await trx('sessions').where({ id: session.id }).update({ status: 'revoked', revoked_at: trx.fn.now() });
    await trx('refresh_tokens').where({ session_id: session.id }).whereNull('revoked_at').update({ revoked_at: trx.fn.now() });
    await audit(trx, {
      projectId: auth.projectId,
      userId: auth.sub,
      actorId: auth.sub,
      action: 'session.revoked',
      entityType: 'session',
      entityId: session.id,
    });
    return { ok: true, sessionId: session.id };
  });
}

module.exports = {
  register,
  startVerification,
  confirmVerification,
  login,
  getMe,
  refresh,
  logout,
  listSessions,
  revokeSession,
  normalizeIdentity,
};
