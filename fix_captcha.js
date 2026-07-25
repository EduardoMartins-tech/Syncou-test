import fs from 'fs';
const file = 'server.ts';
let code = fs.readFileSync(file, 'utf8');

const oldCaptcha = `    try {
      const recaptchaSecret = process.env.RECAPTCHA_SECRET_KEY;
      if (!recaptchaSecret) {
        console.warn('RECAPTCHA_SECRET_KEY is not defined in environment variables.');
      }
      
      const verifyRes = await fetch('https://www.google.com/recaptcha/api/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          secret: recaptchaSecret || '',
          response: captchaToken
        }).toString()
      });
      
      const verifyData = await verifyRes.json();
      if (!verifyData.success) {
        console.error('Captcha validation failed:', verifyData);
        return res.status(400).json({ error: 'Falha na verificação de segurança (Captcha inválido).' });
      }
    } catch (e) {
      console.error('Error verifying captcha:', e);
      return res.status(500).json({ error: 'Erro interno ao validar captcha.' });
    }`;

const newCaptcha = `    try {
      const recaptchaSecret = process.env.RECAPTCHA_SECRET_KEY;
      if (!recaptchaSecret) {
        console.error('CRITICAL ERROR: RECAPTCHA_SECRET_KEY is not defined. Blocking appointment creation.');
        return res.status(500).json({ error: 'Erro de configuração do servidor (Captcha ausente).' });
      }
      
      const verifyRes = await fetch('https://www.google.com/recaptcha/api/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          secret: recaptchaSecret,
          response: captchaToken
        }).toString()
      });
      
      const verifyData = await verifyRes.json();
      if (!verifyData.success) {
        console.error('Captcha validation failed:', verifyData);
        return res.status(400).json({ error: 'Falha na verificação de segurança (Captcha inválido).' });
      }
    } catch (e) {
      console.error('Error verifying captcha:', e);
      return res.status(500).json({ error: 'Erro de conectividade ao validar captcha. Tente novamente mais tarde.' });
    }`;

if (code.includes(oldCaptcha)) {
  code = code.replace(oldCaptcha, newCaptcha);
  fs.writeFileSync(file, code);
  console.log("Captcha logic updated to explicit fail-safe.");
} else {
  console.log("Old captcha logic not found.");
}
