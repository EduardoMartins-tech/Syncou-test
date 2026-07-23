import fs from 'fs';
const serverFile = 'server.ts';
let code = fs.readFileSync(serverFile, 'utf8');

const lines = code.split('\n');

const putEndIndex = lines.findIndex(line => line.includes(`app.put('/api/appointments/:id'`));

// We know put route ends at line 994
let publicProv = lines.findIndex(line => line.includes("app.get('/api/provider/:slug'"));

if (publicProv !== -1) {
    const before = lines.slice(0, 994);
    const after = lines.slice(publicProv - 1); // keep "// Public Provider Data"
    const newSyncAll = `app.post('/api/appointments/sync-all', authenticateToken, async (req: any, res: any) => {
   try {
      const providerRes = await pool.query('SELECT google_access_token FROM users WHERE id = $1', [req.user.id]);
      const googleAccessToken = providerRes.rows[0]?.google_access_token;
      
      if (!googleAccessToken) {
         return res.status(400).json({ error: 'Nenhum token do Google encontrado. Conecte sua conta primeiro.' });
      }

      const result = await pool.query(
        'SELECT * FROM appointments WHERE provider_id = $1 AND (status IS NULL OR status = $2 OR status = $3 OR status = $4) AND google_event_id IS NULL',
        [req.user.id, 'scheduled', 'Pendente', 'Confirmado']
      );

      let syncedCount = 0;
      let errorCount = 0;
      let lastError = null;

      for (const apt of result.rows) {
        try {
          const services = JSON.parse(apt.services || '[]');
          const event = {
            summary: \`Agendamento: \${apt.client_name}\`,
            description: \`Cliente: \${apt.client_name}\\nEmail: \${apt.client_email || 'N/A'}\\nWhatsApp: \${apt.client_whatsapp || 'N/A'}\\nServiços: \${(services || []).map((s: any) => s.name || s.title).join(', ')}\`,
            start: { dateTime: new Date(Number(apt.start_at)).toISOString() },
            end: { dateTime: new Date(Number(apt.end_at)).toISOString() },
            ...((apt.client_email && apt.client_email.includes('@')) ? { attendees: [{ email: apt.client_email }] } : {})
          };

          const gCalRes = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
            method: 'POST',
            headers: {
              'Authorization': \`Bearer \${googleAccessToken}\`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(event),
          });

          if (!gCalRes.ok) {
            const errText = await gCalRes.text();
            console.error('Failed to create GCal event for apt', apt.id, errText);
            errorCount++;
            if (errorCount === 1) {
              lastError = errText;
            }
          } else {
            const gCalData = await gCalRes.json();
            if (gCalData.id) {
               await pool.query('UPDATE appointments SET google_event_id = $1 WHERE id = $2', [gCalData.id, apt.id]);
            }
            syncedCount++;
          }
        } catch (e: any) {
          errorCount++;
          if (errorCount === 1) {
            lastError = e.message;
          }
        }
      }

      res.json({ success: true, synced: syncedCount, errors: errorCount, lastError });
   } catch (err: any) {
      res.status(500).json({ error: err.message });
   }
});`;

    const finalCode = [...before, newSyncAll, ...after].join('\n');
    fs.writeFileSync(serverFile, finalCode);
}
