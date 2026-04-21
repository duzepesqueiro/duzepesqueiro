import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, PawPrint, Check, ChevronLeft, Flame, X, CalendarIcon } from 'lucide-react';
import { format, differenceInCalendarDays, differenceInDays, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Header from '@/components/common/layout/Header';
import { useBooking } from '@/contexts/BookingContext';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { BookingData, Room } from '@/types/booking';
import { api } from '@/lib/api';
import type { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { mapApiChaletToRoom } from '@/lib/hostingRoomMapper';
import { formatBRL } from '@/lib/currency';
import SectionTitle from '@/components/common/layout/SectionTitle';

type RoomLocationState = {
  room?: Room;
  booking?: Pick<BookingData, 'checkIn' | 'checkOut' | 'guests' | 'pets'>;
};

type ApiChaletDetail = {
  id: string;
  name: string;
  description?: string;
  unitType?: string;
  maxGuests?: number;
  basePrice?: number;
  currentPrice?: number;
  amenities?: string[];
  images?: Array<{ id?: string; imageUrl?: string }>;
  petFriendly?: boolean;
  rooms?: string[];
  notes?: string;
};

type ChaletCalendarDTO = {
  chaletId: string;
  from: string;
  to: string;
  reservedDates: string[];
  unavailableDates: string[];
};

const MAX_IMAGES = 10;
const ROOM_TYPE_LABEL: Record<Room['type'], string> = {
  standard: 'Standard',
  deluxe: 'Deluxe',
  suite: 'Suíte',
  cabin: 'Chalé',
};

const toDateKey = (date: Date) => format(date, 'yyyy-MM-dd');

const isRangeInvalid = (
  range: DateRange | undefined,
  unavailableDates: Set<string>
) => {
  if (!range?.from || !range?.to) return false;
  const from = startOfDay(range.from);
  const to = startOfDay(range.to);
  if (differenceInCalendarDays(to, from) <= 0) return true;
  const cursor = new Date(from);
  while (cursor <= to) {
    const key = toDateKey(cursor);
    if (unavailableDates.has(key)) return true;
    cursor.setDate(cursor.getDate() + 1);
  }
  return false;
};

const RoomDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { booking, setBooking } = useBooking();
  const locationRoom = (location.state as RoomLocationState | null | undefined)?.room;
  const { data: apiRoomData, isLoading } = useQuery<ApiChaletDetail>({
    queryKey: ['room-detail', id],
    queryFn: async () => {
      const { data } = await api.get(`/api/chales/${id}`);
      return data as ApiChaletDetail;
    },
    enabled: Boolean(id),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });
  const apiRoom = useMemo(() => (apiRoomData ? mapApiChaletToRoom(apiRoomData) : null), [apiRoomData]);
  const room = apiRoom ?? (locationRoom && locationRoom.id === id ? locationRoom : null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const [expandedImageIndex, setExpandedImageIndex] = useState<number | null>(null);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const [selectedRange, setSelectedRange] = useState<DateRange | undefined>(
    booking.checkIn && booking.checkOut ? { from: booking.checkIn, to: booking.checkOut } : undefined
  );

  const { data: calendarData } = useQuery<ChaletCalendarDTO>({
    queryKey: ['room-calendar', id],
    queryFn: async () => {
      const from = format(startOfDay(new Date()), 'yyyy-MM-dd');
      const to = format(startOfDay(new Date(new Date().setFullYear(new Date().getFullYear() + 1))), 'yyyy-MM-dd');
      const { data } = await api.get(`/api/chales/${id}/calendario`, { params: { from, to } });
      return data as ChaletCalendarDTO;
    },
    enabled: Boolean(id),
    staleTime: 1000 * 60 * 5,
  });

  const unavailableDateSet = useMemo(
    () =>
      new Set(
        [...(calendarData?.reservedDates || []), ...(calendarData?.unavailableDates || [])].filter(Boolean)
      ),
    [calendarData?.reservedDates, calendarData?.unavailableDates]
  );

  const carouselSlides = useMemo<Array<string | null>>(() => {
    const images = (room?.images ?? []).slice(0, MAX_IMAGES);
    if (!images.length) return [null];
    return images;
  }, [room?.id, room?.images]);

  const galleryImages = useMemo(() => (room?.images ?? []).slice(0, MAX_IMAGES), [room?.images]);

  useEffect(() => {
    setActiveSlide(0);
  }, [room?.id]);

  useEffect(() => {
    if (booking.checkIn && booking.checkOut) {
      setSelectedRange({ from: booking.checkIn, to: booking.checkOut });
    }
  }, [booking.checkIn, booking.checkOut]);

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setExpandedImageIndex(null);
      }
    };

    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  if (!room && isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Carregando dados do chalé...</p>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Quarto não encontrado.</p>
      </div>
    );
  }

  const nights = booking.checkIn && booking.checkOut
    ? differenceInDays(booking.checkOut, booking.checkIn)
    : 1;
  const pricePerNight = room.pricePerNight;
  const totalPrice = pricePerNight * Math.max(nights, 1);

  const goToPreviousSlide = () => {
    setActiveSlide((current) => (current - 1 + carouselSlides.length) % carouselSlides.length);
  };

  const goToNextSlide = () => {
    setActiveSlide((current) => (current + 1) % carouselSlides.length);
  };

  const handleBookNow = async () => {
    if (!selectedRange?.from || !selectedRange?.to) {
      setCalendarError('Selecione check-in e check-out para continuar.');
      return;
    }
    if (isRangeInvalid(selectedRange, unavailableDateSet)) {
      setCalendarError('O período selecionado contém datas indisponíveis.');
      return;
    }

    const checkIn = startOfDay(selectedRange.from);
    const checkOut = startOfDay(selectedRange.to);
    setIsCheckingAvailability(true);
    setCalendarError(null);
    try {
      const { data } = await api.get('/api/chales/disponibilidade', {
        params: {
          chaleId: room.id,
          checkin: toDateKey(checkIn),
          checkout: toDateKey(checkOut),
        },
      });
      if (!data?.available) {
        setCalendarError('Este chalé ficou indisponível no período selecionado. Escolha outras datas.');
        return;
      }
    } catch {
      setCalendarError('Não foi possível validar disponibilidade agora. Tente novamente.');
      return;
    } finally {
      setIsCheckingAvailability(false);
    }

    setBooking((prev) => ({
      ...prev,
      roomId: room.id,
      checkIn,
      checkOut,
    }));
    const roomForBooking: Room = { ...room, pricePerNight };
    navigate('/hospedagem/booking', {
      state: {
        room: roomForBooking,
        booking: {
          checkIn,
          checkOut,
          guests: booking.guests,
          pets: booking.pets,
        },
      },
    });
  };

  const activeSlideImage = carouselSlides[activeSlide];

  return (
    <div className="relative min-h-screen bg-[#F2F2F2]">
      <Header open={sidebarOpen} setOpen={setSidebarOpen} />

      <main className={`relative z-10 transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-16'}`}>
        <div className="pt-24 pb-16 px-4">
          <div className="mx-auto w-[95vw] lg:w-[80vw]">
            <button
              onClick={() => navigate('/hospedagem/rooms')}
              className="mb-6 inline-flex items-center gap-1 rounded-lg border border-[#024059]/25 bg-[#F2BF27]/25 px-3 py-2 text-sm font-medium text-[#024059] transition-colors hover:bg-[#F2BF27]/40"
            >
              <ChevronLeft className="h-4 w-4" /> Voltar aos quartos
            </button>

            <div className="grid grid-cols-1 gap-10 xl:grid-cols-12">
              <div className="xl:col-span-7">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mb-8 overflow-hidden rounded-2xl border-2 border-[#F2AB27]/60 bg-[#F2F2F2]"
                >
                  <div className="relative h-[340px] overflow-hidden sm:h-[430px] lg:h-[520px]">
                    <AnimatePresence mode="wait">
                      {activeSlideImage ? (
                        <motion.img
                          key={`${room.id}-${activeSlide}`}
                          initial={{ opacity: 0, scale: 1.03 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.45 }}
                          src={activeSlideImage}
                          alt={`${room.name} - imagem ${activeSlide + 1}`}
                          className="absolute inset-0 h-full w-full object-cover"
                        />
                      ) : (
                        <motion.div
                          key={`blank-${room.id}-${activeSlide}`}
                          initial={{ opacity: 0, scale: 1.01 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.45 }}
                          className="absolute inset-0 flex items-center justify-center bg-[#F2F2F2]"
                        >
                          <div className="text-center space-y-3">
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-dashed border-[#024059]/40 text-[#024059]/75">
                              <span className="text-2xl">+</span>
                            </div>
                            <p className="text-sm text-[#024059]/75">Espaço reservado para imagem</p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <button
                      type="button"
                      onClick={goToPreviousSlide}
                      className="absolute left-4 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-[#F2F2F2]/45 bg-[#024059]/85 text-lg font-semibold text-[#F2F2F2] transition hover:bg-[#024059]"
                      aria-label="Imagem anterior"
                    >
                      &lt;
                    </button>
                    <button
                      type="button"
                      onClick={goToNextSlide}
                      className="absolute right-4 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-[#F2F2F2]/45 bg-[#024059]/85 text-lg font-semibold text-[#F2F2F2] transition hover:bg-[#024059]"
                      aria-label="Próxima imagem"
                    >
                      &gt;
                    </button>

                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-[#F2F2F2]/35 bg-[#024059]/85 px-4 py-1.5 text-xs font-medium text-[#F2F2F2]">
                      {activeSlide + 1}/{carouselSlides.length}
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <div className="mb-3 flex flex-wrap items-center gap-3">
                    <span className="inline-flex items-center rounded-full border border-[#284003]/35 bg-[#F2BF27]/25 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#284003]">
                      {ROOM_TYPE_LABEL[room.type]}
                    </span>
                    <SectionTitle
                      as="h1"
                      logoClassName="h-10 w-10"
                      className="font-display text-3xl font-bold text-[#024059]"
                    >
                      {room.name}
                    </SectionTitle>
                    {room.petFriendly && (
                      <Badge className="gap-1 bg-[#F2AB27] text-[#024059]">
                        <PawPrint className="h-3 w-3" /> Pet friendly
                      </Badge>
                    )}
                  </div>

                  <p className="mb-8 rounded-xl border border-[#024059]/20 bg-[#F2F2F2] p-4 leading-relaxed text-[#024059]/85">
                    {room.description}
                  </p>

                  <div className="flex items-center gap-2 bg-destructive/10 text-destructive px-4 py-2 rounded-lg mb-8 w-fit">
                    <Flame className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      Este quarto está quase lotado para as próximas semanas
                    </span>
                  </div>

                  <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="rounded-xl border-2 border-[#F2AB27]/60 bg-[#F2F2F2] p-5">
                      <h3 className="mb-2 font-display font-semibold text-[#024059]">Camas</h3>
                      <p className="text-sm text-[#284003]/80">{room.beds}</p>
                    </div>
                    <div className="rounded-xl border-2 border-[#F2AB27]/60 bg-[#F2F2F2] p-5">
                      <h3 className="mb-2 font-display font-semibold text-[#024059]">Banheiro</h3>
                      <p className="text-sm text-[#284003]/80">{room.bathroom}</p>
                    </div>
                    <div className="rounded-xl border-2 border-[#F2AB27]/60 bg-[#F2F2F2] p-5">
                      <h3 className="mb-2 font-display font-semibold text-[#024059]">Capacidade</h3>
                      <p className="flex items-center gap-1 text-sm text-[#284003]/80">
                        <Users className="h-4 w-4 text-[#024059]" /> Até {room.capacity} pessoas
                      </p>
                    </div>
                  </div>

                  <SectionTitle
                    as="h3"
                    logoClassName="h-6 w-6"
                    className="mb-4 font-display text-xl font-semibold text-[#024059]"
                  >
                    Comodidades
                  </SectionTitle>
                  <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                    {room.amenities.map((amenity) => (
                      <div
                        key={amenity}
                        className="flex items-center gap-2 rounded-lg border border-[#024059]/18 bg-[#F2BF27]/18 px-3 py-2 text-sm font-medium text-[#284003]"
                      >
                        <Check className="h-4 w-4 text-[#024059]" /> {amenity}
                      </div>
                    ))}
                  </div>

                  <SectionTitle
                    as="h3"
                    logoClassName="h-6 w-6"
                    className="mb-4 font-display text-xl font-semibold text-[#024059]"
                  >
                    Inclusos
                  </SectionTitle>
                  <div className="mb-8 flex flex-wrap gap-2">
                    {room.extras.map((extra) => (
                      <Badge key={extra} className="border border-[#F2AB27]/70 bg-[#F2BF27]/22 text-[#284003]">
                        {extra}
                      </Badge>
                    ))}
                  </div>

                  <SectionTitle
                    as="h3"
                    logoClassName="h-6 w-6"
                    className="mb-4 font-display text-xl font-semibold text-[#024059]"
                  >
                    Regras
                  </SectionTitle>
                  <ul className="mb-8 space-y-2 rounded-xl border border-[#024059]/20 bg-[#F2F2F2] p-4">
                    {room.rules.map((rule) => (
                      <li key={rule} className="text-sm text-[#284003]/88">
                        • {rule}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              </div>

              <div className="space-y-8 xl:col-span-5">
                <motion.div
                  initial={{ opacity: 0, y: 28, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: 0.16, duration: 0.45, ease: 'easeOut' }}
                  className="rounded-2xl border-2 border-[#F2AB27]/70 bg-[#024059] p-8 text-[#F2F2F2]"
                >
                  <div className="mb-5">
                    <SectionTitle
                      as="p"
                      logoClassName="h-6 w-6 ring-white/15"
                      className="text-sm uppercase tracking-[0.14em] text-[#F2F2F2]/80"
                    >
                      A partir de
                    </SectionTitle>
                    <div className="flex items-baseline gap-1">
                      <AnimatePresence mode="wait">
                        <motion.span
                          key={totalPrice}
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="text-5xl font-bold leading-none text-[#F2BF27]"
                        >
                          {formatBRL(totalPrice)}
                        </motion.span>
                      </AnimatePresence>
                      <span className="text-sm text-[#F2F2F2]/80">
                        / {Math.max(nights, 1)} {nights === 1 ? 'noite' : 'noites'}
                      </span>
                    </div>
                  </div>

                  <div className="mb-6 space-y-3 rounded-xl border border-[#F2F2F2]/18 bg-[#F2F2F2]/8 p-4 text-sm">
                    <div className="rounded-lg border border-[#F2F2F2]/20 bg-[#F2F2F2]/8 p-3">
                      <p className="mb-2 text-xs uppercase tracking-[0.12em] text-[#F2F2F2]/80">
                        Selecione Check-in / Check-out
                      </p>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full justify-start text-left font-normal h-12 border-[#F2F2F2]/30 bg-[#F2F2F2]/10 text-[#F2F2F2] hover:bg-[#F2F2F2]/16 hover:text-[#F2F2F2]',
                              !selectedRange?.from && 'text-[#F2F2F2]/75'
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4 text-[#F2F2F2]" />
                            {selectedRange?.from ? (
                              selectedRange.to ? (
                                <span className="text-sm text-[#F2F2F2]">
                                  {format(selectedRange.from, 'dd/MM', { locale: ptBR })} -{' '}
                                  {format(selectedRange.to, 'dd/MM', { locale: ptBR })}
                                </span>
                              ) : (
                                <span className="text-sm text-[#F2F2F2]">
                                  {format(selectedRange.from, 'dd MMM', { locale: ptBR })}
                                </span>
                              )
                            ) : (
                              <span className="text-sm text-[#F2F2F2]/75">Selecione as datas</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="range"
                            locale={ptBR}
                            selected={selectedRange}
                            numberOfMonths={2}
                            onSelect={(range) => {
                              if (!range?.from) {
                                setSelectedRange(undefined);
                                setBooking((prev) => ({ ...prev, checkIn: null, checkOut: null }));
                                setCalendarError(null);
                                return;
                              }
                              if (!range?.to) {
                                const fromKey = toDateKey(startOfDay(range.from));
                                if (unavailableDateSet.has(fromKey)) {
                                  setCalendarError('Selecione uma data inicial que esteja disponível.');
                                  return;
                                }
                                setSelectedRange({ from: range.from, to: undefined });
                                setCalendarError(null);
                                return;
                              }

                              const normalizedRange: DateRange = {
                                from: startOfDay(range.from),
                                to: startOfDay(range.to),
                              };
                              if (isRangeInvalid(normalizedRange, unavailableDateSet)) {
                                setCalendarError('As datas selecionadas incluem períodos indisponíveis.');
                                return;
                              }
                              setSelectedRange(normalizedRange);
                              setBooking((prev) => ({
                                ...prev,
                                checkIn: normalizedRange.from || null,
                                checkOut: normalizedRange.to || null,
                              }));
                              setCalendarError(null);
                            }}
                            disabled={(date) => {
                              const day = toDateKey(startOfDay(date));
                              return (
                                startOfDay(date) < startOfDay(new Date()) ||
                                unavailableDateSet.has(day)
                              );
                            }}
                            modifiers={{
                              unavailable: (date) => unavailableDateSet.has(toDateKey(startOfDay(date))),
                            }}
                            modifiersStyles={{
                              unavailable: {
                                backgroundColor: '#9CA3AF',
                                color: '#1F2937',
                                fontWeight: 700,
                              },
                            }}
                            classNames={{
                              day_disabled: 'text-[#374151]',
                            }}
                            className="p-3 pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                      <div className="mt-3 flex flex-wrap gap-3 text-xs">
                        <span className="inline-flex items-center gap-2 text-[#F2F2F2]/90">
                          <span className="h-3 w-3 rounded-sm bg-gray-400" />
                          Indisponível
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between border-b border-[#F2F2F2]/14 pb-2">
                      <span className="text-[#F2F2F2]/75">Check-in</span>
                      <span className="font-medium text-[#F2F2F2]">
                        {selectedRange?.from
                          ? format(selectedRange.from, 'dd MMM yyyy', { locale: ptBR })
                          : booking.checkIn
                            ? format(booking.checkIn, 'dd MMM yyyy', { locale: ptBR })
                            : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-[#F2F2F2]/14 pb-2">
                      <span className="text-[#F2F2F2]/75">Check-out</span>
                      <span className="font-medium text-[#F2F2F2]">
                        {selectedRange?.to
                          ? format(selectedRange.to, 'dd MMM yyyy', { locale: ptBR })
                          : booking.checkOut
                            ? format(booking.checkOut, 'dd MMM yyyy', { locale: ptBR })
                            : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-[#F2F2F2]/14 pb-2">
                      <span className="text-[#F2F2F2]/75">Hóspedes</span>
                      <span className="font-medium text-[#F2F2F2]">{booking.guests}</span>
                    </div>
                    {booking.pets && (
                      <div className="flex justify-between">
                        <span className="text-[#F2F2F2]/75">Pets</span>
                        <span className="font-medium text-[#F2F2F2]">Sim</span>
                      </div>
                    )}
                  </div>

                  {booking.guests > room.capacity && (
                    <p className="text-destructive text-sm mb-4">
                      ⚠ Este quarto comporta até {room.capacity} pessoas
                    </p>
                  )}
                  {calendarError && (
                    <p className="text-[#F2BF27] text-sm mb-4">{calendarError}</p>
                  )}

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleBookNow}
                    disabled={booking.guests > room.capacity || isCheckingAvailability}
                    className="flex h-14 w-full items-center justify-center rounded-xl border border-[#F2AB27] bg-[#F2AB27] text-base font-bold text-[#024059] transition-colors hover:bg-[#F2BF27] disabled:cursor-not-allowed disabled:border-[#F2AB27]/40 disabled:bg-[#F2AB27]/40 disabled:text-[#024059]/70"
                  >
                    {isCheckingAvailability ? 'Validando datas...' : 'Reservar agora'}
                  </motion.button>

                  <p className="mt-3 text-center text-xs text-[#F2F2F2]/78">
                    Melhor preço garantido · Cancelamento flexível
                  </p>
                </motion.div>

                <motion.section
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.24 }}
                  className="rounded-2xl bg-[#E9F2F1] p-4 sm:p-5"
                >
                  {galleryImages.length ? (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {galleryImages.map((image, index) => (
                        <motion.button
                          key={`${room.id}-album-${index}`}
                          type="button"
                          onClick={() => {
                            setActiveSlide(index % carouselSlides.length);
                            setExpandedImageIndex(index);
                          }}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.03 * index }}
                          className={`group relative overflow-hidden rounded-xl border-2 transition ${
                            activeSlide === index
                              ? 'border-[#F2AB27] ring-2 ring-[#F2AB27]/45'
                              : 'border-[#024059]/20 hover:border-[#024059]/45'
                          } ${index % 5 === 0 ? 'col-span-2 row-span-2 min-h-[230px]' : 'min-h-[140px]'}`}
                          aria-label={`Visualizar foto ${index + 1}`}
                        >
                          <img
                            src={image}
                            alt={`${room.name} - foto ${index + 1}`}
                            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                          />
                        </motion.button>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-[#024059]/30 bg-[#F2F2F2] p-10 text-center text-sm text-[#024059]/75">
                      Nenhuma imagem cadastrada para este chalé.
                    </div>
                  )}
                </motion.section>
              </div>
            </div>
          </div>
        </div>
      </main>

      <AnimatePresence>
        {expandedImageIndex !== null && galleryImages[expandedImageIndex] && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-4"
            onClick={() => setExpandedImageIndex(null)}
            role="dialog"
            aria-modal="true"
            aria-label="Imagem expandida"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-6xl"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setExpandedImageIndex(null)}
                className="absolute right-2 top-2 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#024059]/90 text-[#F2F2F2] transition hover:bg-[#024059]"
                aria-label="Fechar imagem"
              >
                <X className="h-5 w-5" />
              </button>
              <img
                src={galleryImages[expandedImageIndex]}
                alt={`${room.name} - imagem expandida ${expandedImageIndex + 1}`}
                className="max-h-[88vh] w-full rounded-xl object-contain"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RoomDetailPage;
