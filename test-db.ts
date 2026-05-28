import { Pool } from 'pg';
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://syncou_user:syncou_password@localhost/syncou' });
async function run() {
  const res = await pool.query("SELECT * FROM appointments ORDER BY created_at DESC LIMIT 5");
  console.log(res.rows);
}
run().then(() => process.exit(0)).catch(console.error);
