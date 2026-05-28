import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, Plus, Clock, DollarSign, Calendar as CalendarIcon, Edit2, Trash2, MessageSquare, TrendingUp, CheckCircle, RefreshCcw, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { syncWithGoogleCalendar } from '../lib/calendar';

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

  const fetchServices = async () => {
    try {
      const res = await fetch('/api/services', { headers: getAuthHeaders() });
      if (res.ok) setServices(await res.json());
    } catch(err) {
      console.error(err);
    }
  };

  const fetchAppointments = async () => {
    try {
      // Endpoint to implement later in backend or mock
      const res = await fetch('/api/appointments', { headers: getAuthHeaders() });
      if (res.ok) {
         setAppointments(await res.json());
      }
    } catch(err) {
      console.error(err);
    } finally {
      setIsFetchingAppointments(false);
    }
  };

  useEffect(() => {
    if (!currentUser) return;
    setCurrentSlug(currentUser.slug);
    fetchServices();
    fetchAppointments();
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
            
            const message = `Olá ${apt.clientName}, passando para confirmar seu agendamento de ${servicesText} no dia ${formattedDate} às ${formattedTime}. Te aguardo!`;
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

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Visão Geral</h1>
          <p className="text-slate-400">Acompanhe seus agendamentos e gerencie seus serviços.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          {currentSlug && (
             <Button variant="outline" className="bg-slate-900 border-slate-800 text-slate-300" onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/p/${currentSlug}`);
                toast.success("Link copiado!");
             }}>
               <ExternalLink className="w-4 h-4 mr-2" />
               Copiar Meu Link
             </Button>
          )}
        </div>
      </div>

      {/* Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {isFetchingAppointments ? (
          <>
            <div className="bg-slate-800 rounded-2xl h-32 animate-pulse border border-slate-700/50" />
            <div className="bg-slate-800 rounded-2xl h-32 animate-pulse border border-slate-700/50" />
            <div className="bg-slate-800 rounded-2xl h-32 animate-pulse border border-slate-700/50" />
          </>
        ) : (
          <>
            <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50 hover:bg-slate-800/80 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-slate-400">Total de Agendamentos</h3>
                <TrendingUp className="w-5 h-5 text-purple-500" />
              </div>
              <div className="text-4xl font-bold text-white">{appointments.length}</div>
            </div>
            
            <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50 hover:bg-slate-800/80 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-slate-400">Pendentes</h3>
                <Clock className="w-5 h-5 text-purple-500" />
              </div>
              <div className="text-4xl font-bold text-white">
                {appointments.filter(a => a.status === 'scheduled' || a.status === 'Pendente' || !a.status).length}
              </div>
            </div>
            
            <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50 hover:bg-slate-800/80 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-slate-400">Confirmados</h3>
                <CheckCircle className="w-5 h-5 text-purple-500" />
              </div>
              <div className="text-4xl font-bold text-white">
                {appointments.filter(a => a.status === 'confirmed' || a.status === 'Confirmado').length}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        
        {/* Appointments Section */}
        <div className="space-y-6">
           <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
             <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
               <CalendarIcon className="w-5 h-5 text-purple-400" />
               Agendamentos
               <span className="bg-slate-800 text-slate-300 text-xs px-2 py-1 rounded-full">{filteredAppointments.length}</span>
             </h2>

             <div className="flex gap-2 w-full sm:w-auto">
               <Input 
                 placeholder="Filtrar por nome..." 
                 value={filterName}
                 onChange={e => setFilterName(e.target.value)}
                 className="bg-slate-900 border-slate-800 text-slate-100 h-9"
               />
               <select 
                 value={filterStatus}
                 onChange={e => setFilterStatus(e.target.value)}
                 className="bg-slate-900 border border-slate-800 text-slate-100 rounded-md px-3 h-9 text-sm focus:outline-none focus:ring-1 focus:ring-purple-600"
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
                    <Card key={i} className="bg-slate-900/60 border-slate-800 backdrop-blur-md">
                      <CardContent className="p-5">
                        <div className="flex justify-between items-start mb-4">
                          <div className="space-y-2">
                             <div className="h-6 w-32 bg-slate-800 rounded animate-pulse" />
                             <div className="h-4 w-24 bg-slate-800 rounded animate-pulse" />
                          </div>
                          <div className="h-6 w-20 bg-slate-800 rounded-full animate-pulse" />
                        </div>
                        <div className="bg-slate-950/50 rounded-lg p-3 flex justify-between items-center mb-4 border border-slate-800/50">
                           <div className="h-4 w-32 bg-slate-800 rounded animate-pulse" />
                           <div className="h-4 w-16 bg-slate-800 rounded animate-pulse" />
                        </div>
                        <div className="flex flex-col gap-2 mt-4">
                          <div className="h-9 w-full bg-slate-800 rounded animate-pulse" />
                          <div className="flex gap-2">
                            <div className="h-9 flex-1 bg-slate-800 rounded animate-pulse" />
                            <div className="h-9 flex-1 bg-slate-800 rounded animate-pulse" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </>
              ) : filteredAppointments.length === 0 ? (
                <div className="text-center p-8 border border-dashed border-slate-800 rounded-xl bg-slate-900/20">
                   <p className="text-slate-500">Nenhum agendamento encontrado.</p>
                   {filterName || filterStatus !== 'Todos' ? (
                     <Button variant="link" onClick={() => { setFilterName(''); setFilterStatus('Todos'); }} className="text-purple-400 mt-2">
                       Limpar filtros
                     </Button>
                   ) : (
                     <p className="text-sm text-slate-600 mt-2">Compartilhe seu link para receber clientes.</p>
                   )}
                </div>
              ) : (
                filteredAppointments.map(apt => (
                  <Card key={apt.id} className="bg-slate-900/60 border-slate-800 backdrop-blur-md">
                    <CardContent className="p-5">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                           <h3 className="font-bold text-slate-100 text-lg">{apt.clientName}</h3>
                           <div className="flex items-center gap-2 text-sm text-slate-400 mt-1">
                             <a href={`https://wa.me/${apt.clientWhatsApp?.replace(/\D/g, '') || apt.clientPhone?.replace(/\D/g, '')}`} className="hover:text-green-400 transition-colors" target="_blank" rel="noreferrer">
                               {apt.clientWhatsApp || apt.clientPhone}
                             </a>
                           </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-xs px-2 py-1 rounded-full font-medium inline-flex items-center
                            ${(apt.status === 'scheduled' || apt.status === 'Pendente' || !apt.status) ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 
                              (apt.status === 'confirmed' || apt.status === 'Confirmado') ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 
                              'bg-red-500/20 text-red-400 border border-red-500/30'}
                          `}>
                            {(apt.status === 'scheduled' || apt.status === 'Pendente' || !apt.status) && 'Pendente'}
                            {(apt.status === 'confirmed' || apt.status === 'Confirmado') && 'Confirmado'}
                            {(apt.status === 'cancelled' || apt.status === 'Cancelado') && 'Cancelado'}
                          </div>
                          {apt.bookingSource === 'public_link' && (
                             <div className="text-[10px] uppercase font-bold tracking-wider text-purple-400 mt-2">
                               via syncou
                             </div>
                          )}
                        </div>
                      </div>

                      <div className="bg-slate-950/50 rounded-lg p-3 text-sm flex gap-4 md:gap-0 flex-col md:flex-row justify-between md:items-center mb-4 border border-slate-800/50">
                         <div className="flex items-center gap-2 text-slate-300">
                           <Clock className="w-4 h-4 text-slate-500" />
                           {new Date(apt.startAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                           {' as '}
                           {new Date(apt.startAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                         </div>
                         <div className="font-mono text-purple-400 md:border-l border-slate-800 md:pl-3">
                           R$ {apt.totalPrice?.toFixed(2) || '0.00'}
                         </div>
                      </div>

                      <div className="flex flex-col gap-2 mt-4">
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => openWhatsApp(apt)} 
                            className="flex-1 bg-slate-900 border-slate-700 text-slate-300 hover:text-green-400 hover:border-green-500/50"
                          >
                            <MessageSquare className="w-4 h-4 mr-2" /> WhatsApp
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
                              className="flex-1 bg-slate-900 border-slate-700 text-slate-300 hover:text-purple-400 hover:border-purple-500/50"
                            >
                              <RefreshCcw className="w-4 h-4 mr-2" /> Remarcar
                            </Button>
                          )}
                        </div>
                        
                        {(apt.status === 'scheduled' || apt.status === 'Pendente' || !apt.status) && (
                          <div className="flex gap-2 mt-2">
                            <Button size="sm" onClick={() => handleUpdateAppointmentStatus(apt.id, 'Confirmado')} className="flex-1 bg-purple-600 hover:bg-purple-700 text-white">
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
                              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                            >
                              Cancelar
                            </Button>
                          </div>
                        )}
                        {(apt.status === 'confirmed' || apt.status === 'Confirmado') && (
                          <div className="flex gap-2 mt-2">
                            <Button size="sm" disabled className="flex-1 bg-green-500/10 text-green-500 border-green-500/20">
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
                              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                            >
                              Cancelar
                            </Button>
                          </div>
                        )}
                        {(apt.status === 'cancelled' || apt.status === 'Cancelado') && (
                          <div className="space-y-1">
                            <Button size="sm" disabled className="w-full bg-red-500/10 text-red-500 border-red-500/20">
                              Cancelado
                            </Button>
                            {apt.cancelReason && (
                              <p className="text-xs text-slate-500 italic mt-1 bg-slate-950 p-2 rounded">
                                Motivo: {apt.cancelReason}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
           </div>
        </div>

        {/* Services Section */}
        <div className="space-y-6">
           <div className="flex items-center justify-between">
             <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
               <span className="w-5 h-5 rounded bg-purple-600 flex items-center justify-center text-xs">S</span>
               Meus Serviços
             </h2>
             <Dialog open={isServiceModalOpen} onOpenChange={setIsServiceModalOpen}>
               <DialogTrigger render={<Button onClick={() => setEditingService(null)} size="sm" className="bg-purple-600 hover:bg-purple-700 text-white" />}>
                 <Plus className="w-4 h-4 mr-1" /> Novo
               </DialogTrigger>
               <DialogContent className="sm:max-w-[425px] bg-slate-900 border-slate-800 text-slate-100">
                 <DialogHeader>
                   <DialogTitle>{editingService ? 'Editar Serviço' : 'Novo Serviço'}</DialogTitle>
                 </DialogHeader>
                 <form onSubmit={handleSaveService} className="space-y-4 pt-4">
                   <div className="space-y-2">
                     <Label htmlFor="name" className="text-slate-300">Nome do Serviço</Label>
                     <Input id="name" name="name" defaultValue={editingService?.name} required className="bg-slate-950 border-slate-800" />
                   </div>
                   <div className="space-y-2">
                     <Label htmlFor="description" className="text-slate-300">Descrição</Label>
                     <Input id="description" name="description" defaultValue={editingService?.description} className="bg-slate-950 border-slate-800" />
                   </div>
                   <div className="grid grid-cols-3 gap-4">
                     <div className="space-y-2">
                       <Label htmlFor="duration" className="text-slate-300">Duração (min)</Label>
                       <Input id="duration" name="duration" type="number" min="1" defaultValue={editingService?.duration} required className="bg-slate-950 border-slate-800" />
                     </div>
                     <div className="space-y-2">
                       <Label htmlFor="bufferTime" className="text-slate-300">Respiro (min)</Label>
                       <Input id="bufferTime" name="bufferTime" type="number" min="0" defaultValue={editingService?.bufferTime || 0} required className="bg-slate-950 border-slate-800" />
                     </div>
                     <div className="space-y-2">
                       <Label htmlFor="price" className="text-slate-300">Preço (R$)</Label>
                       <Input id="price" name="price" type="number" min="0" step="0.01" defaultValue={editingService?.price} required className="bg-slate-950 border-slate-800" />
                     </div>
                   </div>
                   <div className="flex items-center space-x-2 pt-2">
                     <Switch id="active" name="active" defaultChecked={editingService ? editingService.active : true} />
                     <Label htmlFor="active" className="text-slate-300">Serviço Ativo</Label>
                   </div>
                   <DialogFooter className="pt-4">
                     <Button type="submit" className="bg-purple-600 text-white w-full">Salvar Serviço</Button>
                   </DialogFooter>
                 </form>
               </DialogContent>
             </Dialog>
           </div>

           <div className="grid gap-4">
             {services.length === 0 ? (
                <div className="text-center p-8 border border-dashed border-slate-800 rounded-xl bg-slate-900/20">
                   <p className="text-slate-500">Nenhum serviço cadastrado.</p>
                </div>
             ) : (
                services.map(service => (
                  <Card key={service.id} className="bg-slate-900/40 border-slate-800">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-bold text-slate-200">{service.title || service.name}</h4>
                        </div>
                        <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
                           <span className="flex items-center"><Clock className="w-3 h-3 mr-1" /> {service.duration} min</span>
                           <span className="flex items-center"><DollarSign className="w-3 h-3 mr-1" /> R$ {service.price.toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500/70 hover:text-red-400 hover:bg-red-950/30" onClick={() => handleDeleteService(service.id)}>
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
        <DialogContent className="sm:max-w-[425px] bg-slate-900 border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
              Cancelar Agendamento
            </DialogTitle>
            <CardDescription className="text-slate-400">
              Por favor, informe a justificativa do cancelamento de {cancelingApt ? <b>{cancelingApt.clientName}</b> : 'agendamento'}.
            </CardDescription>
          </DialogHeader>
          <form onSubmit={handleConfirmCancel} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="cancelReason" className="text-slate-300">Justificativa / Motivo</Label>
              <textarea
                id="cancelReason"
                required
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                placeholder="Exemplo: Fora do horário de disponibilidade, imprevisto de força maior, etc."
                className="w-full h-24 bg-slate-950 border border-slate-800 rounded-md p-3 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-purple-600 placeholder:text-slate-500"
              />
            </div>
            <DialogFooter className="pt-2 flex sm:justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setIsCancelModalOpen(false)} className="text-slate-400 hover:text-white hover:bg-slate-800">
                Voltar
              </Button>
              <Button type="submit" variant="destructive" className="bg-red-600 hover:bg-red-700 text-white font-semibold">
                Confirmar Cancelamento
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reschedule Modal */}
      <Dialog open={isRescheduleModalOpen} onOpenChange={setIsRescheduleModalOpen}>
        <DialogContent className="sm:max-w-[425px] bg-slate-900 border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <RefreshCcw className="w-5 h-5 text-purple-500" />
              Remarcar Agendamento
            </DialogTitle>
            <CardDescription className="text-slate-400">
              Escolha a nova data e horário para o agendamento de {reschedulingApt ? <b>{reschedulingApt.clientName}</b> : 'agendamento'}.
            </CardDescription>
          </DialogHeader>
          <form onSubmit={handleConfirmReschedule} className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rescheduleDate" className="text-slate-300">Nova Data</Label>
                <Input
                  id="rescheduleDate"
                  type="date"
                  required
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="bg-slate-950 border-slate-700 text-slate-100 focus-visible:ring-purple-600 block [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rescheduleTime" className="text-slate-300">Novo Horário</Label>
                <Input
                  id="rescheduleTime"
                  type="time"
                  required
                  value={rescheduleTime}
                  onChange={(e) => setRescheduleTime(e.target.value)}
                  className="bg-slate-950 border-slate-700 text-slate-100 focus-visible:ring-purple-600 block [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert"
                />
              </div>
            </div>
            
            <DialogFooter className="pt-4 flex sm:justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setIsRescheduleModalOpen(false)} className="text-slate-400 hover:text-white hover:bg-slate-800">
                Cancelar
              </Button>
              <Button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white font-semibold">
                Confirmar Remarcação
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
