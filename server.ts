import express from 'express';
import path from 'path';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';

let transporter: nodemailer.Transporter | null = null;
async function setupEmail() {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    console.log('Using configured SMTP for emails.');
  } else {
    // Ethereal email for testing/sandbox
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    console.log('Using Ethereal Email for testing (check console for preview URLs).');
  }
}
setupEmail().catch(console.error);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'syncou-super-secret-key-has-to-be-secure-1234';

app.use(cors());
app.use(express.json({ limit: '5mb' }));

// Initialize PostgreSQL
const isDev = process.env.NODE_ENV !== 'production';

// Safely configure pg pool
const dbUrl = process.env.DATABASE_URL || '';
const poolConfig: any = {};

if (process.env.PGHOST && process.env.PGPASSWORD) {
  console.log("Usando variáveis separadas PGHOST, PGUSER, etc.");
  poolConfig.host = process.env.PGHOST;
  poolConfig.port = process.env.PGPORT ? parseInt(process.env.PGPORT) : 5432;
  poolConfig.user = process.env.PGUSER;
  poolConfig.password = process.env.PGPASSWORD;
  poolConfig.database = process.env.PGDATABASE;
  
  if (!process.env.PGHOST.includes('railway.internal') && !process.env.PGHOST.includes('localhost')) {
    poolConfig.ssl = { rejectUnauthorized: false };
  }
} else if (dbUrl) {
  poolConfig.connectionString = dbUrl;
  if (!dbUrl.includes('localhost') && !dbUrl.includes('railway.internal')) {
    poolConfig.ssl = { rejectUnauthorized: false };
  }
}

const pool = new Pool(poolConfig);

// Basic sanity check
if (!dbUrl && !process.env.PGHOST) {
  console.warn("⚠️ AVISO CRÍTICO: Nenhuma variável de banco de dados configurada!");
} else if (dbUrl) {
  const maskedUrl = dbUrl.replace(/:([^:@]+)@/, ':***@');
  console.log(`Configuração detectada. Tentando conectar... ${maskedUrl.includes('railway') ? '(Rede do Railway)' : ''}`);
}

