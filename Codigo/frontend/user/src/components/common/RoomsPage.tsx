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
import type { Room } from '@/types/booking';
import { api } from '@/lib/api';
import roomStandard from '@/assets/room-standard.jpg';
import roomDeluxe from '@/assets/room-deluxe.jpg';
import roomSuite from '@/assets/room-suite.jpg';
import roomCabin from '@/assets/room-cabin.jpg';

type ApiChalet = {
  id: string;
  name: string;
  description?: string;
  unitType?: string;
  maxGuests?: number;
  basePrice?: number;
  amenities?: string[];
  images?: { imageUrl: string }[] | string[];
  petFriendly?: boolean;
  status?: string;
  isActive?: boolean;
  unavailableDates?: string[];
};

const fallbackRooms: Room[] = [
  {
    id: 'room-standard-1',
    name: 'Quarto Conforto',
    type: 'standard',
    description:
      'Aconchegante e funcional, perfeito para uma estadia tranquila. Decoração em tons neutros com toques de madeira.',
    capacity: 2,
    pricePerNight: 280,
    amenities: ['Wi-Fi', 'Ar condicionado', 'TV Smart', 'Frigobar'],
    petFriendly: true,
    images: [roomStandard],
    beds: '1 cama queen',
    bathroom: 'Banheiro privativo',
    extras: ['Café da manhã', 'Estacionamento'],
    rules: ['Check-in a partir das 14h', 'Check-out até 12h'],
    unavailableDates: [],
  },
  {
    id: 'room-deluxe-1',
    name: 'Quarto Jardim',
    type: 'deluxe',
    description:
      'Varanda privativa com vista para o jardim tropical. Ideal para casais em busca de espaço extra e luz natural.',
    capacity: 3,
    pricePerNight: 420,
    amenities: ['Wi-Fi', 'Ar condicionado', 'TV Smart 65"', 'Frigobar'],
    petFriendly: true,
    images: [roomDeluxe],
    beds: '1 cama queen + 1 cama de solteiro',
    bathroom: 'Banheiro privativo com ducha',
    extras: ['Café da manhã', 'Amenities premium'],
    rules: ['Check-in a partir das 14h', 'Silêncio após 22h'],
    unavailableDates: [],
  },
  {
    id: 'room-suite-1',
    name: 'Suíte Master',
    type: 'suite',
    description: 'Experiência premium com ambiente amplo, living integrado e vista privilegiada.',
    capacity: 4,
    pricePerNight: 560,
    amenities: ['Wi-Fi', 'Ar condicionado', 'TV Smart 65"', 'Frigobar'],
    petFriendly: false,
    images: [roomSuite],
    beds: '1 cama king + sofá-cama',
    bathroom: 'Banheiro amplo com amenities',
    extras: ['Café da manhã', 'Late checkout sujeito à disponibilidade'],
    rules: ['Check-in a partir das 14h', 'Não fumar no quarto'],
    unavailableDates: [],
  },
  {
    id: 'room-cabin-1',
    name: 'Chalé da Serra',
    type: 'cabin',
    description: 'Chalé privativo para grupos e famílias em contato com a natureza.',
    capacity: 5,
    pricePerNight: 640,
    amenities: ['Wi-Fi', 'Ar condicionado', 'TV Smart', 'Frigobar'],
    petFriendly: true,
    images: [roomCabin],
    beds: '2 camas queen + 1 sofá-cama',
    bathroom: '2 banheiros',
    extras: ['Café da manhã', 'Área externa privativa'],
    rules: ['Check-in a partir das 14h', 'Não realizar festas'],
    unavailableDates: [],
  },
];

const mapApiChaletToRoom = (item: ApiChalet): Room => ({
  id: item.id,
  name: item.name,
  type: (item.unitType as Room['type']) || 'standard',
  description: item.description || 'Acomodações preparadas para sua estadia.',
  capacity: item.maxGuests || 2,
  pricePerNight: item.basePrice ?? 0,
  amenities: item.amenities && item.amenities.length ? item.amenities : ['Wi-Fi', 'Ar condicionado'],
  petFriendly: Boolean(item.petFriendly),
  images:
    Array.isArray(item.images) && item.images.length
      ? item.images.map((img) => (typeof img === 'string' ? img : img.imageUrl))
      : [roomStandard],
  beds: '1 cama queen',
  bathroom: 'Banheiro privativo',
  extras: [],
  rules: [],
  unavailableDates: item.unavailableDates || [],
});

const isUnavailable = (room: Room, status?: string, isActive?: boolean) => {
  if (isActive === false) return true;
  if (status && status !== 'ACTIVE' && status !== 'AVAILABLE') return true;
  return false;
};

