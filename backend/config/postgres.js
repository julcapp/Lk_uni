const knex = require('knex');
const environments = require('../knexfile');

const environment = process.env.NODE_ENV || 'development';
const config = environments[environment];

if (!config) {
  throw new Error(`Unsupported NODE_ENV for PostgreSQL: ${environment}`);
}

module.exports = knex(config);
