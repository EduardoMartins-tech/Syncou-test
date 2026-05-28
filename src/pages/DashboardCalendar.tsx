import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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

const CustomToolbar = (toolbar: any) => {
  const goToBack = () => {
    toolbar.onNavigate('PREV');
  };

  const goToNext = () => {
    toolbar.onNavigate('NEXT');
  };

  const goToCurrent = () => {
    toolbar.onNavigate('TODAY');
  };

  const label = () => {
    const date = format(toolbar.date, 'MMMM yyyy', { locale: ptBR });
    return <span className="text-lg font-semibold text-white capitalize">{date}</span>;
  };

  return (
    <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
      <div className="flex items-center gap-2">
        <button
          onClick={goToCurrent}
          className="px-4 py-2 text-sm font-medium rounded-md bg-[#1A1333] hover:bg-[#2D214F] text-[#E2D9F3] transition-colors"
        >
          Hoje
        </button>
        <div className="flex items-center bg-[#1A1333] rounded-md overflow-hidden">
          <button
            onClick={goToBack}
            className="p-2 hover:bg-[#2D214F] text-[#E2D9F3] transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={goToNext}
            className="p-2 hover:bg-[#2D214F] text-[#E2D9F3] transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
      <div>
        {label()}
      </div>
      <div className="flex items-center gap-1 bg-[#1A1333] p-1 rounded-lg">
        {['month', 'week', 'day', 'agenda'].map((viewName) => (
          <button
            key={viewName}
            onClick={() => toolbar.onView(viewName)}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              toolbar.view === viewName
                ? 'bg-violet-600 text-white shadow-sm'
                : 'text-[#9B8FC0] hover:text-[#E2D9F3] hover:bg-[#2D214F]'
            }`}
          >
            {messagesConfig[viewName as keyof typeof messagesConfig]}
          </button>
        ))}
      </div>
    </div>
  );
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
              color: #E2D9F3;
              font-family: inherit;
            }
            .rbc-header {
              padding: 12px 0;
              border-bottom: 1px solid #2D214F;
              border-left: 1px solid #2D214F;
              background-color: #130E20;
              color: #9B8FC0;
              font-weight: 500;
              text-transform: capitalize;
            }
            .rbc-header + .rbc-header {
              border-left: 1px solid #2D214F;
            }
            .rbc-month-view, .rbc-time-view, .rbc-agenda-view {
              border: 1px solid #2D214F;
              background: #0B0914;
              border-radius: 12px;
              overflow: hidden;
            }
            .rbc-day-bg + .rbc-day-bg {
              border-left: 1px solid #2D214F;
            }
            .rbc-month-row + .rbc-month-row {
              border-top: 1px solid #2D214F;
            }
            .rbc-time-content {
              border-top: 1px solid #2D214F;
            }
            .rbc-time-header-content {
              border-left: 1px solid #2D214F;
            }
            .rbc-time-slot {
              border-top: 1px dotted #2D214F;
            }
            .rbc-time-gutter .rbc-time-slot {
              color: #9B8FC0;
              border-top: none;
              font-size: 0.8rem;
              padding-right: 8px;
            }
            .rbc-timeslot-group {
              border-bottom: 1px solid #2D214F;
            }
            .rbc-today {
              background-color: rgba(139, 92, 246, 0.08);
            }
            .rbc-off-range-bg {
              background-color: #050409;
            }
            .rbc-date-cell {
              padding: 8px;
              font-weight: 500;
              text-align: right;
            }
            .rbc-event {
              padding: 4px 8px;
              border-radius: 6px;
              box-shadow: 0 1px 2px rgba(0,0,0,0.2);
            }
            .rbc-event.rbc-selected {
              background-color: #8B5CF6 !important;
            }
            .rbc-current-time-indicator {
              background-color: #8B5CF6;
              height: 2px;
            }
            .rbc-current-time-indicator::before {
              content: '';
              display: block;
              width: 8px;
              height: 8px;
              border-radius: 50%;
              background-color: #8B5CF6;
              position: absolute;
              left: -4px;
              top: -3px;
            }
            .rbc-agenda-view table.rbc-agenda-table tbody > tr > td + td {
              border-left: 1px solid #2D214F;
            }
            .rbc-agenda-view table.rbc-agenda-table {
              border: none;
            }
            .rbc-agenda-view table.rbc-agenda-table tbody > tr + tr {
              border-top: 1px solid #2D214F;
            }
            .rbc-agenda-view table.rbc-agenda-table thead > tr > th {
              border-bottom: 1px solid #2D214F;
              padding: 12px;
              text-align: left;
            }
            .rbc-agenda-view table.rbc-agenda-table tbody > tr > td {
              padding: 12px;
            }
          `}} />
          {isFetching ? (
            <div className="h-[700px] flex items-center justify-center">
               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
            </div>
          ) : (
            <div className="space-y-4">
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
                components={{
                  toolbar: CustomToolbar
                }}
              />
              <div className="flex justify-start sm:justify-end items-center gap-4 pt-4 border-t border-[#2D214F] text-sm font-medium">
                <span className="text-[#5B4F81] mr-2">Legenda:</span>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-[#10B981]/10 border border-[#10B981]/20 rounded-md transition-all duration-300">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
                  <span className="text-[#10B981] flex items-center">
                    Confirmado (
                    <div className="relative inline-flex items-center justify-center min-w-[12px] h-[20px] mx-1">
                      <AnimatePresence mode="popLayout" initial={false}>
                        <motion.span
                          key={events.filter(e => e.isConfirmed).length}
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          transition={{ duration: 0.2 }}
                        >
                          {events.filter(e => e.isConfirmed).length}
                        </motion.span>
                      </AnimatePresence>
                    </div>
                    )
                  </span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-[#F59E0B]/10 border border-[#F59E0B]/20 rounded-md transition-all duration-300">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
                  <span className="text-[#F59E0B] flex items-center">
                    Pendente (
                    <div className="relative inline-flex items-center justify-center min-w-[12px] h-[20px] mx-1">
                      <AnimatePresence mode="popLayout" initial={false}>
                        <motion.span
                          key={events.filter(e => !e.isConfirmed).length}
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          transition={{ duration: 0.2 }}
                        >
                          {events.filter(e => !e.isConfirmed).length}
                        </motion.span>
                      </AnimatePresence>
                    </div>
                    )
                  </span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
