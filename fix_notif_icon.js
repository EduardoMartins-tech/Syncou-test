import fs from 'fs';
const file = 'src/pages/DashboardHome.tsx';
let code = fs.readFileSync(file, 'utf8');
code = code.replace(/icon: '\/logo-syncou.png'/g, "icon: '/pwa-192x192.png'");
fs.writeFileSync(file, code);
