import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { RentalCard } from "./RentalCard";
import { RentalItem } from "@/pages/FishingGear";
import { getRentalProductsPage } from "@/lib/api";
import { Pagination, PaginationContent, PaginationItem, PaginationPrevious, PaginationNext, PaginationLink } from "@/components/ui/pagination";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { ArrowUpAZ, Package, DollarSign, ArrowDown, ArrowUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface RentalSectionProps {
  onBooked: (payload: { dto: any; itemName: string; renterName: string; customerPhone: string }) => void;
  initialRentalId?: string;
}

export const RentalSection = ({ onBooked, initialRentalId }: RentalSectionProps) => {
  const navigate = useNavigate();
  const [items, setItems] = useState<RentalItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [sortMode, setSortMode] = useState<"stock" | "alpha" | "price_asc" | "price_desc">("stock");
  const [priceRange, setPriceRange] = useState<number[]>([0, 0]);
  const requestLimit = 10;

  useEffect(() => {
    let mounted = true;
    const fetchItems = async () => {
      try {
        setLoading(true);
        setError(null);
        const pageData = await getRentalProductsPage({ page: currentPage, limit: requestLimit });
        const mapped: RentalItem[] = pageData.items.map((d: any) => {
          const images = Array.isArray(d.images)
            ? d.images.filter(Boolean).slice(0, 10)
            : [];
          const image = d.image || images[0] || "https://placehold.co/600x600?text=Aluguel";

          return {
            id: d.id,
            name: d.name,
            description: d.description,
            hourlyPrice: Number(d.hourlyPrice ?? d.salePrice ?? 0),
            available: Number(d.available ?? d.stockQuantity ?? 0),
            image,
            images: images.length ? images : [image],
            fullDescription: d.fullDescription ?? d.description ?? "",
            unavailableDates: (d.unavailableDates || []).map((s: string) => new Date(s)),
          };
        });
        // Default: ordenar por disponibilidade (sem disponibilidade por último)
        const sorted = mapped.sort((a, b) => {
          if (b.available !== a.available) return b.available - a.available;
          return a.name.localeCompare(b.name);
        });
        if (mounted) {
          setItems(sorted);
          setTotalPages(Math.max(1, Number(pageData.totalPages || 1)));
          if (currentPage > Number(pageData.totalPages || 1)) {
            setCurrentPage(Math.max(1, Number(pageData.totalPages || 1)));
          }
        }
      } catch (err: any) {
        console.error("Erro ao carregar itens de aluguel", err);
        if (mounted) setError("Falha ao carregar itens de aluguel. Tente novamente.");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchItems();
    return () => { mounted = false; };
  }, [currentPage]);

  // Atualiza faixa de preço ao carregar itens (usa hourlyPrice)
  useEffect(() => {
    const max = items.length ? Math.max(...items.map((i) => Number(i.hourlyPrice || 0))) : 0;
    const min = 0;
    setPriceRange([min, max]);
  }, [items]);

  // Abre modal automaticamente se houver parâmetro inicial
  useEffect(() => {
    if (!initialRentalId) return;
    const target = items.find((i) => i.id === initialRentalId);
    if (target) {
      // if (!isAuthenticated()) {
      //   redirectToLogin(`rent_item:${target.id}`);
      //   return;
      // }
      navigate(`/store/rental/${target.id}`);
    }
  }, [initialRentalId, items]);

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
        return "Padrão";
    }
  };

  const visibleItems = useMemo(() => {
    const [min, max] = priceRange;
    const filtered = items.filter((i) => Number(i.hourlyPrice) >= min && Number(i.hourlyPrice) <= max);
    const sorted = [...filtered].sort((a, b) => {
      switch (sortMode) {
        case "alpha":
          return a.name.localeCompare(b.name);
        case "price_asc":
          return Number(a.hourlyPrice) - Number(b.hourlyPrice);
        case "price_desc":
          return Number(b.hourlyPrice) - Number(a.hourlyPrice);
        case "stock":
        default:
          if (b.available !== a.available) return b.available - a.available; // sem disponibilidade por último
          return a.name.localeCompare(b.name);
      }
    });
    return sorted;
  }, [items, priceRange, sortMode]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="border border-border/50 bg-card/90 backdrop-blur-sm shadow-sm">
          <CardContent className="p-4 sm:p-6 space-y-4">
            <div className="h-5 w-44 animate-pulse rounded-md bg-muted" />
            <div className="h-10 w-full animate-pulse rounded-md bg-muted" />
          </CardContent>
        </Card>
        <div className="grid items-stretch grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, idx) => (
            <Card key={idx} className="overflow-hidden border border-border/50 bg-card/90 backdrop-blur-sm">
              <div className="aspect-square animate-pulse bg-muted" />
              <div className="p-4 space-y-3">
                <div className="h-4 w-3/4 animate-pulse rounded-md bg-muted" />
                <div className="h-4 w-2/3 animate-pulse rounded-md bg-muted" />
                <div className="h-11 w-full animate-pulse rounded-md bg-muted" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }
  if (error) {
    return <div className="py-10 text-center text-destructive">{error}</div>;
  }

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
                      <Package className="h-4 w-4" /> Padrão
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
                <span className="text-sm text-muted-foreground">Faixa de preço (dia)</span>
                <span className="text-xs text-muted-foreground">
                  {formatCurrency(priceRange[0])} - {formatCurrency(priceRange[1])}
                </span>
              </div>
              <Slider
                value={priceRange}
                min={0}
                max={items.length ? Math.max(...items.map((i) => Number(i.hourlyPrice || 0))) : 0}
                step={1}
                onValueChange={(vals) => setPriceRange(vals as number[])}
              />
            </div>
          </div>
        </CardContent>
      </Card>
      <div className="grid items-stretch grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {visibleItems.length ? (
          visibleItems.map((item) => (
            <RentalCard
              key={item.id}
              item={item}
              onSelect={() => {
                navigate(`/store/rental/${item.id}`);
              }}
            />
          ))
        ) : (
          <div className="col-span-full rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-12 text-center text-sm text-muted-foreground">
            Nenhum item encontrado para os filtros selecionados.
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
    </div>
  );
};
