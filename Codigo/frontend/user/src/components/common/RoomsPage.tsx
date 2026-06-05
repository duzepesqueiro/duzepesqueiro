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

const RoomsPage = () => {
  const navigate = useNavigate();
  const { booking, setBooking } = useBooking();
  const [searchParams] = useSearchParams();
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
      const d = new Date(checkInParam);
      if (!Number.isNaN(d.getTime())) setBooking((prev) => ({ ...prev, checkIn: d }));
    }
    if (checkOutParam) {
      const d = new Date(checkOutParam);
      if (!Number.isNaN(d.getTime())) setBooking((prev) => ({ ...prev, checkOut: d }));
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
  }, [roomListWithReviews, capacityFilter, petsOnly, priceRange, typeFilter, priceFilterEnabled, hasDateFilter, availabilityMap]);

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
    if (booking.checkIn) params.set('checkIn', booking.checkIn.toISOString());
    if (booking.checkOut) params.set('checkOut', booking.checkOut.toISOString());
    const query = params.toString();
    navigate(
      query ? `/hospedagem/rooms/${room.id}?${query}` : `/hospedagem/rooms/${room.id}`,
      { state: { room } },
    );
  };

  return (
    <div className="relative min-h-screen bg-[#F2F2F2]">
      <Header open={sidebarOpen} setOpen={setSidebarOpen} />

      <main className={`relative z-10 transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-16'}`}>
        <div className="px-4 pb-16 pt-24">
        <div className="container mx-auto max-w-[1400px]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 px-1 py-2"
          >
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-3">
                <span className="inline-flex items-center rounded-full border border-[#284003]/35 bg-[#F2BF27]/25 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#284003]">
                  Busca de hospedagem
                </span>
                <div>
                  <h1 className="font-display text-3xl font-bold tracking-tight text-[#024059] md:text-4xl lg:text-5xl">
                    Nossos Quartos
                  </h1>
                  <p className="mt-2 max-w-2xl text-sm text-[#284003]/85 md:text-base">
                    Encontre o quarto perfeito para sua estadia em Du Zé.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowFilters(!showFilters)}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#024059]/35 bg-[#F2BF27]/30 px-4 py-2 text-sm font-medium text-[#024059] xl:hidden"
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
                    className="rounded-full border border-[#024059]/20 bg-[#F2F2F2] px-3 py-1 text-xs text-[#024059]"
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
              className="overflow-hidden xl:!h-auto xl:!opacity-100 xl:overflow-visible w-full xl:w-80 xl:flex-shrink-0"
            >
              <div
                className="rounded-2xl border-2 border-[#F2AB27]/60 bg-[#F2F2F2] p-6 xl:sticky xl:top-28"
                style={{ boxShadow: '0 18px 42px -18px rgba(0,0,0,0.18)' }}
              >
                <div className="mb-4">
                  <h2 className="font-display text-lg font-semibold text-[#024059]">Filtros</h2>
                  <p className="text-xs text-[#284003]/75">Refine resultados por tipo, capacidade, preço e pets.</p>
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-1">
                  <div>
                    <label className="mb-3 block text-xs font-semibold uppercase tracking-wider text-[#024059]/85">
                      Tipo
                    </label>
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger className="w-full border-[#024059]/35 bg-[#F2F2F2] text-[#024059]">
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
                    <label className="mb-3 block text-xs font-semibold uppercase tracking-wider text-[#024059]/85">
                      Capacidade mínima
                    </label>
                    <Select value={String(capacityFilter)} onValueChange={(v) => setCapacityFilter(Number(v))}>
                      <SelectTrigger className="w-full border-[#024059]/35 bg-[#F2F2F2] text-[#024059]">
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
                    <label className="mb-3 block text-xs font-semibold uppercase tracking-wider text-[#024059]/85">
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

                  <div className="flex items-center justify-between rounded-lg border border-[#024059]/25 bg-[#F2BF27]/20 px-3 py-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-[#024059]">
                      Aceita pets
                    </label>
                    <Switch 
                      checked={petsOnly} 
                      onCheckedChange={setPetsOnly} 
                      className="data-[state=unchecked]:bg-black/40"
                    />
                  </div>
                </div>
              </div>
            </motion.aside>

            <div className="flex-1">
              {isLoading || (hasDateFilter && isLoadingAvailability) ? (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2" aria-label="Carregando quartos">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div
                      key={`room-skeleton-${index}`}
                      className="overflow-hidden rounded-2xl border border-[#F2AB27]/40 bg-[#F2F2F2]"
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
                <div className="py-16 text-center text-[#024059]/80">
                  <p className="text-lg">Nenhum quarto encontrado com os filtros selecionados.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
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
