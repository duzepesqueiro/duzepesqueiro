import { useState } from "react";
import { Calendar, MapPin, Users, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface EventCardProps {
  title: string;
  date: string;
  time: string;
  location: string;
  description: string;
  rules: string;
  currentAttendees: number;
  totalCapacity: number;
  image: string;
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
  image,
  onRegister,
  onEvaluate,
  onOpenDetails,
  registerLabel = "Inscrever-se",
  evaluateLabel = "Avaliar",
  disableExpand = false
}: EventCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const availableSpaces = totalCapacity - currentAttendees;
  const showRegister = typeof onRegister === "function";
  const showEvaluate = !showRegister && typeof onEvaluate === "function";
  const canOpenDetails = typeof onOpenDetails === "function";

  return (
    <Card
      className={cn(
        "overflow-hidden border border-border/40 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col h-full bg-card",
        canOpenDetails ? "cursor-pointer" : undefined
      )}
      onClick={() => onOpenDetails?.()}
    >
      <div className="relative aspect-video overflow-hidden">
        {image ? (
          <img
            src={image}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <span className="text-muted-foreground text-sm">Sem imagem</span>
          </div>
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
