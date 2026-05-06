import { useState } from "react";
import { Calendar, MapPin, Users, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface EventCardProps {
  title: string;
  date?: string;
  eventDate?: string;
  time?: string;
  eventTime?: string;
  location: string;
  description?: string;
  rules?: string;
  currentAttendees?: number;
  totalCapacity?: number;
  availableSlots?: number;
  totalSlots?: number;
  image?: string;
  imageUrl?: string;
  images?: string[];
  onRegister: () => void;
  disableExpand?: boolean;
}

export const EventCard = ({
  title,
  date,
  eventDate,
  time,
  eventTime,
  location,
  description,
  rules,
  currentAttendees,
  totalCapacity,
  availableSlots,
  totalSlots,
  image,
  imageUrl,
  images,
  onRegister,
}: EventCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);
  const capacity = Number(totalCapacity ?? totalSlots ?? 0);
  const attendees = Number(currentAttendees ?? Math.max(0, capacity - Number(availableSlots ?? capacity)));
  const availableSpaces = Number(availableSlots ?? Math.max(0, capacity - attendees));
  const imageList = [
    ...(Array.isArray(images) ? images : []),
    image,
    imageUrl,
  ].filter((item, index, list): item is string => Boolean(item) && list.indexOf(item) === index);
  const displayImages = imageList.length ? imageList : ["https://placehold.co/800x450?text=Evento"];
  const displayImage = displayImages[imageIndex] || displayImages[0];
  const displayDate = date || (eventDate ? new Date(eventDate).toLocaleDateString("pt-BR") : "");
  const displayTime = time || eventTime || "";
  const hasImageCarousel = displayImages.length > 1;

  const showPreviousImage = () => {
    setImageIndex((current) => (current === 0 ? displayImages.length - 1 : current - 1));
  };

  const showNextImage = () => {
    setImageIndex((current) => (current + 1) % displayImages.length);
  };

  return (
    <Card className="overflow-hidden border border-border/40 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col h-full bg-card">
      <div className="relative aspect-video overflow-hidden">
        <img
          src={displayImage}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
        />
        {hasImageCarousel && (
          <>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="absolute left-2 top-1/2 h-8 w-8 -translate-y-1/2 bg-background/85 shadow-sm"
              onClick={showPreviousImage}
              aria-label="Imagem anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="absolute right-2 top-1/2 h-8 w-8 -translate-y-1/2 bg-background/85 shadow-sm"
              onClick={showNextImage}
              aria-label="Próxima imagem"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
              {displayImages.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  className={`h-1.5 rounded-full transition-all ${index === imageIndex ? "w-5 bg-background" : "w-1.5 bg-background/60"}`}
                  onClick={() => setImageIndex(index)}
                  aria-label={`Ver imagem ${index + 1}`}
                />
              ))}
            </div>
          </>
        )}
        <div className="absolute top-2 right-2 bg-background/90 backdrop-blur-sm px-2 py-1 rounded-md text-xs font-bold shadow-sm">
          {availableSpaces > 0 ? `${availableSpaces} vagas` : "Esgotado"}
        </div>
      </div>

      <div className="p-4 flex flex-col flex-grow">
        <h3 className="text-lg font-bold mb-2 line-clamp-2 leading-tight text-foreground">{title}</h3>

        <div className="space-y-2 mb-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary shrink-0" />
            <span>{displayDate} - {displayTime}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary shrink-0" />
            <span className="line-clamp-1">{location}</span>
          </div>
        </div>

        <p className="text-sm text-muted-foreground line-clamp-3 mb-4 flex-grow">
          {description || "Confira as informacoes deste evento."}
        </p>

        <div className="mt-auto space-y-3">
          {isExpanded && (
            <div className="bg-muted/50 p-3 rounded-lg text-sm animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-start gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <span className="font-semibold block text-foreground">Regras:</span>
                  <span className="text-muted-foreground">
                    {rules || "Consulte as regras no local do evento."}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="w-4 h-4" />
                <span>{attendees} / {capacity} participantes</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? "Menos" : "Detalhes"}
            </Button>
            <Button
              className="w-full bg-[#f2c14e] hover:bg-[#d9ad46] text-[#1a2832] font-bold"
              onClick={onRegister}
              disabled={availableSpaces <= 0}
            >
              {availableSpaces > 0 ? "Inscrever-se" : "Lotado"}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};
