import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Calendar, User as UserIcon, XCircle, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { api, getUserOrders, cancelOrder } from "@/lib/api";

export interface SaleDTO {
  id: number;
  saleItemId: number;
  buyerName: string;
  quantity: number;
  totalPrice: number;
  createdAt: string; // ISO datetime
}

interface OrderHistoryProps {
  initialBuyerName?: string;
}

interface ItemInfo {
  name: string;
  image?: string;
  price?: number;
}

export const OrderHistory = ({ initialBuyerName }: OrderHistoryProps) => {
  // Busca por produto (não por nome do usuário)
  const [productQuery, setProductQuery] = useState<string>("");
  const [orders, setOrders] = useState<Array<{ dto: SaleDTO; item: ItemInfo }>>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const refreshOrders = async () => {
    try {
      setLoading(true);
      // Carrega pedidos do usuário (sem filtrar por nome)
      const byName = (initialBuyerName || "").trim();
      const sales: SaleDTO[] = await getUserOrders(byName ? byName : undefined);
      const itemsRes = await api.get("/user/loja");
      const items: any[] = Array.isArray(itemsRes.data) ? itemsRes.data : [];
      const itemMap = new Map<number, ItemInfo>(
        items.map((it: any) => [
          Number(it.id),
          {
            name: String(it.name || it.product || "Produto"),
            image: typeof it.image === "string" ? it.image : undefined,
            price: typeof it.price === "number" ? it.price : undefined,
          },
        ])
      );
      setOrders(
        sales.map((dto) => ({ dto, item: itemMap.get(Number(dto.saleItemId)) || { name: "Produto" } }))
      );
    } catch (err) {
      console.error("Falha ao buscar pedidos do usuário", err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (n?: number) => {
    try {
      return (Number(n || 0)).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } catch {
      return String(n ?? 0);
    }
  };

  const initials = (name?: string) => {
    const s = (name || "P").trim();
    const parts = s.split(" ").filter(Boolean);
    return (parts[0]?.[0] || "P").toUpperCase();
  };

  useEffect(() => {
    // Carrega pedidos na montagem e quando o nome do comprador muda
    refreshOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialBuyerName]);

  const formatDateTime = (s?: string) => {
    if (!s) return "-";
    try {
      const d = new Date(s);
      return d.toLocaleString("pt-BR", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" });
    } catch {
      return s || "-";
    }
  };

  // Paginação
  const [page, setPage] = useState<number>(1);
  const pageSize = 5;
  const filtered = (productQuery
    ? orders.filter(({ item }) => item.name.toLowerCase().includes(productQuery.toLowerCase().trim()))
    : orders);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const startIndex = (page - 1) * pageSize;
  const pageItems = filtered.slice(startIndex, startIndex + pageSize);
  const showingStart = filtered.length === 0 ? 0 : Math.min(startIndex + 1, filtered.length);
  const showingEnd = Math.min(startIndex + pageItems.length, filtered.length);

  useEffect(() => {
    // Reset para primeira página quando o filtro muda ou a lista é atualizada
    setPage(1);
  }, [productQuery, orders]);

  useEffect(() => {
    // Garante que a página atual está dentro dos limites
    if (page > totalPages) setPage(totalPages);
    if (page < 1) setPage(1);
  }, [totalPages]);

  const handleCancel = async (id: number) => {
    try {
      await cancelOrder(id);
      setOrders((prev) => prev.filter((o) => o.dto.id !== id));
    } catch (err) {
      console.error("Erro ao cancelar pedido", err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Input
          value={productQuery}
          onChange={(e) => setProductQuery(e.target.value)}
          placeholder="Nome do produto para buscar pedidos"
          className="max-w-sm"
        />
        <Button variant="secondary" onClick={() => refreshOrders()} disabled={loading}>
          <Search className="h-4 w-4 mr-2" /> Buscar
        </Button>
      </div>

      {!filtered.length ? (
        <div className="mt-4 p-6 border rounded-lg bg-muted/40 text-center text-muted-foreground">
          {productQuery ? "Nenhuma compra encontrada para este produto." : "Nenhuma compra encontrada."}
        </div>
      ) : (
        <>
          <ul className="divide-y rounded-md border">
            {pageItems.map(({ dto, item }) => (
              <li key={dto.id} className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    {item.image ? (
                      <AvatarImage src={item.image} alt={item.name} />
                    ) : (
                      <AvatarFallback className="font-semibold bg-muted/60">{initials(item.name)}</AvatarFallback>
                    )}
                  </Avatar>
                  <div className="min-w-0">
                    <div className="text-sm font-medium line-clamp-1">{item.name}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <UserIcon className="h-3 w-3" /> {dto.buyerName}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground flex items-center gap-2">
                      <Calendar className="h-3 w-3" /> Realizado em: {formatDateTime(dto.createdAt)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 sm:self-start">
                  <Badge variant="secondary">Qtd: {dto.quantity}</Badge>
                  <span className="text-lg font-bold">R${formatCurrency(dto.totalPrice)}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCancel(dto.id)}
                    className="flex items-center gap-1 text-destructive border-destructive hover:bg-destructive/10"
                  >
                    <XCircle className="h-4 w-4" /> Cancelar
                  </Button>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Mostrando {showingStart}–{showingEnd} de {filtered.length}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                aria-label="Anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">Página {page} de {totalPages}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                aria-label="Próximo"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};