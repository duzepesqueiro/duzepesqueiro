import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { ShoppingCart, Package, Info, Star } from "lucide-react";
import { ShopItem } from "@/pages/FishingGear";

interface ShopCardProps {
  item: ShopItem;
  onAddToCart: (item: ShopItem) => void;
  onSelect?: (item: ShopItem) => void;
}

export const ShopCard = ({ item, onAddToCart, onSelect }: ShopCardProps) => {
  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAddToCart(item);
  };

  return (
    <Card
      className="overflow-hidden border border-border/40 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col h-full bg-card cursor-pointer group"
      onClick={() => onSelect?.(item)}
    >
      <div className="relative aspect-square overflow-hidden bg-muted/20">
        <img
          src={item.image}
          alt={item.name}
          className="w-full h-full object-contain p-4 transition-transform duration-500 hover:scale-105"
        />
        {item.stock <= 0 && (
           <div className="absolute inset-0 bg-background/60 flex items-center justify-center backdrop-blur-[1px]">
              <Badge variant="destructive" className="text-sm font-bold">Esgotado</Badge>
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
           <div className="flex items-baseline gap-1">
             <span className="text-xs text-muted-foreground self-start">R$</span>
             <span className="text-2xl font-bold text-foreground">{item.price.toFixed(2)}</span>
           </div>

           {item.stock > 0 ? (
             <div className="text-xs text-green-600 font-medium flex items-center gap-1">
               <Package className="w-3 h-3" />
               Em estoque ({item.stock})
             </div>
           ) : (
             <div className="text-xs text-red-500 font-medium">
               Indisponível
             </div>
           )}

           <Button
             onClick={handleAddToCart}
             disabled={item.stock === 0}
             className="w-full bg-[#f2c14e] hover:bg-[#d9ad46] text-[#1a2832] font-bold shadow-sm"
             size="sm"
           >
             <ShoppingCart className="w-4 h-4 mr-2" />
             Adicionar
           </Button>
        </div>
      </div>
    </Card>
  );
};