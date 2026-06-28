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
import RatingStarsDisplay from '@/components/reviews/RatingStarsDisplay';
import type { ReviewDTO, ReviewSummaryDTO } from '@/types/reviews';
import { User as UserIcon } from 'lucide-react';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { useIsMobile } from '@/hooks/use-mobile';

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
const REVIEWS_PAGE_SIZE = 5;
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
  const isMobile = useIsMobile();
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

  const [reviewsPage, setReviewsPage] = useState(1);

  const { data: reviewsSummary } = useQuery<ReviewSummaryDTO>({
    queryKey: ['reviews-summary', 'HOSTING', id],
    queryFn: async () => {
      const { data } = await api.get('/api/reviews/summary', {
        params: { domain: 'HOSTING', targetId: id },
      });
      return {
        averageRating: Number(data?.averageRating ?? 0),
        reviewsCount: Number(data?.reviewsCount ?? 0),
      };
    },
    enabled: Boolean(id),
    staleTime: 1000 * 60,
  });

  const totalReviewPages = useMemo(() => {
    const total = Number(reviewsSummary?.reviewsCount ?? 0);
    return Math.max(1, Math.ceil(total / REVIEWS_PAGE_SIZE));
  }, [reviewsSummary?.reviewsCount]);

  useEffect(() => {
    setReviewsPage((prev) => Math.min(Math.max(1, prev), totalReviewPages));
  }, [totalReviewPages]);

  const { data: reviews = [], isLoading: isLoadingReviews } = useQuery<ReviewDTO[]>({
    queryKey: ['reviews-list', 'HOSTING', id, reviewsPage],
    queryFn: async () => {
      const { data } = await api.get('/api/reviews', {
        params: { domain: 'HOSTING', targetId: id, page: reviewsPage, limit: REVIEWS_PAGE_SIZE },
      });
      return Array.isArray(data) ? (data as ReviewDTO[]) : [];
    },
    enabled: Boolean(id),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
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
          checkin: checkIn.toISOString(),
          checkout: checkOut.toISOString(),
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
    <div className="relative min-h-screen bg-muted">
      {!isMobile ? <Header open={sidebarOpen} setOpen={setSidebarOpen} /> : null}

      <main className={`relative z-10 transition-all duration-300 ${isMobile ? '' : sidebarOpen ? 'ml-64' : 'ml-16'}`}>
        <div className="pt-24 pb-16">
          <div className="duze-container max-w-[1400px]">
            <button
              onClick={() => navigate('/hospedagem/rooms')}
              className="mb-6 inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-card/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <ChevronLeft className="h-4 w-4" /> Voltar aos quartos
            </button>

            <div className="grid grid-cols-1 gap-10 xl:grid-cols-12">
              <div className="xl:col-span-7">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mb-8 overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
                >
                  <div className="relative h-[340px] overflow-hidden bg-muted sm:h-[430px] lg:h-[520px]">
                    {activeSlideImage ? (
                      <img
                        src={activeSlideImage}
                        alt={`${room.name} - imagem ${activeSlide + 1}`}
                        className="absolute inset-0 h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-muted">
                        <div className="space-y-3 text-center">
                          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-dashed border-border text-muted-foreground">
                            <span className="text-2xl">+</span>
                          </div>
                          <p className="text-sm text-muted-foreground">Espaço reservado para imagem</p>
                        </div>
                      </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-transparent" />

                    <button
                      type="button"
                      onClick={goToPreviousSlide}
                      className="absolute left-4 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/45 text-lg font-semibold text-white shadow-sm transition-colors hover:bg-black/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-black/30"
                      aria-label="Imagem anterior"
                    >
                      &lt;
                    </button>
                    <button
                      type="button"
                      onClick={goToNextSlide}
                      className="absolute right-4 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/45 text-lg font-semibold text-white shadow-sm transition-colors hover:bg-black/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-black/30"
                      aria-label="Próxima imagem"
                    >
                      &gt;
                    </button>

                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-white/20 bg-black/45 px-4 py-1.5 text-xs font-medium text-white">
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
                    <span className="inline-flex items-center rounded-full border border-border bg-secondary/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-foreground">
                      {ROOM_TYPE_LABEL[room.type]}
                    </span>
                    <h1 className="font-display text-3xl font-bold text-foreground">{room.name}</h1>
                    {room.petFriendly && (
                      <Badge variant="secondary" className="gap-1">
                        <PawPrint className="h-3 w-3" /> Pet friendly
                      </Badge>
                    )}
                  </div>

                  <div className="mb-8 rounded-2xl border border-border bg-card p-5 text-sm leading-relaxed text-muted-foreground shadow-sm">
                    {room.description}
                  </div>

                  <div className="mb-8 inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground shadow-sm">
                    <Flame className="h-4 w-4 text-secondary-foreground" />
                    <span className="font-semibold">Alta procura:</span>
                    <span className="text-muted-foreground">reserve com antecedência para garantir disponibilidade.</span>
                  </div>

                  <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Camas</p>
                      <p className="mt-2 text-sm font-semibold text-foreground">{room.beds}</p>
                    </div>
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Banheiro</p>
                      <p className="mt-2 text-sm font-semibold text-foreground">{room.bathroom}</p>
                    </div>
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Capacidade</p>
                      <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                        <Users className="h-4 w-4 text-primary" /> Até {room.capacity} pessoas
                      </p>
                    </div>
                  </div>

                  <div className="mb-4">
                    <h3 className="font-display text-xl font-semibold text-foreground">Comodidades</h3>
                    <p className="mt-1 text-sm text-muted-foreground">O que você encontra neste quarto.</p>
                  </div>
                  <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                    {room.amenities.map((amenity) => (
                      <div
                        key={amenity}
                        className="flex items-center gap-2 rounded-xl border border-border bg-secondary/10 px-3 py-2 text-sm font-medium text-foreground"
                      >
                        <Check className="h-4 w-4 text-primary" /> {amenity}
                      </div>
                    ))}
                  </div>

                  <div className="mb-4">
                    <h3 className="font-display text-xl font-semibold text-foreground">Inclusos</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Itens e facilidades já incluídos na estadia.</p>
                  </div>
                  <div className="mb-8 flex flex-wrap gap-2">
                    {room.extras.map((extra) => (
                      <Badge key={extra} variant="outline" className="bg-card text-foreground">
                        {extra}
                      </Badge>
                    ))}
                  </div>

                  <div className="mb-4">
                    <h3 className="font-display text-xl font-semibold text-foreground">Regras</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Orientações para uma hospedagem tranquila.</p>
                  </div>
                  <ul className="mb-8 space-y-2 rounded-2xl border border-border bg-card p-5 text-sm text-foreground shadow-sm">
                    {room.rules.map((rule) => (
                      <li key={rule} className="flex gap-2">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-secondary" />
                        <span className="text-muted-foreground">{rule}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mb-4">
                    <h3 className="font-display text-xl font-semibold text-foreground">Avaliações</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Experiências de quem já se hospedou.</p>
                  </div>
                  <div className="mb-8 rounded-2xl border border-border bg-card p-5 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <RatingStarsDisplay value={Number(reviewsSummary?.averageRating ?? 0)} className="flex gap-1" />
                        <div className="flex flex-col leading-tight">
                          <span className="text-lg font-extrabold text-foreground">
                            {Number(reviewsSummary?.averageRating ?? 0).toFixed(1)}
                          </span>
                          <span className="text-xs font-medium text-muted-foreground">
                            {Number(reviewsSummary?.reviewsCount ?? 0)} avaliações
                          </span>
                        </div>
                      </div>
                      {Number(reviewsSummary?.reviewsCount ?? 0) > 0 ? (
                        <span className="text-xs text-muted-foreground">Mais recentes primeiro</span>
                      ) : null}
                    </div>

                    <div className="mt-5 space-y-4">
                      {isLoadingReviews ? (
                        <div className="space-y-3">
                          <div className="h-16 w-full animate-pulse rounded-xl bg-muted" />
                          <div className="h-16 w-full animate-pulse rounded-xl bg-muted" />
                          <div className="h-16 w-full animate-pulse rounded-xl bg-muted" />
                        </div>
                      ) : reviews.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-border bg-muted px-4 py-6 text-center">
                          <p className="text-sm font-medium text-muted-foreground">Ainda não há avaliações para este quarto.</p>
                        </div>
                      ) : (
                        reviews.map((review) => (
                          <div
                            key={review.id}
                            className="rounded-xl border border-border bg-muted/60 p-4"
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-card text-muted-foreground shadow-sm">
                                <UserIcon className="h-5 w-5" />
                              </div>
                              <div className="flex-1">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-bold text-foreground">{review.authorName}</p>
                                    <p className="text-[11px] text-muted-foreground">
                                      {review.createdAt ? format(new Date(review.createdAt), 'dd/MM/yyyy') : ''}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <RatingStarsDisplay value={Number(review.rating ?? 0)} className="flex gap-1" />
                                  </div>
                                </div>
                                {review.comment ? (
                                  <p className="mt-2 text-sm text-foreground">"{review.comment}"</p>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {totalReviewPages > 1 ? (
                      <div className="mt-5 flex justify-center">
                        <Pagination>
                          <PaginationContent>
                            <PaginationItem>
                              <PaginationPrevious
                                onClick={() => setReviewsPage((p) => Math.max(1, p - 1))}
                                className={reviewsPage === 1 ? 'pointer-events-none opacity-50' : undefined}
                              />
                            </PaginationItem>
                            {Array.from({ length: totalReviewPages }, (_, idx) => idx + 1)
                              .slice(Math.max(0, reviewsPage - 2), Math.max(0, reviewsPage - 2) + 3)
                              .map((p) => (
                                <PaginationItem key={p}>
                                  <PaginationLink isActive={p === reviewsPage} onClick={() => setReviewsPage(p)}>
                                    {p}
                                  </PaginationLink>
                                </PaginationItem>
                              ))}
                            <PaginationItem>
                              <PaginationNext
                                onClick={() => setReviewsPage((p) => Math.min(totalReviewPages, p + 1))}
                                className={reviewsPage === totalReviewPages ? 'pointer-events-none opacity-50' : undefined}
                              />
                            </PaginationItem>
                          </PaginationContent>
                        </Pagination>
                      </div>
                    ) : null}
                  </div>
                </motion.div>
              </div>

              <div className="space-y-8 xl:col-span-5">
                <motion.div
                  initial={{ opacity: 0, y: 28, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: 0.16, duration: 0.45, ease: 'easeOut' }}
                  className="rounded-2xl border border-border bg-primary p-6 text-primary-foreground shadow-sm sm:p-8"
                >
                  <div className="mb-5">
                    <span className="text-sm uppercase tracking-[0.14em] text-primary-foreground/80">Total estimado</span>
                    <div className="flex items-baseline gap-1">
                      <AnimatePresence mode="wait">
                        <motion.span
                          key={totalPrice}
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="text-5xl font-bold leading-none text-secondary"
                        >
                          {formatBRL(totalPrice)}
                        </motion.span>
                      </AnimatePresence>
                      <span className="text-sm text-primary-foreground/80">
                        para {Math.max(nights, 1)} {nights === 1 ? 'noite' : 'noites'}
                      </span>
                    </div>
                  </div>

                  <div className="mb-6 space-y-3 rounded-xl border border-primary-foreground/15 bg-primary-foreground/10 p-4 text-sm">
                    <div className="rounded-xl border border-primary-foreground/15 bg-primary-foreground/10 p-4">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-primary-foreground/80">
                        Selecione o período da hospedagem
                      </p>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              'h-12 w-full justify-start rounded-xl border-primary-foreground/20 bg-primary-foreground/10 text-left font-semibold text-primary-foreground shadow-sm hover:bg-primary-foreground/15 hover:text-primary-foreground focus-visible:ring-primary-foreground/70',
                              !selectedRange?.from && 'text-primary-foreground/80'
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4 text-primary-foreground" />
                            {selectedRange?.from ? (
                              selectedRange.to ? (
                                <span className="text-sm text-primary-foreground">
                                  {format(selectedRange.from, 'dd/MM', { locale: ptBR })} -{' '}
                                  {format(selectedRange.to, 'dd/MM', { locale: ptBR })}
                                </span>
                              ) : (
                                <span className="text-sm text-primary-foreground">
                                  {format(selectedRange.from, 'dd MMM', { locale: ptBR })}
                                </span>
                              )
                            ) : (
                              <span className="text-sm text-primary-foreground/80">Escolher datas</span>
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
                      <div className="mt-3 flex flex-wrap gap-3 text-xs text-primary-foreground/90">
                        <span className="inline-flex items-center gap-2">
                          <span className="h-3 w-3 rounded-sm bg-muted-foreground" />
                          Datas indisponíveis
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between border-b border-primary-foreground/15 pb-2">
                      <span className="text-primary-foreground/80">Check-in</span>
                      <span className="font-semibold text-primary-foreground">
                        {selectedRange?.from
                          ? format(selectedRange.from, 'dd MMM yyyy', { locale: ptBR })
                          : booking.checkIn
                            ? format(booking.checkIn, 'dd MMM yyyy', { locale: ptBR })
                            : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-primary-foreground/15 pb-2">
                      <span className="text-primary-foreground/80">Check-out</span>
                      <span className="font-semibold text-primary-foreground">
                        {selectedRange?.to
                          ? format(selectedRange.to, 'dd MMM yyyy', { locale: ptBR })
                          : booking.checkOut
                            ? format(booking.checkOut, 'dd MMM yyyy', { locale: ptBR })
                            : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-primary-foreground/15 pb-2">
                      <span className="text-primary-foreground/80">Hóspedes</span>
                      <span className="font-semibold text-primary-foreground">{booking.guests}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-primary-foreground/80">Pets</span>
                      <span className="font-semibold text-primary-foreground">{booking.pets ? 'Sim' : 'Não'}</span>
                    </div>
                  </div>

                  {booking.guests > room.capacity && (
                    <p className="mb-4 text-sm font-semibold text-secondary">
                      Este quarto comporta até {room.capacity} pessoa(s).
                    </p>
                  )}
                  {calendarError && (
                    <p className="mb-4 text-sm font-semibold text-secondary">{calendarError}</p>
                  )}

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleBookNow}
                    disabled={booking.guests > room.capacity || isCheckingAvailability}
                    className="flex h-14 w-full items-center justify-center rounded-xl border border-secondary bg-secondary text-base font-extrabold text-secondary-foreground transition-colors hover:bg-secondary/90 disabled:cursor-not-allowed disabled:border-secondary/40 disabled:bg-secondary/40 disabled:text-secondary-foreground/70"
                  >
                    {isCheckingAvailability ? 'Validando datas...' : 'Reservar agora'}
                  </motion.button>

                  <p className="mt-3 text-center text-xs text-primary-foreground/80">
                    Confirmação rápida · Ajuste datas e hóspedes antes de reservar
                  </p>
                </motion.div>

                <motion.section
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.24 }}
                  className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5"
                >
                  <div className="mb-4">
                    <h2 className="font-display text-lg font-semibold text-foreground">Galeria</h2>
                    <p className="mt-1 text-sm text-muted-foreground">Toque em uma foto para ampliar.</p>
                  </div>
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
                              ? 'border-secondary ring-2 ring-secondary/40'
                              : 'border-border hover:border-primary/30'
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
                    <div className="rounded-xl border border-dashed border-border bg-muted p-10 text-center text-sm text-muted-foreground">
                      Nenhuma imagem cadastrada para este quarto.
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
