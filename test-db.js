import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function test() {
  const query = "SELECT id, working_days FROM users LIMIT 1";
  const res = await pool.query(query);
  console.log("DB Content:", JSON.stringify(res.rows));
  process.exit(0);
}
test();
