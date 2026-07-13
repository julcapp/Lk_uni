const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const request = require('supertest');
const { newDb, DataType } = require('pg-mem');
const migration = require('../db/migrations/202607130001_identity_foundation');
const devhubSeed = require('../db/seeds/001_devhub');

process.env.JWT_ACCESS_SECRET ||= 'test-access-secret-at-least-32-characters';
process.env.JWT_REFRESH_SECRET ||= 'test-refresh-secret-at-least-32-characters';
process.env.CHALLENGE_SECRET ||= 'test-challenge-secret-at-least-32-characters';
process.env.AUTH_DEMO_MODE = 'true';

async function createDatabase() {
  if (process.env.AUTH_TEST_DATABASE === 'real') {
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
  await migration.up(db);
  await devhubSeed.seed(db);
  return { db, ownsDatabase: true };
}

async function main() {
  const { db } = await createDatabase();
  const { createApp } = require('../src/app');
  const app = createApp({ db });
  const email = `auth-${randomUUID()}@example.ru`;
  let userId;

  try {
    const project = await request(app).get('/api/v1/projects/public/devhub').expect(200);
    assert.equal(project.body.project.slug, 'devhub');
    assert.ok(project.body.auth.enabledProviders.includes('email'));

    const registered = await request(app)
      .post('/api/v1/auth/register')
      .send({
        projectSlug: 'devhub',
        displayName: 'Тестовый пользователь',
        email,
        consents: { personalData: true, marketing: false },
      })
      .expect(201);
    userId = registered.body.userId;
    assert.equal(registered.body.status, 'pending_verification');
    assert.deepEqual(registered.body.availableVerificationChannels, ['email']);

    const started = await request(app)
      .post('/api/v1/auth/verify/start')
      .send({ projectSlug: 'devhub', userId, provider: 'email', purpose: 'registration' })
      .expect(201);
    assert.match(started.body.demoCode, /^\d{6}$/);

    await request(app)
      .post('/api/v1/auth/verify/confirm')
      .send({
        projectSlug: 'devhub',
        challengeId: started.body.challengeId,
        code: '000000',
      })
      .expect(400);
    const attempted = await db('verification_challenges').where({ id: started.body.challengeId }).first();
    assert.equal(attempted.attempts_count, 1, 'Invalid verification attempt must be persisted');

    const confirmed = await request(app)
      .post('/api/v1/auth/verify/confirm')
      .set('x-device-name', 'Integration test')
      .send({
        projectSlug: 'devhub',
        challengeId: started.body.challengeId,
        code: started.body.demoCode,
      })
      .expect(200);
    assert.equal(confirmed.body.status, 'verified');
    assert.ok(confirmed.body.tokens.accessToken);
    assert.ok(confirmed.body.tokens.refreshToken);

    const me = await request(app)
      .get('/api/v1/auth/me')
      .set('authorization', `Bearer ${confirmed.body.tokens.accessToken}`)
      .expect(200);
    assert.equal(me.body.user.id, userId);
    assert.equal(me.body.identities[0].provider, 'email');
    assert.equal(me.body.identities[0].verified, true);

    const rotated = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: confirmed.body.tokens.refreshToken })
      .expect(200);
    assert.notEqual(rotated.body.refreshToken, confirmed.body.tokens.refreshToken);

    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ projectSlug: 'devhub', provider: 'email', login: email })
      .expect(202);
    assert.equal(login.body.provider, 'email');
    assert.ok(login.body.challengeId);

    const secondSession = await request(app)
      .post('/api/v1/auth/verify/confirm')
      .set('x-device-name', 'Second integration device')
      .send({ projectSlug: 'devhub', challengeId: login.body.challengeId, code: login.body.demoCode })
      .expect(200);

    const sessions = await request(app)
      .get('/api/v1/auth/sessions')
      .set('authorization', `Bearer ${rotated.body.accessToken}`)
      .expect(200);
    assert.equal(sessions.body.sessions.length, 2);
    const secondSessionId = sessions.body.sessions.find((session) => !session.current).id;

    await request(app)
      .post(`/api/v1/auth/sessions/${secondSessionId}/revoke`)
      .set('authorization', `Bearer ${rotated.body.accessToken}`)
      .expect(200);

    await request(app)
      .get('/api/v1/auth/me')
      .set('authorization', `Bearer ${secondSession.body.tokens.accessToken}`)
      .expect(401);

    await request(app)
      .get('/api/v1/auth/sessions')
      .set('authorization', `Bearer ${secondSession.body.tokens.accessToken}`)
      .expect(401);

    await request(app)
      .post('/api/v1/auth/logout')
      .send({ refreshToken: rotated.body.refreshToken })
      .expect(200);

    await request(app)
      .get('/api/v1/auth/me')
      .set('authorization', `Bearer ${rotated.body.accessToken}`)
      .expect(401);

    await request(app)
      .get('/api/v1/auth/sessions')
      .set('authorization', `Bearer ${rotated.body.accessToken}`)
      .expect(401);

    const replayLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ projectSlug: 'devhub', provider: 'email', login: email })
      .expect(202);
    const replaySession = await request(app)
      .post('/api/v1/auth/verify/confirm')
      .send({ projectSlug: 'devhub', challengeId: replayLogin.body.challengeId, code: replayLogin.body.demoCode })
      .expect(200);
    const replayRotated = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: replaySession.body.tokens.refreshToken })
      .expect(200);
    await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: replaySession.body.tokens.refreshToken })
      .expect(401);
    await request(app)
      .get('/api/v1/auth/me')
      .set('authorization', `Bearer ${replayRotated.body.accessToken}`)
      .expect(401);

    console.log('Auth Core integration test passed: register, verify, me, refresh rotation, login, session revoke, logout');
  } finally {
    if (userId) {
      await db('users').where({ id: userId }).delete();
      await db('audit_log').where({ action: 'user.registration.started', user_id: null }).delete();
    }
    await db.destroy();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
