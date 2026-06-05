import { useMemo, useState, useEffect } from "react";
import { Calendar, MapPin, Clock, Star } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api, createReview, getReviewBySubject } from "@/lib/api";
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
import ReviewModal from "@/components/reviews/ReviewModal";

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

const isEventPast = (dateValue?: string | Date, timeValue?: string): boolean => {
  if (!dateValue) return false;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return false;

  if (timeValue && /^\d{2}:\d{2}/.test(timeValue)) {
    const [hh, mm] = timeValue.split(":").map((v) => Number(v));
    if (!Number.isNaN(hh) && !Number.isNaN(mm)) {
      date.setHours(hh, mm, 0, 0);
    }
  } else {
    date.setHours(23, 59, 59, 999);
  }

  return date.getTime() < Date.now();
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
  const [reviewReg, setReviewReg] = useState<EventRegistration | null>(null);

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
  const completedRegistrationIds = useMemo(
    () =>
      active
        .filter((r) => isEventPast(r.event?.eventDate, r.event?.eventTime))
        .map((r) => r.registrationId),
    [active]
  );

  const { data: hasReviewByRegistrationId = {}, refetch: refetchReviewFlags } = useQuery<
    Record<string, boolean>
  >({
    queryKey: ["my-events-has-review", completedRegistrationIds.join("|")],
    enabled: open && isAuthenticated() && completedRegistrationIds.length > 0,
    queryFn: async () => {
      const responses = await Promise.all(
        completedRegistrationIds.map(async (registrationId) => {
          try {
            await getReviewBySubject({ domain: "EVENT", subjectId: registrationId });
            return [registrationId, true] as const;
          } catch (err: any) {
            const status = err?.response?.status;
            if (status === 404) {
              return [registrationId, false] as const;
            }
            return [registrationId, false] as const;
          }
        })
      );
      return Object.fromEntries(responses);
    },
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

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
                  (() => {
                    const didOccur = isEventPast(reg.event?.eventDate, reg.event?.eventTime);
                    const hasReviewInfo = Object.prototype.hasOwnProperty.call(
                      hasReviewByRegistrationId,
                      reg.registrationId
                    );
                    const alreadyReviewed = hasReviewInfo ? hasReviewByRegistrationId[reg.registrationId] : false;
                    const canReview = didOccur && hasReviewInfo && !alreadyReviewed;
                    return (
                  <RegistrationCard
                    key={reg.registrationId}
                    reg={reg}
                    isConfirming={confirmingId === reg.registrationId}
                    isCancelling={cancellingId === reg.registrationId}
                    onCancelClick={() => handleCancelClick(reg.registrationId)}
                    onDismissConfirm={() => setConfirmingId(null)}
                    canReview={canReview}
                    onReviewClick={() => setReviewReg(reg)}
                  />
                    );
                  })()
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
                    canReview={false}
                    onReviewClick={() => {}}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </DialogContent>

      {reviewReg ? (
        <ReviewModal
          open={!!reviewReg}
          onOpenChange={(next) => !next && setReviewReg(null)}
          title="Avaliar evento"
          description={`Conte como foi sua experiência em "${reviewReg.event.title}".`}
          onSubmit={async ({ rating, comment }) => {
            try {
              await createReview({
                domain: "EVENT",
                subjectId: reviewReg.registrationId,
                rating,
                comment,
              });
              toast.success("Avaliação enviada com sucesso!");
              await refetchReviewFlags();
            } catch (err: any) {
              const message = err?.response?.data?.message;
              const text = Array.isArray(message)
                ? message.join(", ")
                : String(message || "Não foi possível enviar sua avaliação.");
              toast.error(text);
            }
          }}
        />
      ) : null}
    </Dialog>
  );
};

interface RegistrationCardProps {
  reg: EventRegistration;
  isConfirming: boolean;
  isCancelling: boolean;
  onCancelClick: () => void;
  onDismissConfirm: () => void;
  canReview: boolean;
  onReviewClick: () => void;
}

const RegistrationCard = ({
  reg,
  isConfirming,
  isCancelling,
  onCancelClick,
  onDismissConfirm,
  canReview,
  onReviewClick,
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

        {(canReview || canCancel) && (
          <div className="flex flex-wrap items-center gap-2">
            {canReview ? (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs px-3 border-[#F2AB27]/60 bg-[#F2BF27]/25 text-[#284003] hover:bg-[#F2BF27]/35 hover:border-[#F2AB27] font-bold shadow-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onReviewClick();
                }}
                title="Avaliar evento"
              >
                <Star className="h-4 w-4 mr-2" /> Avaliar
              </Button>
            ) : null}

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
