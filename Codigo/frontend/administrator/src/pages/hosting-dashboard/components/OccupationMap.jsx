import React, { useMemo, useState } from 'react';
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameMonth, startOfMonth, startOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Icon from '../../../components/AppIcon';
import HostingReservationModal from './HostingReservationModal';

const weekDays = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];

const statusConfig = {
  occupied: {
    color: 'bg-yellow-400',
    label: 'Ocupado (check-in feito)',
  },
  reserved: {
    color: 'bg-sky-500',
    label: 'Reservado (check-in pendente)',
  },
  free: {
    color: 'bg-emerald-500',
    label: 'Livre',
  },
  maintenance: {
    color: 'bg-gray-300',
    label: 'Indisponível/Manutenção',
  },
};

const chaletsData = [
  {
    id: 'jardim',
    name: 'Quarto Jardim',
    bookings: [
      { start: new Date(2026, 3, 1), end: new Date(2026, 3, 2), status: 'occupied', guest: 'Carlos Mendes', details: 'Check-in concluído' },
      { start: new Date(2026, 3, 3), end: new Date(2026, 3, 5), status: 'reserved', guest: 'Fernanda Rocha', details: 'Check-in previsto às 14:00' },
      { start: new Date(2026, 3, 14), end: new Date(2026, 3, 15), status: 'maintenance', guest: null, details: 'Manutenção preventiva' },
    ],
  },
  {
    id: 'serra',
    name: 'Quarto Serra',
    bookings: [
      { start: new Date(2026, 3, 8), end: new Date(2026, 3, 11), status: 'occupied', guest: 'Bianca Almeida', details: 'Hospedagem em andamento' },
      { start: new Date(2026, 3, 17), end: new Date(2026, 3, 19), status: 'reserved', guest: 'José Silveira', details: 'Pagamento confirmado' },
    ],
  },
  {
    id: 'lago',
    name: 'Quarto Lago',
    bookings: [
      { start: new Date(2026, 3, 2), end: new Date(2026, 3, 4), status: 'reserved', guest: 'Marina Lopes', details: 'Aguardando check-in' },
      { start: new Date(2026, 3, 20), end: new Date(2026, 3, 23), status: 'occupied', guest: 'Paulo Nunes', details: 'Check-in concluído' },
      { start: new Date(2026, 3, 28), end: new Date(2026, 3, 30), status: 'maintenance', guest: null, details: 'Bloqueado para limpeza profunda' },
    ],
  },
  {
    id: 'bosque',
    name: 'Quarto Bosque',
    bookings: [
      { start: new Date(2026, 3, 6), end: new Date(2026, 3, 7), status: 'occupied', guest: 'Sofia Teixeira', details: 'Check-in concluído' },
      { start: new Date(2026, 3, 12), end: new Date(2026, 3, 14), status: 'reserved', guest: 'Ricardo Matos', details: 'Pré-pagamento aprovado' },
    ],
  },
];

const compareDay = (a, b) => format(a, 'yyyy-MM-dd') === format(b, 'yyyy-MM-dd');

const getDayInfo = (chalet, day) => {
  const booking = chalet.bookings.find((item) => day >= item.start && day <= item.end);
  if (!booking) {
    return {
      status: 'free',
      guest: null,
      details: 'Disponível para reserva',
    };
  }
  return booking;
};

const MonthCalendar = ({ chalet, monthDate, onOpenReservation }) => {
  const days = useMemo(() => {
    const monthStart = startOfMonth(monthDate);
    const monthEnd = endOfMonth(monthDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [monthDate]);

  return (
    <div className="border border-border rounded-lg p-3">
      <div className="text-sm font-medium text-foreground capitalize mb-3">
        {format(monthDate, 'MMMM yyyy', { locale: ptBR })}
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map((weekDay, index) => (
          <div key={`${weekDay}-${index}`} className="text-xs text-center text-muted-foreground font-medium">
            {weekDay}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const isCurrentMonth = isSameMonth(day, monthDate);
          const dayInfo = getDayInfo(chalet, day);
          const status = statusConfig[dayInfo.status] || statusConfig.free;

          return (
            <button
              key={`${chalet.id}-${format(monthDate, 'yyyy-MM')}-${format(day, 'yyyy-MM-dd')}`}
              type="button"
              onClick={() =>
                onOpenReservation({
                  chaletName: chalet.name,
                  statusLabel: status.label,
                  dateLabel: format(day, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }),
                  guest: dayInfo.guest,
                  details: dayInfo.details,
                })
              }
              title={`${format(day, 'dd/MM/yyyy')} - ${status.label}${dayInfo.guest ? ` - ${dayInfo.guest}` : ''}`}
              className={`h-8 rounded-md text-xs font-medium flex items-center justify-center transition-smooth border border-transparent hover:border-border ${status.color} ${
                isCurrentMonth ? 'text-gray-900' : 'text-gray-500 opacity-55'
              } ${compareDay(day, new Date()) ? 'ring-1 ring-primary ring-offset-1 ring-offset-card' : ''}`}
            >
              {format(day, 'dd')}
            </button>
          );
        })}
      </div>
    </div>
  );
};

const ChaletCalendar = ({ chalet, onOpenReservation }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date(2026, 3, 1));

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <h4 className="text-base font-heading font-semibold text-foreground mb-3">{chalet.name}</h4>
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() => setCurrentMonth((prev) => addMonths(prev, -1))}
          className="w-7 h-7 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-smooth flex items-center justify-center"
          aria-label="Período anterior"
        >
          <Icon name="ChevronLeft" size={14} />
        </button>
        <span className="text-sm font-medium text-foreground">
          Janela de 60 dias
        </span>
        <button
          type="button"
          onClick={() => setCurrentMonth((prev) => addMonths(prev, 1))}
          className="w-7 h-7 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-smooth flex items-center justify-center"
          aria-label="Próximo período"
        >
          <Icon name="ChevronRight" size={14} />
        </button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {[currentMonth, addMonths(currentMonth, 1)].map((month) => (
          <MonthCalendar
            key={`${chalet.id}-${format(month, 'yyyy-MM')}`}
            chalet={chalet}
            monthDate={month}
            onOpenReservation={onOpenReservation}
          />
        ))}
      </div>
    </div>
  );
};

const OccupationMap = () => {
  const [selectedReservation, setSelectedReservation] = useState(null);

  return (
    <div className="bg-card border border-border rounded-lg p-6 space-y-5">
      <div>
        <h3 className="text-lg font-heading font-semibold text-foreground">Mapa de Ocupação</h3>
        <p className="text-sm text-muted-foreground">Calendário individual por chalé</p>
      </div>

      <div className="flex flex-col gap-4">
        {chaletsData.map((chalet) => (
          <ChaletCalendar key={chalet.id} chalet={chalet} onOpenReservation={setSelectedReservation} />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-4 text-sm">
        {Object.entries(statusConfig).map(([key, value]) => (
          <div key={key} className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-sm ${value.color}`} />
            <span className="text-muted-foreground">{value.label}</span>
          </div>
        ))}
      </div>

      <HostingReservationModal
        isOpen={Boolean(selectedReservation)}
        reservation={selectedReservation}
        onClose={() => setSelectedReservation(null)}
      />
    </div>
  );
};

export default OccupationMap;
