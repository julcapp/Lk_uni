const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const request = require('supertest');
const { newDb, DataType } = require('pg-mem');
const identityMigration = require('../db/migrations/202607130001_identity_foundation');
const projectCreationMigration = require('../db/migrations/202608040001_project_creation_v1');
const passwordResetMigration = require('../db/migrations/202608070001_password_reset');
const profileCoreMigration = require('../db/migrations/202608110001_profile_core');
const organizationCoreMigration = require('../db/migrations/202608110002_organization_core');

process.env.JWT_ACCESS_SECRET ||= 'test-access-secret-at-least-32-characters';
process.env.JWT_REFRESH_SECRET ||= 'test-refresh-secret-at-least-32-characters';
process.env.AUTH_DEMO_MODE ||= 'true';

async function createDatabase() {
  if (process.env.PROJECT_TEST_DATABASE === 'real') {
    return { db: require('../config/postgres'), ownsDatabase: false };
  }

  const memory = newDb({ autoCreateForeignKeyIndices: true });
  memory.registerExtension('pgcrypto', (schema) => {
    schema.registerFunction({
      name: 'gen_random_uuid',
      returns: DataType.uuid,
      impure: true,
      implementation: randomUUID,
    });
  });

  const db = memory.adapters.createKnex();
  await identityMigration.up(db);
  await projectCreationMigration.up(db);
  await passwordResetMigration.up(db);
  await profileCoreMigration.up(db);
  await organizationCoreMigration.up(db);
  return { db, ownsDatabase: true };
}

async function counts(db) {
  const tables = ['organizations', 'projects', 'users', 'auth_identities', 'project_members', 'project_settings', 'sessions', 'refresh_tokens', 'password_reset_tokens', 'user_settings'];
  const result = {};
  for (const table of tables) {
    const row = await db(table).count('* as count').first();
    result[table] = Number(row.count);
  }
  return result;
}

