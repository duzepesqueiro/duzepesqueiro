import { useEffect, useState, useMemo, type MouseEvent, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Users, PawPrint, Wifi, Snowflake, Tv, Coffee } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Room } from '@/types/booking';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatBRL } from '@/lib/currency';

const MAX_IMAGES = 10;

const AMENITY_ICONS: Record<string, ReactNode> = {
  'Wi-Fi': <Wifi className="h-3.5 w-3.5" />,
  'Ar condicionado': <Snowflake className="h-3.5 w-3.5" />,
  'TV Smart': <Tv className="h-3.5 w-3.5" />,
  'TV Smart 65"': <Tv className="h-3.5 w-3.5" />,
  'Frigobar': <Coffee className="h-3.5 w-3.5" />,
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

  // Memoiza o array de imagens para evitar re-fatiamento constante
  const carouselImages = useMemo(() => 
    room.images.slice(0, MAX_IMAGES), 
  [room.images]);

  const hasCarousel = carouselImages.length > 1;
  const activeImage = carouselImages[activeImageIndex] ?? null;

  // Garante que o índice volte a 0 se o quarto mudar ou as imagens diminuírem
  useEffect(() => {
    if (activeImageIndex >= carouselImages.length) {
      setActiveImageIndex(0);
    }
  }, [room.id, carouselImages.length, activeImageIndex]);

  const handleSelect = () => {
    if (unavailable) return;
    if (onSelect) return onSelect(room);
    
    navigate(`/hospedagem/rooms/${room.id}`, { state: { room } });
  };

  const updateImageIndex = (e: MouseEvent, step: number) => {
    e.stopPropagation();
    if (!hasCarousel) return;
    
    setActiveImageIndex((prev) => 
      (prev + step + carouselImages.length) % carouselImages.length
    );
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
      {/* Área da Imagem / Carousel */}
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
              key="placeholder"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
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

        <div className="absolute inset-0 bg-[#024059]/25 pointer-events-none" />

        {hasCarousel && (
          <>
            <button
              type="button"
              onClick={(e) => updateImageIndex(e, -1)}
              className="absolute left-3 top-1/2 z-10 h-9 w-9 -translate-y-1/2 flex items-center justify-center rounded-full border border-[#F2F2F2]/40 bg-[#024059]/75 text-[#F2F2F2] transition hover:bg-[#024059]"
              aria-label="Anterior"
            >
              &lt;
            </button>
            <button
              type="button"
              onClick={(e) => updateImageIndex(e, 1)}
              className="absolute right-3 top-1/2 z-10 h-9 w-9 -translate-y-1/2 flex items-center justify-center rounded-full border border-[#F2F2F2]/40 bg-[#024059]/75 text-[#F2F2F2] transition hover:bg-[#024059]"
              aria-label="Próxima"
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

      {/* Conteúdo Informativo */}
      <div className="p-5">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-display text-lg font-semibold text-[#024059]">{room.name}</h3>
          <div className="flex items-center gap-1 text-[#284003]/80">
            <Users className="h-4 w-4" />
            <span className="text-sm">até {room.capacity}</span>
          </div>
        </div>

        <p className="mb-4 line-clamp-2 text-sm text-[#024059]/78">{room.description}</p>

        <div className="flex flex-wrap gap-2 mb-4">
          {room.amenities.slice(0, 4).map((amenity) => (
            <span
              key={amenity}
              className="inline-flex items-center gap-1 rounded-md bg-[#F2BF27]/20 px-2 py-1 text-xs text-[#284003]"
            >
              {AMENITY_ICONS[amenity] || null} {amenity}
            </span>
          ))}
        </div>

        <div className="flex items-end justify-between border-t border-[#F2BF27]/45 pt-3">
          <div>
            <span className="text-2xl font-bold text-[#024059]">{formatBRL(room.pricePerNight)}</span>
            <span className="text-sm text-[#284003]/75"> /noite</span>
          </div>
          <button
            disabled={unavailable}
            className={cn(
              'rounded-lg border px-4 py-2 text-sm font-semibold transition-colors',
              unavailable
                ? 'cursor-not-allowed border-[#284003]/20 bg-[#F2F2F2] text-[#284003]/55'
                : 'border-[#F2AB27] bg-[#F2AB27] text-[#024059] hover:bg-[#F2BF27]'
            )}
            onClick={(e) => {
              e.stopPropagation();
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