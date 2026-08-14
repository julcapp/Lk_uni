const crypto = require('node:crypto');
const {
  hashToken,
  signAccessToken,
  signRefreshToken,
  tokenExpiresAt,
} = require('./token.service');

function httpError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const derived = crypto.scryptSync(String(password), salt, 64);
  return `scrypt$${salt.toString('hex')}$${derived.toString('hex')}`;
}

function newResetToken() {
  return crypto.randomBytes(32).toString('base64url');
}

function resetTokenHash(token) {
  return crypto.createHash('sha256').update(String(token || '')).digest('hex');
}

async function audit(trx, event) {
  await trx('audit_log').insert({
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

async function requestPasswordReset(db, input, meta = {}) {
  const email = normalizeEmail(input.email);
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    throw httpError(400, 'EMAIL_INVALID', 'Укажите корректный email');
  }

  const generic = {
    ok: true,
    message: 'Если такой адрес зарегистрирован, инструкции по восстановлению отправлены на электронную почту.',
  };

  const identity = await db('auth_identities as i')
    .join('users as u', 'u.id', 'i.user_id')
    .join('projects as p', 'p.id', 'u.project_id')
    .where({
      'i.provider': 'email',
      'i.normalized_value': email,
      'u.status': 'active',
      'p.status': 'active',
    })
    .first(['u.id as user_id', 'u.project_id', 'p.slug as project_slug']);

  if (!identity) return generic;

  const token = newResetToken();
  const ttlMinutes = Math.max(5, Number(process.env.PASSWORD_RESET_TTL_MINUTES || 30));
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

  await db.transaction(async (trx) => {
    await trx('password_reset_tokens')
      .where({ user_id: identity.user_id, status: 'pending' })
      .update({ status: 'revoked' });

    const [row] = await trx('password_reset_tokens').insert({
      project_id: identity.project_id,
      user_id: identity.user_id,
      email,
      token_hash: resetTokenHash(token),
      status: 'pending',
      expires_at: expiresAt,
    }).returning(['id']);

    await audit(trx, {
      projectId: identity.project_id,
      userId: identity.user_id,
      actorId: identity.user_id,
      action: 'user.password_reset.requested',
      entityType: 'password_reset',
      entityId: row.id,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
  });

  if (process.env.AUTH_DEMO_MODE === 'true' || process.env.PASSWORD_RESET_DEMO_MODE === 'true') {
    return {
      ...generic,
      resetUrl: `/reset-password/?token=${encodeURIComponent(token)}`,
      expiresAt,
    };
  }

  return generic;
}

async function validatePasswordReset(db, token) {
  const tokenHash = resetTokenHash(token);
  const row = await db('password_reset_tokens').where({ token_hash: tokenHash }).first();
  const valid = Boolean(
    row &&
    row.status === 'pending' &&
    !row.used_at &&
    new Date(row.expires_at).getTime() > Date.now()
  );
  return { valid };
}

async function confirmPasswordReset(db, input, meta = {}) {
  const token = String(input.token || '');
  const password = String(input.password || '');
  if (!token) throw httpError(400, 'RESET_TOKEN_REQUIRED', 'Ссылка восстановления недействительна');
  if (password.length < 8) throw httpError(400, 'PASSWORD_TOO_SHORT', 'Пароль должен содержать не менее 8 символов');

  const tokenHash = resetTokenHash(token);
  const result = await db.transaction(async (trx) => {
    const row = await trx('password_reset_tokens').where({ token_hash: tokenHash }).forUpdate().first();
    if (!row || row.status !== 'pending' || row.used_at) return { invalid: true };
    if (new Date(row.expires_at).getTime() <= Date.now()) {
      await trx('password_reset_tokens').where({ id: row.id }).update({ status: 'expired' });
      return { expired: true };
    }

    const user = await trx('users').where({ id: row.user_id, project_id: row.project_id, status: 'active' }).first([
      'id', 'project_id', 'display_name', 'status',
    ]);
    if (!user) return { invalid: true };

    await trx('users').where({ id: user.id }).update({
      password_hash: hashPassword(password),
      updated_at: trx.fn.now(),
    });

    await trx('password_reset_tokens').where({ user_id: user.id, status: 'pending' }).update({
      status: 'used',
      used_at: trx.fn.now(),
    });

    await trx('refresh_tokens').where({ user_id: user.id }).whereNull('revoked_at').update({ revoked_at: trx.fn.now() });
    await trx('sessions').where({ user_id: user.id, status: 'active' }).update({ status: 'revoked', revoked_at: trx.fn.now() });

    const tokens = await issueSession(trx, user, meta);
    const workspace = await trx('projects').where({ id: user.project_id }).first(['id', 'slug', 'name']);

    await audit(trx, {
      projectId: user.project_id,
      userId: user.id,
      actorId: user.id,
      action: 'user.password_reset.completed',
      entityType: 'user',
      entityId: user.id,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return {
      user: { id: user.id, displayName: user.display_name, status: user.status },
      workspace,
      tokens,
    };
  });

  if (result.expired) throw httpError(400, 'RESET_TOKEN_EXPIRED', 'Срок действия ссылки восстановления истёк');
  if (result.invalid) throw httpError(400, 'RESET_TOKEN_INVALID', 'Ссылка восстановления недействительна или уже использована');
  return result;
}

module.exports = {
  requestPasswordReset,
  validatePasswordReset,
  confirmPasswordReset,
  resetTokenHash,
};
