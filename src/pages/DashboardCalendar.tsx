import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Calendar as CalendarIcon, Clock, MapPin, User, ChevronLeft, ChevronRight } from 'lucide-react';
import { Calendar, dateFnsLocalizer, Views, View } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import ptBR from 'date-fns/locale/pt-BR';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { format as formatTZ, toZonedTime } from 'date-fns-tz';

const locales = {
  'pt-BR': ptBR,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

const messagesConfig = {
  allDay: 'Dia todo',
  previous: 'Anterior',
  next: 'Próximo',
  today: 'Hoje',
  month: 'Mês',
  week: 'Semana',
  day: 'Dia',
  agenda: 'Agenda',
  date: 'Data',
  time: 'Hora',
  event: 'Evento',
  noEventsInRange: 'Não há agendamentos neste período.',
  showMore: (total: number) => `+ mais ${total}`
};

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
  bookingSource: string;
  cancelReason?: string;
}

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

export function DashboardCalendar() {
  const { getAuthHeaders } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [view, setView] = useState<View>(Views.WEEK);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [aptRes, srvRes] = await Promise.all([
          fetch('/api/appointments', { headers: getAuthHeaders() }),
          fetch('/api/services', { headers: getAuthHeaders() })
        ]);
        
        if (aptRes.ok) setAppointments(await aptRes.json());
        if (srvRes.ok) setServices(await srvRes.json());
      } catch (err) {
        console.error(err);
      } finally {
        setIsFetching(false);
      }
    };
    fetchAll();
  }, []);

  const getAptServicesText = (aptServices: string[]) => {
    if (!aptServices || !Array.isArray(aptServices)) return 'serviços selecionados';
    const matchedNames = aptServices
      .map(id => services.find(s => s.id === id)?.name || services.find(s => s.id === id)?.title)
      .filter(Boolean);
    return matchedNames.length > 0 ? matchedNames.join(', ') : 'serviços selecionados';
  };

  const events = appointments
    .filter(a => a.status === 'confirmed' || a.status === 'Confirmado' || a.status === 'Pendente' || a.status === 'scheduled' || !a.status)
    .map(apt => {
      const isConfirmed = apt.status === 'confirmed' || apt.status === 'Confirmado';
      return {
        id: apt.id,
        title: `${apt.clientName} - ${getAptServicesText(apt.services)}`,
        start: new Date(apt.startAt),
        end: new Date(apt.endAt || apt.startAt + apt.totalDuration * 60000),
        resource: apt,
        isConfirmed
      };
    });

  const eventStyleGetter = (event: any) => {
    const backgroundColor = event.isConfirmed ? '#10B981' : '#F59E0B';
    const style = {
      backgroundColor: backgroundColor,
      borderRadius: '5px',
      opacity: 0.9,
      color: 'white',
      border: '0px',
      display: 'block',
      padding: '2px 5px',
      fontSize: '0.8rem',
      fontWeight: '500'
    };
    return {
      style
    };
  };

  const handleSelectEvent = (event: any) => {
     // Could open a modal to show details, for now just expanding the existing DashboardHome interaction, or simple alert
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 overflow-hidden">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="flex justify-between items-end gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Calendário</h1>
          <p className="text-[#9B8FC0]">Visualize e gerencie todos os seus agendamentos.</p>
        </div>
      </motion.div>

      <Card className="bg-[#130E20] border-[#2D214F] shadow-sm overflow-visible">
        <CardContent className="p-6">
          <style dangerouslySetInnerHTML={{__html: `
            .rbc-calendar {
              min-height: 700px;
              color: white;
            }
            .rbc-toolbar button {
              color: white;
              border-color: #2D214F;
              background: #0B0914;
            }
            .rbc-toolbar button:active, .rbc-toolbar button.rbc-active {
              background: #2D214F;
              color: white;
              border-color: #2D214F;
            }
            .rbc-toolbar button:hover {
              background: #1A1333;
              color: white;
            }
            .rbc-header {
              padding: 10px 0;
              border-bottom: 1px solid #2D214F;
              border-left: 1px solid #2D214F;
              color: #9B8FC0;
              font-weight: 500;
            }
            .rbc-month-view, .rbc-time-view, .rbc-agenda-view {
              border-color: #2D214F;
              background: #0B0914;
              border-radius: 8px;
            }
            .rbc-day-bg {
              border-left: 1px solid #2D214F;
            }
            .rbc-month-row {
              border-top: 1px solid #2D214F;
            }
            .rbc-time-content {
              border-top: 1px solid #2D214F;
            }
            .rbc-time-header-content {
              border-left: 1px solid #2D214F;
            }
            .rbc-time-slot {
              border-top: 1px solid #2D214F;
            }
            .rbc-time-gutter .rbc-time-slot {
              color: #5B4F81;
            }
            .rbc-timeslot-group {
              border-bottom: 1px solid #2D214F;
            }
            .rbc-today {
              background-color: rgba(139, 92, 246, 0.05);
            }
            .rbc-off-range-bg {
              background-color: #050409;
            }
            .rbc-date-cell {
              padding-right: 5px;
            }
            .rbc-event {
              padding: 2px 5px;
            }
            .rbc-btn-group {
              margin-bottom: 10px;
            }
          `}} />
          {isFetching ? (
            <div className="h-[700px] flex items-center justify-center">
               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
            </div>
          ) : (
            <Calendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              style={{ height: 700 }}
              messages={messagesConfig}
              culture="pt-BR"
              eventPropGetter={eventStyleGetter}
              view={view}
              onView={(newView) => setView(newView)}
              onSelectEvent={handleSelectEvent}
              min={new Date(0, 0, 0, 6, 0, 0)} // Start at 6 AM
              max={new Date(0, 0, 0, 22, 0, 0)} // End at 10 PM
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
