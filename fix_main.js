import fs from 'fs';
let code = fs.readFileSync('src/main.tsx', 'utf8');

const swCode = `
import { registerSW } from 'virtual:pwa-register';

if ('serviceWorker' in navigator) {
  registerSW({
    immediate: true,
    onRegistered(r) {
      console.log('SW Registered: ', r);
    },
    onRegisterError(error) {
      console.log('SW registration error', error);
    }
  });
}
`;

if (!code.includes('virtual:pwa-register')) {
  code = code.replace("import './index.css';", "import './index.css';\n" + swCode);
  fs.writeFileSync('src/main.tsx', code);
}
