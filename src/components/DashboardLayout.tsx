import { useEffect, useState } from 'react';
import { Outlet, useNavigate, Link, useLocation, Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LogOut, Settings, LayoutDashboard, Calendar, Bell } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Logo } from './Logo';
import { useAuth } from '../contexts/AuthContext';

export function DashboardLayout() {
  const { currentUser, loading, logout } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B0914] text-[#E2D9F3]">
        <div className="animate-pulse flex flex-col items-center">
          <Logo className="w-16 h-16 text-violet-400 drop-shadow-[0_0_15px_rgba(139,92,246,0.5)] mb-4" />
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/" />;
  }

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Calendário', path: '/dashboard/calendar', icon: Calendar },
    { name: 'Minha Página', path: '/dashboard/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#0B0914] text-[#E2D9F3] font-sans flex flex-col md:flex-row selection:bg-violet-500/30">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-[#130E20]/80 backdrop-blur-xl border-r border-[#2D214F] flex flex-col hidden md:flex h-screen sticky top-0">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-10">
            <Logo className="w-8 h-8 text-violet-400 drop-shadow-[0_0_12px_rgba(139,92,246,0.3)]" />
            <span className="font-semibold text-xl tracking-tight text-white">Syncou</span>
          </div>
          
          <nav className="space-y-1.5 flex-1">
            {navItems.map((item) => (
              <Link key={item.path} to={item.path}>
                <Button 
                  variant="ghost" 
                  className={`w-full justify-start text-[#9B8FC0] hover:text-white hover:bg-[#2D214F]/50 font-medium h-10 ${location.pathname === item.path ? 'bg-[#2D214F] text-white shadow-sm' : ''}`}
                >
                  <item.icon className="mr-3 w-4 h-4" strokeWidth={2} />
                  {item.name}
                </Button>
              </Link>
            ))}
          </nav>
        </div>
        
        <div className="mt-auto p-6 border-t border-[#2D214F]">
          <div className="flex items-center gap-3 mb-6">
            <Avatar className="w-10 h-10 ring-1 ring-[#2D214F] shadow-sm">
              <AvatarImage src={currentUser?.avatarUrl || ''} />
              <AvatarFallback className="bg-[#1A1333] text-white font-medium">{currentUser?.displayName?.charAt(0) || 'U'}</AvatarFallback>
            </Avatar>
            <div className="overflow-hidden">
              <p className="font-medium text-sm text-white truncate">{currentUser?.displayName}</p>
              <p className="text-xs text-[#9B8FC0] truncate">{currentUser?.email}</p>
            </div>
          </div>
          <Button variant="ghost" className="w-full justify-start text-[#9B8FC0] hover:text-red-400 hover:bg-red-500/10 font-medium h-10" onClick={logout}>
            <LogOut className="mr-3 w-4 h-4" strokeWidth={2} />
            Sair
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-x-hidden p-6 md:p-10 flex flex-col min-h-screen">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between bg-[#130E20] border-b border-[#2D214F] p-4 -m-6 md:-m-10 mb-6 sticky top-0 z-10 shadow-sm">
          <div className="flex items-center gap-2">
            <Logo className="w-8 h-8 text-violet-400" />
            <span className="font-semibold text-xl tracking-tight text-white">Syncou</span>
          </div>
          <div className="flex gap-4">
             {navItems.map(item => (
                <Link key={item.path} to={item.path} className="text-[#9B8FC0] hover:text-white" title={item.name}>
                  <item.icon className="w-5 h-5" strokeWidth={2} />
                </Link>
             ))}
             <button onClick={logout} className="text-[#9B8FC0] hover:text-red-400" title="Sair">
               <LogOut className="w-5 h-5" strokeWidth={2} />
             </button>
          </div>
        </header>

        <div className="max-w-5xl mx-auto w-full flex-1">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
