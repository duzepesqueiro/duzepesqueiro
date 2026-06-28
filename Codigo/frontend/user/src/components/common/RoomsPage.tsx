import { useEffect, useMemo, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Filter } from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Header from '@/components/common/layout/Header';
import RoomCard from '@/components/common/booking/RoomCard';
import { useBooking } from '@/contexts/BookingContext';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import type { Room } from '@/types/booking';
import { api } from '@/lib/api';
import { mapApiChaletToRoom, resolveEffectiveRoomPrice } from '@/lib/hostingRoomMapper';
import { formatBRL } from '@/lib/currency';
import { useIsMobile } from '@/hooks/use-mobile';

type ApiChalet = {
  id: string;
  name: string;
  description?: string;
  unitType?: string;
  maxGuests?: number;
  basePrice?: number;
  currentPrice?: number;
  amenities?: string[];
  images?: { imageUrl: string }[] | string[];
  petFriendly?: boolean;
  status?: string;
  isActive?: boolean;
  imagesCount?: number;
  unavailableDates?: string[];
};

type ApiChaletDetail = ApiChalet & {
  images?: Array<{ imageUrl?: string; id?: string }>;
};

type AvailabilityResponse = {
  chaletId: string;
  checkInDate: string;
  checkOutDate: string;
  available: boolean;
};

const normalizeText = (value: string): string => {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
};

