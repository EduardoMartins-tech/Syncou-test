import fs from 'fs';

const serverFile = 'server.ts';
let code = fs.readFileSync(serverFile, 'utf8');

const regex = /(await pool\.query\(\s*'UPDATE appointments SET status = \$1, cancel_reason = COALESCE\(\$2, cancel_reason\) WHERE id = \$3 AND provider_id = \$4',\s*\[status, cancelReason \?\? null, req\.params\.id, req\.user\.id\]\s*\);)/g;

const replacement = `$1
         
         // Delete from Google Calendar if cancelled
         if (status === 'cancelled' || status === 'Cancelado') {
             try {
                const aptRes = await pool.query('SELECT google_event_id FROM appointments WHERE id = $1 AND provider_id = $2', [req.params.id, req.user.id]);
                const googleEventId = aptRes.rows[0]?.google_event_id;
                if (googleEventId) {
                   const providerRes = await pool.query('SELECT google_access_token FROM users WHERE id = $1', [req.user.id]);
                   const googleAccessToken = providerRes.rows[0]?.google_access_token;
                   if (googleAccessToken) {
                      const gCalRes = await fetch(\`https://www.googleapis.com/calendar/v3/calendars/primary/events/\${googleEventId}\`, {
                         method: 'DELETE',
                         headers: {
                            'Authorization': \`Bearer \${googleAccessToken}\`
                         }
                      });
                      if (!gCalRes.ok) {
                         console.error('Failed to delete GCal event:', await gCalRes.text());
                      } else {
                         console.log('GCal event deleted successfully.');
                         // Clear the ID since it is deleted
                         await pool.query('UPDATE appointments SET google_event_id = NULL WHERE id = $1', [req.params.id]);
                      }
                   }
                }
             } catch (e) {
                console.error("Error deleting from GCal:", e);
             }
         }`;

if (regex.test(code)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync(serverFile, code);
    console.log("Successfully updated cancel branch.");
} else {
    console.log("Could not find the cancel branch regex.");
}
