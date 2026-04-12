import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Package, Calendar, User as UserIcon, XCircle, Pencil, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { updateRental } from "@/lib/api";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

export interface RentalDTO {
  id: number;
  rentalItemId: number;
  renterName: string;
  quantity: number;
  startDate: string; // yyyy-MM-dd
  endDate: string;   // yyyy-MM-dd
  totalPrice: number;
  createdAt: string; // ISO datetime
  // Novo campo opcional: hora de devolução
  returnTime?: string; // yyyy-MM-dd HH:mm
}

interface RentalHistoryProps {
  orders: Array<{ dto: RentalDTO; itemName: string }>;
  onCancel?: (id: number) => void | Promise<void>;
  onUpdated?: () => void | Promise<void>;
}

export const RentalHistory = ({ orders, onCancel, onUpdated }: RentalHistoryProps) => {
  const formatDate = (s?: string) => {
    if (!s) return "-";
    try {
      // Input is yyyy-MM-dd, safe to parse
      const parts = s.split("-");
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      return d.toLocaleDateString("pt-BR");
    } catch {
      return s;
    }
  };

  const formatDateTime = (s?: string) => {
    if (!s) return "-";
    try {
      const d = new Date(s);
      return d.toLocaleString("pt-BR", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" });
    } catch {
      return s;
    }
  };

  const toDate = (yyyyMmDd?: string) => {
    if (!yyyyMmDd) return undefined;
    try {
      const [y, m, d] = yyyyMmDd.split("-").map(Number);
      return new Date(y, (m || 1) - 1, d || 1, 0, 0, 0, 0);
    } catch {
      return undefined;
    }
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const activeUpcoming = orders.filter(({ dto }) => !dto.returnTime && (toDate(dto.endDate)?.getTime() ?? 0) >= today.getTime());
  const overdue = orders.filter(({ dto }) => !dto.returnTime && (toDate(dto.endDate)?.getTime() ?? 0) < today.getTime());
  const past = orders.filter(({ dto }) => !!dto.returnTime);

  // Inline edit state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDate, setEditDate] = useState<string>(""); // yyyy-MM-dd
  const [editTime, setEditTime] = useState<string>("06:00"); // HH:mm
  const [editHours, setEditHours] = useState<number>(1);
  const [editQty, setEditQty] = useState<number>(1);

  // Paginação por seção
  const [pageActive, setPageActive] = useState<number>(1);
  const [pageOverdue, setPageOverdue] = useState<number>(1);
  const [pagePast, setPagePast] = useState<number>(1);
  const pageSize = 5;

  const totalActivePages = Math.max(1, Math.ceil(activeUpcoming.length / pageSize));
  const totalOverduePages = Math.max(1, Math.ceil(overdue.length / pageSize));
  const totalPastPages = Math.max(1, Math.ceil(past.length / pageSize));

  const startActive = (pageActive - 1) * pageSize;
  const startOverdue = (pageOverdue - 1) * pageSize;
  const startPast = (pagePast - 1) * pageSize;

  const activePageItems = activeUpcoming.slice(startActive, startActive + pageSize);
  const overduePageItems = overdue.slice(startOverdue, startOverdue + pageSize);
  const pastPageItems = past.slice(startPast, startPast + pageSize);

  useEffect(() => {
    // Reset páginas ao atualizar a lista
    setPageActive(1);
    setPageOverdue(1);
    setPagePast(1);
  }, [orders]);

  useEffect(() => {
    if (pageActive > totalActivePages) setPageActive(totalActivePages);
    if (pageActive < 1) setPageActive(1);
  }, [totalActivePages]);

  useEffect(() => {
    if (pageOverdue > totalOverduePages) setPageOverdue(totalOverduePages);
    if (pageOverdue < 1) setPageOverdue(1);
  }, [totalOverduePages]);

  useEffect(() => {
    if (pagePast > totalPastPages) setPagePast(totalPastPages);
    if (pagePast < 1) setPagePast(1);
  }, [totalPastPages]);

  const startEdit = (dto: RentalDTO) => {
    setEditingId(dto.id);
    setEditDate(dto.startDate || "");
    setEditTime("06:00");
    setEditHours(1);
    setEditQty(dto.quantity || 1);
  };

  const submitEdit = async (id: number) => {
    try {
      const [h, min] = (editTime || "06:00").split(":").map(Number);
      const [y, m, d] = (editDate || "").split("-").map(Number);
      if (!y || !m || !d) {
        toast.error("Selecione uma data válida para o início");
        return;
      }
      const startLocal = new Date(y, (m || 1) - 1, d || 1, h || 6, min || 0, 0, 0);
      const pad = (n: number) => String(n).padStart(2, "0");
      const startTime = `${startLocal.getFullYear()}-${pad(startLocal.getMonth() + 1)}-${pad(startLocal.getDate())} ${pad(startLocal.getHours())}:${pad(startLocal.getMinutes())}`;
      await updateRental(id, {
        quantity: editQty,
        startDate: editDate,
        startTime,
        durationHours: editHours,
      });
      toast.success("Aluguel atualizado com sucesso!");
      setEditingId(null);
      await onUpdated?.();
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Falha ao atualizar aluguel.";
      toast.error(msg);
    }
  };

  if (!orders?.length) {
    return (
      <div className="mt-8 p-6 border rounded-lg bg-muted/40 text-center text-muted-foreground">
        Nenhuma reserva realizada ainda. Faça uma reserva para vê-la aqui em tempo real.
      </div>
    );
  }

  return (
    <div className="space-y-6 mt-10">
      <div>
        <h2 className="text-xl font-semibold">Histórico de Aluguéis</h2>
        <p className="text-sm text-muted-foreground">Suas reservas aparecem aqui imediatamente após confirmação.</p>
      </div>

      {/* Ativos e Próximos */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Aluguéis Ativos e Próximos</h3>
        {!activeUpcoming.length ? (
          <div className="p-4 border rounded-lg bg-muted/40 text-muted-foreground">Nenhum aluguel ativo ou próximo.</div>
        ) : (
          <>
          <ul className="divide-y rounded-md border">
            {activePageItems.map(({ dto, itemName }) => (
              <li key={dto.id} className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="font-semibold bg-muted/60">{itemName?.[0]?.toUpperCase() || "A"}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="text-sm font-medium line-clamp-1">{itemName}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <UserIcon className="h-3 w-3" /> {dto.renterName}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground flex items-center gap-2">
                      <Calendar className="h-3 w-3" /> De {formatDate(dto.startDate)} até {formatDate(dto.endDate)}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">Criado em: {formatDateTime(dto.createdAt)}</div>
                    <div className="mt-1 text-xs text-muted-foreground">Hora de devolução: {formatDateTime(dto.returnTime)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 sm:self-start">
                  <Badge variant="secondary">Qtd: {dto.quantity}</Badge>
                  <span className="text-lg font-bold">R${Number(dto.totalPrice).toFixed(2)}</span>
                  <Button variant="outline" size="sm" onClick={() => startEdit(dto)} className="flex items-center gap-1">
                    <Pencil className="h-4 w-4" /> Editar
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => onCancel?.(dto.id)} className="flex items-center gap-1 text-destructive border-destructive hover:bg-destructive/10">
                    <XCircle className="h-4 w-4" /> Cancelar
                  </Button>
                </div>
                {editingId === dto.id && (
                  <div className="mt-2 p-3 rounded-lg border bg-muted/30 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Data</Label>
                        <Input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
                      </div>
                      <div>
                        <Label>Hora</Label>
                        <Input type="time" value={editTime} onChange={(e) => setEditTime(e.target.value)} />
                      </div>
                      <div>
                        <Label>Horas</Label>
                        <Input type="number" min={1} value={editHours} onChange={(e) => setEditHours(Number(e.target.value))} />
                      </div>
                      <div>
                        <Label>Quantidade</Label>
                        <Input type="number" min={1} value={editQty} onChange={(e) => setEditQty(Number(e.target.value))} />
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" onClick={() => setEditingId(null)}>Cancelar</Button>
                      <Button variant="secondary" onClick={() => submitEdit(dto.id)}>Salvar alterações</Button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPageActive((p) => Math.max(1, p - 1))}
              disabled={pageActive <= 1}
              aria-label="Anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">Página {pageActive} de {totalActivePages}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPageActive((p) => Math.min(totalActivePages, p + 1))}
              disabled={pageActive >= totalActivePages}
              aria-label="Próximo"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          </>
        )}
      </div>

      {/* Em atraso */}
      <div className="space-y-4 mt-8">
        <h3 className="text-lg font-semibold">Em Atraso</h3>
        {!overdue.length ? (
          <div className="p-4 border rounded-lg bg-muted/40 text-muted-foreground">Nenhum aluguel atrasado.</div>
        ) : (
          <>
          <ul className="divide-y rounded-md border">
            {overduePageItems.map(({ dto, itemName }) => (
              <li key={dto.id} className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="font-semibold bg-muted/60">{itemName?.[0]?.toUpperCase() || "A"}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="text-sm font-medium line-clamp-1">{itemName}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <UserIcon className="h-3 w-3" /> {dto.renterName}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground flex items-center gap-2">
                      <Calendar className="h-3 w-3" /> De {formatDate(dto.startDate)} até {formatDate(dto.endDate)}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">Criado em: {formatDateTime(dto.createdAt)}</div>
                    <div className="mt-1 text-xs text-muted-foreground">Hora de devolução: {formatDateTime(dto.returnTime)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 sm:self-start">
                  <Badge variant="secondary">Qtd: {dto.quantity}</Badge>
                  <span className="text-lg font-bold">R${Number(dto.totalPrice).toFixed(2)}</span>
                  {!dto.returnTime && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onCancel?.(dto.id)}
                      className="flex items-center gap-1 text-destructive border-destructive hover:bg-destructive/10"
                    >
                      <XCircle className="h-4 w-4" /> Cancelar
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPageOverdue((p) => Math.max(1, p - 1))}
              disabled={pageOverdue <= 1}
              aria-label="Anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">Página {pageOverdue} de {totalOverduePages}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPageOverdue((p) => Math.min(totalOverduePages, p + 1))}
              disabled={pageOverdue >= totalOverduePages}
              aria-label="Próximo"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          </>
        )}
      </div>

      {/* Histórico (concluídos/cancelados) */}
      <div className="space-y-4 mt-8">
        <h3 className="text-lg font-semibold">Histórico</h3>
        {!past.length ? (
          <div className="p-4 border rounded-lg bg-muted/40 text-muted-foreground">Nenhum histórico disponível.</div>
        ) : (
          <>
          <ul className="divide-y rounded-md border">
            {pastPageItems.map(({ dto, itemName }) => (
              <li key={dto.id} className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="font-semibold bg-muted/60">{itemName?.[0]?.toUpperCase() || "A"}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="text-sm font-medium line-clamp-1">{itemName}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <UserIcon className="h-3 w-3" /> {dto.renterName}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground flex items-center gap-2">
                      <Calendar className="h-3 w-3" /> De {formatDate(dto.startDate)} até {formatDate(dto.endDate)}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">Criado em: {formatDateTime(dto.createdAt)}</div>
                    <div className="mt-1 text-xs text-muted-foreground">Hora de devolução: {formatDateTime(dto.returnTime)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 sm:self-start">
                  <Badge variant="secondary">Qtd: {dto.quantity}</Badge>
                  <span className="text-lg font-bold">R${Number(dto.totalPrice).toFixed(2)}</span>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPagePast((p) => Math.max(1, p - 1))}
              disabled={pagePast <= 1}
              aria-label="Anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">Página {pagePast} de {totalPastPages}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPagePast((p) => Math.min(totalPastPages, p + 1))}
              disabled={pagePast >= totalPastPages}
              aria-label="Próximo"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          </>
        )}
      </div>
    </div>
  );
};