import fs from 'fs';

const serverFile = 'server.ts';
let code = fs.readFileSync(serverFile, 'utf8');

const regex = /(if \(!gCalRes\.ok\) \{\s*console\.error\('Failed to create GCal event:', await gCalRes\.text\(\)\);\s*\} else \{\s*console\.log\('GCal event created successfully\.'\);\s*\})/g;

const replacement = `if (!gCalRes.ok) {
           console.error('Failed to create GCal event:', await gCalRes.text());
        } else {
           const gCalData = await gCalRes.json();
           if (gCalData.id) {
              await pool.query('UPDATE appointments SET google_event_id = $1 WHERE id = $2', [gCalData.id, id]);
           }
           console.log('GCal event created successfully.');
        }`;

if (regex.test(code)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync(serverFile, code);
    console.log("Successfully updated book branch.");
} else {
    console.log("Could not find the book branch regex.");
}
