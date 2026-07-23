import fs from 'fs';
const file = 'src/pages/DashboardHome.tsx';
let code = fs.readFileSync(file, 'utf8');

const oldButton = `<Button onClick={() => Notification.requestPermission().then(p => setNotificationPerm(p))} variant="outline" className="border-amber-500/50 text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 h-9 px-3 shrink-0">
                     <Bell className="w-4 h-4 sm:mr-2" />
                     <span className="hidden sm:inline">Ativar Notificações</span>
                   </Button>`;

const newButton = `<Button 
                     onClick={async () => {
                       if (!('Notification' in window)) {
                         notifyError('Navegador não suporta notificações.');
                         return;
                       }
                       if (Notification.permission === 'denied') {
                         notifyError('Notificações bloqueadas. Libere nas permissões do site/navegador para receber alertas.');
                         return;
                       }
                       const p = await Notification.requestPermission();
                       setNotificationPerm(p);
                       if (p === 'granted') notifySuccess('Notificações ativadas!');
                     }} 
                     variant="outline" 
                     className="border-amber-500/50 text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 h-9 px-3 shrink-0"
                   >
                     <Bell className="w-4 h-4 mr-2" />
                     <span>Ativar Notificações</span>
                   </Button>`;

code = code.replace(oldButton, newButton);
fs.writeFileSync(file, code);
console.log("Button updated.");
