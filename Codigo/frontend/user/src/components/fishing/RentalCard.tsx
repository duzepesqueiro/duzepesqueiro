import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, ChevronLeft, ChevronRight } from "lucide-react";
import { RentalItem } from "@/pages/FishingGear";

interface RentalCardProps {
  item: RentalItem;
  onSelect: () => void;
}

export const RentalCard = ({ item, onSelect }: RentalCardProps) => {
  const galleryImages = (item.images?.length ? item.images : [item.image]).filter(Boolean).slice(0, 10);
  const [imageIndex, setImageIndex] = useState<number>(0);

  useEffect(() => {
    setImageIndex(0);
  }, [item.id]);

  const currentImage = galleryImages[imageIndex] || item.image;

  return (
    <Card className="overflow-hidden border border-border/40 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col h-full bg-card">
      <div className="relative aspect-square overflow-hidden bg-muted/20">
        <img
          src={currentImage}
          alt={item.name}
          className="w-full h-full object-contain p-4 transition-transform duration-500 hover:scale-105"
        />
        {galleryImages.length > 1 && (
          <>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="absolute left-2 top-1/2 h-8 w-8 -translate-y-1/2"
              onClick={() => setImageIndex((current) => (current - 1 + galleryImages.length) % galleryImages.length)}
              aria-label="Imagem anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="absolute right-2 top-1/2 h-8 w-8 -translate-y-1/2"
              onClick={() => setImageIndex((current) => (current + 1) % galleryImages.length)}
              aria-label="Próxima imagem"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <div className="absolute bottom-2 left-0 right-0 flex items-center justify-center gap-1">
              {galleryImages.map((src, index) => (
                <button
                  key={`${src}-${index}`}
                  type="button"
                  className={`h-2 w-2 rounded-full ${index === imageIndex ? "bg-primary" : "bg-muted-foreground/40"}`}
                  onClick={() => setImageIndex(index)}
                  aria-label={`Ver imagem ${index + 1}`}
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
             <span className="text-xs text-muted-foreground">/dia</span>
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
