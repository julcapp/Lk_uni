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

function verifyPassword(password, storedHash) {
  const parts = String(storedHash || '').split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  const salt = Buffer.from(parts[1], 'hex');
  const expected = Buffer.from(parts[2], 'hex');
  const actual = crypto.scryptSync(String(password || ''), salt, expected.length);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
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

  return { sessionId: session.id, accessToken, refreshToken };
}

async function passwordLogin(db, input, meta = {}) {
  const email = normalizeEmail(input.email);
  const password = String(input.password || '');
  if (!/^\S+@\S+\.\S+$/.test(email) || !password) {
    throw httpError(400, 'LOGIN_DATA_INVALID', 'Укажите email и пароль');
  }

  const identity = await db('auth_identities as i')
    .join('users as u', 'u.id', 'i.user_id')
    .join('projects as p', 'p.id', 'u.project_id')
    .where({ 'i.provider': 'email', 'i.normalized_value': email, 'u.status': 'active', 'p.status': 'active' })
    .first([
      'u.id', 'u.project_id', 'u.display_name', 'u.status', 'u.password_hash',
      'p.slug as project_slug', 'p.name as project_name',
    ]);

  if (!identity || !verifyPassword(password, identity.password_hash)) {
    throw httpError(401, 'INVALID_CREDENTIALS', 'Неверный email или пароль');
  }

  return db.transaction(async (trx) => {
    const tokens = await issueSession(trx, identity, meta);
    await trx('audit_log').insert({
      project_id: identity.project_id,
      user_id: identity.id,
      actor_type: 'user',
      actor_id: identity.id,
      action: 'user.password_login.succeeded',
      entity_type: 'session',
      entity_id: tokens.sessionId,
      ip_address: meta.ip || null,
      user_agent: meta.userAgent || null,
      metadata: JSON.stringify({ projectSlug: identity.project_slug }),
    });

    return {
      user: { id: identity.id, displayName: identity.display_name, status: identity.status },
      workspace: { id: identity.project_id, slug: identity.project_slug, name: identity.project_name },
      tokens,
    };
  });
}

module.exports = { passwordLogin, verifyPassword };
