import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Clock, Plus, Check, ChevronLeft, ArrowRight } from 'lucide-react';
import { format, isSameDay, addMinutes, isAfter, startOfDay, addDays, getHours, setHours, setMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Provider {
  id: string;
  slug: string;
  displayName: string;
  avatarUrl: string;
  bio: string;
  workingHoursStart?: string;
  workingHoursEnd?: string;
  workingDays?: number[];
  whatsapp?: string;
  scheduleOverrides?: Record<string, { start: string; end: string; isClosed: boolean }>;
}

interface Service {
  id: string;
  name: string;
  title?: string;
  description: string;
  duration: number;
  bufferTime?: number;
  price: number;
}

export function ProviderPage() {
  const { slug } = useParams();
  const [provider, setProvider] = useState<Provider | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedServices, setSelectedServices] = useState<Set<string>>(new Set());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [isFetchingAppointments, setIsFetchingAppointments] = useState(false);
  
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1); // 1: services, 2: datetime, 3: checkout, 4: success
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form
  const [clientName, setClientName] = useState('');
  const [clientWhatsApp, setClientWhatsApp] = useState('');
  const [clientEmail, setClientEmail] = useState('');

  // Fetch appointments for selected date
  useEffect(() => {
    const fetchAppointments = async () => {
      if (!provider || !selectedDate) return;
      setIsFetchingAppointments(true);
      try {
        const startDay = startOfDay(selectedDate).getTime();
        const endDay = setMinutes(setHours(selectedDate, 23), 59).getTime(); // 23:59:59 approximately, or use endOfDay
        
        // This should hit an open/public endpoint for a provider's unavailable chunks
        // To keep it simple, we just pretend there's no overlapping bookings for now directly
        const res = await fetch(`/api/provider/${provider.slug}/appointments?startAt=${startDay}&endAt=${endDay}`);
        if(res.ok) {
           const fetched = await res.json();
           setAppointments(fetched.filter((app: any) => app.status === 'Pendente' || app.status === 'Confirmado' || app.status === 'scheduled' || app.status === 'confirmed' || !app.status));
        } else {
           setAppointments([]);
        }
      } catch (err) {
        console.error("Error fetching appointments:", err);
      } finally {
        setIsFetchingAppointments(false);
      }
    };
    
    if (step === 2 || step === 3) {
      fetchAppointments();
    }
  }, [provider, selectedDate, step]);

  // Fetch data
  useEffect(() => {
    const fetchProvider = async () => {
      try {
        const res = await fetch(`/api/provider/${slug}`);
        if(res.ok) {
           const { user, services } = await res.json();
           setProvider(user);
           setServices(services.filter((s:any) => s.active));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (slug) fetchProvider();
  }, [slug]);

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Localizando profissional...</div>;
  if (!provider) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white font-bold text-xl">Profissional não encontrado</div>;

  const toggleService = (id: string) => {
    const next = new Set(selectedServices);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedServices(next);
  };

  const selectedServicesList = services.filter(s => selectedServices.has(s.id));
  const totalDuration = selectedServicesList.reduce((acc, s) => acc + s.duration, 0);
  const totalBufferTime = selectedServicesList.reduce((acc, s) => acc + (s.bufferTime || 0), 0);
  const totalDurationWithBuffer = totalDuration + totalBufferTime;
  const totalPrice = selectedServicesList.reduce((acc, s) => acc + s.price, 0);

  // Improved slot generation: check for overlaps, duration and overrides
  const generateSlots = () => {
    if (!selectedDate || selectedServices.size === 0 || !provider) return [];
    
    let workingStart = provider.workingHoursStart || "09:00";
    let workingEnd = provider.workingHoursEnd || "18:00";
    let isClosed = false;

    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    if (provider.scheduleOverrides && provider.scheduleOverrides[dateKey]) {
      const override = provider.scheduleOverrides[dateKey];
      if (override.isClosed) {
        isClosed = true;
      } else {
        workingStart = override.start;
        workingEnd = override.end;
      }
    }

    if (isClosed) return [];
    
    const [startHour, startMin] = workingStart.split(':').map(Number);
    const [endHour, endMin] = workingEnd.split(':').map(Number);
    
    let start = setMinutes(setHours(selectedDate, startHour), startMin);
    const end = setMinutes(setHours(selectedDate, endHour), endMin);
    const slots = [];
    const now = new Date();

    while (isAfter(end, start)) {
      const slotTime = start.getTime();
      const slotEndAt = slotTime + (totalDurationWithBuffer * 60000);
      
      // Basic check: is the slot in the past?
      const isPast = isSameDay(selectedDate, now) && isAfter(now, start);
      
      if (!isPast) {
        // Check for overlaps with existing appointments
        const isOccupied = appointments.some(app => {
          // An appointment overlaps if it starts before our slot ends AND ends after our slot starts
          const isValidStatus = app.status === 'Pendente' || app.status === 'Confirmado' || app.status === 'scheduled' || app.status === 'confirmed' || !app.status;
          return isValidStatus && app.startAt < slotEndAt && app.endAt > slotTime;
        });

        if (!isOccupied) {
          slots.push(format(start, 'HH:mm'));
        }
      }
      
      start = addMinutes(start, 30);
    }
    return slots;
  };

  const slots = generateSlots();

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!provider || !selectedDate || !selectedTime || selectedServices.size === 0) return;
    setIsSubmitting(true);

    try {
      const [hours, minutes] = selectedTime.split(':').map(Number);
      const startAt = setMinutes(setHours(selectedDate, hours), minutes).getTime();
      const endAt = startAt + (totalDurationWithBuffer * 60000);

      const bookingPayload = {
         providerId: provider.id,
         clientName,
         clientWhatsApp,
         clientPhone: clientWhatsApp.replace(/\D/g, ''),
         clientEmail,
         services: Array.from(selectedServices),
         totalPrice,
         totalDuration,
         bufferTime: totalBufferTime,
         bookingSource: 'public_link',
         status: 'Pendente',
         startAt,
         endAt
      };
      
      const res = await fetch(`/api/provider/${provider.slug}/book`, {
         method: 'POST',
         headers: {
            'Content-Type': 'application/json'
         },
         body: JSON.stringify(bookingPayload)
      });
      
      if(!res.ok) throw new Error('Falha no agendamento');

      setStep(4);
    } catch(err) {
      console.error(err);
      alert('Erro ao agendar. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const maskWhatsApp = (v: string) => {
    v = v.replace(/\D/g, '');
    if (v.length > 2) v = `(${v.substring(0, 2)}) ` + v.substring(2);
    if (v.length > 10) v = v.substring(0, 10) + '-' + v.substring(10, 14);
    return v;
  };

  const handleWhatsAppConfirm = () => {
    if (!provider?.whatsapp || !selectedDate || !selectedTime) return;
    const servicesText = selectedServicesList.map(s => s.title || s.name).join(', ');
    const dateText = format(selectedDate, "dd/MM/yyyy");
    const message = `Olá! Acabei de agendar ${servicesText} para o dia ${dateText} às ${selectedTime}. Meu nome é ${clientName}.`;
    let phoneNum = provider.whatsapp.replace(/\D/g, '');
    if (phoneNum.length === 10 || phoneNum.length === 11) phoneNum = '55' + phoneNum;
    const url = `https://wa.me/${phoneNum}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-24 dark">
      {/* Header Sticky */}
      {step < 4 && (
        <header className="bg-slate-950/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-10 px-4 py-3 flex items-center shadow-sm">
          {step > 1 && (
             <Button variant="ghost" size="icon" className="mr-2 h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-800" onClick={() => setStep(step - 1 as any)}>
               <ChevronLeft className="w-5 h-5" />
             </Button>
          )}
          <div className="flex items-center gap-3">
             <Avatar className="w-8 h-8">
               <AvatarImage src={provider.avatarUrl} />
               <AvatarFallback className="bg-purple-100 text-purple-700 text-xs">{provider.displayName.charAt(0)}</AvatarFallback>
             </Avatar>
             <div>
               <p className="text-sm font-bold text-white leading-tight">{provider.displayName}</p>
               <p className="text-[10px] text-slate-400 font-medium">Agendamento online</p>
             </div>
          </div>
        </header>
      )}

      {step === 1 && (
        <main className="max-w-xl mx-auto px-4 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="text-center mb-8">
             <Avatar className="w-24 h-24 mx-auto mb-4 border-4 border-white shadow-md">
               <AvatarImage src={provider.avatarUrl} />
               <AvatarFallback className="bg-purple-100 text-purple-700 text-3xl font-bold">{provider.displayName.charAt(0)}</AvatarFallback>
             </Avatar>
             <h1 className="text-2xl font-bold text-white mb-1">{provider.displayName}</h1>
             <Badge className="bg-green-900 text-green-300 hover:bg-green-900 uppercase tracking-widest text-[9px] mb-3 border-none">Disponível</Badge>
             {provider.bio && <p className="text-slate-400 text-sm max-w-sm mx-auto">{provider.bio}</p>}
          </div>

          <h2 className="font-bold text-lg mb-4 text-white">Selecione os Serviços</h2>
          <div className="space-y-3">
            {services.map(svc => {
              const isSelected = selectedServices.has(svc.id);
              return (
                <Card 
                  key={svc.id} 
                  className={`cursor-pointer transition-all border-2 shadow-sm bg-slate-900 ${isSelected ? 'border-purple-600 ring-2 ring-purple-600/20' : 'border-slate-800 hover:border-slate-700'}`}
                  onClick={() => toggleService(svc.id)}
                >
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-white">{svc.title || svc.name}</h3>
                      {svc.description && <p className="text-xs text-slate-400 mt-1">{svc.description}</p>}
                      <div className="flex items-center gap-3 text-xs font-medium text-slate-400 mt-2">
                        <span className="flex items-center bg-slate-800 px-2 py-1 rounded-md"><Clock className="w-3 h-3 mr-1"/> {svc.duration} min</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="font-bold text-purple-400">R$ {svc.price.toFixed(2)}</span>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center border ${isSelected ? 'bg-purple-600 border-purple-600 text-white' : 'border-slate-700 text-transparent'}`}>
                        {isSelected ? <Check className="w-4 h-4"/> : <Plus className="w-4 h-4 text-slate-600"/>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {selectedServices.size > 0 && (
             <div className="fixed bottom-0 left-0 w-full bg-slate-950 border-t border-slate-800 p-4 shadow-xl z-20 animate-in slide-in-from-bottom-full">
               <div className="max-w-xl mx-auto flex items-center justify-between">
                 <div>
                   <p className="text-xs text-slate-400 font-medium">{selectedServices.size} serviços • {totalDuration} min</p>
                   <p className="text-lg font-bold text-white">Total: R$ {totalPrice.toFixed(2)}</p>
                 </div>
                 <Button className="bg-purple-600 hover:bg-purple-700 text-white px-8 h-12 rounded-full" onClick={() => setStep(2)}>
                   Continuar <ArrowRight className="w-4 h-4 ml-2" />
                 </Button>
               </div>
             </div>
          )}
        </main>
      )}

      {step === 2 && (
        <main className="max-w-xl mx-auto px-4 py-8 animate-in fade-in slide-in-from-right-8 duration-300">
           <h2 className="font-bold text-xl mb-6 text-white">Escolha o horário</h2>
           
           <Card className="mb-6 border-slate-800 shadow-sm overflow-hidden bg-slate-900">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date: Date | undefined) => { if(date) setSelectedDate(date)}}
                disabled={(date) => {
                  if (isBeforeToday(date)) return true;
                  const dateKey = format(date, 'yyyy-MM-dd');
                  if (provider?.scheduleOverrides && provider.scheduleOverrides[dateKey]) {
                    return false; // Let them select it to either show custom times or the "closed" message explicitly
                  }
                  
                  let safeWorkingDays = [1, 2, 3, 4, 5];
                  if (Array.isArray(provider?.workingDays)) {
                     safeWorkingDays = provider.workingDays.map(Number);
                  } else if (typeof provider?.workingDays === 'string') {
                     try {
                       safeWorkingDays = JSON.parse(provider.workingDays).map(Number);
                     } catch(e) {}
                  }
                  
                  return !safeWorkingDays.includes(date.getDay());
                }}
                className="mx-auto rounded-xl text-white pointer-events-auto"
                locale={ptBR}
              />
           </Card>

           {selectedDate && (
             <div>
               <h3 className="font-medium text-slate-400 mb-3 flex justify-between items-end">
                 <span>Horários disponíveis em <br/><span className="text-purple-400 font-bold">{format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}</span></span>
               </h3>
               {isFetchingAppointments ? (
                 <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                   {[...Array(8)].map((_, i) => (
                     <div key={i} className="h-10 w-full rounded-md bg-slate-800 animate-pulse border border-slate-700" />
                   ))}
                 </div>
               ) : slots.length > 0 ? (
                 <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                   {slots.map(time => (
                      <Button 
                        key={time} 
                        variant={selectedTime === time ? 'default' : 'outline'}
                        className={selectedTime === time ? 'bg-purple-600 hover:bg-purple-700 text-white border-purple-600' : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-purple-500 hover:text-purple-400'}
                        onClick={() => setSelectedTime(time)}
                      >
                        {time}
                      </Button>
                   ))}
                 </div>
               ) : (
                 <div className="text-center py-8 bg-slate-900/50 rounded-xl border border-slate-800 border-dashed">
                   <p className="text-slate-400">Nenhum horário disponível para este dia.</p>
                 </div>
               )}
             </div>
           )}

          <div className="fixed bottom-0 left-0 w-full bg-slate-950 border-t border-slate-800 p-4 shadow-xl z-20">
            <div className="max-w-xl mx-auto flex justify-between">
              <Button variant="ghost" onClick={() => setStep(1)} className="text-slate-300 hover:text-white hover:bg-slate-800">Voltar</Button>
              <Button disabled={!selectedTime} className="bg-purple-600 hover:bg-purple-700 text-white px-8 rounded-full" onClick={() => setStep(3)}>
                Avançar
              </Button>
            </div>
          </div>
        </main>
      )}

      {step === 3 && (
        <main className="max-w-xl mx-auto px-4 py-8 animate-in fade-in slide-in-from-right-8 duration-300">
           <h2 className="font-bold text-xl mb-6 text-white">Seus dados</h2>
           
           <Card className="border-slate-800 shadow-sm mb-6 bg-slate-900 overflow-hidden">
             <div className="bg-slate-800/50 border-b border-slate-800 px-4 py-3 flex items-center justify-between">
               <span className="text-sm font-medium text-slate-400">Resumo</span>
               <span className="text-sm font-bold text-purple-400 cursor-pointer" onClick={() => setStep(1)}>Editar</span>
             </div>
             <CardContent className="p-4 space-y-3 font-medium text-sm">
               <div className="flex justify-between">
                 <span className="text-slate-400">Data</span>
                 <span className="text-white text-right">{format(selectedDate!, "dd/MM/yyyy")} às {selectedTime}</span>
               </div>
               <div className="flex justify-between">
                 <span className="text-slate-400">Serviços ({selectedServices.size})</span>
                 <span className="text-white text-right truncate max-w-[200px]">{selectedServicesList.map(s => s.title || s.name).join(', ')}</span>
               </div>
               <div className="flex justify-between pt-3 border-t border-slate-800">
                 <span className="text-white font-bold">Total a pagar</span>
                 <span className="text-white font-bold">R$ {totalPrice.toFixed(2)}</span>
               </div>
             </CardContent>
           </Card>

           <form id="booking-form" onSubmit={handleBooking} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-slate-300">Seu nome completo *</Label>
                <Input id="name" required value={clientName} onChange={e => setClientName(e.target.value)} className="bg-slate-900 border-slate-700 text-white text-base h-12 placeholder:text-slate-500" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="whatsapp" className="text-slate-300">WhatsApp *</Label>
                <Input id="whatsapp" required value={clientWhatsApp} onChange={e => setClientWhatsApp(maskWhatsApp(e.target.value))} placeholder="(00) 00000-0000" className="bg-slate-900 border-slate-700 text-white text-base h-12 placeholder:text-slate-500" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-300">E-mail (opcional)</Label>
                <Input id="email" type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} className="bg-slate-900 border-slate-700 text-white text-base h-12 placeholder:text-slate-500" />
              </div>
           </form>

          <div className="fixed bottom-0 left-0 w-full bg-slate-950 border-t border-slate-800 p-4 shadow-xl z-20">
            <div className="max-w-xl mx-auto flex justify-between">
              <Button variant="ghost" type="button" onClick={() => setStep(2)} className="text-slate-300 hover:text-white hover:bg-slate-800">Voltar</Button>
              <Button type="submit" form="booking-form" disabled={isSubmitting} className="bg-purple-600 hover:bg-purple-700 text-white px-8 rounded-full">
                {isSubmitting ? 'Confirmando...' : 'Confirmar Agendamento'}
              </Button>
            </div>
          </div>
        </main>
      )}

      {step === 4 && (
        <main className="max-w-md mx-auto px-4 py-20 text-center animate-in zoom-in-95 duration-500">
           <div className="w-20 h-20 bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6 text-green-400 border-4 border-green-900/50">
             <Check className="w-10 h-10" />
           </div>
           <h2 className="text-2xl font-bold tracking-tight text-white mb-2">Agendamento Solicitado!</h2>
           <p className="text-slate-400 mb-8">
             Seu pedido foi enviado para <b>{provider?.displayName}</b>.
             Você receberá uma confirmação no WhatsApp <br/><b>{clientWhatsApp}</b> em breve.
           </p>
           
           <Card className="bg-slate-900 shadow-sm border border-slate-800 mb-8 text-left">
             <CardContent className="p-5 text-sm space-y-2">
               <p className="flex justify-between"><span className="text-slate-400">Quando:</span> <strong className="text-white">{format(selectedDate!, "dd/MM/yyyy")} - {selectedTime}</strong></p>
               <p className="flex justify-between"><span className="text-slate-400">Profissional:</span> <strong className="text-white">{provider?.displayName}</strong></p>
               <p className="flex justify-between"><span className="text-slate-400">Valor total:</span> <strong className="text-white">R$ {totalPrice.toFixed(2)}</strong></p>
             </CardContent>
           </Card>

           {provider?.whatsapp && (
             <Button className="w-full rounded-full h-12 mb-4 bg-green-600 hover:bg-green-700 text-white font-bold" onClick={handleWhatsAppConfirm}>
               Confirmar pelo WhatsApp
             </Button>
           )}

           <Button variant="outline" className="w-full rounded-full h-12 border-slate-700 bg-slate-900 text-white hover:bg-slate-800" onClick={() => window.location.reload()}>
             Fazer novo agendamento
           </Button>
        </main>
      )}
    </div>
  );
}

function isBeforeToday(date: Date) {
  return isAfter(startOfDay(new Date()), date);
}