async function runMigrations() {
  let client;
  try {
    console.log("Iniciando verificação do banco de dados (migrations)...");
    client = await pool.connect(); // Test connection explicitly
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        slug VARCHAR(255) UNIQUE,
        display_name VARCHAR(255),
        avatar_url TEXT,
        bio TEXT,
        working_hours_start VARCHAR(50),
        working_hours_end VARCHAR(50),
        working_days TEXT,
        whatsapp VARCHAR(50),
        schedule_overrides TEXT,
        google_access_token TEXT,
        role VARCHAR(50) DEFAULT 'provider',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      -- Alter table explicitly in case it already exists but without the new column
      ALTER TABLE users ADD COLUMN IF NOT EXISTS google_access_token TEXT;

      CREATE TABLE IF NOT EXISTS services (
        id VARCHAR(255) PRIMARY KEY,
        provider_id VARCHAR(255) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        duration INTEGER NOT NULL,
        buffer_time INTEGER DEFAULT 0,
        price REAL NOT NULL,
        active INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (provider_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS appointments (
        id VARCHAR(255) PRIMARY KEY,
        provider_id VARCHAR(255) NOT NULL,
        client_name VARCHAR(255) NOT NULL,
        client_whatsapp VARCHAR(50),
        client_phone VARCHAR(50),
        client_email VARCHAR(255),
        services TEXT NOT NULL,
        total_price REAL,
        total_duration INTEGER,
        buffer_time INTEGER,
        booking_source VARCHAR(50),
        status VARCHAR(50) DEFAULT 'Pendente',
        cancel_reason TEXT,
        start_at BIGINT NOT NULL,
        end_at BIGINT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (provider_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS otp_codes (
        email VARCHAR(255) PRIMARY KEY,
        code VARCHAR(10) NOT NULL,
        expires_at TIMESTAMP NOT NULL
      );
    `);
    console.log("Banco de dados sincronizado e tabelas verificadas com sucesso! (PostgreSQL)");
  } catch (err: any) {
    console.error("================ ERRO CRÍTICO NO BANCO DE DADOS ================");
    console.error("Falha ao rodar migrations. Isso geralmente significa que a DATABASE_URL");
    console.error("está incorreta ou o banco de dados não está acessível.");
    console.error("Erro original:", err.message);
    console.error("=================================================================");
  } finally {
    if (client) {
      client.release();
    }
  }
}
runMigrations();

// Auth Middleware
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

function generateId() {
  return Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
}

// ====== API ROUTES ====== //

app.post('/api/auth/send-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'E-mail obrigatório.' });

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Este e-mail já está em uso.' });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await pool.query(
      `INSERT INTO otp_codes (email, code, expires_at) VALUES ($1, $2, $3)
       ON CONFLICT (email) DO UPDATE SET code = EXCLUDED.code, expires_at = EXCLUDED.expires_at`,
      [email, code, expiresAt]
    );

    if (transporter) {
      const info = await transporter.sendMail({
        from: '"Syncou" <noreply@syncou.app>',
        to: email,
        subject: 'Seu código de verificação Syncou',
        text: `Seu código de verificação é: ${code}. Ele expira em 10 minutos.`,
        html: `<b>Seu código de verificação é: ${code}</b><br>Ele expira em 10 minutos.`
      });
      console.log('Message sent: %s', info.messageId);
      const testMessageUrl = nodemailer.getTestMessageUrl(info);
      if (testMessageUrl) {
        console.log('Preview URL: %s', testMessageUrl);
      }
    }

    // Always log the code for testing purposes in the console
    console.log(`[TESTING] Email OTP for ${email}: ${code}`);

    res.json({ success: true, message: 'Código enviado com sucesso.' });
  } catch (error: any) {
    console.error('Error sending OTP:', error);
    res.status(500).json({ error: 'Falha ao enviar o código de verificação.' });
  }
});

app.post('/api/auth/google', async (req, res) => {
  try {
    const { email, displayName } = req.body;
    if (!email) return res.status(400).json({ error: 'Email não encontrado' });
    
    // Check if user exists
    const existing = await pool.query('SELECT id, email FROM users WHERE email = $1', [email]);
    let id;
    if (existing.rows.length > 0) {
      id = existing.rows[0].id;
    } else {
      id = generateId();
      const workingDays = JSON.stringify(['1','2','3','4','5']);
      const dpName = displayName || email.split('@')[0];
      const placeholderHash = await bcrypt.hash(generateId(), 10); // Random impossible password
      await pool.query(
        'INSERT INTO users (id, email, password_hash, display_name, role, working_days, working_hours_start, working_hours_end) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [id, email, placeholderHash, dpName, 'provider', workingDays, '09:00', '18:00']
      );
    }
    
    // Generate JWT
    const token = jwt.sign({ id, email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id, email } });
  } catch (error: any) {
    console.error('Google auth error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, code } = req.body;
    if (!email || !password || !code) return res.status(400).json({ error: 'Dados incompletos. Informe email, código e senha.' });

    const otpResult = await pool.query('SELECT code, expires_at FROM otp_codes WHERE email = $1', [email]);
    if (otpResult.rows.length === 0) {
      return res.status(400).json({ error: 'Código não encontrado ou e-mail inválido.' });
    }

    const otpRecord = otpResult.rows[0];
    if (otpRecord.code !== code) {
      return res.status(400).json({ error: 'Código de verificação incorreto.' });
    }
    if (new Date() > new Date(otpRecord.expires_at)) {
      return res.status(400).json({ error: 'Código de verificação expirado.' });
    }

    const hash = await bcrypt.hash(password, 10);
    const id = generateId();
    
    const workingDays = JSON.stringify(['1','2','3','4','5']);
    
    await pool.query(
      'INSERT INTO users (id, email, password_hash, display_name, role, working_days, working_hours_start, working_hours_end) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [id, email, hash, email.split('@')[0], 'provider', workingDays, '09:00', '18:00']
    );

    // Delete the used code
    await pool.query('DELETE FROM otp_codes WHERE email = $1', [email]);
    
    const token = jwt.sign({ id, email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id, email } });
  } catch (error: any) {
    if (error.code === '23505') { // Postgres unique constraint violation
      return res.status(400).json({ error: 'Email já cadastrado.' });
    }
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await pool.query('SELECT id, email, password_hash FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    
    if (!user) return res.status(400).json({ error: 'Usuário não encontrado.' });
    
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(400).json({ error: 'Senha incorreta.' });
    
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, email: user.email } });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/users/me', authenticateToken, async (req: any, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, slug, display_name as "displayName", avatar_url as "avatarUrl", bio, working_hours_start as "workingHoursStart", working_hours_end as "workingHoursEnd", working_days as "workingDays", whatsapp, schedule_overrides as "scheduleOverrides", google_access_token as "googleAccessToken", role FROM users WHERE id = $1',
      [req.user.id]
    );
    const user = result.rows[0];
    if (!user) return res.sendStatus(404);
    
    if (user.workingDays) {
      try { user.workingDays = JSON.parse(user.workingDays); } catch(e) {}
    }
    if (user.scheduleOverrides) {
      try { user.scheduleOverrides = JSON.parse(user.scheduleOverrides); } catch(e) {}
    }
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/users/google-token', authenticateToken, async (req: any, res: any) => {
  try {
    const { token } = req.body;
    await pool.query(
      'UPDATE users SET google_access_token = $1 WHERE id = $2',
      [token, req.user.id]
    );
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/users/me', authenticateToken, async (req: any, res: any) => {
  try {
    const data = req.body;
    const id = req.user.id;
    console.log("PUT /api/users/me req.body:", data);
    
    if (data.slug) {
      const existing = await pool.query('SELECT id FROM users WHERE slug = $1 AND id != $2', [data.slug, id]);
      if (existing.rows.length > 0) {
        return res.status(400).json({ error: 'Este link já está em uso.' });
      }
    }
    
    // Carefully handle workingDays (must stringify even if empty array)
    let workingDaysStr = null;
    if (data.workingDays !== undefined && data.workingDays !== null) {
       workingDaysStr = typeof data.workingDays === 'string' ? data.workingDays : JSON.stringify(data.workingDays);
    }
    
    // Convert scheduleOverrides to a string if it's an object
    let scheduleOverridesStr = null;
    if (data.scheduleOverrides !== undefined && data.scheduleOverrides !== null) {
       scheduleOverridesStr = typeof data.scheduleOverrides === 'string' ? data.scheduleOverrides : JSON.stringify(data.scheduleOverrides);
    }
    
    await pool.query(`
      UPDATE users SET 
        slug = COALESCE($1, slug),
        display_name = COALESCE($2, display_name),
        bio = COALESCE($3, bio),
        working_hours_start = COALESCE($4, working_hours_start),
        working_hours_end = COALESCE($5, working_hours_end),
        working_days = COALESCE($6, working_days),
        whatsapp = COALESCE($7, whatsapp),
        schedule_overrides = COALESCE($8, schedule_overrides),
        avatar_url = COALESCE($9, avatar_url)
      WHERE id = $10
    `, [
      data.slug ?? null, 
      data.displayName ?? null, 
      data.bio ?? null, 
      data.workingHoursStart ?? null, 
      data.workingHoursEnd ?? null, 
      workingDaysStr, 
      data.whatsapp ?? null, 
      scheduleOverridesStr,
      data.avatarUrl ?? null,
      id
    ]);
    
    res.json({ success: true });
  } catch (error: any) {
    console.error("Erro interno no PUT /api/users/me:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/services', authenticateToken, async (req: any, res) => {
  try {
    const result = await pool.query(
      'SELECT id, title as name, title, description, duration, buffer_time as "bufferTime", price, active FROM services WHERE provider_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(result.rows.map(r => ({...r, active: Boolean(r.active)})));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/services', authenticateToken, async (req: any, res) => {
  try {
    const { title, description, duration, bufferTime, price, active } = req.body;
    const id = generateId();
    await pool.query(
      'INSERT INTO services (id, provider_id, title, description, duration, buffer_time, price, active) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [id, req.user.id, title, description, duration, bufferTime || 0, price || 0, active ? 1 : 0]
    );
    res.json({ id, name: title, title, description, duration, bufferTime, price, active });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/services/:id', authenticateToken, async (req: any, res) => {
  try {
    await pool.query('DELETE FROM services WHERE id = $1 AND provider_id = $2', [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/appointments', authenticateToken, async (req: any, res) => {
   try {
     const result = await pool.query(
       'SELECT id, client_name as "clientName", client_whatsapp as "clientWhatsApp", client_phone as "clientPhone", client_email as "clientEmail", services, total_price as "totalPrice", total_duration as "totalDuration", booking_source as "bookingSource", status, cancel_reason as "cancelReason", start_at as "startAt", end_at as "endAt" FROM appointments WHERE provider_id = $1 ORDER BY start_at ASC',
       [req.user.id]
     );
     res.json(result.rows.map(r => ({
        ...r,
        startAt: Number(r.startAt),
        endAt: Number(r.endAt),
        services: JSON.parse(r.services || '[]')
     })));
   } catch (error: any) {
     res.status(500).json({ error: error.message });
   }
});

app.put('/api/appointments/:id', authenticateToken, async (req: any, res) => {
   try {
      const { status, cancelReason, startAt, endAt } = req.body;
      
      if (startAt && endAt) {
         // Reschedule scenario (could also include status change if we want)
         await pool.query(
           'UPDATE appointments SET status = COALESCE($1, status), cancel_reason = COALESCE($2, cancel_reason), start_at = $3, end_at = $4 WHERE id = $5 AND provider_id = $6',
           [status || null, cancelReason ?? null, startAt, endAt, req.params.id, req.user.id]
         );
      } else {
         await pool.query(
           'UPDATE appointments SET status = $1, cancel_reason = COALESCE($2, cancel_reason) WHERE id = $3 AND provider_id = $4',
           [status, cancelReason ?? null, req.params.id, req.user.id]
         );
      }
      res.json({ success: true });
   } catch (err: any) {
      res.status(500).json({ error: err.message });
   }
});

// Public Provider Data
app.get('/api/provider/:slug', async (req, res) => {
  try {
    const resultUser = await pool.query(
      'SELECT id, slug, display_name as "displayName", avatar_url as "avatarUrl", bio, working_hours_start as "workingHoursStart", working_hours_end as "workingHoursEnd", working_days as "workingDays", whatsapp, schedule_overrides as "scheduleOverrides" FROM users WHERE slug = $1',
      [req.params.slug]
    );
    const user = resultUser.rows[0];
    if (!user) return res.status(404).json({ error: 'Provider not found' });
    
    if (user.workingDays) {
      try { user.workingDays = JSON.parse(user.workingDays); } catch(e) {}
    }
    if (user.scheduleOverrides) {
      try { user.scheduleOverrides = JSON.parse(user.scheduleOverrides); } catch(e) {}
    }
    
    const resultServices = await pool.query(
      'SELECT id, title as name, title, description, duration, buffer_time as "bufferTime", price, active FROM services WHERE provider_id = $1 AND active = 1 ORDER BY created_at DESC',
      [user.id]
    );
    const services = resultServices.rows.map(r => ({...r, active: Boolean(r.active)}));
    
    res.json({ user, services });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/provider/:slug/appointments', async (req, res) => {
   try {
     const resultUser = await pool.query('SELECT id FROM users WHERE slug = $1', [req.params.slug]);
     const user = resultUser.rows[0];
     if (!user) return res.json([]);
     
     const { startAt, endAt } = req.query;
     if (!startAt || !endAt) return res.json([]);

     const resultApts = await pool.query(
       'SELECT start_at as "startAt", end_at as "endAt", status FROM appointments WHERE provider_id = $1 AND start_at >= $2 AND start_at <= $3 AND status NOT IN ($4, $5)',
       [user.id, Number(startAt), Number(endAt), 'cancelled', 'Cancelado']
     );
     
     res.json(resultApts.rows.map(r => ({ ...r, startAt: Number(r.startAt), endAt: Number(r.endAt) })));
   } catch (error: any) {
     res.status(500).json({ error: error.message });
   }
});

app.post('/api/provider/:slug/book', async (req, res) => {
  try {
    const { providerId, clientName, clientWhatsApp, clientPhone, clientEmail, services, totalPrice, totalDuration, bufferTime, bookingSource, status, startAt, endAt } = req.body;
    const id = generateId();
    
    await pool.query(
      'INSERT INTO appointments (id, provider_id, client_name, client_whatsapp, client_phone, client_email, services, total_price, total_duration, buffer_time, booking_source, status, start_at, end_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)',
      [id, providerId, clientName, clientWhatsApp, clientPhone, clientEmail, JSON.stringify(services || []), totalPrice, totalDuration, bufferTime || 0, bookingSource, status || 'Pendente', startAt, endAt]
    );

    // Sync to Google Calendar if provider has connected it
    try {
      const providerRes = await pool.query('SELECT google_access_token FROM users WHERE id = $1', [providerId]);
      const googleAccessToken = providerRes.rows[0]?.google_access_token;
      if (googleAccessToken) {
        const event = {
          summary: `Agendamento: ${clientName}`,
          description: `Cliente: ${clientName}\nEmail: ${clientEmail || 'N/A'}\nWhatsApp: ${clientWhatsApp || 'N/A'}\nServiços: ${(services || []).map((s: any) => s.name).join(', ')}`,
          start: {
            dateTime: new Date(Number(startAt)).toISOString(),
            timeZone: 'America/Sao_Paulo',
          },
          end: {
            dateTime: new Date(Number(endAt)).toISOString(),
            timeZone: 'America/Sao_Paulo',
          },
          attendees: clientEmail ? [{ email: clientEmail }] : [],
        };

        const gCalRes = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${googleAccessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(event),
        });

        if (!gCalRes.ok) {
           console.error('Failed to create GCal event:', await gCalRes.text());
        } else {
           console.log('GCal event created successfully.');
        }
      }
    } catch (gcalErr) {
       console.error("Error creating Google Calendar event:", gcalErr);
    }
      
    res.json({ success: true, appointmentId: id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ====== VITE INTEGRATION ====== //
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
