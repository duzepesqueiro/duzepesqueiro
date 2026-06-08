import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShopCard } from "./ShopCard";
import { ShopItem, CartItem } from "@/pages/FishingGear";
import { getSaleProductsPage } from "@/lib/api";
import { toast } from "sonner";
import { Pagination, PaginationContent, PaginationItem, PaginationPrevious, PaginationNext, PaginationLink } from "@/components/ui/pagination";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { ArrowUpAZ, Package, DollarSign, ArrowDown, ArrowUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface ShoppingSectionProps {
  cartItems: CartItem[];
  onAddToCart: (item: ShopItem, quantity?: number) => void;
  onUpdateQuantity: (id: string, quantity: number) => void;
  initialProductId?: string;
}

export const ShoppingSection = ({
  cartItems,
  onAddToCart,
  onUpdateQuantity,
  initialProductId,
}: ShoppingSectionProps) => {
  const navigate = useNavigate();
  const [items, setItems] = useState<ShopItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [sortMode, setSortMode] = useState<"stock" | "alpha" | "price_asc" | "price_desc">("stock");
  const [priceRange, setPriceRange] = useState<number[]>([0, 0]);
  const requestLimit = 10;

  useEffect(() => {
    const fetchItems = async () => {
      try {
        setLoading(true);
        const pageData = await getSaleProductsPage({ page: currentPage, limit: requestLimit });
        const data: ShopItem[] = pageData.items.map((i: any) => {
          const images = Array.isArray(i.images)
            ? i.images.filter(Boolean).slice(0, 10)
            : [];
          const image = i.image || images[0] || "https://placehold.co/500x500?text=Fishing+Item";

          return {
            id: String(i.id),
            name: String(i.name || ""),
            description: String(i.description || ""),
            price: Number(i.salePrice ?? i.price ?? 0),
            stock: Number(i.stockQuantity ?? i.stock ?? 0),
            image,
            images: images.length ? images : [image],
          };
        });
        // Default: ordenar por estoque (itens sem estoque por último)
        const sorted = [...data].sort((a, b) => {
          if (b.stock !== a.stock) return b.stock - a.stock;
          return a.name.localeCompare(b.name);
        });
        setItems(sorted);
        setTotalPages(Math.max(1, Number(pageData.totalPages || 1)));
        if (currentPage > Number(pageData.totalPages || 1)) {
          setCurrentPage(Math.max(1, Number(pageData.totalPages || 1)));
        }
      } catch (err: any) {
        console.error("Erro ao carregar itens da loja", err);
        toast.error("Não foi possível carregar os produtos da loja.");
      } finally {
        setLoading(false);
      }
    };
    fetchItems();
  }, [currentPage]);

  // Atualiza faixa de preço ao carregar itens
  useEffect(() => {
    const max = items.length ? Math.max(...items.map((i) => Number(i.price || 0))) : 0;
    const min = 0;
    setPriceRange([min, max]);
  }, [items]);

  // Abrir modal automaticamente se houver produto inicial
  useEffect(() => {
    if (!initialProductId) return;
    const target = items.find((i) => i.id === initialProductId);
    if (target) navigate(`/store/product/${target.id}`);
  }, [initialProductId, items]);

  const formatCurrency = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const sortLabel = (mode: typeof sortMode) => {
    switch (mode) {
      case "alpha":
        return "A–Z";
      case "price_asc":
        return "Preço ↑";
      case "price_desc":
        return "Preço ↓";
      case "stock":
      default:
        return "Disponibilidade";
    }
  };

  const visibleItems = useMemo(() => {
    const [min, max] = priceRange;
    const filtered = items.filter((i) => Number(i.price) >= min && Number(i.price) <= max);
    const sorted = [...filtered].sort((a, b) => {
      switch (sortMode) {
        case "alpha":
          return a.name.localeCompare(b.name);
        case "price_asc":
          return Number(a.price) - Number(b.price);
        case "price_desc":
          return Number(b.price) - Number(a.price);
        case "stock":
        default:
          if (b.stock !== a.stock) return b.stock - a.stock; // sem estoque por último
          return a.name.localeCompare(b.name);
      }
    });
    return sorted;
  }, [items, priceRange, sortMode]);

  return (
    <div className="space-y-8">
      <Card className="border border-border/50 bg-card/90 backdrop-blur-sm shadow-sm">
        <CardContent className="p-4 sm:p-6 space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Ordenar</span>
              <Select value={sortMode} onValueChange={(v) => setSortMode(v as any)}>
                <SelectTrigger aria-label="Ordenação" className="h-11 w-44 justify-between">
                  <span className="flex items-center gap-2">
                    {sortMode === "alpha" && <ArrowUpAZ className="h-4 w-4" />}
                    {sortMode === "stock" && <Package className="h-4 w-4" />}
                    {sortMode === "price_asc" && <DollarSign className="h-4 w-4" />}
                    {sortMode === "price_desc" && <DollarSign className="h-4 w-4" />}
                    <span className="text-sm font-medium">{sortLabel(sortMode)}</span>
                  </span>
                </SelectTrigger>
                <SelectContent align="start">
                  <SelectItem value="stock">
                    <span className="flex items-center gap-2">
                      <Package className="h-4 w-4" /> Disponibilidade
                    </span>
                  </SelectItem>
                  <SelectItem value="alpha">
                    <span className="flex items-center gap-2">
                      <ArrowUpAZ className="h-4 w-4" /> A–Z
                    </span>
                  </SelectItem>
                  <SelectItem value="price_asc">
                    <span className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" /> Preço <ArrowDown className="h-3 w-3" />
                    </span>
                  </SelectItem>
                  <SelectItem value="price_desc">
                    <span className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" /> Preço <ArrowUp className="h-3 w-3" />
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 sm:max-w-md">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Faixa de preço</span>
                <span className="text-xs text-muted-foreground">
                  {formatCurrency(priceRange[0])} - {formatCurrency(priceRange[1])}
                </span>
              </div>
              <Slider
                value={priceRange}
                min={0}
                max={items.length ? Math.max(...items.map((i) => Number(i.price || 0))) : 0}
                step={1}
                onValueChange={(vals) => setPriceRange(vals as number[])}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {loading ? (
          Array.from({ length: 8 }).map((_, idx) => (
            <Card key={idx} className="overflow-hidden border border-border/50 bg-card/90 backdrop-blur-sm">
              <div className="aspect-square animate-pulse bg-muted" />
              <div className="p-4 space-y-3">
                <div className="h-4 w-3/4 animate-pulse rounded-md bg-muted" />
                <div className="h-4 w-2/3 animate-pulse rounded-md bg-muted" />
                <div className="h-11 w-full animate-pulse rounded-md bg-muted" />
              </div>
            </Card>
          ))
        ) : visibleItems.length ? (
          visibleItems.map((item) => (
            <ShopCard
              key={item.id}
              item={item}
              onSelect={(it, presetQuantity) => navigate(`/store/product/${it.id}`, { state: { presetQuantity } })}
            />
          ))
        ) : (
          <div className="col-span-full rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-12 text-center text-sm text-muted-foreground">
            Nenhum produto encontrado para os filtros selecionados.
          </div>
        )}
      </div>

      <Pagination className="mt-2">
        <PaginationContent className="flex-wrap justify-center">
          <PaginationItem>
            <PaginationPrevious
              onClick={(e) => { e.preventDefault(); setCurrentPage((p) => Math.max(1, p - 1)); }}
              className={currentPage <= 1 ? "pointer-events-none opacity-50" : ""}
            />
          </PaginationItem>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <PaginationItem key={page}>
              <PaginationLink
                isActive={page === currentPage}
                onClick={(e) => { e.preventDefault(); setCurrentPage(page); }}
              >
                {page}
              </PaginationLink>
            </PaginationItem>
          ))}
          <PaginationItem>
            <PaginationNext
              onClick={(e) => { e.preventDefault(); setCurrentPage((p) => Math.min(totalPages, p + 1)); }}
              className={currentPage >= totalPages ? "pointer-events-none opacity-50" : ""}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>

      {/* Carrinho agora é exibido via modal no FishingGear */}
      {/* Removido o render inline de <CartSummary /> para manter um único ponto de exibição */}
    </div>
  );
};
