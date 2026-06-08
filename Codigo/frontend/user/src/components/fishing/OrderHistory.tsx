import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Calendar, XCircle, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { listSalesOrdersPage, cancelOrder } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";

export interface SaleDTO {
  id: string;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  items: Array<{
    id: string;
    productId: string;
    nameSnapshot: string;
    imageSnapshot?: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }>;
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
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [total, setTotal] = useState<number>(0);
  const pageSize = 10;

  const refreshOrders = async () => {
    try {
      setLoading(true);
      const result = await listSalesOrdersPage({ page, limit: pageSize });
      const sales: SaleDTO[] = Array.isArray(result?.items) ? result.items : [];
      setTotalPages(Math.max(1, Number(result?.totalPages ?? 1)));
      setTotal(Number(result?.total ?? sales.length) || 0);
      setOrders(
        (sales || []).map((dto: any) => {
          const first = Array.isArray(dto.items) ? dto.items[0] : undefined;
          return {
            dto,
            item: {
              name: String(first?.nameSnapshot ?? "Pedido"),
              image: typeof first?.imageSnapshot === "string" ? first.imageSnapshot : undefined,
              price: typeof first?.unitPrice === "number" ? first.unitPrice : undefined,
            },
          };
        }),
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
  }, [initialBuyerName, page]);

  const formatDateTime = (s?: string) => {
    if (!s) return "-";
    try {
      const d = new Date(s);
      return d.toLocaleString("pt-BR", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" });
    } catch {
      return s || "-";
    }
  };

  const filtered = useMemo(() => {
    const q = productQuery.toLowerCase().trim();
    if (!q) return orders;
    return orders.filter(({ dto, item }) => {
      const names = [
        item.name,
        ...(Array.isArray(dto.items) ? dto.items.map((i) => String(i.nameSnapshot || "")) : []),
      ]
        .filter(Boolean)
        .join(" ");
      return names.toLowerCase().includes(q);
    });
  }, [orders, productQuery]);

  const showingStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const showingEnd = total === 0 ? 0 : Math.min(page * pageSize, total);

  const handleCancel = async (id: string) => {
    try {
      await cancelOrder(id);
      refreshOrders();
    } catch (err) {
      console.error("Erro ao cancelar pedido", err);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border border-border/50 bg-card/90 backdrop-blur-sm shadow-sm">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1">
              <Input
                value={productQuery}
                onChange={(e) => setProductQuery(e.target.value)}
                placeholder="Buscar por nome do produto"
                className="h-11"
              />
            </div>
            <Button className="h-11 font-semibold" variant="secondary" onClick={() => refreshOrders()} disabled={loading}>
              <Search className="h-4 w-4" /> Buscar
            </Button>
          </div>
        </CardContent>
      </Card>

      {!filtered.length ? (
        <div className="mt-4 p-6 border border-dashed rounded-2xl bg-muted/20 text-center text-muted-foreground">
          {productQuery ? "Nenhuma compra encontrada para este produto." : "Nenhuma compra encontrada."}
        </div>
      ) : (
        <>
          <ul className="space-y-3">
            {filtered.map(({ dto, item }) => (
              <li key={dto.id}>
                <Card className="border border-border/50 bg-card/90 backdrop-blur-sm">
                  <CardContent className="p-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="h-10 w-10">
                        {item.image ? (
                          <AvatarImage src={item.image} alt={item.name} />
                        ) : (
                          <AvatarFallback className="font-semibold bg-muted/60">{initials(item.name)}</AvatarFallback>
                        )}
                      </Avatar>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold line-clamp-1">{item.name}</div>
                        <div className="mt-1 text-xs text-muted-foreground flex items-center gap-2">
                          <Calendar className="h-3 w-3" /> Realizado em: {formatDateTime(dto.createdAt)}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                      <Badge variant="secondary" className="font-semibold">
                        Itens: {(dto.items || []).reduce((acc, i) => acc + Number(i.quantity || 0), 0)}
                      </Badge>
                      <Badge variant="outline" className="bg-background/70 backdrop-blur-sm font-semibold">
                        R${formatCurrency(dto.totalAmount)}
                      </Badge>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleCancel(dto.id)}
                        className="h-9 flex items-center gap-2 text-destructive border-destructive/40 hover:bg-destructive/10"
                      >
                        <XCircle className="h-4 w-4" /> Cancelar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Mostrando {showingStart}–{showingEnd} de {total}
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
