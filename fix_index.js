import fs from 'fs';
let code = fs.readFileSync('index.html', 'utf8');
code = code.replace(/href="\/logo-syncou.png"/g, 'href="/pwa-192x192.png"');
fs.writeFileSync('index.html', code);
