import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, Plus, Clock, DollarSign, Calendar as CalendarIcon, Edit2, Trash2, MessageSquare, TrendingUp, CheckCircle, RefreshCcw, Check, CheckCircle2, XCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { syncWithGoogleCalendar } from '../lib/calendar';
import { googleSignInForCalendar } from '../lib/firebase';

interface Service {
  id: string;
  name: string;
  description: string;
  duration: number;
  bufferTime: number;
  price: number;
  active: boolean;
  title?: string;
}

interface Appointment {
  id: string;
  clientName: string;
  clientWhatsApp: string;
  clientPhone?: string;
  services: string[];
  totalPrice: number;
  totalDuration: number;
  status: string;
  startAt: number;
  endAt: number;
  date?: string;
  time?: string;
  bookingSource: string;
  cancelReason?: string;
}

export function DashboardHome() {
  const { currentUser, getAuthHeaders } = useAuth();
  // removed googleAccessToken as this is a local build now, but keeping var for stub
  const googleAccessToken = null;
  const signInWithGoogle = () => {};

  const [services, setServices] = useState<Service[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isFetchingAppointments, setIsFetchingAppointments] = useState(true);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [currentSlug, setCurrentSlug] = useState<string | null>(null);

  // Status Filter ("Todos", "Pendente", "Confirmado", "Cancelado")
  const [filterStatus, setFilterStatus] = useState<string>('Todos');
  const [filterName, setFilterName] = useState<string>('');

  // Cancel Modal
  const [cancelingApt, setCancelingApt] = useState<Appointment | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  // Reschedule Modal
  const [reschedulingApt, setReschedulingApt] = useState<Appointment | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);

  const appointmentsRef = useRef<Appointment[]>([]);

  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const fetchServices = async () => {
    try {
      const res = await fetch('/api/services', { headers: getAuthHeaders() });
      if (res.ok) setServices(await res.json());
    } catch(err) {
      console.error(err);
    }
  };

  const fetchAppointments = async (isBackground = false) => {
    try {
      const res = await fetch('/api/appointments', { headers: getAuthHeaders() });
      if (res.ok) {
         const data = await res.json();
         if (isBackground && appointmentsRef.current.length > 0) {
            const existingIds = new Set(appointmentsRef.current.map(a => a.id));
            const newAppointments = data.filter((a: Appointment) => !existingIds.has(a.id));
            
            if (newAppointments.length > 0) {
              // Play sound
              const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
              audio.play().catch(e => console.log('Audio error:', e));

              // Show native notification if allowed
              if (Notification.permission === 'granted') {
                newAppointments.forEach((apt: Appointment) => {
                   new Notification('Novo agendamento recebido!', {
                     body: `${apt.clientName} agendou um novo horário.`,
                     icon: '/favicon.ico'
                   });
                });
              } else {
                newAppointments.forEach((apt: Appointment) => {
                   toast.success(`Novo agendamento de ${apt.clientName}!`);
                });
              }
            }
         }
         setAppointments(data);
         appointmentsRef.current = data;
      }
    } catch(err) {
      console.error(err);
    } finally {
      if (!isBackground) setIsFetchingAppointments(false);
    }
  };

  useEffect(() => {
    if (!currentUser) return;
    setCurrentSlug(currentUser.slug);
    fetchServices();
    fetchAppointments();
    
    // Poll for new appointments
    const interval = setInterval(() => {
      fetchAppointments(true);
    }, 15000);
    
    return () => clearInterval(interval);
  }, [currentUser]);

  const handleSaveService = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const formData = new FormData(e.currentTarget);
    const title = formData.get('name') as string;
    const description = formData.get('description') as string;
    const duration = Number(formData.get('duration'));
    const bufferTime = Number(formData.get('bufferTime')) || 0;
    const price = Number(formData.get('price'));
    const active = formData.get('active') === 'on';

    try {
      if (editingService) {
        toast.error('Edição de serviço atual não suportada direto na api demo.');
      } else {
        const res = await fetch('/api/services', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders()
          },
          body: JSON.stringify({ title, description, duration, bufferTime, price, active })
        });
        if (res.ok) {
          toast.success('Serviço criado!');
          fetchServices();
        } else {
          toast.error('Erro ao salvar serviço');
        }
      }
      setIsServiceModalOpen(false);
      setEditingService(null);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar serviço');
    }
  };

  const handleDeleteService = async (id: string) => {
    if (!confirm('Você tem certeza?')) return;
    try {
      const res = await fetch(`/api/services/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        setServices(services.filter(s => s.id !== id));
        toast.success('Serviço removido');
      }
    } catch(err) {
      toast.error('Erro ao remover');
    }
  }

  const handleUpdateAppointmentStatus = async (id: string, status: string) => {
    try {
       const res = await fetch(`/api/appointments/${id}`, {
         method: 'PUT',
         headers: {
           'Content-Type': 'application/json',
           ...getAuthHeaders()
         },
         body: JSON.stringify({ status })
       })
       if (!res.ok) throw new Error('Failed');
       
       toast.success('Status atualizado');
       fetchAppointments();
       
       if (status === 'Confirmado') {
         const apt = appointments.find(a => a.id === id);
         if (apt) {
            const rawNumber = apt.clientPhone || apt.clientWhatsApp || '';
            let digitsOnly = rawNumber.replace(/\D/g, '');
            if ((digitsOnly.length === 10 || digitsOnly.length === 11) && !digitsOnly.startsWith('55')) {
              digitsOnly = '55' + digitsOnly;
            }
            
            const servicesText = getAptServicesText(apt.services);
            const dateObj = new Date(apt.startAt || apt.date || '');
            const formattedDate = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
            const formattedTime = dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            
            let message = `Olá {NOME}, passando para confirmar seu agendamento de {SERVICOS} no dia {DATA} às {HORA}. Te aguardo!`;
            if (currentUser?.whatsappMessageTemplate) {
               message = currentUser.whatsappMessageTemplate;
            }
            message = message
               .replace(/{NOME}/g, apt.clientName)
               .replace(/{SERVICOS}/g, servicesText)
               .replace(/{DATA}/g, formattedDate)
               .replace(/{HORA}/g, formattedTime);
            
            const url = `https://wa.me/${digitsOnly}?text=${encodeURIComponent(message)}`;
            window.open(url, '_blank', 'noopener,noreferrer');
         }
       }
       
    } catch(err) {
       toast.error('Erro ao atualizar status');
    }
  }

  const getAptServicesText = (aptServices: string[]) => {
    if (!aptServices) return 'serviços selecionados';
    const matchedNames = aptServices
      .map(id => services.find(s => s.id === id)?.name)
      .filter(Boolean);
    return matchedNames.length > 0 ? matchedNames.join(', ') : 'serviços selecionados';
  };

  const openWhatsApp = (apt: Appointment) => {
    const rawNumber = apt.clientPhone || apt.clientWhatsApp || '';
    let digitsOnly = rawNumber.replace(/\D/g, '');
    if ((digitsOnly.length === 10 || digitsOnly.length === 11) && !digitsOnly.startsWith('55')) {
      digitsOnly = '55' + digitsOnly;
    }
    
    const servicesText = getAptServicesText(apt.services);
    const dateObj = new Date(apt.startAt || apt.date || '');
    const formattedDate = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const formattedTime = dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    
    const message = `Olá ${apt.clientName}, tudo bem? Estou entrando em contato sobre o seu agendamento de ${servicesText} no dia ${formattedDate} às ${formattedTime}...`;
    const url = `https://wa.me/${digitsOnly}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleConfirmReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reschedulingApt || !rescheduleDate || !rescheduleTime) return;

    try {
      const startAtDate = new Date(`${rescheduleDate}T${rescheduleTime}:00`);
      const startAtTime = startAtDate.getTime();
      const endAtTime = startAtTime + (reschedulingApt.totalDuration * 60000);

      const res = await fetch(`/api/appointments/${reschedulingApt.id}`, {
         method: 'PUT',
         headers: {
           'Content-Type': 'application/json',
           ...getAuthHeaders()
         },
         body: JSON.stringify({ 
            status: reschedulingApt.status, // Keep current status
            startAt: startAtTime, 
            endAt: endAtTime 
         })
      });
      if (!res.ok) throw new Error('fail');
      toast.success('Agendamento remarcado com sucesso!');
      fetchAppointments();
      setIsRescheduleModalOpen(false);
      setReschedulingApt(null);

      if (confirm('Deseja avisar o cliente via WhatsApp sobre o novo horário?')) {
        const rawNumber = reschedulingApt.clientPhone || reschedulingApt.clientWhatsApp || '';
        let digitsOnly = rawNumber.replace(/\D/g, '');
        if ((digitsOnly.length === 10 || digitsOnly.length === 11) && !digitsOnly.startsWith('55')) {
          digitsOnly = '55' + digitsOnly;
        }
        const formattedDate = startAtDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const formattedTime = startAtDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        
        const message = `Olá ${reschedulingApt.clientName}! Seu agendamento foi remarcado para o dia ${formattedDate} às ${formattedTime}. Até breve!`;
        const url = `https://wa.me/${digitsOnly}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank', 'noopener,noreferrer');
      }

    } catch (err) {
      console.error(err);
      toast.error('Erro ao remarcar o agendamento.');
    }
  };

  const handleConfirmCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelingApt) return;
    try {
      const res = await fetch(`/api/appointments/${cancelingApt.id}`, {
         method: 'PUT',
         headers: {
           'Content-Type': 'application/json',
           ...getAuthHeaders()
         },
         body: JSON.stringify({ status: 'Cancelado', cancelReason })
      })
      if (!res.ok) throw new Error('fail');
      toast.success('Agendamento cancelado com sucesso!');
      fetchAppointments();
      setIsCancelModalOpen(false);
      setCancelingApt(null);
      setCancelReason('');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao cancelar o agendamento.');
    }
  };

  const handleSyncCalendar = async (isRetry = false) => {
    try {
      const loadingToast = toast.loading(isRetry ? 'Re-sincronizando...' : 'Sincronizando com o Google Calendar...');
      const res = await fetch('/api/appointments/sync-all', {
        method: 'POST',
        headers: getAuthHeaders()
      });
      toast.dismiss(loadingToast);
      
      const data = await res.json();
      if (res.ok) {
        if (data.synced > 0) {
          toast.success(`✅ ${data.synced} agendamento(s) sincronizado(s) com sucesso na sua agenda do Google!`);
        } else if (data.errors > 0) {
          console.error("GCal Sync Error:", data.lastError);
          const isAuthError = String(data.lastError).includes('Invalid Credentials') || String(data.lastError).includes('401') || String(data.lastError).includes('UNAUTHENTICATED');
          if (isAuthError && !isRetry) {
             toast.info("Acesso ao Google expirou. Reconectando...");
             try {
                const result = await googleSignInForCalendar();
                if (result?.accessToken) {
                   await fetch('/api/users/google-token', {
                     method: 'POST',
                     headers: {
                       ...getAuthHeaders(),
                       'Content-Type': 'application/json',
                     },
                     body: JSON.stringify({ token: result.accessToken }),
                   });
                   // Retry the sync automatically
                   handleSyncCalendar(true);
                }
             } catch(signInErr: any) {
                if (signInErr.code !== 'auth/popup-closed-by-user') {
                   toast.error("Falha ao reconectar. Por favor, tente novamente na aba Minha Página.");
                }
             }
          } else if (isAuthError && isRetry) {
             toast.error(`❌ O acesso ao Google ainda é falho. Verifique suas permissões no Google.`);
          } else {
             toast.error(`❌ Tentativa concluída, mas falhou em ${data.errors} agendamento(s). Erro: ${data.lastError ? String(data.lastError).substring(0, 80) : "Desconhecido"}.`, { duration: 8000 });
          }
        } else {
          toast.info('Tudo atualizado! Nenhum agendamento pendente para sincronização.');
        }
      } else {
        toast.error(data.error || 'Erro ao sincronizar. Tente reconectar sua conta.');
      }
    } catch(err) {
      toast.error('Erro interno de conexão. Tente novamente mais tarde.');
    }
  };

  const filteredAppointments = appointments.filter(apt => {
    // Determine standard status string
    let aptStatus = 'Pendente';
    if (apt.status === 'confirmed' || apt.status === 'Confirmado') aptStatus = 'Confirmado';
    else if (apt.status === 'cancelled' || apt.status === 'Cancelado') aptStatus = 'Cancelado';

    // Status filter
    if (filterStatus !== 'Todos' && aptStatus !== filterStatus) return false;

    // Filter by name (clientName)
    if (filterName && !apt.clientName.toLowerCase().includes(filterName.toLowerCase())) return false;

    return true;
  });

  const now = new Date();
  const currentMonthRevenue = appointments
    .filter(a => {
       const isConfirmed = a.status === 'confirmed' || a.status === 'Confirmado';
       if (!isConfirmed) return false;
       const dateObj = new Date(a.startAt || a.date || '');
       return dateObj.getMonth() === now.getMonth() && dateObj.getFullYear() === now.getFullYear();
    })
    .reduce((sum, a) => sum + (Number(a.totalPrice) || 0), 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 overflow-hidden">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Visão Geral</h1>
          <p className="text-[#9B8FC0]">Acompanhe seus agendamentos e gerencie seus serviços.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          {currentSlug && (
             <Button className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white shadow-lg shadow-violet-500/20" onClick={() => window.open(`/p/${currentSlug}`, '_blank')}>
               <Plus className="w-4 h-4 mr-2" />
               Agendar Agora
             </Button>
          )}
          <Button variant="outline" className="bg-[#130E20] border-[#2D214F] text-[#E2D9F3] hover:bg-[#1A1333] hover:text-white" onClick={() => handleSyncCalendar(false)} title="Sincroniza seus agendamentos para o seu Google Calendar. Útil caso algum agendamento tenha falhado.">
            <RefreshCcw className="w-4 h-4 mr-2" />
            Sincronizar
          </Button>
          {currentSlug && (
             <Button variant="outline" className="bg-[#130E20] border-[#2D214F] text-[#E2D9F3] hover:bg-[#1A1333] hover:text-white" onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/p/${currentSlug}`);
                toast.success("Link copiado!");
             }}>
               <ExternalLink className="w-4 h-4 mr-2" />
               Copiar
             </Button>
          )}
        </div>
      </motion.div>

      {/* Metrics Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {isFetchingAppointments ? (
          <>
            <div className="bg-[#130E20] rounded-2xl h-32 animate-pulse border border-[#2D214F]" />
            <div className="bg-[#130E20] rounded-2xl h-32 animate-pulse border border-[#2D214F]" />
            <div className="bg-[#130E20] rounded-2xl h-32 animate-pulse border border-[#2D214F]" />
            <div className="bg-[#130E20] rounded-2xl h-32 animate-pulse border border-[#2D214F]" />
          </>
        ) : (
          <>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
              className="bg-[#130E20] p-6 rounded-2xl border border-[#2D214F] hover:border-[#4B3B7A] transition-colors shadow-sm"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-[#9B8FC0]">Faturamento (Mês)</h3>
                <DollarSign className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="text-3xl font-bold text-white flex items-baseline gap-1">
                <span className="text-lg font-medium text-[#9B8FC0]">R$</span>
                {currentMonthRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="bg-[#130E20] p-6 rounded-2xl border border-[#2D214F] hover:border-[#4B3B7A] transition-colors shadow-sm"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-[#9B8FC0]">Total de Agendamentos</h3>
                <TrendingUp className="w-5 h-5 text-[#8B5CF6]" />
              </div>
              <div className="text-4xl font-bold text-white">{appointments.length}</div>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="bg-[#130E20] p-6 rounded-2xl border border-[#2D214F] hover:border-[#4B3B7A] transition-colors shadow-sm"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-[#9B8FC0]">Pendentes</h3>
                <Clock className="w-5 h-5 text-amber-400" />
              </div>
              <div className="text-4xl font-bold text-white">
                {appointments.filter(a => a.status === 'scheduled' || a.status === 'Pendente' || !a.status).length}
              </div>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="bg-[#130E20] p-6 rounded-2xl border border-[#2D214F] hover:border-[#4B3B7A] transition-colors shadow-sm"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-[#9B8FC0]">Confirmados</h3>
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="text-4xl font-bold text-white">
                {appointments.filter(a => a.status === 'confirmed' || a.status === 'Confirmado').length}
              </div>
            </motion.div>
          </>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        
        {/* Appointments Section */}
        <div className="space-y-6">
           <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
             <h2 className="text-xl font-bold text-white flex items-center gap-2">
               <CalendarIcon className="w-5 h-5 text-violet-400" />
               Agendamentos
               <span className="bg-[#1A1333] text-[#E2D9F3] text-xs px-2 py-1 rounded-full">{filteredAppointments.length}</span>
             </h2>

             <div className="flex gap-2 w-full sm:w-auto">
               <Input 
                 placeholder="Filtrar por nome..." 
                 value={filterName}
                 onChange={e => setFilterName(e.target.value)}
                 className="bg-[#130E20] border-[#2D214F] text-white h-9 placeholder:text-[#5B4F81] focus-visible:ring-violet-500"
               />
               <select 
                 value={filterStatus}
                 onChange={e => setFilterStatus(e.target.value)}
                 className="bg-[#130E20] border border-[#2D214F] text-white rounded-md px-3 h-9 text-sm focus:outline-none focus:ring-1 focus:ring-violet-500"
               >
                 <option value="Todos">Todos</option>
                 <option value="Pendente">Pendentes</option>
                 <option value="Confirmado">Confirmados</option>
                 <option value="Cancelado">Cancelados</option>
               </select>
             </div>
           </div>

           <div className="space-y-4">
              {isFetchingAppointments ? (
                <>
                  {[...Array(3)].map((_, i) => (
                    <Card key={i} className="bg-[#130E20] border-[#2D214F] shadow-sm">
                      <CardContent className="p-5">
                        <div className="flex justify-between items-start mb-4">
                          <div className="space-y-2">
                             <div className="h-6 w-32 bg-[#1A1333] rounded animate-pulse" />
                             <div className="h-4 w-24 bg-[#1A1333] rounded animate-pulse" />
                          </div>
                          <div className="h-6 w-20 bg-[#1A1333] rounded-full animate-pulse" />
                        </div>
                        <div className="bg-[#0B0914] rounded-lg p-3 flex justify-between items-center mb-4 border border-[#2D214F]">
                           <div className="h-4 w-32 bg-[#1A1333] rounded animate-pulse" />
                           <div className="h-4 w-16 bg-[#1A1333] rounded animate-pulse" />
                        </div>
                        <div className="flex flex-col gap-2 mt-4">
                          <div className="h-9 w-full bg-[#1A1333] rounded animate-pulse" />
                          <div className="flex gap-2">
                            <div className="h-9 flex-1 bg-[#1A1333] rounded animate-pulse" />
                            <div className="h-9 flex-1 bg-[#1A1333] rounded animate-pulse" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </>
              ) : filteredAppointments.length === 0 ? (
                <div className="text-center p-8 border border-dashed border-[#2D214F] rounded-xl bg-[#130E20]">
                   <p className="text-[#9B8FC0]">Nenhum agendamento encontrado.</p>
                   {filterName || filterStatus !== 'Todos' ? (
                     <Button variant="link" onClick={() => { setFilterName(''); setFilterStatus('Todos'); }} className="text-violet-400 mt-2">
                       Limpar filtros
                     </Button>
                   ) : (
                     <p className="text-sm text-[#5B4F81] mt-2">Compartilhe seu link para receber clientes.</p>
                   )}
                </div>
              ) : (
                filteredAppointments.map((apt, index) => (
                  <motion.div
                    key={apt.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.1 + (index * 0.05), ease: [0.16, 1, 0.3, 1] }}
                  >
                    <Card className="bg-[#130E20] border-[#2D214F] shadow-sm hover:border-[#4B3B7A] transition-colors">
                    <CardContent className="p-5">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                           <h3 className="font-bold text-white text-lg">{apt.clientName}</h3>
                           <div className="flex items-center gap-2 text-sm text-[#9B8FC0] mt-1">
                             <a href={`https://wa.me/${apt.clientWhatsApp?.replace(/\D/g, '') || apt.clientPhone?.replace(/\D/g, '')}`} className="hover:text-violet-400 transition-colors" target="_blank" rel="noreferrer">
                               {apt.clientWhatsApp || apt.clientPhone}
                             </a>
                           </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-xs px-2 py-1 rounded-full font-medium inline-flex items-center gap-1.5
                            ${(apt.status === 'scheduled' || apt.status === 'Pendente' || !apt.status) ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' : 
                              (apt.status === 'confirmed' || apt.status === 'Confirmado') ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 
                              'bg-red-500/15 text-red-400 border border-red-500/30'}
                          `}>
                            {(apt.status === 'scheduled' || apt.status === 'Pendente' || !apt.status) && <><Clock className="w-3.5 h-3.5" /> Pendente</>}
                            {(apt.status === 'confirmed' || apt.status === 'Confirmado') && <><CheckCircle2 className="w-3.5 h-3.5" /> Confirmado</>}
                            {(apt.status === 'cancelled' || apt.status === 'Cancelado') && <><XCircle className="w-3.5 h-3.5" /> Cancelado</>}
                          </div>
                          {apt.bookingSource === 'public_link' && (
                             <div className="text-[10px] uppercase font-bold tracking-wider text-violet-500 mt-2">
                               via syncou
                             </div>
                          )}
                        </div>
                      </div>

                      <div className="bg-[#0B0914] rounded-lg p-3 text-sm flex gap-4 md:gap-0 flex-col md:flex-row justify-between md:items-center mb-4 border border-[#2D214F]">
                         <div className="flex items-center gap-2 text-[#E2D9F3]">
                           <Clock className="w-4 h-4 text-[#5B4F81]" />
                           {new Date(apt.startAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                           {' as '}
                           {new Date(apt.startAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                         </div>
                         <div className="font-mono text-violet-400 font-medium md:border-l border-[#2D214F] md:pl-3">
                           R$ {apt.totalPrice?.toFixed(2) || '0.00'}
                         </div>
                      </div>

                      <div className="flex flex-col gap-2 mt-4">
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => openWhatsApp(apt)} 
                            className="flex-1 bg-[#1A1333] border-[#2D214F] text-[#E2D9F3] hover:text-white hover:border-[#4B3B7A] hover:bg-[#2D214F]"
                          >
                            <MessageSquare className="w-4 h-4 mr-2 text-[#9B8FC0] group-hover:text-white" /> WhatsApp
                          </Button>
                          
                          {(apt.status !== 'cancelled' && apt.status !== 'Cancelado') && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => {
                                setReschedulingApt(apt);
                                const currentStart = new Date(apt.startAt);
                                setRescheduleDate(currentStart.toISOString().split('T')[0]);
                                setRescheduleTime(currentStart.toTimeString().slice(0, 5));
                                setIsRescheduleModalOpen(true);
                              }} 
                              className="flex-1 bg-[#1A1333] border-[#2D214F] text-[#E2D9F3] hover:text-white hover:border-[#4B3B7A] hover:bg-[#2D214F]"
                            >
                              <RefreshCcw className="w-4 h-4 mr-2" /> Remarcar
                            </Button>
                          )}
                        </div>
                        
                        {(apt.status === 'scheduled' || apt.status === 'Pendente' || !apt.status) && (
                          <div className="flex gap-2 mt-2">
                            <Button size="sm" onClick={() => handleUpdateAppointmentStatus(apt.id, 'Confirmado')} className="flex-1 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white">
                              Confirmar
                            </Button>
                            <Button 
                              size="sm" 
                              onClick={() => {
                                setCancelingApt(apt);
                                setCancelReason('');
                                setIsCancelModalOpen(true);
                              }} 
                              variant="destructive" 
                              className="flex-1 bg-red-500/20 text-red-400 hover:bg-red-500/30 hover:text-red-300 border-none"
                            >
                              Cancelar
                            </Button>
                          </div>
                        )}
                        {(apt.status === 'confirmed' || apt.status === 'Confirmado') && (
                          <div className="flex gap-2 mt-2">
                            <Button size="sm" disabled className="flex-1 bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                              Confirmado
                            </Button>
                            <Button 
                              size="sm" 
                              onClick={() => {
                                setCancelingApt(apt);
                                setCancelReason('');
                                setIsCancelModalOpen(true);
                              }} 
                              variant="destructive" 
                              className="flex-1 bg-red-500/20 text-red-400 hover:bg-red-500/30 hover:text-red-300 border-none"
                            >
                              Cancelar
                            </Button>
                          </div>
                        )}
                        {(apt.status === 'cancelled' || apt.status === 'Cancelado') && (
                          <div className="space-y-1">
                            <Button size="sm" disabled className="w-full bg-red-500/10 text-red-400 border-red-500/20">
                              Cancelado
                            </Button>
                            {apt.cancelReason && (
                              <p className="text-xs text-[#9B8FC0] italic mt-1 bg-[#0A0713] p-2 rounded-md border border-[#2D214F]">
                                Motivo: {apt.cancelReason}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                  </motion.div>
                ))
              )}
           </div>
        </div>

        {/* Services Section */}
        <div className="space-y-6">
           <div className="flex items-center justify-between">
             <h2 className="text-xl font-bold text-white flex items-center gap-2">
               <span className="w-6 h-6 rounded-md bg-[#8B5CF6]/20 text-violet-400 flex items-center justify-center text-xs font-semibold ring-1 ring-violet-500/30">S</span>
               Meus Serviços
             </h2>
             <Dialog open={isServiceModalOpen} onOpenChange={setIsServiceModalOpen}>
               <DialogTrigger asChild>
                 <Button onClick={() => setEditingService(null)} size="sm" className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white">
                   <Plus className="w-4 h-4 mr-1" /> Novo
                 </Button>
               </DialogTrigger>
               <DialogContent className="sm:max-w-[425px] bg-[#130E20] border-[#2D214F] text-[#E2D9F3] shadow-2xl">
                 <DialogHeader>
                   <DialogTitle className="text-white text-xl">{editingService ? 'Editar Serviço' : 'Novo Serviço'}</DialogTitle>
                 </DialogHeader>
                 <form onSubmit={handleSaveService} className="space-y-4 pt-4">
                   <div className="space-y-2">
                     <Label htmlFor="name" className="text-[#9B8FC0]">Nome do Serviço</Label>
                     <Input id="name" name="name" defaultValue={editingService?.name} required className="bg-[#0B0914] border-[#2D214F] text-white focus-visible:ring-violet-500 h-11" placeholder="Ex: Corte de Cabelo" />
                   </div>
                   <div className="space-y-2">
                     <Label htmlFor="description" className="text-[#9B8FC0]">Descrição (Opcional)</Label>
                     <Input id="description" name="description" defaultValue={editingService?.description} className="bg-[#0B0914] border-[#2D214F] text-white focus-visible:ring-violet-500 h-11" placeholder="Ex: Lavagem e finalização inclusos" />
                   </div>
                   <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                     <div className="space-y-2">
                       <Label htmlFor="duration" className="text-[#9B8FC0]">Duração (min)</Label>
                       <Input id="duration" name="duration" type="number" min="1" defaultValue={editingService?.duration} required className="bg-[#0B0914] border-[#2D214F] text-white focus-visible:ring-violet-500 h-11" />
                     </div>
                     <div className="space-y-2">
                       <Label htmlFor="bufferTime" className="text-[#9B8FC0]">Respiro (min)</Label>
                       <Input id="bufferTime" name="bufferTime" type="number" min="0" defaultValue={editingService?.bufferTime || 0} required className="bg-[#0B0914] border-[#2D214F] text-white focus-visible:ring-violet-500 h-11" />
                     </div>
                     <div className="space-y-2">
                       <Label htmlFor="price" className="text-[#9B8FC0]">Preço (R$)</Label>
                       <Input id="price" name="price" type="number" min="0" step="0.01" defaultValue={editingService?.price} required className="bg-[#0B0914] border-[#2D214F] text-white focus-visible:ring-violet-500 h-11" />
                     </div>
                   </div>
                   <div className="flex items-center space-x-2 pt-2 border-t border-[#2D214F] mt-4 pb-2">
                     <Switch id="active" name="active" defaultChecked={editingService ? editingService.active : true} />
                     <Label htmlFor="active" className="text-white font-medium">Serviço Ativo</Label>
                   </div>
                   <DialogFooter className="pt-4 border-t border-[#2D214F]">
                     <Button type="button" variant="ghost" onClick={() => setIsServiceModalOpen(false)} className="text-[#9B8FC0] hover:text-white hover:bg-[#2D214F]/50">Cancelar</Button>
                     <Button type="submit" className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white">Salvar Serviço</Button>
                   </DialogFooter>
                 </form>
               </DialogContent>
             </Dialog>
           </div>

           <div className="grid gap-4">
             {services.length === 0 ? (
                <div className="text-center p-8 border border-dashed border-[#2D214F] rounded-xl bg-[#130E20]">
                   <p className="text-[#9B8FC0]">Nenhum serviço cadastrado.</p>
                </div>
             ) : (
                services.map(service => (
                  <Card key={service.id} className="bg-[#130E20] border-[#2D214F] hover:border-[#4B3B7A] transition-colors shadow-sm">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-bold text-white">{service.title || service.name}</h4>
                        </div>
                        <div className="flex items-center gap-4 text-xs font-mono text-[#9B8FC0]">
                           <span className="flex items-center"><Clock className="w-3 h-3 mr-1" /> {service.duration} min</span>
                           <span className="flex items-center font-medium"><DollarSign className="w-3 h-3 mr-1" /> R$ {service.price.toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10" onClick={() => handleDeleteService(service.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
             )}
           </div>
        </div>

      </div>

      {/* Cancellation Reason Modal */}
      <Dialog open={isCancelModalOpen} onOpenChange={setIsCancelModalOpen}>
        <DialogContent className="sm:max-w-[425px] bg-[#130E20] border-[#2D214F] text-[#E2D9F3]">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse ring-4 ring-red-500/20" />
              Cancelar Agendamento
            </DialogTitle>
            <CardDescription className="text-[#9B8FC0]">
              Por favor, informe a justificativa do cancelamento de {cancelingApt ? <b className="text-white">{cancelingApt.clientName}</b> : 'agendamento'}.
            </CardDescription>
          </DialogHeader>
          <form onSubmit={handleConfirmCancel} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="cancelReason" className="text-[#9B8FC0]">Justificativa / Motivo</Label>
              <textarea
                id="cancelReason"
                required
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                placeholder="Exemplo: Fora do horário de disponibilidade, imprevisto de força maior, etc."
                className="w-full h-24 bg-[#0B0914] border border-[#2D214F] rounded-lg p-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-violet-500 placeholder:text-[#5B4F81]"
              />
            </div>
            <DialogFooter className="pt-2 flex sm:justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setIsCancelModalOpen(false)} className="text-[#9B8FC0] hover:text-white hover:bg-[#2D214F]">
                Voltar
              </Button>
              <Button type="submit" variant="destructive" className="bg-red-500/20 hover:bg-red-500/30 text-red-400 font-semibold border-none">
                Confirmar Cancelamento
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reschedule Modal */}
      <Dialog open={isRescheduleModalOpen} onOpenChange={setIsRescheduleModalOpen}>
        <DialogContent className="sm:max-w-[425px] bg-[#130E20] border-[#2D214F] text-white">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <RefreshCcw className="w-5 h-5 text-violet-400" />
              Remarcar Agendamento
            </DialogTitle>
            <CardDescription className="text-[#9B8FC0]">
              Escolha a nova data e horário para o agendamento de {reschedulingApt ? <b className="text-white">{reschedulingApt.clientName}</b> : 'agendamento'}.
            </CardDescription>
          </DialogHeader>
          <form onSubmit={handleConfirmReschedule} className="space-y-4 pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rescheduleDate" className="text-[#9B8FC0]">Nova Data</Label>
                <Input
                  id="rescheduleDate"
                  type="date"
                  required
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="bg-[#0B0914] border-[#2D214F] text-white focus-visible:ring-violet-500 block [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rescheduleTime" className="text-[#9B8FC0]">Novo Horário</Label>
                <Input
                  id="rescheduleTime"
                  type="time"
                  required
                  value={rescheduleTime}
                  onChange={(e) => setRescheduleTime(e.target.value)}
                  className="bg-[#0B0914] border-[#2D214F] text-white focus-visible:ring-violet-500 block [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert h-11"
                />
              </div>
            </div>
            
            <DialogFooter className="pt-4 flex sm:justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setIsRescheduleModalOpen(false)} className="text-[#9B8FC0] hover:text-white hover:bg-[#2D214F]">
                Cancelar
              </Button>
              <Button type="submit" className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white font-semibold">
                Confirmar Remarcação
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
