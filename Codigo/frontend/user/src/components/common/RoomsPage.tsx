import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Filter } from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Header from '@/components/common/layout/Header';
import SectionTitle from '@/components/common/layout/SectionTitle';
import RoomCard from '@/components/common/booking/RoomCard';
import { useBooking } from '@/contexts/BookingContext';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import type { Room } from '@/types/booking';
import { api } from '@/lib/api';
import { mapApiChaletToRoom, resolveEffectiveRoomPrice } from '@/lib/hostingRoomMapper';

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

type BackendRoomType = 'standard' | 'deluxe' | 'suite';

const ROOM_TYPE_LABELS: Record<BackendRoomType, string> = {
  standard: 'Standard',
  deluxe: 'Deluxe',
  suite: 'Suíte',
};

const ROOM_TYPE_ORDER: BackendRoomType[] = ['standard', 'deluxe', 'suite'];

const ROOM_TYPE_TO_BACKEND: Record<BackendRoomType, 'STANDARD' | 'DELUXE' | 'SUITE'> = {
  standard: 'STANDARD',
  deluxe: 'DELUXE',
  suite: 'SUITE',
};

const isBackendRoomType = (value: Room['type']): value is BackendRoomType =>
  value === 'standard' || value === 'deluxe' || value === 'suite';

const parseQueryDate = (value: string | null): Date | null => {
  if (!value) return null;
  const normalized = value.trim();
  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const parsed = match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    : new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const fetchChales = async (params?: Record<string, string | number>) => {
  const { data } = await api.get('/api/chales', { params });
  return Array.isArray(data) ? (data as ApiChalet[]) : [];
};

const enrichChales = async (base: ApiChalet[]) => {
  return Promise.all(
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
    }),
  );
};

