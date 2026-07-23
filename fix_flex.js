import fs from 'fs';
const file = 'src/pages/DashboardHome.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/<div className="flex items-center justify-between">/, '<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">');
code = code.replace(/<div className="flex gap-2">/, '<div className="flex flex-wrap gap-2 w-full sm:w-auto">');

fs.writeFileSync(file, code);
