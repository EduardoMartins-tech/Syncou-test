import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  await pool.query('ALTER TABLE appointments ADD COLUMN IF NOT EXISTS google_event_id VARCHAR(255);');
  console.log("Column added");
  process.exit(0);
}
main();