const RoomsPage = () => {
  const navigate = useNavigate();
  const { booking, setBooking } = useBooking();
  const [searchParams] = useSearchParams();
  const guestsParamRaw = searchParams.get('guests');
  const guestsParam = guestsParamRaw ? Number(guestsParamRaw) : NaN;
  const petsParam = searchParams.get('pets');
  const checkInParamRaw = searchParams.get('checkIn');
  const checkOutParamRaw = searchParams.get('checkOut');
  const initialCapacityFilter = !Number.isNaN(guestsParam) && guestsParam > 1 ? guestsParam : 0;
  const initialPetsOnly = petsParam === '1' || petsParam === 'true' ? true : booking.pets;

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [capacityFilter, setCapacityFilter] = useState<number>(initialCapacityFilter);
  const [petsOnly, setPetsOnly] = useState(initialPetsOnly);
  const [priceRange, setPriceRange] = useState<number[]>([0, 1000]);
  const [priceFilterEnabled, setPriceFilterEnabled] = useState(false);
  const [typeFilter, setTypeFilter] = useState<BackendRoomType | 'all'>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Preenche filtros com o que veio da home
  useEffect(() => {
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

    if (checkInParamRaw) {
      const d = parseQueryDate(checkInParamRaw);
      if (d) setBooking((prev) => ({ ...prev, checkIn: d }));
    }
    if (checkOutParamRaw) {
      const d = parseQueryDate(checkOutParamRaw);
      if (d) setBooking((prev) => ({ ...prev, checkOut: d }));
    }
  }, [booking.guests, checkInParamRaw, checkOutParamRaw, guestsParam, petsParam, setBooking]);

  const queryCheckIn = checkInParamRaw ?? (booking.checkIn ? format(booking.checkIn, 'yyyy-MM-dd') : null);
  const queryCheckOut = checkOutParamRaw ?? (booking.checkOut ? format(booking.checkOut, 'yyyy-MM-dd') : null);

  const roomQueryParams = useMemo(() => {
    const params: Record<string, string | number> = {};

    if (typeFilter !== 'all') {
      params.tipo = ROOM_TYPE_TO_BACKEND[typeFilter];
    }

    if (capacityFilter > 0) {
      params.capacidadeAdultos = capacityFilter;
      params.capacidadeCriancas = 0;
    }

    if (queryCheckIn && queryCheckOut) {
      params.checkin = queryCheckIn;
      params.checkout = queryCheckOut;
    }

    return params;
  }, [capacityFilter, queryCheckIn, queryCheckOut, typeFilter]);

  const { data: allRoomsData = [] } = useQuery<ApiChalet[]>({
    queryKey: ['rooms-options'],
    queryFn: () => fetchChales(),
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });

  const { data: serverRooms = [], isLoading: isLoadingRooms } = useQuery<ApiChalet[]>({
    queryKey: ['rooms', typeFilter, capacityFilter, queryCheckIn, queryCheckOut],
    queryFn: async (): Promise<ApiChalet[]> => {
      const base = await fetchChales(roomQueryParams);
      return enrichChales(base);
    },
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  const allRoomList: Room[] = useMemo(
    () => allRoomsData.map((item) => mapApiChaletToRoom(item)),
    [allRoomsData],
  );

  const roomList: Room[] = useMemo(
    () => serverRooms.map((item) => mapApiChaletToRoom(item)),
    [serverRooms],
  );

  const availableTypeOptions = useMemo(() => {
    const availableTypes = new Set(
      allRoomList.map((room) => room.type).filter(isBackendRoomType),
    );
    return ROOM_TYPE_ORDER.filter((type) => availableTypes.has(type));
  }, [allRoomList]);

  const maxCapacity = useMemo(() => {
    if (!allRoomList.length) return 0;
    return Math.max(...allRoomList.map((room) => room.capacity || 0));
  }, [allRoomList]);

  const availableCapacityOptions = useMemo(
    () => Array.from({ length: Math.max(maxCapacity, capacityFilter) }, (_, index) => index + 1),
    [capacityFilter, maxCapacity],
  );

  const hasPetFriendlyRooms = useMemo(
    () => allRoomList.some((room) => room.petFriendly),
    [allRoomList],
  );

  useEffect(() => {
    if (typeFilter !== 'all' && !availableTypeOptions.includes(typeFilter)) {
      setTypeFilter('all');
    }
  }, [availableTypeOptions, typeFilter]);

  const priceSliderMax = useMemo(() => {
    if (!allRoomList.length) return 1000;
    const maxPrice = Math.max(...allRoomList.map((room) => room.pricePerNight || 0));
    return Math.max(1000, Math.ceil(maxPrice / 100) * 100);
  }, [allRoomList]);

  useEffect(() => {
    if (!priceFilterEnabled) {
      setPriceRange([0, priceSliderMax]);
      return;
    }
    setPriceRange((prev) => [Math.min(prev[0], priceSliderMax), Math.min(prev[1], priceSliderMax)]);
  }, [priceSliderMax, priceFilterEnabled]);

  const filteredRooms = useMemo(() => {
    return roomList
      .filter((room) => {
        if (petsOnly && hasPetFriendlyRooms && !room.petFriendly) return false;
        if (priceFilterEnabled && (room.pricePerNight < priceRange[0] || room.pricePerNight > priceRange[1])) return false;
        return true;
      })
      .map((room) => ({ room }));
  }, [
    roomList,
    petsOnly,
    hasPetFriendlyRooms,
    priceRange,
    priceFilterEnabled,
  ]);

  const summaryChips = [
    booking.checkIn && booking.checkOut
      ? `Período: ${booking.checkIn.toLocaleDateString()} - ${booking.checkOut.toLocaleDateString()}`
      : null,
    searchParams.has('guests') || booking.guests > 1 ? `${booking.guests} hóspede(s)` : null,
    typeFilter !== 'all' ? ROOM_TYPE_LABELS[typeFilter] : null,
    capacityFilter > 0 ? `${capacityFilter}+ pessoas` : null,
    hasPetFriendlyRooms && petsOnly ? 'Somente pet friendly' : null,
  ].filter((chip): chip is string => Boolean(chip));

  const handleSelectRoom = (room: Room) => {
    setBooking((prev) => ({ ...prev, roomId: room.id }));
    const params = new URLSearchParams();
    if (queryCheckIn) params.set('checkIn', queryCheckIn);
    if (queryCheckOut) params.set('checkOut', queryCheckOut);
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
                  <SectionTitle
                    as="h1"
                    logoClassName="h-10 w-10"
                    className="font-display text-3xl font-bold tracking-tight text-[#024059] md:text-4xl lg:text-5xl"
                  >
                    Nossos Quartos
                  </SectionTitle>
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
                  <SectionTitle
                    as="h2"
                    logoClassName="h-7 w-7"
                    className="font-display text-lg font-semibold text-[#024059]"
                  >
                    Filtros
                  </SectionTitle>
                  <p className="text-xs text-[#284003]/75">Refine resultados por tipo, capacidade, preço e pets.</p>
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-1">
                  <div>
                    <label className="mb-3 block text-xs font-semibold uppercase tracking-wider text-[#024059]/85">
                      Tipo
                    </label>
                    <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as BackendRoomType | 'all')}>
                      <SelectTrigger className="w-full border-[#024059]/35 bg-[#F2F2F2] text-[#024059]">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        {availableTypeOptions.map((type) => (
                          <SelectItem key={type} value={type}>
                            {ROOM_TYPE_LABELS[type]}
                          </SelectItem>
                        ))}
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
                        {availableCapacityOptions.map((capacity) => (
                          <SelectItem key={capacity} value={String(capacity)}>
                            {capacity}+ pessoas
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="sm:col-span-2 lg:col-span-2 xl:col-span-1">
                    <label className="mb-3 block text-xs font-semibold uppercase tracking-wider text-[#024059]/85">
                      Faixa de preço: R${priceRange[0]} - R${priceRange[1]}
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
                    <Switch checked={petsOnly} onCheckedChange={setPetsOnly} disabled={!hasPetFriendlyRooms} />
                  </div>
                </div>
              </div>
            </motion.aside>

            <div
              aria-hidden="true"
              className="hidden xl:block w-px self-stretch rounded-full bg-[#024059]/12"
            />

            <div className="flex-1">
              {isLoadingRooms ? (
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
                  {filteredRooms.map(({ room }, i) => (
                    <RoomCard key={room.id} room={room} index={i} onSelect={handleSelectRoom} />
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
