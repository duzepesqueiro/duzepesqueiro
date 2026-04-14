import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CalendarIcon, Users, PawPrint, Search } from 'lucide-react';
import { format, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useBooking } from '@/contexts/BookingContext';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import type { DateRange } from 'react-day-picker';

type BlockedDateRange = { start: Date; end: Date; reason?: string };

interface SearchBoxProps {
  blockedDates?: BlockedDateRange[];
  isLoadingBlocked?: boolean;
  className?: string;
}

const SearchBox = ({
  blockedDates = [],
  isLoadingBlocked = false,
  className,
}: SearchBoxProps) => {
  const { booking, setBooking } = useBooking();
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState<DateRange | undefined>(
    booking.checkIn && booking.checkOut
      ? { from: booking.checkIn, to: booking.checkOut }
      : undefined
  );

  const normalizedBlocks = useMemo(
    () =>
      blockedDates
        .filter(
          (b) =>
            b.start &&
            b.end &&
            !Number.isNaN(b.start.getTime()) &&
            !Number.isNaN(b.end.getTime())
        )
        .map((b) => ({
          start: startOfDay(b.start),
          end: startOfDay(b.end),
          reason: b.reason,
        })),
    [blockedDates]
  );

  const isDateBlocked = (date: Date) => {
    if (!normalizedBlocks.length) return false;
    const target = startOfDay(date);
    return normalizedBlocks.some(
      (block) => target >= block.start && target <= block.end
    );
  };

  const handleSearch = () => {
    if (!dateRange?.from || !dateRange?.to) {
      toast({
        title: 'Selecione as datas',
        description:
          'O campo de check-in/check-out é obrigatório para buscar disponibilidade.',
        variant: 'destructive',
      });
      return;
    }

    // Garante que o contexto esteja sincronizado com o que vai para a listagem.
    setBooking((prev) => ({
      ...prev,
      checkIn: dateRange?.from || null,
      checkOut: dateRange?.to || null,
      pets: prev.pets,
      guests: prev.guests,
    }));

    const searchParams = new URLSearchParams();
    searchParams.set('checkIn', format(dateRange.from, 'yyyy-MM-dd'));
    searchParams.set('checkOut', format(dateRange.to, 'yyyy-MM-dd'));
    searchParams.set('guests', String(booking.guests));
    searchParams.set('pets', booking.pets ? '1' : '0');

    navigate(`/hospedagem/rooms?${searchParams.toString()}`);
  };

  const incrementGuests = () =>
    setBooking((prev) => ({ ...prev, guests: Math.min(prev.guests + 1, 10) }));
  const decrementGuests = () =>
    setBooking((prev) => ({ ...prev, guests: Math.max(prev.guests - 1, 1) }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.6 }}
      className={cn(
        'glass rounded-2xl p-6 md:p-8 w-full max-w-4xl mx-auto shadow-xl',
        className
      )}
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
                      {format(dateRange.from, 'dd/MM', { locale: ptBR })} —{' '}
                      {format(dateRange.to, 'dd/MM', { locale: ptBR })}
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
                disabled={(date) =>
                  date < startOfDay(new Date()) || isDateBlocked(date)
                }
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
              –
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
              onCheckedChange={(checked) =>
                setBooking((prev) => ({ ...prev, pets: checked }))
              }
            />
            <span className="text-sm text-foreground">
              {booking.pets ? 'Sim' : 'Não'}
            </span>
          </div>
        </div>

        {/* CTA */}
        <div>
          <button
            onClick={handleSearch}
            disabled={!dateRange?.from || !dateRange?.to || isLoadingBlocked}
            className="btn-gold w-full h-12 flex items-center justify-center gap-2 text-sm disabled:opacity-70 disabled:cursor-not-allowed"
          >
            <Search className="h-4 w-4" />
            {isLoadingBlocked ? 'Validando datas...' : 'Ver disponibilidade'}
          </button>
          <p className="mt-2 text-xs text-muted-foreground">
            Datas passadas e períodos bloqueados pelo servidor ficam indisponíveis.
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default SearchBox;
