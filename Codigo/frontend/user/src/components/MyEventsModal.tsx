import { useState, useEffect } from "react";
import { Calendar, MapPin, Clock } from "lucide-react";
import { api } from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface EventRegistration {
  registrationId: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "PAID";
  registeredAt: string;
  event: {
    id: string;
    title: string;
    imageUrl: string;
    location: string;
    eventDate: string;
    eventTime: string;
  };
}

interface MyEventsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRegistrationCancelled?: () => void;
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendente",
  CONFIRMED: "Confirmado",
  CANCELLED: "Cancelado",
  PAID: "Pago",
};

const STATUS_CLASS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800 border-yellow-200",
  CONFIRMED: "bg-green-100 text-green-800 border-green-200",
  CANCELLED: "bg-red-100 text-red-800 border-red-200",
  PAID: "bg-blue-100 text-blue-800 border-blue-200",
};

const formatDate = (iso: string) => {
  const [y, m, d] = String(iso).split("T")[0].split("-");
  return `${d}/${m}/${y}`;
};

export const MyEventsModal = ({
  open,
  onOpenChange,
  onRegistrationCancelled,
}: MyEventsModalProps) => {
  const [registrations, setRegistrations] = useState<EventRegistration[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !isAuthenticated()) return;
    let mounted = true;

    const load = async () => {
      setIsLoading(true);
      try {
        const { data } = await api.get<EventRegistration[]>("/events/registrations");
        if (mounted) setRegistrations(Array.isArray(data) ? data : []);
      } catch {
        toast.error("Erro ao carregar suas inscrições.");
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [open]);

  const handleCancelClick = (registrationId: string) => {
    if (confirmingId === registrationId) {
      doCancel(registrationId);
    } else {
      setConfirmingId(registrationId);
    }
  };

  const doCancel = async (registrationId: string) => {
    setCancellingId(registrationId);
    setConfirmingId(null);
    try {
      await api.delete(`/events/registrations/${registrationId}`);
      setRegistrations((prev) =>
        prev.map((r) =>
          r.registrationId === registrationId ? { ...r, status: "CANCELLED" } : r
        )
      );
      toast.success("Inscrição cancelada com sucesso.");
      onRegistrationCancelled?.();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || "Erro ao cancelar inscrição.");
    } finally {
      setCancellingId(null);
    }
  };

  const active = registrations.filter((r) => r.status !== "CANCELLED");
  const cancelled = registrations.filter((r) => r.status === "CANCELLED");

  return (
    <Dialog open={open} onOpenChange={(v) => { setConfirmingId(null); onOpenChange(v); }}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Meus Eventos</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="py-12 text-center text-muted-foreground">Carregando...</div>
        ) : registrations.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            Você ainda não está inscrito em nenhum evento.
          </div>
        ) : (
          <div className="space-y-6">
            {active.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Inscrições ativas ({active.length})
                </p>
                {active.map((reg) => (
                  <RegistrationCard
                    key={reg.registrationId}
                    reg={reg}
                    isConfirming={confirmingId === reg.registrationId}
                    isCancelling={cancellingId === reg.registrationId}
                    onCancelClick={() => handleCancelClick(reg.registrationId)}
                    onDismissConfirm={() => setConfirmingId(null)}
                  />
                ))}
              </div>
            )}

            {cancelled.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Canceladas ({cancelled.length})
                </p>
                {cancelled.map((reg) => (
                  <RegistrationCard
                    key={reg.registrationId}
                    reg={reg}
                    isConfirming={false}
                    isCancelling={false}
                    onCancelClick={() => {}}
                    onDismissConfirm={() => {}}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

interface RegistrationCardProps {
  reg: EventRegistration;
  isConfirming: boolean;
  isCancelling: boolean;
  onCancelClick: () => void;
  onDismissConfirm: () => void;
}

const RegistrationCard = ({
  reg,
  isConfirming,
  isCancelling,
  onCancelClick,
  onDismissConfirm,
}: RegistrationCardProps) => {
  const canCancel = reg.status !== "CANCELLED";

  return (
    <div className="flex gap-3 p-3 rounded-lg border border-border/50 bg-card hover:bg-muted/30 transition-colors">
      <div className="w-16 h-16 rounded-md overflow-hidden shrink-0 bg-muted flex items-center justify-center">
        {reg.event.imageUrl ? (
          <img
            src={reg.event.imageUrl}
            alt={reg.event.title}
            className="w-full h-full object-cover"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
          />
        ) : (
          <span className="text-[10px] text-muted-foreground text-center px-1">Sem imagem</span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h4 className="font-semibold text-sm leading-tight line-clamp-2">{reg.event.title}</h4>
          <Badge
            variant="outline"
            className={`text-[10px] shrink-0 ${STATUS_CLASS[reg.status] ?? ""}`}
          >
            {STATUS_LABEL[reg.status] ?? reg.status}
          </Badge>
        </div>

        <div className="space-y-0.5 text-xs text-muted-foreground mb-2">
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>{formatDate(reg.event.eventDate)} • {reg.event.eventTime}</span>
          </div>
          <div className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            <span className="truncate">{reg.event.location}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>Inscrito em {formatDate(reg.registeredAt)}</span>
          </div>
        </div>

        {canCancel && (
          <div className="flex flex-wrap items-center gap-2">
            {isConfirming ? (
              <>
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-7 text-xs px-3 whitespace-nowrap"
                  disabled={isCancelling}
                  onClick={onCancelClick}
                >
                  {isCancelling ? "Cancelando..." : "Confirmar cancelamento"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs px-3"
                  onClick={onDismissConfirm}
                >
                  Voltar
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs px-3 text-destructive border-destructive/30 hover:bg-destructive/5"
                disabled={isCancelling}
                onClick={onCancelClick}
              >
                Cancelar inscrição
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
