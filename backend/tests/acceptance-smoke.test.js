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
  if (process.env.PROJECT_TEST_DATABASE === 'real') return require('../config/postgres');
  const memory = newDb({ autoCreateForeignKeyIndices: true });
  memory.registerExtension('pgcrypto', (schema) => schema.registerFunction({ name: 'gen_random_uuid', returns: DataType.uuid, impure: true, implementation: randomUUID }));
  const db = memory.adapters.createKnex();
  await identityMigration.up(db);
  await projectCreationMigration.up(db);
  await passwordResetMigration.up(db);
  await profileCoreMigration.up(db);
  await organizationCoreMigration.up(db);
  return db;
}

async function main() {
  const db = await createDatabase();
  const { createApp } = require('../src/app');
  const app = createApp({ db });
  const email = `acceptance-${randomUUID()}@example.ru`;

  try {
    const uiRoutes = ['/login/', '/create-project/', '/workspace/', '/profile/', '/organization/', '/forgot-password/', '/reset-password/'];
    for (const path of uiRoutes) {
      const response = await request(app).get(path).expect(200);
      assert.match(response.headers['content-type'] || '', /text\/html/);
      assert.match(response.text, /Lk_uni/);
      assert.match(response.text, /\/shared\/i18n\.js/, `${path} must load shared localization`);
      assert.match(response.text, /data-i18n=/, `${path} must contain localizable UI nodes`);
    }
    const i18n = await request(app).get('/shared/i18n.js').expect(200);
    assert.match(i18n.headers['content-type'] || '', /javascript/);
    assert.match(i18n.text, /lkuni\.language/);
    assert.match(i18n.text, /ru:/);
    assert.match(i18n.text, /en:/);

    const created = await request(app).post('/api/v1/projects').set('x-device-name', 'Acceptance smoke').send({ projectName: 'Acceptance Project', owner: { name: 'Первый пользователь', email, password: 'acceptance-password-123' } }).expect(201);
    let accessToken = created.body.tokens.accessToken;
    assert.ok(accessToken);

    const profile = await request(app).patch('/api/v1/profile').set('authorization', `Bearer ${accessToken}`).send({ displayName: 'Первый пользователь', phone: '+7 900 111-22-33' }).expect(200);
    assert.equal(profile.body.user.phone, '+7 900 111-22-33');

    let settings = await request(app).patch('/api/v1/profile/settings').set('authorization', `Bearer ${accessToken}`).send({ language: 'en', timezone: 'Europe/Moscow' }).expect(200);
    assert.equal(settings.body.language, 'en');
    settings = await request(app).get('/api/v1/profile/settings').set('authorization', `Bearer ${accessToken}`).expect(200);
    assert.equal((settings.body.settings || settings.body).language, 'en', 'English preference must persist in profile settings');

    const organization = await request(app).patch('/api/v1/organization').set('authorization', `Bearer ${accessToken}`).send({ name: 'Acceptance Organization', description: 'Приёмочное испытание', website: 'https://example.ru', email: 'office@example.ru', phone: '+7 900 111-22-33', address: 'Москва', language: 'en', timezone: 'Europe/Moscow' }).expect(200);
    assert.equal(organization.body.organization.name, 'Acceptance Organization');

    const reset = await request(app).post('/api/v1/auth/password-reset/request').send({ email }).expect(200);
    assert.ok(reset.body.resetUrl, 'Demo mode must expose a reset URL for the acceptance smoke test');
    const token = new URL(`http://localhost${reset.body.resetUrl}`).searchParams.get('token');
    assert.ok(token);
    const confirmed = await request(app).post('/api/v1/auth/password-reset/confirm').send({ token, password: 'acceptance-password-456' }).expect(200);
    accessToken = confirmed.body.tokens.accessToken;
    assert.ok(accessToken);

    await request(app).post('/api/v1/auth/password-login').send({ email, password: 'acceptance-password-123' }).expect(401);
    const loggedIn = await request(app).post('/api/v1/auth/password-login').send({ email, password: 'acceptance-password-456' }).expect(200);
    assert.ok(loggedIn.body.tokens.accessToken);

    const finalProfile = await request(app).get('/api/v1/profile').set('authorization', `Bearer ${loggedIn.body.tokens.accessToken}`).expect(200);
    assert.equal(finalProfile.body.user.phone, '+7 900 111-22-33');
    const finalSettings = await request(app).get('/api/v1/profile/settings').set('authorization', `Bearer ${loggedIn.body.tokens.accessToken}`).expect(200);
    assert.equal((finalSettings.body.settings || finalSettings.body).language, 'en', 'Language preference must survive password reset and re-login');
    const finalOrganization = await request(app).get('/api/v1/organization').set('authorization', `Bearer ${loggedIn.body.tokens.accessToken}`).expect(200);
    assert.equal(finalOrganization.body.organization.name, 'Acceptance Organization');

    console.log('Acceptance smoke test passed: RU/EN UI, workspace, profile, organization and password recovery');
  } finally { await db.destroy(); }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
