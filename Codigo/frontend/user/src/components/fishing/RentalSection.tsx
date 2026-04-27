import { useEffect, useMemo, useState } from "react";
import { RentalCard } from "./RentalCard";
import { RentalModal } from "./RentalModal";
import { RentalItem } from "@/pages/FishingGear";
import { getRentalCatalog } from "@/lib/rentalCatalog";
import { isAuthenticated, redirectToLogin } from "@/lib/auth";
import { Pagination, PaginationContent, PaginationItem, PaginationPrevious, PaginationNext, PaginationLink } from "@/components/ui/pagination";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { ArrowUpAZ, Package, DollarSign, ArrowDown, ArrowUp } from "lucide-react";

interface RentalSectionProps {
  onBooked: (payload: { dto: any; itemName: string; renterName: string; customerPhone: string }) => void;
  initialRentalId?: number;
}

export const RentalSection = ({ onBooked, initialRentalId }: RentalSectionProps) => {
  const [items, setItems] = useState<RentalItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<RentalItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sortMode, setSortMode] = useState<"stock" | "alpha" | "price_asc" | "price_desc">("stock");
  const [priceRange, setPriceRange] = useState<number[]>([0, 0]);
  const itemsPerPage = 8;

  useEffect(() => {
    let mounted = true;
    const fetchItems = async () => {
      try {
        setLoading(true);
        setError(null);
        const mapped: RentalItem[] = await getRentalCatalog();
        // Default: ordenar por disponibilidade (sem disponibilidade por último)
        const sorted = mapped.sort((a, b) => {
          if (b.available !== a.available) return b.available - a.available;
          return a.name.localeCompare(b.name);
        });
        if (mounted) setItems(sorted);
      } catch (err: any) {
        console.error("Erro ao carregar itens de aluguel", err);
        if (mounted) setError("Falha ao carregar itens de aluguel. Tente novamente.");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchItems();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    // Resetar paginação quando a lista mudar
    setCurrentPage(1);
  }, [items.length]);

  // Atualiza faixa de preço ao carregar itens (usa hourlyPrice)
  useEffect(() => {
    const max = items.length ? Math.max(...items.map((i) => Number(i.hourlyPrice || 0))) : 0;
    const min = 0;
    setPriceRange([min, max]);
  }, [items]);

  // Abre modal automaticamente se houver parâmetro inicial
  useEffect(() => {
    if (!initialRentalId) return;
    const target = items.find((i) => String(i.id) === String(initialRentalId));
    if (target) {
      // if (!isAuthenticated()) {
      //   redirectToLogin(`rent_item:${target.id}`);
      //   return;
      // }
      setSelectedItem(target);
    }
  }, [initialRentalId, items]);

  const formatCurrency = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

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

  const totalPages = Math.ceil(visibleItems.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedItems = visibleItems.slice(startIndex, startIndex + itemsPerPage);

  if (loading) {
    return <div className="py-10 text-center text-muted-foreground">Carregando equipamentos para aluguel...</div>;
  }
  if (error) {
    return <div className="py-10 text-center text-destructive">{error}</div>;
  }

  return (
    <div className="space-y-8">
      {/* Barra de controles: ordenação por ícones e faixa de preço */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Ordenar</span>
          <Select value={sortMode} onValueChange={(v) => setSortMode(v as any)}>
            <SelectTrigger aria-label="Ordenação" className="w-12 justify-center">
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
            <span className="text-sm text-muted-foreground">Faixa de preço (hora)</span>
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {paginatedItems.map((item) => (
          <RentalCard
            key={item.id}
            item={item}
            onSelect={() => {
              // if (!isAuthenticated()) {
              //   redirectToLogin(`rent_item:${item.id}`);
              //   return;
              // }
              setSelectedItem(item);
            }}
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

      <RentalModal
        item={selectedItem}
        open={!!selectedItem}
        onOpenChange={(open) => !open && setSelectedItem(null)}
        onBooked={({ dto, renterName, customerPhone }) => {
          if (selectedItem) {
            onBooked({ dto, itemName: selectedItem.name, renterName, customerPhone });
          }
        }}
      />
    </div>
  );
};
