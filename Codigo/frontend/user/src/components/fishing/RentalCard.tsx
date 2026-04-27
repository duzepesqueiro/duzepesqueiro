import { type MouseEvent, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Images, Package } from "lucide-react";
import { RentalItem } from "@/pages/FishingGear";

interface RentalCardProps {
  item: RentalItem;
  onSelect: () => void;
}

export const RentalCard = ({ item, onSelect }: RentalCardProps) => {
  const images = useMemo(
    () =>
      (item.images?.length ? item.images : [item.image]).filter(
        (src): src is string => typeof src === "string" && src.trim().length > 0
      ),
    [item.image, item.images]
  );
  const gallery = images.length ? images : ["https://placehold.co/600x600?text=Aluguel"];
  const [activeIndex, setActiveIndex] = useState(0);
  const activeImage = gallery[activeIndex] ?? gallery[0];
  const hasGallery = gallery.length > 1;

  const handlePrevious = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setActiveIndex((current) => (current === 0 ? gallery.length - 1 : current - 1));
  };

  const handleNext = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setActiveIndex((current) => (current + 1) % gallery.length);
  };

  return (
    <Card className="overflow-hidden border border-border/40 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col h-full bg-card">
      <div className="relative aspect-square overflow-hidden bg-muted/20 group">
        <img
          src={activeImage}
          alt={item.name}
          className="w-full h-full object-contain p-4 transition-transform duration-500 hover:scale-105"
        />
        {hasGallery && (
          <>
            <Badge className="absolute left-3 top-3 gap-1 bg-background/90 text-foreground shadow-sm hover:bg-background">
              <Images className="h-3 w-3" />
              {gallery.length}
            </Badge>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              aria-label="Imagem anterior"
              onClick={handlePrevious}
              className="absolute left-2 top-1/2 h-8 w-8 -translate-y-1/2 rounded-full bg-background/90 opacity-0 shadow-sm transition-opacity group-hover:opacity-100"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              aria-label="Próxima imagem"
              onClick={handleNext}
              className="absolute right-2 top-1/2 h-8 w-8 -translate-y-1/2 rounded-full bg-background/90 opacity-0 shadow-sm transition-opacity group-hover:opacity-100"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
              {gallery.map((src, index) => (
                <button
                  key={`${src}-${index}`}
                  type="button"
                  aria-label={`Ver imagem ${index + 1}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    setActiveIndex(index);
                  }}
                  className={`h-1.5 rounded-full transition-all ${
                    index === activeIndex ? "w-5 bg-primary" : "w-1.5 bg-background/80"
                  }`}
                />
              ))}
            </div>
          </>
        )}
        {item.available <= 0 && (
          <div className="absolute inset-0 bg-background/60 flex items-center justify-center backdrop-blur-[1px]">
             <Badge variant="secondary" className="text-sm font-bold">Esgotado</Badge>
          </div>
        )}
      </div>

      <div className="p-4 flex flex-col flex-grow space-y-3">
        <div className="space-y-1">
           <h3 className="font-medium text-base leading-tight line-clamp-2 hover:text-primary cursor-pointer" onClick={onSelect}>
             {item.name}
           </h3>
           <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
        </div>

        <div className="mt-auto pt-2 space-y-3">
           <div className="flex items-baseline gap-1">
             <span className="text-xs text-muted-foreground self-start">R$</span>
             <span className="text-2xl font-bold text-foreground">{item.hourlyPrice}</span>
             <span className="text-xs text-muted-foreground">/hora</span>
           </div>

           {item.available > 0 ? (
             <div className="text-xs text-green-600 font-medium flex items-center gap-1">
               <Package className="w-3 h-3" />
               Em estoque ({item.available})
             </div>
           ) : (
             <div className="text-xs text-red-500 font-medium">
               Indisponível no momento
             </div>
           )}

           <Button
             onClick={onSelect}
             disabled={item.available === 0}
             className="w-full bg-[#f2c14e] hover:bg-[#d9ad46] text-[#1a2832] font-bold shadow-sm"
             size="sm"
           >
             Alugar Agora
           </Button>
        </div>
      </div>
    </Card>
  );
};
