exports.up = async function up(knex) {
  await knex.raw('CREATE EXTENSION IF NOT EXISTS pgcrypto');

  await knex.schema.createTable('projects', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('slug', 80).notNullable().unique();
    table.string('name', 255).notNullable();
    table.string('status', 40).notNullable().defaultTo('active');
    table.text('public_base_url');
    table.jsonb('allowed_redirect_urls').notNullable().defaultTo('[]');
    table.jsonb('branding').notNullable().defaultTo('{}');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('project_auth_settings', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('project_id').notNullable().unique().references('id').inTable('projects').onDelete('CASCADE');
    table.jsonb('enabled_providers').notNullable().defaultTo('["email","phone"]');
    table.jsonb('registration_settings').notNullable().defaultTo('{}');
    table.jsonb('login_settings').notNullable().defaultTo('{}');
    table.jsonb('required_verification').notNullable().defaultTo('{"mode":"one_of","channels":["email","phone"]}');
    table.jsonb('token_settings').notNullable().defaultTo('{"accessTokenTtlMinutes":15,"refreshTokenTtlDays":30,"verificationTtlMinutes":10}');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('users', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('project_id').notNullable().references('id').inTable('projects').onDelete('CASCADE');
    table.string('display_name', 255);
    table.string('first_name', 120);
    table.string('last_name', 120);
    table.string('status', 40).notNullable().defaultTo('pending_verification');
    table.timestamp('verified_at', { useTz: true });
    table.jsonb('profile').notNullable().defaultTo('{}');
    table.jsonb('consents').notNullable().defaultTo('{}');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true });
    table.index(['project_id'], 'idx_users_project_id');
    table.index(['status'], 'idx_users_status');
  });

  await knex.schema.createTable('auth_identities', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('project_id').notNullable().references('id').inTable('projects').onDelete('CASCADE');
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('provider', 50).notNullable();
    table.text('provider_user_id').notNullable();
    table.text('normalized_value');
    table.boolean('verified').notNullable().defaultTo(false);
    table.timestamp('verified_at', { useTz: true });
    table.jsonb('metadata').notNullable().defaultTo('{}');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.unique(['project_id', 'provider', 'provider_user_id']);
    table.index(['user_id'], 'idx_auth_identities_user_id');
    table.index(['provider'], 'idx_auth_identities_provider');
    table.index(['normalized_value'], 'idx_auth_identities_normalized_value');
  });

  await knex.schema.createTable('verification_challenges', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('project_id').notNullable().references('id').inTable('projects').onDelete('CASCADE');
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.string('provider', 50).notNullable();
    table.string('purpose', 50).notNullable();
    table.text('challenge_hash').notNullable();
    table.text('public_token').unique();
    table.text('target_value');
    table.string('status', 40).notNullable().defaultTo('pending');
    table.integer('attempts_count').notNullable().defaultTo(0);
    table.integer('max_attempts').notNullable().defaultTo(5);
    table.jsonb('metadata').notNullable().defaultTo('{}');
    table.timestamp('expires_at', { useTz: true }).notNullable();
    table.timestamp('confirmed_at', { useTz: true });
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.index(['user_id'], 'idx_verification_challenges_user');
    table.index(['public_token'], 'idx_verification_challenges_public_token');
    table.index(['status'], 'idx_verification_challenges_status');
  });

  await knex.schema.createTable('sessions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('project_id').notNullable().references('id').inTable('projects').onDelete('CASCADE');
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.text('user_agent');
    table.specificType('ip_address', 'inet');
    table.text('device_name');
    table.string('status', 40).notNullable().defaultTo('active');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('last_seen_at', { useTz: true });
    table.timestamp('revoked_at', { useTz: true });
    table.index(['user_id'], 'idx_sessions_user_id');
    table.index(['status'], 'idx_sessions_status');
  });

  await knex.schema.createTable('refresh_tokens', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('session_id').notNullable().references('id').inTable('sessions').onDelete('CASCADE');
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('project_id').notNullable().references('id').inTable('projects').onDelete('CASCADE');
    table.text('token_hash').notNullable().unique();
    table.text('previous_token_hash');
    table.timestamp('expires_at', { useTz: true }).notNullable();
    table.timestamp('used_at', { useTz: true });
    table.timestamp('revoked_at', { useTz: true });
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.index(['session_id'], 'idx_refresh_tokens_session_id');
    table.index(['user_id'], 'idx_refresh_tokens_user_id');
  });

  await knex.schema.createTable('oauth_states', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('project_id').notNullable().references('id').inTable('projects').onDelete('CASCADE');
    table.string('provider', 50).notNullable();
    table.text('state_hash').notNullable().unique();
    table.text('code_verifier_hash');
    table.string('purpose', 50).notNullable();
    table.text('redirect_uri');
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.jsonb('metadata').notNullable().defaultTo('{}');
    table.timestamp('expires_at', { useTz: true }).notNullable();
    table.timestamp('consumed_at', { useTz: true });
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('provider_events', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('project_id').references('id').inTable('projects').onDelete('SET NULL');
    table.string('provider', 50).notNullable();
    table.string('event_type', 120);
    table.text('external_event_id');
    table.jsonb('payload').notNullable();
    table.string('status', 40).notNullable().defaultTo('received');
    table.timestamp('received_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('processed_at', { useTz: true });
    table.index(['provider'], 'idx_provider_events_provider');
    table.index(['event_type'], 'idx_provider_events_event_type');
  });

  await knex.schema.createTable('recovery_requests', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('project_id').notNullable().references('id').inTable('projects').onDelete('CASCADE');
    table.uuid('user_id').references('id').inTable('users').onDelete('SET NULL');
    table.string('lookup_type', 50);
    table.text('lookup_hash');
    table.string('status', 40).notNullable().defaultTo('started');
    table.string('selected_provider', 50);
    table.specificType('ip_address', 'inet');
    table.text('user_agent');
    table.jsonb('metadata').notNullable().defaultTo('{}');
    table.timestamp('expires_at', { useTz: true }).notNullable();
    table.timestamp('verified_at', { useTz: true });
    table.timestamp('completed_at', { useTz: true });
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.index(['project_id'], 'idx_recovery_requests_project_id');
    table.index(['user_id'], 'idx_recovery_requests_user_id');
    table.index(['status'], 'idx_recovery_requests_status');
    table.index(['lookup_hash'], 'idx_recovery_requests_lookup_hash');
  });

  await knex.schema.createTable('recovery_attempts', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('recovery_request_id').notNullable().references('id').inTable('recovery_requests').onDelete('CASCADE');
    table.string('provider', 50).notNullable();
    table.string('status', 40).notNullable().defaultTo('pending');
    table.specificType('ip_address', 'inet');
    table.text('user_agent');
    table.jsonb('metadata').notNullable().defaultTo('{}');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('completed_at', { useTz: true });
    table.index(['recovery_request_id'], 'idx_recovery_attempts_request_id');
    table.index(['provider'], 'idx_recovery_attempts_provider');
  });

  await knex.schema.createTable('audit_log', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('project_id').references('id').inTable('projects').onDelete('SET NULL');
    table.uuid('user_id').references('id').inTable('users').onDelete('SET NULL');
    table.string('actor_type', 40).notNullable().defaultTo('system');
    table.uuid('actor_id');
    table.string('action', 120).notNullable();
    table.string('entity_type', 80);
    table.uuid('entity_id');
    table.specificType('ip_address', 'inet');
    table.text('user_agent');
    table.jsonb('metadata').notNullable().defaultTo('{}');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.index(['project_id'], 'idx_audit_log_project_id');
    table.index(['user_id'], 'idx_audit_log_user_id');
    table.index(['action'], 'idx_audit_log_action');
  });
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('audit_log');
  await knex.schema.dropTableIfExists('recovery_attempts');
  await knex.schema.dropTableIfExists('recovery_requests');
  await knex.schema.dropTableIfExists('provider_events');
  await knex.schema.dropTableIfExists('oauth_states');
  await knex.schema.dropTableIfExists('refresh_tokens');
  await knex.schema.dropTableIfExists('sessions');
  await knex.schema.dropTableIfExists('verification_challenges');
  await knex.schema.dropTableIfExists('auth_identities');
  await knex.schema.dropTableIfExists('users');
  await knex.schema.dropTableIfExists('project_auth_settings');
  await knex.schema.dropTableIfExists('projects');
};
