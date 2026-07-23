import fs from 'fs';
let code = fs.readFileSync('tsconfig.json', 'utf8');
const parsed = JSON.parse(code);
if (!parsed.compilerOptions.types) {
  parsed.compilerOptions.types = [];
}
if (!parsed.compilerOptions.types.includes('vite-plugin-pwa/client')) {
  parsed.compilerOptions.types.push('vite-plugin-pwa/client');
}
fs.writeFileSync('tsconfig.json', JSON.stringify(parsed, null, 2));
