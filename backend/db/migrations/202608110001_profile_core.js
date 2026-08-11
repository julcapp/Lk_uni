exports.up = async function up(knex) {
  await knex.schema.createTable('user_settings', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().unique().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('project_id').notNullable().references('id').inTable('projects').onDelete('CASCADE');
    table.string('language', 10).notNullable().defaultTo('ru');
    table.string('timezone', 80).notNullable().defaultTo('Europe/Moscow');
    table.string('theme', 20).notNullable().defaultTo('system');
    table.boolean('notifications').notNullable().defaultTo(true);
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.index(['project_id'], 'idx_user_settings_project_id');
  });
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('user_settings');
};
