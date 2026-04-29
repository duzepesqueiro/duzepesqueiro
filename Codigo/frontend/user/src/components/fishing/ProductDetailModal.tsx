import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from "@/components/ui/carousel";
import { ShopItem } from "@/pages/FishingGear";

interface ProductDetailModalProps {
  item: ShopItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddToCart: (item: ShopItem) => void;
}

export const ProductDetailModal = ({ item, open, onOpenChange, onAddToCart }: ProductDetailModalProps) => {
  if (!item) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent></DialogContent>
      </Dialog>
    );
  }
  const images = item.images?.length ? item.images : [item.image];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-xl">{item.name}</DialogTitle>
          <DialogDescription>Detalhes do produto</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-md overflow-hidden border border-border/40 relative">
            <Carousel className="relative">
              <CarouselContent className="h-72">
                {images.map((src, index) => (
                  <CarouselItem key={`${src}-${index}`}>
                    <img
                      src={src}
                      alt={`${item.name} - imagem ${index + 1}`}
                      className="w-full h-72 object-cover"
                    />
                  </CarouselItem>
                ))}
              </CarouselContent>
              {images.length > 1 && (
                <>
                  <CarouselPrevious className="!bg-background/90" />
                  <CarouselNext className="!bg-background/90" />
                </>
              )}
            </Carousel>
          </div>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{item.description || item.fullDescription}</p>
            <Separator />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Estoque:</span>
              <span className="font-medium">{item.stock}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Preço:</span>
              <span className="font-bold">R${item.price.toFixed(2)}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
          <Button onClick={() => onAddToCart(item)} disabled={item.stock <= 0}>Adicionar ao carrinho</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};