const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool();
async function run() {
  try {
    const res = await pool.query('SELECT email, CONCAT(SUBSTRING(avatar_url, 1, 25), \'...\') as trunc, length(avatar_url) as len FROM users');
    console.log(res.rows);
    process.exit(0);
  } catch(e) {
    console.error(e);
  }
}
run();