const RoomsPage = () => {
  const navigate = useNavigate();
  const { booking, setBooking } = useBooking();
  const [searchParams] = useSearchParams();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [capacityFilter, setCapacityFilter] = useState<number>(0);
  const [petsOnly, setPetsOnly] = useState(booking.pets);
  const [priceRange, setPriceRange] = useState<number[]>([0, 1000]);
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
    queryKey: [
      'rooms',
      typeFilter,
      capacityFilter,
      booking.checkIn ? booking.checkIn.toISOString() : null,
      booking.checkOut ? booking.checkOut.toISOString() : null,
      petsOnly,
    ],
    queryFn: async (): Promise<ApiChalet[]> => {
      const params: Record<string, string | number | boolean | undefined> = {
        checkin: booking.checkIn ? booking.checkIn.toISOString() : undefined,
        checkout: booking.checkOut ? booking.checkOut.toISOString() : undefined,
        capacidadeAdultos: capacityFilter > 0 ? capacityFilter : undefined,
        tipo: typeFilter !== 'all' ? typeFilter : undefined,
      };
      const { data } = await api.get('/api/chales', { params });
      if (!Array.isArray(data)) return [];
      return data as ApiChalet[];
    },
    staleTime: 1000 * 60 * 3,
    placeholderData: keepPreviousData,
  });

  const roomList: { room: Room; status?: string; isActive?: boolean }[] = serverRooms.length
    ? serverRooms.map((c) => ({ room: mapApiChaletToRoom(c), status: c.status, isActive: c.isActive }))
    : fallbackRooms.map((r) => ({ room: r, status: 'ACTIVE', isActive: true }));

  const filteredRooms = useMemo(() => {
    return roomList
      .filter(({ room, status, isActive }) => {
        if (capacityFilter > 0 && room.capacity < capacityFilter) return false;
        if (petsOnly && !room.petFriendly) return false;
        if (room.pricePerNight < priceRange[0] || room.pricePerNight > priceRange[1]) return false;
        if (typeFilter !== 'all' && room.type !== typeFilter) return false;
        if (booking.guests > room.capacity) return false;
        if (isUnavailable(room, status, isActive)) return false;
        return true;
      })
      .map(({ room, status, isActive }) => ({
        room,
        unavailable: isUnavailable(room, status, isActive),
      }));
  }, [roomList, capacityFilter, petsOnly, priceRange, typeFilter, booking.guests]);

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
    params.set('price', String(room.pricePerNight));
    navigate(`/hospedagem/rooms/${room.id}?${params.toString()}`, { state: { room } });
  };

  return (
    <div className="relative min-h-screen bg-background">
      <Header open={sidebarOpen} setOpen={setSidebarOpen} />

      <main className={`relative z-10 transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-16'}`}>
        <div className="pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
            <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-1">
              Nossos Quartos
            </h1>
            <p className="text-muted-foreground">Encontre o quarto perfeito para sua estadia em Du Zé.</p>
            {summaryChips.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {summaryChips.map((chip) => (
                  <span
                    key={chip}
                    className="px-3 py-1 text-xs rounded-full bg-muted text-foreground border border-border/70"
                  >
                    {chip}
                  </span>
                ))}
              </div>
            )}
          </motion.div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className="md:hidden flex items-center gap-2 mb-4 text-sm font-medium text-foreground bg-muted px-4 py-2 rounded-lg"
          >
            <Filter className="h-4 w-4" /> Filtros
          </button>

          <div className="flex flex-col md:flex-row gap-8">
            <motion.aside
              initial={false}
              animate={{ height: showFilters ? 'auto' : 0, opacity: showFilters ? 1 : 0 }}
              className="md:!h-auto md:!opacity-100 overflow-hidden md:overflow-visible w-full md:w-72 flex-shrink-0"
            >
              <div
                className="bg-card rounded-2xl p-6 space-y-6"
                style={{ boxShadow: '0 18px 42px -18px rgba(0,0,0,0.18)' }}
              >
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 block">
                    Tipo
                  </label>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-full">
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
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 block">
                    Capacidade mínima
                  </label>
                  <Select value={String(capacityFilter)} onValueChange={(v) => setCapacityFilter(Number(v))}>
                    <SelectTrigger className="w-full">
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

                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 block">
                    Faixa de preço: R${priceRange[0]} - R${priceRange[1]}
                  </label>
                  <Slider value={priceRange} onValueChange={setPriceRange} min={0} max={1000} step={20} />
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Aceita pets
                  </label>
                  <Switch checked={petsOnly} onCheckedChange={setPetsOnly} />
                </div>
              </div>
            </motion.aside>

            <div className="flex-1">
              {isLoading ? (
                <div className="text-center py-16 text-muted-foreground">Carregando quartos...</div>
              ) : filteredRooms.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <p className="text-lg">Nenhum quarto encontrado com os filtros selecionados.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
