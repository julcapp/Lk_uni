const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const request = require('supertest');
const { newDb, DataType } = require('pg-mem');
const identityMigration = require('../db/migrations/202607130001_identity_foundation');
const projectCreationMigration = require('../db/migrations/202608040001_project_creation_v1');
const passwordResetMigration = require('../db/migrations/202608070001_password_reset');

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
  return { db, ownsDatabase: true };
}

async function counts(db) {
  const tables = ['organizations', 'projects', 'users', 'auth_identities', 'project_members', 'project_settings', 'sessions', 'refresh_tokens', 'password_reset_tokens'];
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

    const loginAudit = await db('audit_log')
      .where({ project_id: projectId, user_id: userId, action: 'user.password_login.succeeded' })
      .first();
    assert.ok(loginAudit);

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

    assert.equal(resetRequested.body.ok, true);
    assert.ok(resetRequested.body.resetUrl);
    const resetToken = new URL(`http://localhost${resetRequested.body.resetUrl}`).searchParams.get('token');
    assert.ok(resetToken);

    const validated = await request(app)
      .get(`/api/v1/auth/password-reset/validate?token=${encodeURIComponent(resetToken)}`)
      .expect(200);
    assert.equal(validated.body.valid, true);

    const activeBeforeReset = await db('sessions').where({ user_id: userId, status: 'active' }).whereNull('revoked_at');
    assert.ok(activeBeforeReset.length >= 2);

    const resetDone = await request(app)
      .post('/api/v1/auth/password-reset/confirm')
      .set('x-device-name', 'Password reset integration test')
      .send({ token: resetToken, password: 'new-password-123' })
      .expect(200);

    assert.equal(resetDone.body.user.id, userId);
    assert.equal(resetDone.body.workspace.id, projectId);
    assert.ok(resetDone.body.tokens.accessToken);
    assert.ok(resetDone.body.tokens.refreshToken);

    const activeAfterReset = await db('sessions').where({ user_id: userId, status: 'active' }).whereNull('revoked_at');
    assert.equal(activeAfterReset.length, 1, 'Password reset must revoke previous active sessions and create one new session');

    const reuse = await request(app)
      .post('/api/v1/auth/password-reset/confirm')
      .send({ token: resetToken, password: 'another-password-123' })
      .expect(400);
    assert.equal(reuse.body.code, 'RESET_TOKEN_INVALID');

    await request(app)
      .post('/api/v1/auth/password-login')
      .send({ email, password: 'password123' })
      .expect(401);

    const loginWithNewPassword = await request(app)
      .post('/api/v1/auth/password-login')
      .send({ email, password: 'new-password-123' })
      .expect(200);
    assert.equal(loginWithNewPassword.body.user.id, userId);

    const resetAudit = await db('audit_log')
      .where({ project_id: projectId, user_id: userId, action: 'user.password_reset.completed' })
      .first();
    assert.ok(resetAudit);

    const beforeDuplicate = await counts(db);

    const duplicate = await request(app)
      .post('/api/v1/projects')
      .send({
        projectName: 'Дубликат',
        owner: { name: 'Другой владелец', email, password: 'password123' },
      })
      .expect(409);

    assert.equal(duplicate.body.code, 'EMAIL_ALREADY_EXISTS');
    assert.deepEqual(await counts(db), beforeDuplicate, 'Duplicate email must not leave partially created records');

    await request(app)
      .post('/api/v1/projects')
      .send({
        projectName: 'Некорректный проект',
        owner: { name: 'Владелец', email: `invalid-${randomUUID()}@example.ru`, password: 'short' },
      })
      .expect(400);

    assert.deepEqual(await counts(db), beforeDuplicate, 'Validation error must roll back the whole workspace transaction');

    console.log('Project Creation integration test passed: workspace, login, password reset, session, audit and rollback');
  } finally {
    await db.destroy();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