async function main() {
  const { db } = await createDatabase();
  const { createApp } = require('../src/app');
  const app = createApp({ db });
  const email = `owner-${randomUUID()}@example.ru`;

  try {
    const created = await request(app)
      .post('/api/v1/projects')
      .set('x-device-name', 'Project creation integration test')
      .send({
        projectName: 'У Тимоши',
        businessType: 'vending',
        deploymentMode: 'cloud',
        owner: {
          name: 'Александр',
          email,
          password: 'password123',
          consents: { personalData: true },
        },
      })
      .expect(201);

    assert.equal(created.body.workspace.name, 'У Тимоши');
    assert.equal(created.body.workspace.business_type, 'vending');
    assert.equal(created.body.workspace.deployment_mode, 'cloud');
    assert.equal(created.body.owner.role, 'OWNER');
    assert.equal(created.body.owner.status, 'active');
    assert.equal(created.body.nextStep, 'workspace_setup');
    assert.ok(created.body.tokens.accessToken);
    assert.ok(created.body.tokens.refreshToken);

    const projectId = created.body.workspace.id;
    const userId = created.body.owner.id;

    const organization = await db('organizations').where({ id: created.body.organization.id }).first();
    const membership = await db('project_members').where({ project_id: projectId, user_id: userId }).first();
    const settings = await db('project_settings').where({ project_id: projectId }).first();
    const identity = await db('auth_identities').where({ project_id: projectId, user_id: userId }).first();
    const user = await db('users').where({ id: userId }).first();
    const audit = await db('audit_log').where({ project_id: projectId, action: 'workspace.created' }).first();

    assert.equal(organization.name, 'У Тимоши');
    assert.equal(membership.role, 'OWNER');
    assert.equal(identity.normalized_value, email);
    assert.equal(identity.verified, true);
    assert.match(user.password_hash, /^scrypt\$[0-9a-f]+\$[0-9a-f]+$/);
    assert.ok(settings.settings);
    assert.ok(audit);

    const loggedIn = await request(app)
      .post('/api/v1/auth/password-login')
      .set('x-device-name', 'Password login integration test')
      .send({ email, password: 'password123' })
      .expect(200);

    assert.equal(loggedIn.body.user.id, userId);
    assert.equal(loggedIn.body.workspace.id, projectId);
    assert.ok(loggedIn.body.tokens.accessToken);
    assert.ok(loggedIn.body.tokens.refreshToken);

    const badLogin = await request(app)
      .post('/api/v1/auth/password-login')
      .send({ email, password: 'wrong-password' })
      .expect(401);
    assert.equal(badLogin.body.code, 'INVALID_CREDENTIALS');

    const unknownReset = await request(app)
      .post('/api/v1/auth/password-reset/request')
      .send({ email: `unknown-${randomUUID()}@example.ru` })
      .expect(200);
    assert.equal(unknownReset.body.ok, true);
    assert.equal(unknownReset.body.resetUrl, undefined, 'Unknown email must not reveal account existence');

    const resetRequested = await request(app)
      .post('/api/v1/auth/password-reset/request')
      .set('x-device-name', 'Password reset integration test')
      .send({ email })
      .expect(200);
    assert.ok(resetRequested.body.resetUrl);
    const resetToken = new URL(`http://localhost${resetRequested.body.resetUrl}`).searchParams.get('token');

    await request(app)
      .get(`/api/v1/auth/password-reset/validate?token=${encodeURIComponent(resetToken)}`)
      .expect(200);

    const resetDone = await request(app)
      .post('/api/v1/auth/password-reset/confirm')
      .set('x-device-name', 'Password reset integration test')
      .send({ token: resetToken, password: 'new-password-123' })
      .expect(200);
    assert.ok(resetDone.body.tokens.accessToken);

    await request(app)
      .post('/api/v1/auth/password-reset/confirm')
      .send({ token: resetToken, password: 'another-password-123' })
      .expect(400);

    await request(app)
      .post('/api/v1/auth/password-login')
      .send({ email, password: 'password123' })
      .expect(401);

    const loginWithNewPassword = await request(app)
      .post('/api/v1/auth/password-login')
      .set('x-device-name', 'Primary profile session')
      .send({ email, password: 'new-password-123' })
      .expect(200);

    const accessToken = loginWithNewPassword.body.tokens.accessToken;
    const profile = await request(app)
      .get('/api/v1/profile')
      .set('authorization', `Bearer ${accessToken}`)
      .expect(200);
    assert.equal(profile.body.user.email, email);
    assert.equal(profile.body.settings.language, 'ru');

    const updatedProfile = await request(app)
      .patch('/api/v1/profile')
      .set('authorization', `Bearer ${accessToken}`)
      .send({ displayName: 'Александр Викторович', firstName: 'Александр', lastName: 'Ильин', phone: '+7 900 000-00-00' })
      .expect(200);
    assert.equal(updatedProfile.body.user.displayName, 'Александр Викторович');
    assert.equal(updatedProfile.body.user.phone, '+7 900 000-00-00');

    const updatedSettings = await request(app)
      .patch('/api/v1/profile/settings')
      .set('authorization', `Bearer ${accessToken}`)
      .send({ language: 'en', timezone: 'Asia/Bangkok', notifications: false })
      .expect(200);
    assert.equal(updatedSettings.body.language, 'en');
    assert.equal(updatedSettings.body.timezone, 'Asia/Bangkok');
    assert.equal(updatedSettings.body.notifications, false);

    const organizationRead = await request(app)
      .get('/api/v1/organization')
      .set('authorization', `Bearer ${accessToken}`)
      .expect(200);
    assert.equal(organizationRead.body.organization.name, 'У Тимоши');
    assert.equal(organizationRead.body.organization.role, 'OWNER');

    const organizationUpdated = await request(app)
      .patch('/api/v1/organization')
      .set('authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Клуб У Тимоши',
        description: 'Семейный проект мягкого мороженого',
        website: 'https://example.ru',
        email: 'office@example.ru',
        phone: '+7 900 111-22-33',
        address: 'Москва',
        language: 'ru',
        timezone: 'Europe/Moscow',
      })
      .expect(200);
    assert.equal(organizationUpdated.body.organization.name, 'Клуб У Тимоши');
    assert.equal(organizationUpdated.body.organization.phone, '+7 900 111-22-33');

    const organizationAudit = await db('audit_log')
      .where({ project_id: projectId, user_id: userId, action: 'organization.updated' })
      .first();
    assert.ok(organizationAudit);

    const secondLogin = await request(app)
      .post('/api/v1/auth/password-login')
      .set('x-device-name', 'Secondary profile session')
      .send({ email, password: 'new-password-123' })
      .expect(200);

    const sessionsBeforeChange = await request(app)
      .get('/api/v1/profile/sessions')
      .set('authorization', `Bearer ${accessToken}`)
      .expect(200);
    assert.ok(sessionsBeforeChange.body.sessions.length >= 2);

    const changedPassword = await request(app)
      .post('/api/v1/profile/change-password')
      .set('authorization', `Bearer ${accessToken}`)
      .send({ currentPassword: 'new-password-123', newPassword: 'final-password-456' })
      .expect(200);
    assert.ok(changedPassword.body.revokedOtherSessions >= 1);

    const secondarySession = await db('sessions').where({ id: secondLogin.body.tokens.sessionId }).first();
    assert.equal(secondarySession.status, 'revoked');

    await request(app)
      .post('/api/v1/auth/password-login')
      .send({ email, password: 'new-password-123' })
      .expect(401);

    await request(app)
      .post('/api/v1/auth/password-login')
      .send({ email, password: 'final-password-456' })
      .expect(200);

    const profileAudit = await db('audit_log').where({ project_id: projectId, user_id: userId, action: 'profile.updated' }).first();
    const settingsAudit = await db('audit_log').where({ project_id: projectId, user_id: userId, action: 'profile.settings.updated' }).first();
    const passwordAudit = await db('audit_log').where({ project_id: projectId, user_id: userId, action: 'profile.password.changed' }).first();
    assert.ok(profileAudit && settingsAudit && passwordAudit);

    const beforeDuplicate = await counts(db);

    const duplicate = await request(app)
      .post('/api/v1/projects')
      .send({ projectName: 'Дубликат', owner: { name: 'Другой владелец', email, password: 'password123' } })
      .expect(409);
    assert.equal(duplicate.body.code, 'EMAIL_ALREADY_EXISTS');
    assert.deepEqual(await counts(db), beforeDuplicate, 'Duplicate email must not leave partially created records');

    await request(app)
      .post('/api/v1/projects')
      .send({ projectName: 'Некорректный проект', owner: { name: 'Владелец', email: `invalid-${randomUUID()}@example.ru`, password: 'short' } })
      .expect(400);
    assert.deepEqual(await counts(db), beforeDuplicate, 'Validation error must roll back the whole workspace transaction');

    console.log('Project Creation integration test passed: workspace, auth, password reset, profile core, organization core, sessions, audit and rollback');
  } finally {
    await db.destroy();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
