import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Calendar, MapPin, Users, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const MAX_IMAGES = 10;

interface EventCardProps {
  title: string;
  date: string;
  time: string;
  location: string;
  description: string;
  rules: string;
  currentAttendees: number;
  totalCapacity: number;
  images?: string[];
  onRegister?: () => void;
  onEvaluate?: () => void;
  onOpenDetails?: () => void;
  registerLabel?: string;
  evaluateLabel?: string;
  disableExpand?: boolean;
}

export const EventCard = ({ 
  title, 
  date, 
  time,
  location, 
  description, 
  rules,
  currentAttendees,
  totalCapacity,
  images = [],
  onRegister,
  onEvaluate,
  onOpenDetails,
  registerLabel = "Inscrever-se",
  evaluateLabel = "Avaliar",
  disableExpand = false
}: EventCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [imageErrorByUrl, setImageErrorByUrl] = useState<Record<string, boolean>>({});
  const availableSpaces = totalCapacity - currentAttendees;
  const showRegister = typeof onRegister === "function";
  const showEvaluate = !showRegister && typeof onEvaluate === "function";
  const canOpenDetails = typeof onOpenDetails === "function";

  const carouselImages = useMemo(() => {
    const list = Array.isArray(images) ? images : [];
    return list.filter((url) => typeof url === "string" && url.trim()).slice(0, MAX_IMAGES);
  }, [images]);

  const hasCarousel = carouselImages.length > 1;
  const activeImageCandidate = carouselImages[activeImageIndex] ?? null;
  const activeImage = activeImageCandidate && !imageErrorByUrl[activeImageCandidate] ? activeImageCandidate : null;

  useEffect(() => {
    if (activeImageIndex >= carouselImages.length) {
      setActiveImageIndex(0);
    }
  }, [carouselImages.length, activeImageIndex]);

  useEffect(() => {
    setImageErrorByUrl({});
    setActiveImageIndex(0);
  }, [images]);

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
    <Card
      className={cn(
        "group overflow-hidden border border-border/40 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col h-full bg-card",
        canOpenDetails ? "cursor-pointer" : undefined
      )}
      onClick={() => onOpenDetails?.()}
    >
      <div className="relative aspect-video overflow-hidden">
        <AnimatePresence mode="wait">
          {activeImage ? (
            <motion.img
              key={`${activeImage}-${activeImageIndex}`}
              src={activeImage}
              alt={`${title} - imagem ${activeImageIndex + 1}`}
              initial={{ opacity: 0, scale: 1.04 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              transition={{ duration: 0.35 }}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
              onError={() =>
                setImageErrorByUrl((prev) => ({
                  ...prev,
                  [activeImage]: true,
                }))
              }
            />
          ) : (
            <motion.div
              key={`${title}-placeholder`}
              initial={{ opacity: 0, scale: 1.02 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.01 }}
              transition={{ duration: 0.35 }}
              className="flex h-full w-full items-center justify-center bg-muted"
            >
              <div className="text-center space-y-2">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-dashed border-muted-foreground/35 text-muted-foreground/80">
                  <span className="text-xl">+</span>
                </div>
                <p className="text-xs text-muted-foreground/70">Imagem reservada</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {hasCarousel && (
          <>
            <button
              type="button"
              onClick={goToPreviousImage}
              className="absolute left-3 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-border/50 bg-background/80 text-sm font-semibold text-foreground backdrop-blur-sm transition hover:bg-background"
              aria-label="Imagem anterior"
            >
              &lt;
            </button>
            <button
              type="button"
              onClick={goToNextImage}
              className="absolute right-3 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-border/50 bg-background/80 text-sm font-semibold text-foreground backdrop-blur-sm transition hover:bg-background"
              aria-label="Próxima imagem"
            >
              &gt;
            </button>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-border/50 bg-background/80 px-3 py-1 text-[11px] font-medium text-foreground backdrop-blur-sm">
              {activeImageIndex + 1}/{carouselImages.length}
            </div>
          </>
        )}
        <div className="absolute top-2 right-2 bg-background/90 backdrop-blur-sm px-2 py-1 rounded-md text-xs font-bold shadow-sm">
           {availableSpaces > 0 ? `${availableSpaces} vagas` : 'Esgotado'}
        </div>
      </div>
      
      <div className="p-4 flex flex-col flex-grow">
        <h3 className="text-lg font-bold mb-2 line-clamp-2 leading-tight text-foreground">{title}</h3>
        
        <div className="space-y-2 mb-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary shrink-0" />
            <span>{date} • {time}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary shrink-0" />
            <span className="line-clamp-1">{location}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <Users className="w-4 h-4 text-primary shrink-0" />
          <span>{currentAttendees} / {totalCapacity} participantes</span>
        </div>

        <div className="mt-auto space-y-3">
          {isExpanded && (
            <div className="bg-muted/50 p-3 rounded-lg text-sm animate-in fade-in zoom-in-95 duration-200 space-y-3">
              {description && (
                <div>
                  <span className="font-semibold block text-foreground mb-1">Descrição:</span>
                  <span className="text-muted-foreground">{description}</span>
                </div>
              )}
              {rules && (
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <div>
                    <span className="font-semibold block text-foreground mb-1">Regras:</span>
                    <span className="text-muted-foreground">{rules}</span>
                  </div>
                </div>
              )}
              {!description && !rules && (
                <span className="text-muted-foreground">Sem detalhes adicionais.</span>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              className={cn(!showRegister && !showEvaluate ? "col-span-2" : undefined)}
              onClick={(e) => {
                e.stopPropagation();
                if (!disableExpand) setIsExpanded(!isExpanded);
              }}
              disabled={disableExpand}
            >
              {isExpanded ? "Menos" : "Detalhes"}
            </Button>
            {showRegister && (
              <Button
                className="w-full bg-[#f2c14e] hover:bg-[#d9ad46] text-[#1a2832] font-bold"
                onClick={(e) => {
                  e.stopPropagation();
                  onRegister?.();
                }}
                disabled={availableSpaces <= 0}
              >
                {availableSpaces > 0 ? registerLabel : "Lotado"}
              </Button>
            )}
            {showEvaluate && (
              <Button
                className="w-full bg-[#f2c14e] hover:bg-[#d9ad46] text-[#1a2832] font-bold"
                onClick={(e) => {
                  e.stopPropagation();
                  onEvaluate?.();
                }}
              >
                {evaluateLabel}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};
