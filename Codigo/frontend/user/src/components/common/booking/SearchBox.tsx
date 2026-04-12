import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CalendarIcon, Users, PawPrint, Search } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useBooking } from '@/contexts/BookingContext';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import type { DateRange } from 'react-day-picker';

const SearchBox = () => {
  const { booking, setBooking } = useBooking();
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState<DateRange | undefined>(
    booking.checkIn && booking.checkOut
      ? { from: booking.checkIn, to: booking.checkOut }
      : undefined
  );

  const handleSearch = () => {
    setBooking(prev => ({
      ...prev,
      checkIn: dateRange?.from || null,
      checkOut: dateRange?.to || null,
    }));
    navigate('/hospedagem/rooms');
  };

  const incrementGuests = () => setBooking(prev => ({ ...prev, guests: Math.min(prev.guests + 1, 10) }));
  const decrementGuests = () => setBooking(prev => ({ ...prev, guests: Math.max(prev.guests - 1, 1) }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.6 }}
      className="glass rounded-2xl p-6 md:p-8 w-full max-w-4xl mx-auto"
      style={{ boxShadow: 'var(--shadow-elevated)' }}
    >
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6 items-end">
        {/* Date Range */}
        <div className="md:col-span-1">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
            Check-in / Check-out
          </label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal h-12',
                  !dateRange?.from && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <span className="text-sm">
                      {format(dateRange.from, 'dd/MM', { locale: ptBR })} — {format(dateRange.to, 'dd/MM', { locale: ptBR })}
                    </span>
                  ) : (
                    format(dateRange.from, 'dd MMM', { locale: ptBR })
                  )
                ) : (
                  <span className="text-sm">Selecione as datas</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={2}
                disabled={(date) => date < new Date()}
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Guests */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
            Hóspedes
          </label>
          <div className="flex items-center h-12 border border-input rounded-lg px-3">
            <Users className="h-4 w-4 text-muted-foreground mr-2" />
            <button
              onClick={decrementGuests}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-muted text-foreground font-bold text-lg hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              −
            </button>
            <span className="mx-3 font-semibold text-foreground min-w-[20px] text-center">
              {booking.guests}
            </span>
            <button
              onClick={incrementGuests}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-muted text-foreground font-bold text-lg hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              +
            </button>
          </div>
        </div>

        {/* Pets */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
            Levará animais?
          </label>
          <div className="flex items-center h-12 border border-input rounded-lg px-3 gap-3">
            <PawPrint className="h-4 w-4 text-muted-foreground" />
            <Switch
              checked={booking.pets}
              onCheckedChange={(checked) => setBooking(prev => ({ ...prev, pets: checked }))}
            />
            <span className="text-sm text-foreground">{booking.pets ? 'Sim' : 'Não'}</span>
          </div>
        </div>

        {/* CTA */}
        <div>
          <button onClick={handleSearch} className="btn-gold w-full h-12 flex items-center justify-center gap-2 text-sm">
            <Search className="h-4 w-4" />
            Ver disponibilidade
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default SearchBox;
