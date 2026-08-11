const crypto = require('node:crypto');
const { verifyPassword } = require('../auth/password-login.service');

function httpError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

function parseJson(value, fallback = {}) {
  if (value == null) return fallback;
  return typeof value === 'string' ? JSON.parse(value) : value;
}

function hashPassword(password) {
  const value = String(password || '');
  if (value.length < 8) throw httpError(400, 'PASSWORD_TOO_SHORT', 'Пароль должен содержать не менее 8 символов');
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(value, salt, 64);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
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

async function ensureSettings(db, auth) {
  let settings = await db('user_settings').where({ user_id: auth.sub, project_id: auth.projectId }).first();
  if (!settings) {
    [settings] = await db('user_settings').insert({ user_id: auth.sub, project_id: auth.projectId }).returning('*');
  }
  return settings;
}

async function getProfile(db, auth) {
  await assertActiveSession(db, auth);
  const user = await db('users').where({ id: auth.sub, project_id: auth.projectId }).first();
  if (!user) throw httpError(404, 'USER_NOT_FOUND', 'Пользователь не найден');
  const identities = await db('auth_identities').where({ user_id: user.id, project_id: auth.projectId, verified: true });
  const email = identities.find((item) => item.provider === 'email')?.normalized_value || null;
  const settings = await ensureSettings(db, auth);
  const profile = parseJson(user.profile, {});
  return {
    user: {
      id: user.id,
      displayName: user.display_name,
      firstName: user.first_name,
      lastName: user.last_name,
      email,
      phone: profile.phone || null,
      status: user.status,
      createdAt: user.created_at,
    },
    settings: {
      language: settings.language,
      timezone: settings.timezone,
      theme: settings.theme,
      notifications: settings.notifications,
    },
  };
}

async function updateProfile(db, auth, input) {
  await assertActiveSession(db, auth);
  const allowed = ['displayName', 'firstName', 'lastName', 'phone'];
  const requested = Object.keys(input || {}).filter((key) => allowed.includes(key));
  if (!requested.length) throw httpError(400, 'PROFILE_UPDATE_EMPTY', 'Нет данных для обновления');

  return db.transaction(async (trx) => {
    const user = await trx('users').where({ id: auth.sub, project_id: auth.projectId }).forUpdate().first();
    if (!user) throw httpError(404, 'USER_NOT_FOUND', 'Пользователь не найден');
    const before = { displayName: user.display_name, firstName: user.first_name, lastName: user.last_name, phone: parseJson(user.profile, {}).phone || null };
    const nextProfile = { ...parseJson(user.profile, {}) };
    if (Object.prototype.hasOwnProperty.call(input, 'phone')) nextProfile.phone = String(input.phone || '').trim() || null;
    const patch = { updated_at: trx.fn.now(), profile: JSON.stringify(nextProfile) };
    if (Object.prototype.hasOwnProperty.call(input, 'displayName')) patch.display_name = String(input.displayName || '').trim() || null;
    if (Object.prototype.hasOwnProperty.call(input, 'firstName')) patch.first_name = String(input.firstName || '').trim() || null;
    if (Object.prototype.hasOwnProperty.call(input, 'lastName')) patch.last_name = String(input.lastName || '').trim() || null;
    await trx('users').where({ id: user.id }).update(patch);
    await trx('audit_log').insert({
      project_id: auth.projectId,
      user_id: auth.sub,
      actor_type: 'user',
      actor_id: auth.sub,
      action: 'profile.updated',
      entity_type: 'user',
      entity_id: auth.sub,
      metadata: JSON.stringify({ before, requested }),
    });
    return getProfile(trx, auth);
  });
}

async function updateSettings(db, auth, input) {
  await assertActiveSession(db, auth);
  const patch = { updated_at: db.fn.now() };
  if (input.language != null) {
    if (!['ru', 'en'].includes(input.language)) throw httpError(400, 'LANGUAGE_INVALID', 'Поддерживаются языки ru и en');
    patch.language = input.language;
  }
  if (input.timezone != null) patch.timezone = String(input.timezone).trim();
  if (input.theme != null) {
    if (!['system', 'light', 'dark'].includes(input.theme)) throw httpError(400, 'THEME_INVALID', 'Недопустимая тема интерфейса');
    patch.theme = input.theme;
  }
  if (input.notifications != null) patch.notifications = Boolean(input.notifications);
  if (Object.keys(patch).length === 1) throw httpError(400, 'SETTINGS_UPDATE_EMPTY', 'Нет настроек для обновления');

  await db.transaction(async (trx) => {
    let settings = await trx('user_settings').where({ user_id: auth.sub, project_id: auth.projectId }).forUpdate().first();
    if (!settings) {
      await trx('user_settings').insert({ user_id: auth.sub, project_id: auth.projectId });
      settings = await trx('user_settings').where({ user_id: auth.sub, project_id: auth.projectId }).first();
    }
    await trx('user_settings').where({ id: settings.id }).update(patch);
    await trx('audit_log').insert({
      project_id: auth.projectId,
      user_id: auth.sub,
      actor_type: 'user',
      actor_id: auth.sub,
      action: 'profile.settings.updated',
      entity_type: 'user',
      entity_id: auth.sub,
      metadata: JSON.stringify({ changed: Object.keys(patch).filter((key) => key !== 'updated_at') }),
    });
  });
  return (await getProfile(db, auth)).settings;
}

async function changePassword(db, auth, input) {
  await assertActiveSession(db, auth);
  const currentPassword = String(input.currentPassword || '');
  const newPassword = String(input.newPassword || '');
  if (newPassword.length < 8) throw httpError(400, 'PASSWORD_TOO_SHORT', 'Новый пароль должен содержать не менее 8 символов');

  return db.transaction(async (trx) => {
    const user = await trx('users').where({ id: auth.sub, project_id: auth.projectId }).forUpdate().first();
    if (!user || !verifyPassword(currentPassword, user.password_hash)) {
      throw httpError(401, 'CURRENT_PASSWORD_INVALID', 'Текущий пароль указан неверно');
    }
    await trx('users').where({ id: user.id }).update({ password_hash: hashPassword(newPassword), updated_at: trx.fn.now() });
    const otherSessions = await trx('sessions').where({ user_id: auth.sub, project_id: auth.projectId }).whereNot({ id: auth.sid }).whereNull('revoked_at').select('id');
    if (otherSessions.length) {
      const ids = otherSessions.map((item) => item.id);
      await trx('sessions').whereIn('id', ids).update({ status: 'revoked', revoked_at: trx.fn.now() });
      await trx('refresh_tokens').whereIn('session_id', ids).whereNull('revoked_at').update({ revoked_at: trx.fn.now() });
    }
    await trx('audit_log').insert({
      project_id: auth.projectId,
      user_id: auth.sub,
      actor_type: 'user',
      actor_id: auth.sub,
      action: 'profile.password.changed',
      entity_type: 'user',
      entity_id: auth.sub,
      metadata: JSON.stringify({ revokedOtherSessions: otherSessions.length }),
    });
    return { ok: true, revokedOtherSessions: otherSessions.length };
  });
}

async function listSessions(db, auth) {
  await assertActiveSession(db, auth);
  const sessions = await db('sessions').where({ user_id: auth.sub, project_id: auth.projectId }).whereNull('revoked_at').orderBy('created_at', 'desc');
  return { sessions: sessions.map((item) => ({ id: item.id, deviceName: item.device_name, userAgent: item.user_agent, ipAddress: item.ip_address, createdAt: item.created_at, lastSeenAt: item.last_seen_at, current: item.id === auth.sid })) };
}

async function revokeSession(db, auth, sessionId) {
  await assertActiveSession(db, auth);
  if (sessionId === auth.sid) throw httpError(400, 'CURRENT_SESSION_REVOKE_FORBIDDEN', 'Текущую сессию завершайте через выход из системы');
  const session = await db('sessions').where({ id: sessionId, user_id: auth.sub, project_id: auth.projectId }).whereNull('revoked_at').first();
  if (!session) throw httpError(404, 'SESSION_NOT_FOUND', 'Сессия не найдена');
  await db.transaction(async (trx) => {
    await trx('sessions').where({ id: session.id }).update({ status: 'revoked', revoked_at: trx.fn.now() });
    await trx('refresh_tokens').where({ session_id: session.id }).whereNull('revoked_at').update({ revoked_at: trx.fn.now() });
    await trx('audit_log').insert({ project_id: auth.projectId, user_id: auth.sub, actor_type: 'user', actor_id: auth.sub, action: 'profile.session.revoked', entity_type: 'session', entity_id: session.id, metadata: JSON.stringify({}) });
  });
  return { ok: true, sessionId };
}

module.exports = { getProfile, updateProfile, updateSettings, changePassword, listSessions, revokeSession };
