exports.up = async function up(knex) {
  await knex.schema.createTable('organizations', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name', 255).notNullable();
    table.string('status', 40).notNullable().defaultTo('active');
    table.jsonb('metadata').notNullable().defaultTo('{}');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.alterTable('projects', (table) => {
    table.uuid('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.string('business_type', 80);
    table.string('deployment_mode', 40).notNullable().defaultTo('cloud');
  });

  await knex.schema.alterTable('users', (table) => {
    table.text('password_hash');
  });

  await knex.schema.createTable('project_members', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('project_id').notNullable().references('id').inTable('projects').onDelete('CASCADE');
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('role', 40).notNullable().defaultTo('USER');
    table.string('status', 40).notNullable().defaultTo('active');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.unique(['project_id', 'user_id']);
    table.index(['user_id'], 'idx_project_members_user_id');
  });

  await knex.schema.createTable('project_settings', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('project_id').notNullable().unique().references('id').inTable('projects').onDelete('CASCADE');
    table.jsonb('settings').notNullable().defaultTo('{}');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('project_settings');
  await knex.schema.dropTableIfExists('project_members');
  await knex.schema.alterTable('users', (table) => table.dropColumn('password_hash'));
  await knex.schema.alterTable('projects', (table) => {
    table.dropColumn('deployment_mode');
    table.dropColumn('business_type');
    table.dropColumn('organization_id');
  });
  await knex.schema.dropTableIfExists('organizations');
};
