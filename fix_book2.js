import fs from 'fs';

const serverFile = 'server.ts';
let code = fs.readFileSync(serverFile, 'utf8');

const badStr = `if (gCalData.id) {
              await pool.query('UPDATE appointments SET google_event_id = if (!gCalRes.ok) {
           console.error('Failed to create GCal event:', await gCalRes.text());
        } else {
           console.log('GCal event created successfully.');
        } WHERE id = $2', [gCalData.id, id]);
           }`;

const goodStr = `if (gCalData.id) {
              await pool.query('UPDATE appointments SET google_event_id = $1 WHERE id = $2', [gCalData.id, id]);
           }`;

code = code.replace(badStr, goodStr);
fs.writeFileSync(serverFile, code);
