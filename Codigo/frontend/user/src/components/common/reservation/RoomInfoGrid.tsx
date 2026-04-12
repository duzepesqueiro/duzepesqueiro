import { motion } from 'framer-motion';
import { Bed, Bath, Wifi, PawPrint, Clock, Star } from 'lucide-react';
import type { Room } from '@/types/booking';

interface InfoItem {
  label: string;
  value: string;
  icon?: React.ReactNode;
}

const iconMap: Record<string, React.ReactNode> = {
  beds: <Bed className="h-4 w-4" />,
  bathroom: <Bath className="h-4 w-4" />,
  capacity: <Star className="h-4 w-4" />,
  petFriendly: <PawPrint className="h-4 w-4" />,
};

const buildInfoItems = (room: Room): InfoItem[] => {
  const items: InfoItem[] = [
    { label: 'Tipo', value: room.type === 'standard' ? 'Standard' : room.type === 'deluxe' ? 'Deluxe' : room.type === 'suite' ? 'Suíte' : 'Chalé', icon: <Star className="h-4 w-4" /> },
    { label: 'Capacidade', value: `Até ${room.capacity} pessoa(s)`, icon: iconMap.capacity },
    { label: 'Camas', value: room.beds, icon: iconMap.beds },
    { label: 'Banheiro', value: room.bathroom, icon: iconMap.bathroom },
    { label: 'Aceita Pets', value: room.petFriendly ? 'Sim' : 'Não', icon: iconMap.petFriendly },
  ];

  room.amenities.forEach(a => {
    items.push({ label: 'Comodidade', value: a, icon: <Wifi className="h-4 w-4" /> });
  });

  room.extras.forEach(e => {
    items.push({ label: 'Extra', value: e, icon: <Star className="h-4 w-4" /> });
  });

  room.rules.forEach(r => {
    items.push({ label: 'Regra', value: r, icon: <Clock className="h-4 w-4" /> });
  });

  return items;
};

interface RoomInfoGridProps {
  room: Room;
}

const RoomInfoGrid = ({ room }: RoomInfoGridProps) => {
  const items = buildInfoItems(room);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <img
          src={room.images[0]}
          alt={room.name}
          className="w-24 h-20 object-cover rounded-lg"
        />
        <div>
          <h4 className="font-display font-bold text-foreground text-lg">{room.name}</h4>
          <p className="text-sm text-muted-foreground">{room.description}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((item, i) => (
          <motion.div
            key={`${item.label}-${item.value}-${i}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className="flex items-start gap-2.5 bg-muted rounded-lg p-3"
          >
            <span className="text-primary mt-0.5 shrink-0">{item.icon}</span>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{item.label}</p>
              <p className="text-sm text-foreground break-words">{item.value}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default RoomInfoGrid;
