import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }});
async function run() {
  try {
    const res = await pool.query('SELECT display_name, CONCAT(SUBSTRING(avatar_url, 1, 25), \'...\') as trunc, length(avatar_url) as len FROM users');
    console.log(JSON.stringify(res.rows, null, 2));
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
run();
