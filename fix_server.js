import fs from 'fs';

const serverFile = 'server.ts';
let code = fs.readFileSync(serverFile, 'utf8');

// The injected block that needs to be fixed:
// await pool.query('UPDATE appointments SET status = $1, cancel_reason = COALESCE($2, cancel_reason) WHERE id = $3 AND provider_id = $4', [status, cancelReason ?? null, req.params.id, req.user.id]);
// Is everywhere instead of $1.

const badString = `await pool.query(
           'UPDATE appointments SET status = $1, cancel_reason = COALESCE($2, cancel_reason) WHERE id = $3 AND provider_id = $4',
           [status, cancelReason ?? null, req.params.id, req.user.id]
         );`;
         
const badString2 = `await pool.query(
           'UPDATE appointments SET status = COALESCE($1, status), cancel_reason = COALESCE($2, cancel_reason), start_at = $3, end_at = $4 WHERE id = $5 AND provider_id = $6',
           [status || null, cancelReason ?? null, startAt, endAt, req.params.id, req.user.id]
         );`;
         
code = code.replace(new RegExp(badString.replace(/[.*+?^$\\{\\}()|[\\]\\\\]/g, '\\$&'), 'g'), '$$1');
code = code.replace(new RegExp(badString2.replace(/[.*+?^$\\{\\}()|[\\]\\\\]/g, '\\$&'), 'g'), '$$1');

fs.writeFileSync(serverFile, code);
