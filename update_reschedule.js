import fs from 'fs';

const serverFile = 'server.ts';
let code = fs.readFileSync(serverFile, 'utf8');

const regex = /(await pool\.query\(\s*'UPDATE appointments SET status = COALESCE\(\$1, status\), cancel_reason = COALESCE\(\$2, cancel_reason\), start_at = \$3, end_at = \$4 WHERE id = \$5 AND provider_id = \$6',\s*\[status \|\| null, cancelReason \?\? null, startAt, endAt, req\.params\.id, req\.user\.id\]\s*\);)/g;

const replacement = `$1
         
         // Update in Google Calendar if rescheduled
         try {
             const aptRes = await pool.query('SELECT google_event_id, client_name, client_email, client_whatsapp, services FROM appointments WHERE id = $1 AND provider_id = $2', [req.params.id, req.user.id]);
             const googleEventId = aptRes.rows[0]?.google_event_id;
             if (googleEventId) {
                const providerRes = await pool.query('SELECT google_access_token FROM users WHERE id = $1', [req.user.id]);
                const googleAccessToken = providerRes.rows[0]?.google_access_token;
                if (googleAccessToken) {
                   
                   // Fetch event to update it via PATCH, or just send a PATCH request with start and end
                   const patchEvent = {
                      start: { dateTime: new Date(Number(startAt)).toISOString() },
                      end: { dateTime: new Date(Number(endAt)).toISOString() }
                   };
                   
                   const gCalRes = await fetch(\`https://www.googleapis.com/calendar/v3/calendars/primary/events/\${googleEventId}\`, {
                      method: 'PATCH',
                      headers: {
                         'Authorization': \`Bearer \${googleAccessToken}\`,
                         'Content-Type': 'application/json'
                      },
                      body: JSON.stringify(patchEvent)
                   });
                   if (!gCalRes.ok) {
                      console.error('Failed to update GCal event:', await gCalRes.text());
                   } else {
                      console.log('GCal event updated successfully.');
                   }
                }
             }
         } catch (e) {
             console.error("Error updating GCal:", e);
         }`;

if (regex.test(code)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync(serverFile, code);
    console.log("Successfully updated reschedule branch.");
} else {
    console.log("Could not find the reschedule branch regex.");
}
