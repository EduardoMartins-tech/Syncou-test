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
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-200">
        <div className="animate-pulse flex flex-col items-center">
          <Logo className="w-16 h-16 drop-shadow-[0_0_15px_rgba(147,51,234,0.5)] mb-4" />
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/" />;
  }

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Minha Página', path: '/dashboard/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-slate-900/50 backdrop-blur-xl border-r border-slate-800 flex flex-col hidden md:flex">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-8">
            <Logo className="w-8 h-8 drop-shadow-[0_0_8px_rgba(147,51,234,0.5)]" />
            <span className="font-bold text-xl tracking-tight text-white">Syncou</span>
          </div>
          
          <nav className="space-y-2 flex-1">
            {navItems.map((item) => (
              <Link key={item.path} to={item.path}>
                <Button 
                  variant="ghost" 
                  className={`w-full justify-start text-slate-300 hover:text-white hover:bg-slate-800 ${location.pathname === item.path ? 'bg-slate-800 text-white' : ''}`}
                >
                  <item.icon className="mr-3 w-5 h-5" />
                  {item.name}
                </Button>
              </Link>
            ))}
          </nav>
        </div>
        
        <div className="mt-auto p-6 border-t border-slate-800">
          <div className="flex items-center gap-3 mb-6">
            <Avatar className="w-10 h-10 border border-slate-700">
              <AvatarImage src={currentUser?.avatarUrl || ''} />
              <AvatarFallback className="bg-slate-800">{currentUser?.displayName?.charAt(0) || 'U'}</AvatarFallback>
            </Avatar>
            <div className="overflow-hidden">
              <p className="font-medium text-sm truncate">{currentUser?.displayName}</p>
              <p className="text-xs text-slate-500 truncate">{currentUser?.email}</p>
            </div>
          </div>
          <Button variant="ghost" className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-950/30" onClick={logout}>
            <LogOut className="mr-3 w-5 h-5" />
            Sair
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-x-hidden p-6 md:p-8 flex flex-col">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between bg-slate-900 border-b border-slate-800 p-4 -m-6 mb-6">
          <div className="flex items-center gap-2">
            <Logo className="w-8 h-8 drop-shadow-[0_0_8px_rgba(147,51,234,0.5)]" />
            <span className="font-bold text-xl tracking-tight">Syncou</span>
          </div>
          <div className="flex gap-4">
             {navItems.map(item => (
                <Link key={item.path} to={item.path} className="text-slate-400 hover:text-white" title={item.name}>
                  <item.icon className="w-6 h-6" />
                </Link>
             ))}
             <button onClick={logout} className="text-red-400" title="Sair">
               <LogOut className="w-6 h-6" />
             </button>
          </div>
        </header>

        <div className="max-w-6xl mx-auto w-full flex-1">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
