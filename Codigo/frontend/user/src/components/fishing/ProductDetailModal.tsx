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
  const formatCurrency = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-hidden border border-border/50 bg-card/95 backdrop-blur-sm p-0">
        <div className="max-h-[90vh] overflow-y-auto">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/50">
            <DialogTitle className="font-display text-xl font-semibold">{item.name}</DialogTitle>
            <DialogDescription>Detalhes do produto</DialogDescription>
          </DialogHeader>

          <div className="px-6 py-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-2xl overflow-hidden border border-border/50 relative bg-muted/20">
                <div className="aspect-square">
                  <img src={currentImage} alt={item.name} className="w-full h-full object-contain p-4" />
                </div>
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
                      className="absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full"
                      aria-label="Imagem anterior"
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
                      className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full"
                      aria-label="Próxima imagem"
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
                  <span className="text-muted-foreground">Estoque</span>
                  <span className="font-medium">{item.stock}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Preço</span>
                  <span className="font-semibold">{formatCurrency(item.price)}</span>
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
                      className="h-11 w-11"
                      disabled={item.stock <= 0 || quantity <= 1}
                      aria-label="Diminuir quantidade"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <div className="min-w-10 text-center text-sm font-medium">{quantity}</div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setQuantity((q) => Math.min(Math.max(1, item.stock), q + 1))}
                      className="h-11 w-11"
                      disabled={item.stock <= 0 || quantity >= item.stock}
                      aria-label="Aumentar quantidade"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2">
              <Button className="h-11" variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
              <Button className="h-11 font-semibold" variant="secondary" onClick={() => onAddToCart(item, quantity)} disabled={item.stock <= 0}>
                Adicionar ao carrinho
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
