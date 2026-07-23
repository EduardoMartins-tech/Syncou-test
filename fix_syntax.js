import fs from 'fs';
const file = 'src/pages/DashboardHome.tsx';
let code = fs.readFileSync(file, 'utf8');

const regex = /vibrate: \[200, 100, 200\] } as any\s+}\);/g;
code = code.replace(regex, "vibrate: [200, 100, 200]\n                      } as any);");
fs.writeFileSync(file, code);
