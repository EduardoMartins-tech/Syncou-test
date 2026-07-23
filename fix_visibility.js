import fs from 'fs';
const file = 'src/pages/DashboardHome.tsx';
let code = fs.readFileSync(file, 'utf8');

const oldEffect = `  useEffect(() => {
    if (!currentUser) return;
    setCurrentSlug(currentUser.slug);
    fetchServices();
    fetchAppointments();
    
    // Poll for new appointments
    const interval = setInterval(() => {
      fetchAppointments(true);
    }, 15000);
    
    return () => clearInterval(interval);
  }, [currentUser]);`;

const newEffect = `  useEffect(() => {
    if (!currentUser) return;
    setCurrentSlug(currentUser.slug);
    fetchServices();
    fetchAppointments();
    
    // Poll for new appointments
    const interval = setInterval(() => {
      fetchAppointments(true);
    }, 15000);
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchAppointments(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentUser]);`;

if (code.includes(oldEffect)) {
  code = code.replace(oldEffect, newEffect);
  fs.writeFileSync(file, code);
  console.log("Visibility logic updated.");
} else {
  console.log("oldEffect not found");
}