const parseLocalDateParam = (value: string): Date | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(year, month - 1, day);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatLocalDateParam = (date: Date): string => {
  const yyyy = String(date.getFullYear());
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const RoomsPage = () => {
  const navigate = useNavigate();
  const { booking, setBooking } = useBooking();
  const [searchParams] = useSearchParams();
  const searchQueryRaw = searchParams.get('q') ?? '';
  const searchQuery = useMemo(() => normalizeText(searchQueryRaw.trim()), [searchQueryRaw]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useIsMobile();
  const [capacityFilter, setCapacityFilter] = useState<number>(0);
  const [petsOnly, setPetsOnly] = useState(booking.pets);
  const [priceRange, setPriceRange] = useState<number[]>([0, 1000]);
  const [priceFilterEnabled, setPriceFilterEnabled] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Preenche filtros com o que veio da home
  useEffect(() => {
    const guestsParamRaw = searchParams.get('guests');
    const guestsParam = guestsParamRaw ? Number(guestsParamRaw) : NaN;
    const petsParam = searchParams.get('pets');
    const checkInParam = searchParams.get('checkIn');
    const checkOutParam = searchParams.get('checkOut');

    if (!Number.isNaN(guestsParam) && guestsParam > 1) {
      setCapacityFilter(guestsParam);
    }

    if (!Number.isNaN(guestsParam) && guestsParam > 0) {
      setBooking((prev) => ({ ...prev, guests: guestsParam }));
    }

    if (petsParam === '1' || petsParam === 'true') {
      setPetsOnly(true);
      setBooking((prev) => ({ ...prev, pets: true }));
    }

    if (checkInParam) {
      const d = parseLocalDateParam(checkInParam);
      if (d) setBooking((prev) => ({ ...prev, checkIn: d }));
    }
    if (checkOutParam) {
      const d = parseLocalDateParam(checkOutParam);
      if (d) setBooking((prev) => ({ ...prev, checkOut: d }));
    }
  }, [booking.guests, searchParams, setBooking]);

  const { data: serverRooms = [], isLoading } = useQuery<ApiChalet[]>({
    queryKey: ['rooms'],
    queryFn: async (): Promise<ApiChalet[]> => {
      const { data } = await api.get('/api/chales');
      if (!Array.isArray(data)) return [];
      const base = data as ApiChalet[];

      const enriched = await Promise.all(
        base.map(async (item) => {
          if (item.imagesCount === 0) {
            return { ...item, images: [] };
          }
          try {
            const { data: detail } = await api.get(`/api/chales/${item.id}`);
            const images = Array.isArray((detail as ApiChaletDetail)?.images)
              ? (detail as ApiChaletDetail).images
              : [];
            return {
              ...item,
              images,
              currentPrice: resolveEffectiveRoomPrice({
                ...(item as Record<string, unknown>),
                ...((detail as Record<string, unknown>) || {}),
              }),
            };
          } catch {
            return { ...item, images: [] };
          }
        })
      );

      return enriched;
    },
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    placeholderData: keepPreviousData,
  });

  const roomList: Room[] = serverRooms.length
    ? serverRooms.map((c) => mapApiChaletToRoom(c))
    : [];

  const roomIds = useMemo(() => roomList.map((room) => room.id).filter(Boolean), [roomList]);

  const { data: reviewsSummaryByRoomId = {} } = useQuery<
    Record<string, { averageRating: number; reviewsCount: number }>
  >({
    queryKey: ['hosting-rooms-reviews-summary', roomIds.join('|')],
    enabled: roomIds.length > 0,
    queryFn: async () => {
      const responses = await Promise.all(
        roomIds.map(async (roomId) => {
          try {
            const { data } = await api.get('/api/reviews/summary', {
              params: { domain: 'HOSTING', targetId: roomId },
            });
            const averageRating = Number(data?.averageRating ?? 0);
            const reviewsCount = Number(data?.reviewsCount ?? 0);
            return [roomId, { averageRating, reviewsCount }] as const;
          } catch {
            return [roomId, { averageRating: 0, reviewsCount: 0 }] as const;
          }
        }),
      );
      return Object.fromEntries(responses);
    },
    staleTime: 1000 * 60,
  });

  const roomListWithReviews = useMemo(() => {
    return roomList.map((room) => {
      const summary = reviewsSummaryByRoomId[room.id];
      if (!summary) return room;
      return {
        ...room,
        averageRating: summary.averageRating,
        reviewsCount: summary.reviewsCount,
      };
    });
  }, [roomList, reviewsSummaryByRoomId]);

  const hasDateFilter = Boolean(booking.checkIn && booking.checkOut);

  const { data: availabilityMap = {}, isLoading: isLoadingAvailability } = useQuery<Record<string, boolean>>({
    queryKey: [
      'rooms-availability',
      roomListWithReviews.map((room) => room.id).join('|'),
      booking.checkIn ? booking.checkIn.toISOString() : null,
      booking.checkOut ? booking.checkOut.toISOString() : null,
    ],
    enabled: hasDateFilter && roomListWithReviews.length > 0,
    queryFn: async () => {
      const checkin = booking.checkIn!.toISOString();
      const checkout = booking.checkOut!.toISOString();
      const responses = await Promise.all(
        roomListWithReviews.map(async (room) => {
          try {
            const { data } = await api.get('/api/chales/disponibilidade', {
              params: { chaleId: room.id, checkin, checkout },
            });
            const dto = data as AvailabilityResponse;
            return [room.id, !dto?.available] as const;
          } catch {
            return [room.id, true] as const;
          }
        })
      );
      return Object.fromEntries(responses);
    },
    staleTime: 1000 * 60,
  });

  const priceSliderMax = useMemo(() => {
    if (!roomListWithReviews.length) return 1000;
    const maxPrice = Math.max(...roomListWithReviews.map((room) => room.pricePerNight || 0));
    return Math.max(1000, Math.ceil(maxPrice / 100) * 100);
  }, [roomListWithReviews]);

  useEffect(() => {
    if (!priceFilterEnabled) {
      setPriceRange([0, priceSliderMax]);
      return;
    }
    setPriceRange((prev) => [Math.min(prev[0], priceSliderMax), Math.min(prev[1], priceSliderMax)]);
  }, [priceSliderMax, priceFilterEnabled]);

  const filteredRooms = useMemo(() => {
    return roomListWithReviews
      .filter((room) => {
        if (searchQuery) {
          const haystack = [
            room.name,
            room.description,
            room.type,
            room.beds,
            room.bathroom,
            ...room.amenities,
            ...room.extras,
          ].map((value) => normalizeText(String(value)));
          if (!haystack.some((value) => value.includes(searchQuery))) return false;
        }
        if (capacityFilter > 0 && room.capacity < capacityFilter) return false;
        if (petsOnly && !room.petFriendly) return false;
        if (priceFilterEnabled && (room.pricePerNight < priceRange[0] || room.pricePerNight > priceRange[1])) return false;
        if (typeFilter !== 'all' && room.type !== typeFilter) return false;
        return true;
      })
      .map((room) => ({
        room,
        unavailable: hasDateFilter ? Boolean(availabilityMap[room.id]) : false,
      }));
  }, [roomListWithReviews, searchQuery, capacityFilter, petsOnly, priceRange, typeFilter, priceFilterEnabled, hasDateFilter, availabilityMap]);

  const summaryChips = [
    booking.checkIn && booking.checkOut
      ? `Período: ${booking.checkIn.toLocaleDateString()} - ${booking.checkOut.toLocaleDateString()}`
      : null,
    searchParams.has('guests') || booking.guests > 1 ? `${booking.guests} hóspede(s)` : null,
    petsOnly || booking.pets ? 'Somente pet friendly' : null,
  ].filter((chip): chip is string => Boolean(chip));

  const handleSelectRoom = (room: Room) => {
    setBooking((prev) => ({ ...prev, roomId: room.id }));
    const params = new URLSearchParams();
    if (booking.checkIn) params.set('checkIn', formatLocalDateParam(booking.checkIn));
    if (booking.checkOut) params.set('checkOut', formatLocalDateParam(booking.checkOut));
    const query = params.toString();
    navigate(
      query ? `/hospedagem/rooms/${room.id}?${query}` : `/hospedagem/rooms/${room.id}`,
      { state: { room } },
    );
  };

  return (
    <div className="relative min-h-screen bg-muted">
      {!isMobile ? <Header open={sidebarOpen} setOpen={setSidebarOpen} /> : null}

      <main className={`relative z-10 transition-all duration-300 ${isMobile ? '' : sidebarOpen ? 'ml-64' : 'ml-16'}`}>
        <div className="pb-16 pt-24">
        <div className="duze-container max-w-[1400px]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 px-1 py-2"
          >
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-3">
                <span className="inline-flex items-center rounded-full border border-border bg-secondary/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-foreground">
                  Busca de hospedagem
                </span>
                <div>
                  <h1 className="font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl lg:text-5xl">
                    Nossos Quartos
                  </h1>
                  <p className="mt-2 max-w-2xl text-sm text-muted-foreground md:text-base">
                    Encontre o quarto perfeito para sua estadia em Du Zé.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowFilters(!showFilters)}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card/80 px-4 py-2 text-sm font-semibold text-foreground shadow-sm backdrop-blur transition-colors hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background xl:hidden"
              >
                <Filter className="h-4 w-4" />
                {showFilters ? 'Ocultar filtros' : 'Mostrar filtros'}
              </button>
            </div>

            {summaryChips.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {summaryChips.map((chip) => (
                  <span
                    key={chip}
                    className="rounded-full border border-border bg-card px-3 py-1 text-xs text-foreground shadow-sm"
                  >
                    {chip}
                  </span>
                ))}
              </div>
            )}
          </motion.div>

          <div className="flex flex-col gap-6 xl:flex-row xl:gap-8">
            <motion.aside
              initial={false}
              animate={{ height: showFilters ? 'auto' : 0, opacity: showFilters ? 1 : 0 }}
              className="w-full overflow-hidden xl:w-80 xl:flex-shrink-0 xl:overflow-visible xl:!h-auto xl:!opacity-100"
            >
              <div
                className="rounded-2xl border border-border bg-card p-6 shadow-sm xl:sticky xl:top-28"
              >
                <div className="mb-4">
                  <h2 className="font-display text-lg font-semibold text-foreground">Filtros</h2>
                  <p className="text-xs text-muted-foreground">Refine resultados por tipo, capacidade, preço e pets.</p>
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-1">
                  <div>
                    <label className="mb-3 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Tipo
                    </label>
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger className="w-full border-border bg-background text-foreground shadow-sm focus:ring-ring">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="standard">Standard</SelectItem>
                        <SelectItem value="deluxe">Deluxe</SelectItem>
                        <SelectItem value="suite">Suíte</SelectItem>
                        <SelectItem value="cabin">Chalé</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="mb-3 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Capacidade mínima
                    </label>
                    <Select value={String(capacityFilter)} onValueChange={(v) => setCapacityFilter(Number(v))}>
                      <SelectTrigger className="w-full border-border bg-background text-foreground shadow-sm focus:ring-ring">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Todos</SelectItem>
                        <SelectItem value="2">2+ pessoas</SelectItem>
                        <SelectItem value="3">3+ pessoas</SelectItem>
                        <SelectItem value="4">4+ pessoas</SelectItem>
                        <SelectItem value="5">5+ pessoas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="sm:col-span-2 lg:col-span-2 xl:col-span-1">
                    <label className="mb-3 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Faixa de preço: {formatBRL(priceRange[0])} - {formatBRL(priceRange[1])}
                    </label>
                    <Slider
                      value={priceRange}
                      onValueChange={(value) => {
                        setPriceFilterEnabled(true);
                        setPriceRange(value);
                      }}
                      min={0}
                      max={priceSliderMax}
                      step={20}
                    />
                  </div>

                  <div className="flex min-h-11 items-center justify-between rounded-xl border border-border bg-secondary/15 px-3 py-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-foreground">
                      Aceita pets
                    </label>
                    <Switch 
                      checked={petsOnly} 
                      onCheckedChange={setPetsOnly} 
                      className="data-[state=unchecked]:bg-muted-foreground/35"
                    />
                  </div>
                </div>
              </div>
            </motion.aside>

            <div className="flex-1">
              {isLoading || (hasDateFilter && isLoadingAvailability) ? (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3" aria-label="Carregando quartos">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div
                      key={`room-skeleton-${index}`}
                      className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
                    >
                      <Skeleton className="h-56 w-full rounded-none" />
                      <div className="space-y-4 p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-2">
                            <Skeleton className="h-6 w-44" />
                            <Skeleton className="h-4 w-32" />
                          </div>
                          <Skeleton className="h-8 w-20 rounded-full" />
                        </div>
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-11/12" />
                        <Skeleton className="h-4 w-4/5" />
                        <div className="flex flex-wrap gap-2 pt-2">
                          <Skeleton className="h-7 w-24 rounded-full" />
                          <Skeleton className="h-7 w-20 rounded-full" />
                          <Skeleton className="h-7 w-28 rounded-full" />
                        </div>
                        <div className="flex items-center justify-between pt-2">
                          <Skeleton className="h-5 w-24" />
                          <Skeleton className="h-10 w-32 rounded-lg" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredRooms.length === 0 ? (
                <div className="rounded-2xl border border-border bg-card p-10 text-center text-foreground shadow-sm">
                  <p className="text-lg font-semibold">Nenhum quarto encontrado</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Ajuste os filtros (tipo, capacidade, preço) ou remova a opção de pets para ampliar os resultados.
                  </p>
                </div>
              ) : (
                <div className="grid items-stretch grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {filteredRooms.map(({ room, unavailable }, i) => (
                    <RoomCard key={room.id} room={room} index={i} unavailable={unavailable} onSelect={handleSelectRoom} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        </div>
      </main>
    </div>
  );
};

export default RoomsPage;
