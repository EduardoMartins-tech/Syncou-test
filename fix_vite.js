import fs from 'fs';
let code = fs.readFileSync('vite.config.ts', 'utf8');
code = code.replace(/src: '\/pwa-192x192.png',\s*sizes: '512x512'/g, "src: '/pwa-512x512.png',\n              sizes: '512x512'");
fs.writeFileSync('vite.config.ts', code);
