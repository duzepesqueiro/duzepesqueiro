import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Filter } from 'lucide-react';
import Header from '@/components/common/layout/Header';
import RoomCard from '@/components/common/booking/RoomCard';
import { useBooking } from '@/contexts/BookingContext';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Room } from '@/types/booking';
import roomStandard from '@/assets/room-standard.jpg';
import roomDeluxe from '@/assets/room-deluxe.jpg';
import roomSuite from '@/assets/room-suite.jpg';
import roomCabin from '@/assets/room-cabin.jpg';

const rooms: Room[] = [
  {
    id: 'room-standard-1',
    name: 'Quarto Standard',
    type: 'standard',
    description: 'Conforto essencial para casais e pequenas famílias com ambiente acolhedor.',
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
    name: 'Quarto Deluxe',
    type: 'deluxe',
    description: 'Mais espaço e comodidade para estadias com conforto superior.',
    capacity: 3,
    pricePerNight: 390,
    amenities: ['Wi-Fi', 'Ar condicionado', 'TV Smart 65"', 'Frigobar'],
    petFriendly: true,
    images: [roomDeluxe],
    beds: '1 cama queen + 1 cama solteiro',
    bathroom: 'Banheiro privativo com ducha',
    extras: ['Café da manhã', 'Amenities premium'],
    rules: ['Check-in a partir das 14h', 'Silêncio após 22h'],
    unavailableDates: [],
  },
  {
    id: 'room-suite-1',
    name: 'Suíte Master',
    type: 'suite',
    description: 'Experiência premium com ambiente amplo e vista privilegiada.',
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

const RoomsPage = () => {
  const { booking } = useBooking();
  const [capacityFilter, setCapacityFilter] = useState<number>(0);
  const [petsOnly, setPetsOnly] = useState(booking.pets);
  const [priceRange, setPriceRange] = useState<number[]>([0, 1000]);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  const filteredRooms = useMemo(() => {
    return rooms.filter(room => {
      if (capacityFilter > 0 && room.capacity < capacityFilter) return false;
      if (petsOnly && !room.petFriendly) return false;
      if (room.pricePerNight < priceRange[0] || room.pricePerNight > priceRange[1]) return false;
      if (typeFilter !== 'all' && room.type !== typeFilter) return false;
      if (booking.guests > room.capacity) return false;
      return true;
    });
  }, [capacityFilter, petsOnly, priceRange, typeFilter, booking.guests]);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-2">
              Nossos Quartos
            </h1>
            <p className="text-muted-foreground">
              {booking.guests > 1 ? `Para ${booking.guests} hóspedes` : 'Encontre o quarto perfeito'}
              {booking.pets ? ' · Com pets' : ''}
            </p>
          </motion.div>

          {/* Filters toggle mobile */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="md:hidden flex items-center gap-2 mb-4 text-sm font-medium text-foreground bg-muted px-4 py-2 rounded-lg"
          >
            <Filter className="h-4 w-4" /> Filtros
          </button>

          <div className="flex flex-col md:flex-row gap-8">
            {/* Filters */}
            <motion.aside
              initial={false}
              animate={{ height: showFilters ? 'auto' : 0, opacity: showFilters ? 1 : 0 }}
              className={`md:!h-auto md:!opacity-100 overflow-hidden md:overflow-visible w-full md:w-64 flex-shrink-0`}
            >
              <div className="bg-card rounded-xl p-5 space-y-6" style={{ boxShadow: 'var(--shadow-card)' }}>
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
                  <Select value={String(capacityFilter)} onValueChange={v => setCapacityFilter(Number(v))}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Qualquer</SelectItem>
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
                  <Slider
                    value={priceRange}
                    onValueChange={setPriceRange}
                    min={0}
                    max={1000}
                    step={50}
                    className="mt-2"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Aceita pets
                  </label>
                  <Switch checked={petsOnly} onCheckedChange={setPetsOnly} />
                </div>
              </div>
            </motion.aside>

            {/* Room grid */}
            <div className="flex-1">
              {filteredRooms.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <p className="text-lg">Nenhum quarto encontrado com os filtros selecionados.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {filteredRooms.map((room, i) => (
                    <RoomCard key={room.id} room={room} index={i} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default RoomsPage;
