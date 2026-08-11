exports.up = async function up(knex) {
  await knex.schema.alterTable('organizations', (table) => {
    table.text('description');
    table.text('website');
    table.text('email');
    table.text('phone');
    table.text('address');
    table.text('logo_url');
    table.string('language', 8).notNullable().defaultTo('ru');
    table.string('timezone', 80).notNullable().defaultTo('Europe/Moscow');
  });
};

exports.down = async function down(knex) {
  await knex.schema.alterTable('organizations', (table) => {
    table.dropColumn('timezone');
    table.dropColumn('language');
    table.dropColumn('logo_url');
    table.dropColumn('address');
    table.dropColumn('phone');
    table.dropColumn('email');
    table.dropColumn('website');
    table.dropColumn('description');
  });
};
