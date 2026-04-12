import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Clock, Package, Info } from "lucide-react";
import { RentalItem } from "@/pages/FishingGear";

interface RentalCardProps {
  item: RentalItem;
  onSelect: () => void;
}

export const RentalCard = ({ item, onSelect }: RentalCardProps) => {
  return (
    <Card className="overflow-hidden border border-border/40 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col h-full bg-card">
      <div className="relative aspect-square overflow-hidden bg-muted/20">
        <img
          src={item.image}
          alt={item.name}
          className="w-full h-full object-contain p-4 transition-transform duration-500 hover:scale-105"
        />
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