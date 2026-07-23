import fs from 'fs';

const serverFile = 'server.ts';
let code = fs.readFileSync(serverFile, 'utf8');

const regex = /app\.put\('\/api\/appointments\/:id', authenticateToken, async \(req: any, res\) => \{[\s\S]*?\}\);/m;

const correctCode = `app.put('/api/appointments/:id', authenticateToken, async (req: any, res) => {
   try {
      const { status, cancelReason, startAt, endAt } = req.body;
      
      if (startAt && endAt) {
         // Validate working hours
         const providerUser = await pool.query('SELECT working_hours_start as "workingHoursStart", working_hours_end as "workingHoursEnd", working_days as "workingDays", work_on_holidays as "workOnHolidays", schedule_overrides as "scheduleOverrides" FROM users WHERE id = $1', [req.user.id]);
         if (providerUser.rows.length > 0) {
           const providerRow = providerUser.rows[0];
           
           try {
             if (providerRow.scheduleOverrides) {
               providerRow.scheduleOverrides = JSON.parse(providerRow.scheduleOverrides);
             }
           } catch(e) {}
       
           let workingStart = providerRow.workingHoursStart || "09:00";
           let workingEnd = providerRow.workingHoursEnd || "18:00";
           let isClosed = false;
       
           const startDateObj = new Date(Number(startAt));
           const pad = (n) => n.toString().padStart(2, '0');
           const dateKey = \`\${startDateObj.getFullYear()}-\${pad(startDateObj.getMonth() + 1)}-\${pad(startDateObj.getDate())}\`;
       
           // National holidays logic (Brazil)
           const holidays = [
             '01-01', '04-21', '05-01', '09-07', '10-12', '11-02', '11-15', '12-25'
           ];
           const monthDay = \`\${pad(startDateObj.getMonth() + 1)}-\${pad(startDateObj.getDate())}\`;
           
           if (holidays.includes(monthDay) && !providerRow.workOnHolidays) {
              isClosed = true;
           }

           if (providerRow.scheduleOverrides && providerRow.scheduleOverrides[dateKey]) {
             const override = providerRow.scheduleOverrides[dateKey];
             if (override.isClosed) {
               isClosed = true;
             } else {
               workingStart = override.start;
               workingEnd = override.end;
             }
           }
       
           if (isClosed) {
             return res.status(400).json({ error: 'Você não está disponível (fechado/folga) nesta data.' });
           }
       
           const [endHour, endMin] = workingEnd.split(':').map(Number);
           const endOfShift = new Date(Number(startAt));
           endOfShift.setHours(endHour, endMin, 0, 0);
       
           if (Number(endAt) > endOfShift.getTime()) {
             return res.status(400).json({ error: 'O agendamento excede seu horário de trabalho.' });
           }
         }

         // Check for overlapping appointments
         const overlapCheck = await pool.query(
           \`SELECT id FROM appointments 
            WHERE provider_id = $1 
            AND id != $2
            AND status NOT IN ('cancelled', 'Cancelado')
            AND start_at < $3 
            AND end_at > $4\`,
           [req.user.id, req.params.id, Number(endAt), Number(startAt)]
         );
     
         if (overlapCheck.rows.length > 0) {
           return res.status(400).json({ error: 'Conflito de agenda: Você já possui outro compromisso neste horário.' });
         }

         // Reschedule scenario
         await pool.query(
           'UPDATE appointments SET status = COALESCE($1, status), cancel_reason = COALESCE($2, cancel_reason), start_at = $3, end_at = $4 WHERE id = $5 AND provider_id = $6',
           [status || null, cancelReason ?? null, startAt, endAt, req.params.id, req.user.id]
         );
         
         // Update in Google Calendar if rescheduled
         try {
             const aptRes = await pool.query('SELECT google_event_id, client_name, client_email, client_whatsapp, services FROM appointments WHERE id = $1 AND provider_id = $2', [req.params.id, req.user.id]);
             const googleEventId = aptRes.rows[0]?.google_event_id;
             if (googleEventId) {
                const providerRes = await pool.query('SELECT google_access_token FROM users WHERE id = $1', [req.user.id]);
                const googleAccessToken = providerRes.rows[0]?.google_access_token;
                if (googleAccessToken) {
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
         }
      } else {
         await pool.query(
           'UPDATE appointments SET status = $1, cancel_reason = COALESCE($2, cancel_reason) WHERE id = $3 AND provider_id = $4',
           [status, cancelReason ?? null, req.params.id, req.user.id]
         );
         
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
                         await pool.query('UPDATE appointments SET google_event_id = NULL WHERE id = $1', [req.params.id]);
                      }
                   }
                }
             } catch (e) {
                console.error("Error deleting from GCal:", e);
             }
         }
      }
      res.json({ success: true });
   } catch (err: any) {
      res.status(500).json({ error: err.message });
   }
});`;

code = code.replace(regex, correctCode);
fs.writeFileSync(serverFile, code);
