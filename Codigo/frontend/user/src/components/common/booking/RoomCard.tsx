import { motion } from 'framer-motion';
import { Users, PawPrint, Wifi, Snowflake, Tv, Coffee } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Room } from '@/types/booking';
import { Badge } from '@/components/ui/badge';

const amenityIcons: Record<string, React.ReactNode> = {
  'Wi-Fi': <Wifi className="h-3.5 w-3.5" />,
  'Ar condicionado': <Snowflake className="h-3.5 w-3.5" />,
  'TV Smart': <Tv className="h-3.5 w-3.5" />,
  'TV Smart 65"': <Tv className="h-3.5 w-3.5" />,
  'Frigobar': <Coffee className="h-3.5 w-3.5" />,
};

interface RoomCardProps {
  room: Room;
  index: number;
}

const RoomCard = ({ room, index }: RoomCardProps) => {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      whileHover={{ y: -4 }}
      className="card-room cursor-pointer group"
      onClick={() => navigate(`/hospedagem/rooms/${room.id}`)}
    >
      <div className="relative overflow-hidden aspect-[4/3]">
        <img
          src={room.images[0]}
          alt={room.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
        />
        {room.petFriendly && (
          <Badge className="absolute top-3 left-3 bg-primary text-primary-foreground gap-1">
            <PawPrint className="h-3 w-3" /> Pet friendly
          </Badge>
        )}
      </div>

      <div className="p-5">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-display text-lg font-semibold text-foreground">{room.name}</h3>
          <div className="flex items-center gap-1 text-muted-foreground">
            <Users className="h-4 w-4" />
            <span className="text-sm">até {room.capacity}</span>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{room.description}</p>

        <div className="flex flex-wrap gap-2 mb-4">
          {room.amenities.slice(0, 4).map(a => (
            <span key={a} className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md">
              {amenityIcons[a] || null} {a}
            </span>
          ))}
        </div>

        <div className="flex items-end justify-between pt-3 border-t border-border">
          <div>
            <span className="text-2xl font-bold text-foreground">
              R$ {room.pricePerNight}
            </span>
            <span className="text-sm text-muted-foreground"> /noite</span>
          </div>
          <button className="btn-gold text-sm px-4 py-2">Selecionar</button>
        </div>
      </div>
    </motion.div>
  );
};

export default RoomCard;
