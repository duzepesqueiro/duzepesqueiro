import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CalendarIcon, Users, PawPrint, Search, Plus, Minus } from 'lucide-react';
import { differenceInCalendarDays, format, startOfDay } from 'date-fns';
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
  const navigate = useNavigate();
  const { booking, setBooking } = useBooking();
  const [searchError, setSearchError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(
    booking.checkIn && booking.checkOut
      ? { from: booking.checkIn, to: booking.checkOut }
      : undefined
  );

  // Normalização das datas bloqueadas
  const normalizedBlocks = useMemo(() => 
    blockedDates
      .filter(b => b.start && b.end && !isNaN(b.start.getTime()) && !isNaN(b.end.getTime()))
      .map(b => ({
        start: startOfDay(b.start),
        end: startOfDay(b.end),
      })),
    [blockedDates]
  );

  const isDateBlocked = (date: Date) => {
    const target = startOfDay(date);
    return normalizedBlocks.some(block => target >= block.start && target <= block.end);
  };

  const getValidationError = (): string | null => {
    if (!dateRange?.from || !dateRange?.to) return 'Selecione check-in e check-out.';
    
    const from = startOfDay(dateRange.from);
    const to = startOfDay(dateRange.to);
    const today = startOfDay(new Date());

    if (from < today) return 'Check-in não pode ser em data passada.';
    if (differenceInCalendarDays(to, from) <= 0) return 'Check-out deve ser após o check-in.';
    
    const overlaps = normalizedBlocks.some(b => from <= b.end && to >= b.start);
    if (overlaps) return 'O período selecionado contém datas indisponíveis.';

    return null;
  };

  const handleSearch = () => {
    const error = getValidationError();
    if (error) {
      setSearchError(error);
      toast({ title: 'Atenção', description: error, variant: 'destructive' });
      return;
    }

    setSearchError(null);

    // Sincroniza Contexto
    setBooking(prev => ({
      ...prev,
      checkIn: dateRange?.from ?? null,
      checkOut: dateRange?.to ?? null,
    }));

    // Build Query Params
    const params = new URLSearchParams({
      checkIn: format(dateRange!.from!, 'yyyy-MM-dd'),
      checkOut: format(dateRange!.to!, 'yyyy-MM-dd'),
      guests: String(booking.guests),
      pets: booking.pets ? '1' : '0',
    });

    navigate(`/hospedagem/rooms?${params.toString()}`);
  };

  const updateGuestCount = (val: number) => {
    setBooking(prev => ({ 
      ...prev, 
      guests: Math.min(Math.max(prev.guests + val, 1), 10) 
    }));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.6 }}
      className={cn('rounded-3xl p-6 md:p-8 w-full max-w-5xl mx-auto', className)}
    >
      <div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-4">
        
        {/* Datas */}
        <SearchField label="Check-in / Check-out">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full h-12 border-0 bg-[#E9F2F1]/10 text-[#E9F2F1] hover:bg-[#E9F2F1]/20 hover:text-white',
                  !dateRange?.from && 'opacity-70'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                <span className="text-sm">
                  {dateRange?.from ? (
                    dateRange.to 
                      ? `${format(dateRange.from, 'dd/MM')} - ${format(dateRange.to, 'dd/MM')}`
                      : format(dateRange.from, 'dd MMM', { locale: ptBR })
                  ) : 'Selecione as datas'}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={(v) => { setDateRange(v); setSearchError(null); }}
                numberOfMonths={2}
                disabled={(date) => date < startOfDay(new Date()) || isDateBlocked(date)}
                className="p-3"
              />
            </PopoverContent>
          </Popover>
        </SearchField>

        {/* Hóspedes */}
        <SearchField label="Hóspedes">
          <div className="flex items-center justify-center gap-4 rounded-xl bg-[#E9F2F1]/10 px-4 py-2 h-12">
            <Users className="h-4 w-4 text-[#E9F2F1]/80" />
            <CounterButton onClick={() => updateGuestCount(-1)} icon={<Minus className="h-4 w-4" />} />
            <span className="min-w-[24px] font-bold text-[#E9F2F1]">{booking.guests}</span>
            <CounterButton onClick={() => updateGuestCount(1)} icon={<Plus className="h-4 w-4" />} />
          </div>
        </SearchField>

        {/* Pets */}
        <SearchField label="Levará animais?">
          <div className="flex items-center justify-center gap-3 rounded-xl bg-[#E9F2F1]/10 px-4 py-2 h-12">
            <PawPrint className="h-4 w-4 text-[#E9F2F1]/80" />
            <Switch
              checked={booking.pets}
              onCheckedChange={(val) => setBooking(prev => ({ ...prev, pets: val }))}
            />
            <span className="text-sm text-[#E9F2F1] w-8">{booking.pets ? 'Sim' : 'Não'}</span>
          </div>
        </SearchField>

        {/* Botão de Busca */}
        <div className="flex flex-col items-center justify-center gap-2 p-4">
          <button
            onClick={handleSearch}
            disabled={isLoadingBlocked}
            className="btn-gold w-full h-12 flex items-center justify-center gap-2 text-sm font-bold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
          >
            <Search className="h-4 w-4" />
            {isLoadingBlocked ? 'Validando...' : 'Ver disponibilidade'}
          </button>
          {searchError && <p className="text-[10px] text-[#F2F0CE] font-medium uppercase">{searchError}</p>}
        </div>
      </div>
    </motion.div>
  );
};

// Sub-componentes utilitários locais para limpar o JSX principal
const SearchField = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex flex-col items-center justify-center gap-3 p-4 text-center">
    <label className="text-[10px] font-bold text-[#E9F2F1]/80 uppercase tracking-widest leading-none">
      {label}
    </label>
    {children}
  </div>
);

const CounterButton = ({ onClick, icon }: { onClick: () => void; icon: React.ReactNode }) => (
  <button
    onClick={onClick}
    className="w-7 h-7 flex items-center justify-center rounded-full bg-[#E9F2F1]/15 text-[#E9F2F1] hover:bg-[#F2F0CE] hover:text-[#0D5673] transition-all"
  >
    {icon}
  </button>
);

export default SearchBox;