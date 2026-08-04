const crypto = require('node:crypto');
const {
  hashToken,
  signAccessToken,
  signRefreshToken,
  tokenExpiresAt,
} = require('../auth/token.service');

function httpError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function slugify(value) {
  const base = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return base || 'project';
}

function hashPassword(password) {
  const value = String(password || '');
  if (value.length < 8) throw httpError(400, 'PASSWORD_TOO_SHORT', 'Пароль должен содержать не менее 8 символов');
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(value, salt, 64);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

async function uniqueSlug(trx, name) {
  const base = slugify(name);
  let candidate = base;
  for (let index = 0; index < 100; index += 1) {
    const exists = await trx('projects').where({ slug: candidate }).first('id');
    if (!exists) return candidate;
    candidate = `${base}-${index + 2}`;
  }
  throw httpError(409, 'PROJECT_SLUG_UNAVAILABLE', 'Не удалось подобрать адрес рабочего пространства');
}

async function createSession(trx, user, meta) {
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

async function createWorkspace(db, input, meta = {}) {
  const projectName = String(input.projectName || input.workspaceName || '').trim();
  const ownerName = String(input.owner?.name || '').trim();
  const email = normalizeEmail(input.owner?.email);

  if (!projectName) throw httpError(400, 'PROJECT_NAME_REQUIRED', 'Укажите название проекта');
  if (!ownerName) throw httpError(400, 'OWNER_NAME_REQUIRED', 'Укажите имя владельца');
  if (!/^\S+@\S+\.\S+$/.test(email)) throw httpError(400, 'EMAIL_INVALID', 'Укажите корректный email');

  try {
    return await db.transaction(async (trx) => {
      const duplicate = await trx('auth_identities').where({ provider: 'email', normalized_value: email }).first('id');
      if (duplicate) throw httpError(409, 'EMAIL_ALREADY_EXISTS', 'Пользователь с таким email уже существует');

      const slug = await uniqueSlug(trx, projectName);
      const [organization] = await trx('organizations').insert({
        name: String(input.organizationName || projectName).trim(),
        metadata: JSON.stringify({ source: 'project_creation_wizard' }),
      }).returning(['id', 'name', 'status']);

      const [project] = await trx('projects').insert({
        organization_id: organization.id,
        slug,
        name: projectName,
        business_type: input.businessType || null,
        deployment_mode: input.deploymentMode || 'cloud',
        status: 'active',
        branding: JSON.stringify({}),
        allowed_redirect_urls: JSON.stringify([]),
      }).returning(['id', 'slug', 'name', 'status', 'business_type', 'deployment_mode']);

      await trx('project_auth_settings').insert({
        project_id: project.id,
        enabled_providers: JSON.stringify(['email']),
        required_verification: JSON.stringify({ mode: 'none', channels: [] }),
        registration_settings: JSON.stringify({ ownerCreatedByWizard: true }),
        login_settings: JSON.stringify({ passwordEnabled: true }),
      });

      const [user] = await trx('users').insert({
        project_id: project.id,
        display_name: ownerName,
        status: 'active',
        verified_at: trx.fn.now(),
        password_hash: hashPassword(input.owner?.password),
        profile: JSON.stringify({ roleLabel: 'Владелец' }),
        consents: JSON.stringify(input.owner?.consents || {}),
      }).returning(['id', 'project_id', 'display_name', 'status']);

      await trx('auth_identities').insert({
        project_id: project.id,
        user_id: user.id,
        provider: 'email',
        provider_user_id: email,
        normalized_value: email,
        verified: true,
        verified_at: trx.fn.now(),
      });

      await trx('project_members').insert({ project_id: project.id, user_id: user.id, role: 'OWNER' });
      await trx('project_settings').insert({
        project_id: project.id,
        settings: JSON.stringify({ onboarding: { completed: false, nextStep: 'workspace_setup' } }),
      });

      const tokens = await createSession(trx, user, meta);

      await trx('audit_log').insert({
        project_id: project.id,
        user_id: user.id,
        actor_type: 'user',
        actor_id: user.id,
        action: 'workspace.created',
        entity_type: 'project',
        entity_id: project.id,
        ip_address: meta.ip || null,
        user_agent: meta.userAgent || null,
        metadata: JSON.stringify({ organizationId: organization.id, businessType: project.business_type }),
      });

      return {
        workspace: project,
        organization,
        owner: { id: user.id, displayName: user.display_name, status: user.status, role: 'OWNER' },
        tokens,
        nextStep: 'workspace_setup',
      };
    });
  } catch (error) {
    if (error.code === '23505') throw httpError(409, 'WORKSPACE_CONFLICT', 'Проект или пользователь уже существует');
    throw error;
  }
}

module.exports = { createWorkspace };
