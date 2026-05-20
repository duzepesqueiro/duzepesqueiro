import { useEffect, useState } from "react";
import { Calendar, MapPin, Clock, Users, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
  onRegister: () => void;
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
  disableExpand = false
}: EventCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const availableSpaces = totalCapacity - currentAttendees;

  return (
    <Card className="overflow-hidden border border-border/40 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col h-full bg-card">
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

        <p className="text-sm text-muted-foreground line-clamp-3 mb-4 flex-grow">
          {description}
        </p>

        <div className="mt-auto space-y-3">
          {isExpanded && (
            <div className="bg-muted/50 p-3 rounded-lg text-sm animate-in fade-in zoom-in-95 duration-200">
               <div className="flex items-start gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <div>
                    <span className="font-semibold block text-foreground">Regras:</span>
                    <span className="text-muted-foreground">{rules}</span>
                  </div>
               </div>
               <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="w-4 h-4" />
                  <span>{currentAttendees} / {totalCapacity} participantes</span>
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