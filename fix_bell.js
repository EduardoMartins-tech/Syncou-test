import fs from 'fs';
const file = 'src/pages/DashboardHome.tsx';
let code = fs.readFileSync(file, 'utf8');

// Add Bell to imports
code = code.replace(/Download } from 'lucide-react';/, "Download, Bell } from 'lucide-react';");

// Add state
const stateInsert = `  const [filterName, setFilterName] = useState<string>('');\n  const [notificationPerm, setNotificationPerm] = useState<string>(Notification.permission);`;
code = code.replace(/  const \[filterName, setFilterName\] = useState<string>\(''\);/, stateInsert);

// Add button
const buttonInsert = `               <div className="flex gap-2">
                 {notificationPerm !== 'granted' && (
                   <Button onClick={() => Notification.requestPermission().then(p => setNotificationPerm(p))} variant="outline" className="border-amber-500/50 text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 h-9 px-3 shrink-0">
                     <Bell className="w-4 h-4 sm:mr-2" />
                     <span className="hidden sm:inline">Ativar Notificações</span>
                   </Button>
                 )}`;
code = code.replace(/               <div className="flex gap-2">/, buttonInsert);

fs.writeFileSync(file, code);
