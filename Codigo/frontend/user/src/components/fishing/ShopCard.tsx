import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Package, ChevronLeft, ChevronRight, Minus, Plus } from "lucide-react";
import { ShopItem } from "@/pages/FishingGear";
import { useEffect, useMemo, useState, type KeyboardEvent } from "react";

interface ShopCardProps {
  item: ShopItem;
  onSelect: (item: ShopItem, presetQuantity?: number) => void;
}

export const ShopCard = ({ item, onSelect }: ShopCardProps) => {
  const [imageIndex, setImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);

  const galleryImages = useMemo(
    () => (item.images?.length ? item.images : [item.image]).filter(Boolean).slice(0, 10),
    [item.images, item.image],
  );

  useEffect(() => {
    setImageIndex(0);
    setQuantity(1);
  }, [item.id]);

  const currentImage = galleryImages[imageIndex] || item.image;

  const formatCurrency = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(item, quantity);
    setQuantity(1);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect(item);
    }
  };

  return (
    <Card
      className="group overflow-hidden border border-border/50 bg-card/90 backdrop-blur-sm shadow-sm transition-shadow duration-200 flex flex-col h-full cursor-pointer hover:shadow-[var(--shadow-nature)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      onClick={() => onSelect(item)}
      role="button"
      tabIndex={0}
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
              onClick={(e) => {
                e.stopPropagation();
                setImageIndex((p) => (p - 1 + galleryImages.length) % galleryImages.length);
              }}
              className="absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity focus-visible:opacity-100"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                setImageIndex((p) => (p + 1) % galleryImages.length);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity focus-visible:opacity-100"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </>
        )}
        {item.stock <= 0 && (
           <div className="absolute inset-0 bg-background/60 flex items-center justify-center backdrop-blur-[1px]">
              <Badge variant="outline" className="bg-background/80 backdrop-blur-sm text-sm font-semibold">Esgotado</Badge>
           </div>
        )}
      </div>

      <div className="p-4 flex flex-col flex-grow space-y-3">
        <div className="space-y-1">
          <div className="flex justify-between items-start gap-2">
             <h3 className="font-medium text-base leading-tight line-clamp-2 group-hover:text-primary transition-colors">
               {item.name}
             </h3>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
        </div>

        <div className="mt-auto pt-2 space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-2xl font-semibold text-foreground">{formatCurrency(Number(item.price || 0))}</span>
            <Badge variant="outline" className="bg-background/70 backdrop-blur-sm">
              {item.stock > 0 ? `${item.stock} em estoque` : "Sem estoque"}
            </Badge>
          </div>

          <div className="text-xs text-muted-foreground font-medium flex items-center gap-1">
            <Package className="w-3 h-3" />
            {item.stock > 0 ? "Disponível para compra" : "Indisponível"}
          </div>

           <div className="flex items-center justify-between gap-2">
             <span className="text-xs text-muted-foreground">Quantidade</span>
             <div className="flex items-center gap-1">
               <Button
                 type="button"
                 variant="outline"
                 size="icon"
                 onClick={(e) => {
                   e.stopPropagation();
                   setQuantity((q) => Math.max(1, q - 1));
                 }}
                 className="h-11 w-11"
                 disabled={item.stock <= 0 || quantity <= 1}
               >
                 <Minus className="h-4 w-4" />
               </Button>
               <div className="min-w-10 text-center text-sm font-medium">{quantity}</div>
               <Button
                 type="button"
                 variant="outline"
                 size="icon"
                 onClick={(e) => {
                   e.stopPropagation();
                   setQuantity((q) => Math.min(Math.max(1, item.stock), q + 1));
                 }}
                 className="h-11 w-11"
                 disabled={item.stock <= 0 || quantity >= item.stock}
               >
                 <Plus className="h-4 w-4" />
               </Button>
             </div>
           </div>

           <Button
             onClick={handleAddToCart}
             disabled={item.stock === 0}
             className="w-full h-11 font-semibold shadow-sm"
             size="sm"
             variant="secondary"
           >
             <ShoppingCart className="w-4 h-4" />
             Adicionar
           </Button>
        </div>
      </div>
    </Card>
  );
};
