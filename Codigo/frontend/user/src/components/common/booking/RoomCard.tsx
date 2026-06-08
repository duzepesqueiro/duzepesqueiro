import { useEffect, useState, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react';
import { motion } from 'framer-motion';
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

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (unavailable) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleSelect();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      className={cn(
        'group overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-[box-shadow,border-color,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        unavailable
          ? 'cursor-not-allowed opacity-70'
          : 'cursor-pointer hover:-translate-y-1 hover:border-primary/25 hover:shadow-[0_18px_40px_-24px_hsl(var(--primary)/0.55)]'
      )}
      onClick={handleSelect}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-disabled={unavailable}
      aria-label={unavailable ? `${room.name} indisponível` : `Ver informações de ${room.name}`}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {activeImage ? (
          <img
            src={activeImage}
            alt={`${room.name} - imagem ${activeImageIndex + 1}`}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.06]"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted">
            <div className="space-y-2 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-dashed border-border text-muted-foreground">
                <span className="text-xl">+</span>
              </div>
              <p className="text-xs text-muted-foreground">Imagem reservada</p>
            </div>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/15 to-transparent" />

        {hasCarousel && (
          <>
            <button
              type="button"
              onClick={goToPreviousImage}
              className="absolute left-3 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/45 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-black/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-black/30"
              aria-label="Imagem anterior"
            >
              &lt;
            </button>
            <button
              type="button"
              onClick={goToNextImage}
              className="absolute right-3 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/45 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-black/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-black/30"
              aria-label="Próxima imagem"
            >
              &gt;
            </button>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-white/20 bg-black/45 px-3 py-1 text-[11px] font-medium text-white">
              {activeImageIndex + 1}/{carouselImages.length}
            </div>
          </>
        )}

        {room.petFriendly && (
          <Badge variant="secondary" className="absolute left-3 top-3 gap-1">
            <PawPrint className="h-3 w-3" /> Pet friendly
          </Badge>
        )}

        {unavailable && (
          <Badge
            variant="outline"
            className="absolute right-3 top-3 border-white/20 bg-black/45 text-white backdrop-blur"
          >
            Indisponível
          </Badge>
        )}
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display text-lg font-semibold leading-snug text-foreground">{room.name}</h3>
          <div className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            <span>até {room.capacity}</span>
          </div>
        </div>

        <div className="mb-4 mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground">
          {room.reviewsCount && room.reviewsCount > 0 ? (
            <>
              <RatingStarsDisplay value={Number(room.averageRating ?? 0)} className="flex gap-1" />
              <span className="text-sm font-semibold text-foreground">{Number(room.averageRating ?? 0).toFixed(1)}</span>
              <span className="text-xs">({room.reviewsCount} avaliações)</span>
            </>
          ) : (
            <span className="text-xs">Sem avaliações</span>
          )}
        </div>

        <p className="mb-4 line-clamp-2 text-sm text-muted-foreground">{room.description}</p>

        <div className="mb-4 flex flex-wrap gap-2">
          {room.amenities.slice(0, 4).map((a) => (
            <span
              key={a}
              className="inline-flex items-center gap-1 rounded-lg border border-border bg-secondary/10 px-2 py-1 text-xs font-medium text-foreground"
            >
              <span className="text-primary">{amenityIcons[a] || null}</span>
              {a}
            </span>
          ))}
        </div>

        <div className="flex items-end justify-between border-t border-border pt-3">
          <div>
            <span className="text-2xl font-bold text-foreground">{formatBRL(room.pricePerNight)}</span>
            <span className="text-sm text-muted-foreground"> /noite</span>
          </div>
          <button
            type="button"
            className={cn(
              'min-h-11 rounded-xl border px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              unavailable
                ? 'cursor-not-allowed border-border bg-muted text-muted-foreground'
                : 'border-primary bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/95'
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
