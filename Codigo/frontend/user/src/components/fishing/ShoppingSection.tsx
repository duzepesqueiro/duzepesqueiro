import { useEffect, useMemo, useState } from "react";
import { ShopCard } from "./ShopCard";
import { CartSummary } from "./CartSummary";
import { ShopItem, CartItem } from "@/pages/FishingGear";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Pagination, PaginationContent, PaginationItem, PaginationPrevious, PaginationNext, PaginationLink } from "@/components/ui/pagination";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { ArrowUpAZ, Package, DollarSign, ArrowDown, ArrowUp } from "lucide-react";

interface ShoppingSectionProps {
  cartItems: CartItem[];
  onAddToCart: (item: ShopItem) => void;
  onUpdateQuantity: (id: number, quantity: number) => void;
  initialProductId?: number;
}

import { ProductDetailModal } from "./ProductDetailModal";

export const ShoppingSection = ({
  cartItems,
  onAddToCart,
  onUpdateQuantity,
  initialProductId,
}: ShoppingSectionProps) => {
  const [items, setItems] = useState<ShopItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sortMode, setSortMode] = useState<"stock" | "alpha" | "price_asc" | "price_desc">("stock");
  const [priceRange, setPriceRange] = useState<number[]>([0, 0]);
  const [selectedItem, setSelectedItem] = useState<ShopItem | null>(null);
  const itemsPerPage = 8;

  useEffect(() => {
    const fetchItems = async () => {
      try {
        setLoading(true);
        const res = await api.get("/user/loja");
        const data: ShopItem[] = (res.data || []).map((i: any) => ({
          id: i.id,
          name: i.name,
          description: i.description,
          price: i.price,
          stock: i.stock,
          image: i.image || "https://placehold.co/500x500?text=Fishing+Item",
        }));
        // Default: ordenar por estoque (itens sem estoque por último)
        const sorted = [...data].sort((a, b) => {
          if (b.stock !== a.stock) return b.stock - a.stock;
          return a.name.localeCompare(b.name);
        });
        setItems(sorted);
      } catch (err: any) {
        console.error("Erro ao carregar itens da loja", err);
        toast.error("Não foi possível carregar os produtos da loja.");
      } finally {
        setLoading(false);
      }
    };
    fetchItems();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [items.length]);

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
    if (target) setSelectedItem(target);
  }, [initialProductId, items]);

  const formatCurrency = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

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

  const totalPages = Math.ceil(visibleItems.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedItems = visibleItems.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="space-y-8">
      {/* Barra de controles: ordenação por ícones e faixa de preço */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Ordenar</span>
          <Select value={sortMode} onValueChange={(v) => setSortMode(v as any)}>
            <SelectTrigger aria-label="Ordenação" className="w-12 justify-center">
              {/* Ícone do modo selecionado (sem texto) */}
              {sortMode === "alpha" && <ArrowUpAZ className="h-4 w-4" />}
              {sortMode === "stock" && <Package className="h-4 w-4" />}
              {sortMode === "price_asc" && <div className="flex items-center gap-0.5"><DollarSign className="h-4 w-4" /><ArrowDown className="h-3 w-3" /></div>}
              {sortMode === "price_desc" && <div className="flex items-center gap-0.5"><DollarSign className="h-4 w-4" /><ArrowUp className="h-3 w-3" /></div>}
            </SelectTrigger>
            <SelectContent align="start">
              <SelectItem value="alpha">
                <ArrowUpAZ className="h-4 w-4" />
              </SelectItem>
              <SelectItem value="stock">
                <Package className="h-4 w-4" />
              </SelectItem>
              <SelectItem value="price_asc">
                <div className="flex items-center gap-1"><DollarSign className="h-4 w-4" /><ArrowDown className="h-3 w-3" /></div>
              </SelectItem>
              <SelectItem value="price_desc">
                <div className="flex items-center gap-1"><DollarSign className="h-4 w-4" /><ArrowUp className="h-3 w-3" /></div>
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {loading && (
          <div className="col-span-full text-center text-muted-foreground">Carregando produtos...</div>
        )}
        {!loading && items.length === 0 && (
          <div className="col-span-full text-center text-muted-foreground">Nenhum produto disponível.</div>
        )}
        {!loading && paginatedItems.map((item) => (
          <ShopCard
            key={item.id}
            item={item}
            onAddToCart={onAddToCart}
            onSelect={() => setSelectedItem(item)}
          />
        ))}
      </div>

      <Pagination className="mt-2">
        <PaginationContent>
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

      <ProductDetailModal
        item={selectedItem}
        open={!!selectedItem}
        onOpenChange={(open) => !open && setSelectedItem(null)}
        onAddToCart={(i) => {
          onAddToCart(i);
          setSelectedItem(null);
        }}
      />
    </div>
  );
};
