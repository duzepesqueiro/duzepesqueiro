import { useEffect, useState, type MouseEvent, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Users, PawPrint, Wifi, Snowflake, Tv, Coffee } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Room } from '@/types/booking';
import { Badge } from '@/components/ui/badge';
import RatingStarsDisplay from '@/components/reviews/RatingStarsDisplay';
import { cn } from '@/lib/utils';
import { formatBRL } from '@/lib/currency';

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

  const carouselImages: string[] = room.images.slice(0, MAX_IMAGES);

  const hasCarousel = carouselImages.length > 1;
  const activeImage = carouselImages[activeImageIndex] ?? null;

  useEffect(() => {
    if (activeImageIndex >= carouselImages.length) {
      setActiveImageIndex(0);
    }
  }, [room.id, room.images.length, carouselImages.length, activeImageIndex]);

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
      className={cn(
        'group overflow-hidden rounded-2xl border-2 border-[#F2BF27]/55 bg-[#F2F2F2] transition-all duration-300',
        unavailable ? 'cursor-default opacity-60' : 'cursor-pointer hover:border-[#F2AB27]'
      )}
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
              className="flex h-full w-full items-center justify-center bg-[#F2F2F2]"
            >
              <div className="text-center space-y-2">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-dashed border-[#024059]/35 text-[#024059]/80">
                  <span className="text-xl">+</span>
                </div>
                <p className="text-xs text-[#024059]/70">Imagem reservada</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="absolute inset-0 bg-[#024059]/25" />

        {hasCarousel && (
          <>
            <button
              type="button"
              onClick={goToPreviousImage}
              className="absolute left-3 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[#F2F2F2]/40 bg-[#024059]/75 text-sm font-semibold text-[#F2F2F2] transition hover:bg-[#024059]"
              aria-label="Imagem anterior"
            >
              &lt;
            </button>
            <button
              type="button"
              onClick={goToNextImage}
              className="absolute right-3 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[#F2F2F2]/40 bg-[#024059]/75 text-sm font-semibold text-[#F2F2F2] transition hover:bg-[#024059]"
              aria-label="Próxima imagem"
            >
              &gt;
            </button>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-[#F2F2F2]/35 bg-[#024059]/75 px-3 py-1 text-[11px] font-medium text-[#F2F2F2]">
              {activeImageIndex + 1}/{carouselImages.length}
            </div>
          </>
        )}

        {room.petFriendly && (
          <Badge className="absolute left-3 top-3 gap-1 bg-[#F2AB27] text-[#024059]">
            <PawPrint className="h-3 w-3" /> Pet friendly
          </Badge>
        )}
      </div>

      <div className="p-5">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-display text-lg font-semibold text-[#024059]">{room.name}</h3>
          <div className="flex items-center gap-1 text-[#284003]/80">
            <Users className="h-4 w-4" />
            <span className="text-sm">até {room.capacity}</span>
          </div>
        </div>

        <div className="mb-4 flex items-center gap-2 text-[#284003]/80">
          {room.reviewsCount && room.reviewsCount > 0 ? (
            <>
              <RatingStarsDisplay value={Number(room.averageRating ?? 0)} className="flex gap-1" />
              <span className="text-sm font-semibold">{Number(room.averageRating ?? 0).toFixed(1)}</span>
              <span className="text-xs text-[#284003]/70">({room.reviewsCount} avaliações)</span>
            </>
          ) : (
            <span className="text-xs text-[#284003]/60">Sem avaliações</span>
          )}
        </div>

        <p className="mb-4 line-clamp-2 text-sm text-[#024059]/78">{room.description}</p>

        <div className="flex flex-wrap gap-2 mb-4">
          {room.amenities.slice(0, 4).map((a) => (
            <span
              key={a}
              className="inline-flex items-center gap-1 rounded-md bg-[#F2BF27]/20 px-2 py-1 text-xs text-[#284003]"
            >
              {amenityIcons[a] || null} {a}
            </span>
          ))}
        </div>

        <div className="flex items-end justify-between border-t border-[#F2BF27]/45 pt-3">
          <div>
            <span className="text-2xl font-bold text-[#024059]">{formatBRL(room.pricePerNight)}</span>
            <span className="text-sm text-[#284003]/75"> /noite</span>
          </div>
          <button
            className={cn(
              'rounded-lg border px-4 py-2 text-sm font-semibold transition-colors',
              unavailable
                ? 'cursor-not-allowed border-[#284003]/20 bg-[#F2F2F2] text-[#284003]/55'
                : 'border-[#F2AB27] bg-[#F2AB27] text-[#024059] hover:bg-[#F2BF27]'
            )}
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
