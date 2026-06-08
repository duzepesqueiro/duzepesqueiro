import { useEffect, useState, type KeyboardEvent } from "react";
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
  const formatCurrency = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect();
    }
  };

  return (
    <Card
      className="group overflow-hidden border border-border/50 bg-card/90 backdrop-blur-sm shadow-sm transition-shadow duration-200 flex flex-col h-full cursor-pointer hover:shadow-[var(--shadow-nature)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
    >
      <div className="relative aspect-square overflow-hidden bg-muted/20">
        <img
          src={currentImage}
          alt={item.name}
          className="w-full h-full object-contain p-4 transition-transform duration-500 group-hover:scale-[1.02]"
        />
        {galleryImages.length > 1 && (
          <>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="absolute left-3 top-1/2 h-10 w-10 -translate-y-1/2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity focus-visible:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                setImageIndex((current) => (current - 1 + galleryImages.length) % galleryImages.length);
              }}
              aria-label="Imagem anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="absolute right-3 top-1/2 h-10 w-10 -translate-y-1/2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity focus-visible:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                setImageIndex((current) => (current + 1) % galleryImages.length);
              }}
              aria-label="Próxima imagem"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <div className="absolute bottom-2 left-0 right-0 flex items-center justify-center gap-1">
              {galleryImages.map((src, index) => (
                <button
                  key={`${src}-${index}`}
                  type="button"
                  className={`h-2 w-2 rounded-full transition-colors ${index === imageIndex ? "bg-primary" : "bg-muted-foreground/30 hover:bg-muted-foreground/50"}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setImageIndex(index);
                  }}
                  aria-label={`Ver imagem ${index + 1}`}
                />
              ))}
            </div>
          </>
        )}
        {item.available <= 0 && (
          <div className="absolute inset-0 bg-background/60 flex items-center justify-center backdrop-blur-[1px]">
            <Badge variant="outline" className="bg-background/80 backdrop-blur-sm text-sm font-semibold">Indisponível</Badge>
          </div>
        )}
      </div>

      <div className="p-4 flex flex-col flex-grow space-y-3">
        <div className="space-y-1">
          <h3 className="font-semibold text-base leading-tight line-clamp-2 group-hover:text-primary transition-colors">
            {item.name}
          </h3>
          <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
        </div>

        <div className="mt-auto pt-2 space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold text-foreground">{formatCurrency(Number(item.hourlyPrice || 0))}</span>
              <span className="text-xs text-muted-foreground">/dia</span>
            </div>
            <Badge variant="outline" className="bg-background/70 backdrop-blur-sm">
              {item.available > 0 ? `${item.available} disponíveis` : "Sem estoque"}
            </Badge>
          </div>

          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <Package className="w-3 h-3" />
            {item.available > 0 ? "Disponível para aluguel" : "Indisponível no momento"}
          </div>

          <Button onClick={onSelect} disabled={item.available === 0} className="w-full h-11 font-semibold" size="sm" variant="secondary">
            Alugar agora
          </Button>
        </div>
      </div>
    </Card>
  );
};
