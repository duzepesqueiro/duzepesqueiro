import { useEffect, useId, useMemo, useState, type KeyboardEvent, type MouseEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, Calendar, ChevronLeft, ChevronRight, ImageOff, MapPin, Users } from "lucide-react";
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
  const detailsId = useId();
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

  const handleCardKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!canOpenDetails) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onOpenDetails?.();
    }
  };

  return (
    <Card
      className={cn(
        "group overflow-hidden border border-border/50 bg-card/90 backdrop-blur-sm shadow-sm transition-shadow duration-200 flex flex-col h-full",
        canOpenDetails
          ? "cursor-pointer hover:shadow-[var(--shadow-nature)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          : undefined,
      )}
      onClick={() => onOpenDetails?.()}
      role={canOpenDetails ? "button" : undefined}
      tabIndex={canOpenDetails ? 0 : undefined}
      onKeyDown={handleCardKeyDown}
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
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
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
              className="flex h-full w-full items-center justify-center bg-muted/50"
            >
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-dashed border-border bg-background/70">
                  <ImageOff className="h-5 w-5" aria-hidden="true" />
                </div>
                <p className="text-xs">Sem imagem</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {hasCarousel && (
          <>
            <button
              type="button"
              onClick={goToPreviousImage}
              className="absolute left-3 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-border/60 bg-background/70 text-foreground backdrop-blur-md transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label="Imagem anterior"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={goToNextImage}
              className="absolute right-3 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-border/60 bg-background/70 text-foreground backdrop-blur-md transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label="Próxima imagem"
            >
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </button>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-border/50 bg-background/80 px-3 py-1 text-[11px] font-medium text-foreground backdrop-blur-sm">
              {activeImageIndex + 1}/{carouselImages.length}
            </div>
          </>
        )}
        <div className="absolute right-3 top-3 rounded-full border border-border/60 bg-background/70 px-3 py-1 text-[11px] font-semibold text-foreground backdrop-blur-md">
          {availableSpaces > 0 ? `${availableSpaces} vagas` : "Esgotado"}
        </div>
      </div>
      
      <div className="p-4 flex flex-col flex-grow">
        <h3 className="text-lg font-semibold mb-2 line-clamp-2 leading-tight text-foreground">{title}</h3>
        
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
            <div
              id={detailsId}
              className="rounded-xl border border-border/50 bg-muted/30 p-4 text-sm animate-in fade-in zoom-in-95 duration-200 space-y-3"
            >
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Button
              variant="outline"
              className={cn(
                "h-11 justify-center font-semibold",
                !showRegister && !showEvaluate ? "sm:col-span-2" : undefined,
              )}
              onClick={(e) => {
                e.stopPropagation();
                if (!disableExpand) setIsExpanded(!isExpanded);
              }}
              disabled={disableExpand}
              aria-expanded={isExpanded}
              aria-controls={detailsId}
            >
              {isExpanded ? "Menos" : "Detalhes"}
            </Button>
            {showRegister && (
              <Button
                variant="secondary"
                className="h-11 w-full font-semibold"
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
                variant="secondary"
                className="h-11 w-full font-semibold"
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
