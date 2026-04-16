import { useEffect, useState, type MouseEvent, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Users, PawPrint, Wifi, Snowflake, Tv, Coffee } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Room } from '@/types/booking';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const MAX_IMAGES = 10;

const amenityIcons: Record<string, ReactNode> = {
  'Wi-Fi': <Wifi className="h-3.5 w-3.5" />,
  'Ar condicionado': <Snowflake className="h-3.5 w-3.5" />,
  'TV Smart': <Tv className="h-3.5 w-3.5" />,
  'TV Smart 65"': <Tv className="h-3.5 w-3.5" />,
  Frigobar: <Coffee className="h-3.5 w-3.5" />,
};

interface RoomCardProps {
  room: Room;
  index: number;
  unavailable?: boolean;
  onSelect?: (room: Room) => void;
}

const RoomCard = ({ room, index, unavailable = false, onSelect }: RoomCardProps) => {
  const navigate = useNavigate();
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const carouselImages: Array<string | null> = [
    ...room.images.slice(0, MAX_IMAGES),
    ...Array.from({ length: Math.max(0, MAX_IMAGES - room.images.length) }, () => null),
  ];

  const hasCarousel = carouselImages.length > 1;
  const activeImage = carouselImages[activeImageIndex] ?? carouselImages[0];

  useEffect(() => {
    setActiveImageIndex(0);
  }, [room.id, room.images.length]);

  const handleSelect = () => {
    if (unavailable) return;

    if (onSelect) {
      onSelect(room);
      return;
    }

    navigate(`/hospedagem/rooms/${room.id}`, { state: { room } });
  };

  const goToPreviousImage = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (!hasCarousel) return;
    setActiveImageIndex((current) => (current - 1 + carouselImages.length) % carouselImages.length);
  };

  const goToNextImage = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (!hasCarousel) return;
    setActiveImageIndex((current) => (current + 1) % carouselImages.length);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      whileHover={{ y: -4 }}
      className={cn('card-room group', unavailable ? 'opacity-60 cursor-default' : 'cursor-pointer')}
      onClick={handleSelect}
    >
      <div className="relative overflow-hidden aspect-[4/3]">
        <AnimatePresence mode="wait">
          {activeImage ? (
            <motion.img
              key={`${room.id}-${activeImageIndex}`}
              src={activeImage}
              alt={`${room.name} - imagem ${activeImageIndex + 1}`}
              initial={{ opacity: 0, scale: 1.04 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              transition={{ duration: 0.35 }}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              loading="lazy"
            />
          ) : (
            <motion.div
              key={`${room.id}-${activeImageIndex}-placeholder`}
              initial={{ opacity: 0, scale: 1.02 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.01 }}
              transition={{ duration: 0.35 }}
              className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted via-background to-muted/70"
            >
              <div className="text-center space-y-2">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-dashed border-border/70 text-muted-foreground">
                  <span className="text-xl">+</span>
                </div>
                <p className="text-xs text-muted-foreground">Imagem reservada</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />

        {hasCarousel && (
          <>
            <button
              type="button"
              onClick={goToPreviousImage}
              className="absolute left-3 top-1/2 -translate-y-1/2 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/45 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-black/65"
              aria-label="Imagem anterior"
            >
              &lt;
            </button>
            <button
              type="button"
              onClick={goToNextImage}
              className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/45 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-black/65"
              aria-label="Próxima imagem"
            >
              &gt;
            </button>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-white/15 bg-black/45 px-3 py-1 text-[11px] font-medium text-white backdrop-blur-md">
              {activeImageIndex + 1}/{carouselImages.length}
            </div>
          </>
        )}

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
          {room.amenities.slice(0, 4).map((a) => (
            <span
              key={a}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md"
            >
              {amenityIcons[a] || null} {a}
            </span>
          ))}
        </div>

        <div className="flex items-end justify-between pt-3 border-t border-border">
          <div>
            <span className="text-2xl font-bold text-foreground">R$ {room.pricePerNight}</span>
            <span className="text-sm text-muted-foreground"> /noite</span>
          </div>
          <button
            className="btn-gold text-sm px-4 py-2"
            disabled={unavailable}
            onClick={(event) => {
              event.stopPropagation();
              handleSelect();
            }}
          >
            {unavailable ? 'Indisponível' : 'Ver informações'}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default RoomCard;
