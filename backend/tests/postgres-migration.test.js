const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { newDb, DataType } = require('pg-mem');
const migration = require('../db/migrations/202607130001_identity_foundation');
const devhubSeed = require('../db/seeds/001_devhub');

const expectedTables = [
  'projects',
  'project_auth_settings',
  'users',
  'auth_identities',
  'verification_challenges',
  'sessions',
  'refresh_tokens',
  'oauth_states',
  'provider_events',
  'recovery_requests',
  'recovery_attempts',
  'audit_log',
];

async function main() {
  const memory = newDb({ autoCreateForeignKeyIndices: true });
  memory.registerExtension('pgcrypto', (schema) => {
    schema.registerFunction({
      name: 'gen_random_uuid',
      returns: DataType.uuid,
      impure: true,
      implementation: randomUUID,
    });
  });

  const knex = memory.adapters.createKnex();

  try {
    await migration.up(knex);

    for (const table of expectedTables) {
      assert.equal(await knex.schema.hasTable(table), true, `Missing table: ${table}`);
    }

    await devhubSeed.seed(knex);
    await devhubSeed.seed(knex);

    const projects = await knex('projects').where({ slug: 'devhub' });
    assert.equal(projects.length, 1, 'DevHub seed must be idempotent');

    const settings = await knex('project_auth_settings').where({ project_id: projects[0].id });
    assert.equal(settings.length, 1, 'DevHub auth settings must be created');
    const enabledProviders = typeof settings[0].enabled_providers === 'string'
      ? JSON.parse(settings[0].enabled_providers)
      : settings[0].enabled_providers;
    assert.deepEqual(enabledProviders, ['email', 'phone', 'max', 'telegram', 'vk']);
    const requiredVerification = typeof settings[0].required_verification === 'string'
      ? JSON.parse(settings[0].required_verification)
      : settings[0].required_verification;
    assert.deepEqual(requiredVerification, {
      mode: 'one_of',
      channels: ['email', 'phone', 'max'],
    });

    await migration.down(knex);
    for (const table of expectedTables) {
      assert.equal(await knex.schema.hasTable(table), false, `Table was not removed: ${table}`);
    }

    console.log(`PostgreSQL migration test passed: ${expectedTables.length} tables, seed and rollback`);
  } finally {
    await knex.destroy();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
