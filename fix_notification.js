import fs from 'fs';
const file = 'src/pages/DashboardHome.tsx';
let code = fs.readFileSync(file, 'utf8');

const oldNotif = `              // Play sound
              const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
              audio.play().catch(e => console.log('Audio error:', e));

              // Show native notification if allowed
              if (Notification.permission === 'granted') {
                newAppointments.forEach((apt: Appointment) => {
                   new Notification('Novo agendamento recebido!', {
                     body: \`\${apt.clientName} agendou um novo horário.\`,
                     icon: '/favicon.ico'
                   });
                });
              } else {
                newAppointments.forEach((apt: Appointment) => {
                   notifySuccess(\`Novo agendamento de \${apt.clientName}!\`);
                });
              }`;

const newNotif = `              // Play sound
              const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
              audio.play().catch(e => console.log('Audio error:', e));

              // Show native notification if allowed
              if (Notification.permission === 'granted') {
                newAppointments.forEach((apt: Appointment) => {
                  if ('serviceWorker' in navigator) {
                    navigator.serviceWorker.ready.then(registration => {
                      registration.showNotification('Novo agendamento recebido!', {
                        body: \`\${apt.clientName} agendou um novo horário.\`,
                        icon: '/logo-syncou.png',
                        vibrate: [200, 100, 200]
                      });
                    }).catch(err => {
                       new Notification('Novo agendamento recebido!', {
                         body: \`\${apt.clientName} agendou um novo horário.\`,
                         icon: '/logo-syncou.png'
                       });
                    });
                  } else {
                     new Notification('Novo agendamento recebido!', {
                       body: \`\${apt.clientName} agendou um novo horário.\`,
                       icon: '/logo-syncou.png'
                     });
                  }
                });
              } else {
                newAppointments.forEach((apt: Appointment) => {
                   notifySuccess(\`Novo agendamento de \${apt.clientName}!\`);
                });
              }`;

if (code.includes(oldNotif)) {
  code = code.replace(oldNotif, newNotif);
  fs.writeFileSync(file, code);
  console.log("Notification logic updated.");
} else {
  console.log("oldNotif not found");
}
