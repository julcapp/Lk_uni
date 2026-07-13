require('dotenv').config();

function connection() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required for PostgreSQL');
  }

  return {
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: true } : false,
  };
}

const shared = {
  client: 'pg',
  connection,
  pool: {
    min: Number(process.env.DB_POOL_MIN || 2),
    max: Number(process.env.DB_POOL_MAX || 10),
  },
  migrations: {
    directory: './db/migrations',
    tableName: 'knex_migrations',
    extension: 'js',
  },
  seeds: {
    directory: './db/seeds',
    extension: 'js',
  },
};

module.exports = {
  development: shared,
  test: { ...shared, pool: { min: 1, max: 4 } },
  production: shared,
};
