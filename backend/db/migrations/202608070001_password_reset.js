exports.up = async function up(knex) {
  await knex.schema.createTable('password_reset_tokens', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('project_id').notNullable().references('id').inTable('projects').onDelete('CASCADE');
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('email', 320).notNullable();
    table.string('token_hash', 64).notNullable().unique();
    table.string('status', 32).notNullable().defaultTo('pending');
    table.timestamp('expires_at', { useTz: true }).notNullable();
    table.timestamp('used_at', { useTz: true });
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.index(['user_id', 'status'], 'idx_password_reset_user_status');
    table.index(['expires_at'], 'idx_password_reset_expires_at');
  });
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('password_reset_tokens');
};
