require('dotenv').config();
const db = require('../config/postgres');

async function main() {
  try {
    const result = await db.raw('select current_database() as database, version() as version');
    const row = result.rows[0];
    console.log(`PostgreSQL connection OK: ${row.database}`);
    console.log(row.version);
  } finally {
    await db.destroy();
  }
}

main().catch((error) => {
  console.error(`PostgreSQL connection failed: ${error.message}`);
  process.exitCode = 1;
});
