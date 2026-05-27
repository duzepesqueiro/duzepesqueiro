import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { DollarSign, Package, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import LoadingSpinner from "@/components/LoadingSpinner";
import { getAllSaleProducts } from "@/lib/api";
import { ShopItem } from "@/pages/FishingGear";
import { ReviewsSection } from "@/components/reviews/ReviewsSection";

type LocationState = {
  presetQuantity?: number;
};

export const SaleProductDetail = ({
  onAddToCart,
}: {
  onAddToCart: (item: ShopItem, quantity?: number) => void;
}) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state || {}) as LocationState;

  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<ShopItem | null>(null);
  const [imageIndex, setImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    setImageIndex(0);
  }, [id]);

  useEffect(() => {
    setQuantity(Math.max(1, Number(state.presetQuantity ?? 1) || 1));
  }, [state.presetQuantity, id]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const all = await getAllSaleProducts({ limit: 100 });
        const raw = all.find((p: any) => String(p.id) === String(id));
        if (!raw) {
          if (mounted) setProduct(null);
          return;
        }
        const images = Array.isArray(raw.images)
          ? raw.images.filter(Boolean).slice(0, 10)
          : [];
        const image = raw.image || images[0] || "https://placehold.co/500x500?text=Fishing+Item";
        const mapped: ShopItem = {
          id: String(raw.id),
          name: String(raw.name || ""),
          description: String(raw.description || ""),
          price: Number(raw.salePrice ?? raw.price ?? 0),
          stock: Number(raw.stockQuantity ?? raw.stock ?? 0),
          image,
          images: images.length ? images : [image],
        };
        if (mounted) setProduct(mapped);
      } catch {
        if (mounted) setProduct(null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [id]);

  const galleryImages = useMemo(
    () => (product?.images?.length ? product.images : product ? [product.image] : []).filter(Boolean).slice(0, 10),
    [product],
  );
  const currentImage = galleryImages[imageIndex] || product?.image;
  const totalPrice = ((product?.price ?? 0) * (quantity > 0 ? quantity : 0)).toFixed(2);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto py-16">
        <LoadingSpinner />
      </div>
    );
  }

  if (!id || !product) {
    return (
      <div className="max-w-5xl mx-auto">
        <Button variant="ghost" className="mb-6" onClick={() => navigate("/store?tab=purchase")}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <div className="rounded-xl border border-border/50 bg-muted/20 p-6 text-muted-foreground">
          Produto não encontrado.
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <Button variant="ghost" className="mb-2" onClick={() => navigate("/store?tab=purchase")}>
        <ChevronLeft className="h-4 w-4 mr-2" />
        Voltar
      </Button>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="space-y-3">
            <div className="relative rounded-lg overflow-hidden bg-muted/20 border border-border/40">
              {currentImage ? (
                <img src={currentImage} alt={product.name} className="w-full h-72 object-contain p-4" />
              ) : null}
              {galleryImages.length > 1 ? (
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
                </>
              ) : null}
            </div>
            {galleryImages.length > 1 ? (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {galleryImages.map((src, index) => (
                  <button
                    key={`${src}-${index}`}
                    type="button"
                    className={`h-14 w-14 shrink-0 overflow-hidden rounded-md border bg-muted/20 ${index === imageIndex ? "border-primary" : "border-border"}`}
                    onClick={() => setImageIndex(index)}
                    aria-label={`Ver imagem ${index + 1}`}
                  >
                    <img src={src} alt={`${product.name} ${index + 1}`} className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl border border-border/40 bg-card p-6 space-y-3">
            <h1 className="text-2xl font-bold">{product.name}</h1>
            <p className="text-sm text-muted-foreground">{product.description}</p>
            <Separator />
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Preço:</span>
              <span className="font-medium">R${product.price.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Disponível:</span>
              <span className="font-medium">{product.stock}</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border/40 bg-card p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4" />
                Preço unitário
              </Label>
              <Input value={`R$${product.price.toFixed(2)}`} readOnly />
            </div>
            <div>
              <Label className="flex items-center gap-2 mb-2">
                <Package className="h-4 w-4" />
                Quantidade
              </Label>
              <Input
                type="number"
                min={1}
                max={product.stock ?? undefined}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Preço unitário:</span>
              <span className="font-medium">R${product.price.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Quantidade:</span>
              <span className="font-medium">{quantity}</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="font-semibold text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Total:
              </span>
              <span className="text-2xl font-bold text-primary">R${totalPrice}</span>
            </div>
          </div>

          <Button
            onClick={() => {
              onAddToCart(product, quantity);
              navigate("/store?tab=purchase");
            }}
            className="w-full"
            size="lg"
            variant="secondary"
            disabled={product.stock <= 0}
          >
            Adicionar ao carrinho
          </Button>
        </div>
      </div>

      <ReviewsSection domain="SALES" targetId={product.id} />
    </div>
  );
};
