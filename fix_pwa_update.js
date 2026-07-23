import fs from 'fs';

// 1. Update vite.config.ts
let viteCode = fs.readFileSync('vite.config.ts', 'utf8');
viteCode = viteCode.replace(/registerType:\s*'autoUpdate'/, "registerType: 'prompt'");
fs.writeFileSync('vite.config.ts', viteCode);

// 2. Update main.tsx
let mainCode = fs.readFileSync('src/main.tsx', 'utf8');
const oldSWCode = `import { registerSW } from 'virtual:pwa-register';

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
}`;

const newSWCode = `import { registerSW } from 'virtual:pwa-register';

if ('serviceWorker' in navigator) {
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      toast('Nova atualização disponível!', {
        description: 'Clique em atualizar para carregar a nova versão do aplicativo.',
        action: {
          label: 'Atualizar',
          onClick: () => {
            updateSW(true);
          }
        },
        duration: Infinity
      });
    },
    onRegistered(r) {
      console.log('SW Registered: ', r);
      // Verifica se há atualização a cada 1 hora
      if (r) {
        setInterval(() => {
          r.update();
        }, 60 * 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.log('SW registration error', error);
    }
  });
}`;

mainCode = mainCode.replace(oldSWCode, newSWCode);
fs.writeFileSync('src/main.tsx', mainCode);

console.log("PWA update logic applied.");
