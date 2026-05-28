import { Pool } from 'pg';
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://syncou_user:syncou_password@localhost/syncou' });
async function test() {
  const providerRes = await pool.query("SELECT google_access_token FROM users WHERE email = 'eduardoferreiramartins74@gmail.com'");
  const googleAccessToken = providerRes.rows[0]?.google_access_token;
  console.log(googleAccessToken ? "Token exists" : "Token does not exist");
  if (googleAccessToken) {
    const gCalRes = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${googleAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        summary: "Test Event",
        start: { dateTime: new Date().toISOString(), timeZone: 'America/Sao_Paulo' },
        end: { dateTime: new Date(Date.now() + 3600000).toISOString(), timeZone: 'America/Sao_Paulo' }
      }),
    });
    console.log(gCalRes.status, await gCalRes.text());
  }
}
test().then(() => process.exit(0)).catch(console.error);
