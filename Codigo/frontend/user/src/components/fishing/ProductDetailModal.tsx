import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { ShopItem } from "@/pages/FishingGear";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Minus, Plus } from "lucide-react";

interface ProductDetailModalProps {
  item: ShopItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddToCart: (item: ShopItem, quantity?: number) => void;
}

export const ProductDetailModal = ({ item, open, onOpenChange, onAddToCart }: ProductDetailModalProps) => {
  const [imageIndex, setImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    setImageIndex(0);
    setQuantity(1);
  }, [item?.id, open]);

  if (!item) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent></DialogContent>
      </Dialog>
    );
  }

  const galleryImages = (item.images?.length ? item.images : [item.image]).filter(Boolean).slice(0, 10);
  const currentImage = galleryImages[imageIndex] || item.image;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-xl">{item.name}</DialogTitle>
          <DialogDescription>Detalhes do produto</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-md overflow-hidden border border-border/40 relative bg-muted/20">
            <img src={currentImage} alt={item.name} className="w-full h-48 object-contain p-3" />
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
                  className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full"
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
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{item.description}</p>
            <Separator />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Estoque:</span>
              <span className="font-medium">{item.stock}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Preço:</span>
              <span className="font-bold">R${item.price.toFixed(2)}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-muted-foreground">Quantidade</span>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="h-8 w-8"
                  disabled={item.stock <= 0 || quantity <= 1}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <div className="min-w-10 text-center text-sm font-medium">{quantity}</div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity((q) => Math.min(Math.max(1, item.stock), q + 1))}
                  className="h-8 w-8"
                  disabled={item.stock <= 0 || quantity >= item.stock}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
          <Button onClick={() => onAddToCart(item, quantity)} disabled={item.stock <= 0}>Adicionar ao carrinho</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
