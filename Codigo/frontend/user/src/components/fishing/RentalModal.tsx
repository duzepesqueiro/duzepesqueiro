import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Calendar as CalendarIcon, DollarSign, CheckCircle, Package, Phone, ChevronLeft, ChevronRight } from "lucide-react";
import { formatPhoneBR, unmaskPhone } from "@/lib/phone";
import { RentalItem } from "@/pages/FishingGear";
import { api, getUserProfile } from "@/lib/api";
import { isAuthenticated, redirectToLogin } from "@/lib/auth";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { addDays, format } from "date-fns";

interface RentalModalProps {
  item: RentalItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBooked?: (payload: { dto: any; renterName: string; customerPhone: string }) => void;
}

export const RentalModal = ({ item, open, onOpenChange, onBooked }: RentalModalProps) => {
  const [startDate, setStartDate] = useState<string>(""); // yyyy-MM-dd
  const [quantity, setQuantity] = useState<number>(1);
  const [renterName, setRenterName] = useState<string>("");
  const [customerPhone, setCustomerPhone] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [imageIndex, setImageIndex] = useState<number>(0);

  // Deriva objeto Date da string para o Calendar sem deslocamento de fuso (local midday)
  const startDateObj = startDate
    ? (() => {
        const [y, m, d] = startDate.split("-").map(Number);
        return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0, 0);
      })()
    : undefined;
  // Bloqueia datas anteriores ao dia atual
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // Datas indisponíveis vindas do item
  const unavailableSet = new Set(
    (item?.unavailableDates || []).map((d) => format(d, "yyyy-MM-dd"))
  );

  // Prefill renter name and phone when authenticated
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (isAuthenticated() && open) {
          const profile = await getUserProfile();
          if (profile && mounted) {
            if (profile.nome && !renterName) setRenterName(profile.nome);
            if (profile.telefone && !customerPhone) setCustomerPhone(formatPhoneBR(profile.telefone));
          }
        }
      } catch {}
    })();
    return () => { mounted = false; };
  }, [open]);

  useEffect(() => {
    setImageIndex(0);
  }, [item?.id, open]);

  // Evita renderização do modal quando não há item selecionado
  if (!item) return null;

  const galleryImages = (item.images?.length ? item.images : [item.image]).filter(Boolean).slice(0, 10);
  const currentImage = galleryImages[imageIndex] || item.image;
  const formatCurrency = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const totalPrice = formatCurrency(item.hourlyPrice * (quantity > 0 ? quantity : 0));

  const handleConfirmRental = async () => {
    try {
      // Require authentication on action
      // if (!isAuthenticated()) {
      //   redirectToLogin(`rent_item:${item.id}`);
      //   return;
      // }

      if (!startDate) {
        toast.error("Selecione a data.");
        return;
      }
      if (quantity == null || quantity <= 0) {
        toast.error("Informe uma quantidade válida (>= 1).");
        return;
      }
      if (item.available != null && quantity > item.available) {
        toast.error("Quantidade solicitada maior que disponível.");
        return;
      }

      setSubmitting(true);

      const returnDate = startDateObj ? format(addDays(startDateObj, 1), "yyyy-MM-dd") : "";
      const payload: any = {
        productId: item.id,
        rentalDate: startDate,
        returnDate,
        periodType: "DAILY",
        periodValue: 1,
        quantity,
        unitPrice: item.hourlyPrice,
        notes:
          [renterName?.trim() ? `Locatário: ${renterName.trim()}` : "", customerPhone?.trim() ? `Telefone: ${customerPhone.trim()}` : ""]
            .filter(Boolean)
            .join(" | ") || undefined,
      };

      const res = await api.post("/rentals/bookings", payload);
      const dto = res?.data?.data ?? res?.data;
      toast.success("Aluguel confirmado com sucesso!", {
        description: `${item.name} reservado por 1 dia.`,
        icon: <CheckCircle className="h-4 w-4 text-green-600" />,
      });
      onOpenChange(false);
      setStartDate("");
      setQuantity(1);
      setRenterName("");
      setCustomerPhone("");
      setSubmitting(false);
      onBooked?.({ dto, renterName, customerPhone });
    } catch (err: any) {
      console.error("Erro ao confirmar aluguel", err);
      setSubmitting(false);
      const msg = err?.response?.data?.message || "Falha ao confirmar aluguel.";
      toast.error(msg);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden border border-border/50 bg-card/95 backdrop-blur-sm p-0">
        <div className="max-h-[90vh] overflow-y-auto">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/50">
            <DialogTitle className="font-display text-2xl font-semibold">{item.name}</DialogTitle>
            <DialogDescription>{item.description}</DialogDescription>
          </DialogHeader>

          <div className="px-6 py-6 grid md:grid-cols-2 gap-6">
          {/* Coluna Esquerda - Imagem e Descrição */}
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="relative rounded-2xl overflow-hidden bg-muted/20 border border-border/50">
                <div className="aspect-[4/3]">
                  <img src={currentImage} alt={item.name} className="w-full h-full object-contain p-6" />
                </div>
                {galleryImages.length > 1 && (
                  <>
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      className="absolute left-3 top-1/2 h-10 w-10 -translate-y-1/2 rounded-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        setImageIndex((current) => (current - 1 + galleryImages.length) % galleryImages.length);
                      }}
                      aria-label="Imagem anterior"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      className="absolute right-3 top-1/2 h-10 w-10 -translate-y-1/2 rounded-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        setImageIndex((current) => (current + 1) % galleryImages.length);
                      }}
                      aria-label="Próxima imagem"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
              {galleryImages.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {galleryImages.map((src, index) => (
                    <button
                      key={`${src}-${index}`}
                      type="button"
                      className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl border bg-muted/20 ${index === imageIndex ? "border-primary" : "border-border/60"}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setImageIndex(index);
                      }}
                      aria-label={`Ver imagem ${index + 1}`}
                    >
                      <img src={src} alt={`${item.name} ${index + 1}`} className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <h3 className="font-semibold mb-2">Descrição</h3>
              <p className="text-sm text-muted-foreground">{item.fullDescription}</p>
            </div>
            <div className="flex items-center gap-4 p-4 bg-muted/20 border border-border/50 rounded-2xl">
              <div className="text-center">
                <div className="text-xl font-semibold text-primary">{formatCurrency(item.hourlyPrice)}</div>
                <div className="text-sm text-muted-foreground">por dia</div>
              </div>
              <Separator orientation="vertical" className="h-12" />
              <div className="text-center">
                <div className="text-3xl font-bold text-primary flex items-center justify-center gap-2">
                  <Package className="h-6 w-6" /> {item.available}
                </div>
                <div className="text-sm text-muted-foreground">unidades disponíveis</div>
              </div>
            </div>
          </div>

          {/* Coluna Direita - Formulário de Reserva */}
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="flex items-center gap-2 mb-3">
                  <CalendarIcon className="h-4 w-4" />
                  Selecione a data
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full h-11 pl-3 text-left font-normal",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      {startDateObj ? (
                        format(startDateObj, "dd/MM/yyyy")
                      ) : (
                        <span>Selecionar data</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDateObj}
                      onSelect={(date) => setStartDate(date ? format(date, "yyyy-MM-dd") : "")}
                      disabled={(date) => date < today || unavailableSet.has(format(date, "yyyy-MM-dd"))}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <Package className="h-4 w-4" />
                  Quantidade
                </Label>
                <Input
                  className="h-11"
                  type="number"
                  min={1}
                  max={item.available ?? undefined}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                />
              </div>
            </div>

            <div>
              <Label className="mb-2">Nome do locatário</Label>
              <Input
                className="h-11"
                placeholder="Digite seu nome"
                value={renterName}
                onChange={(e) => setRenterName(e.target.value)}
              />
            </div>

            {/* Contato */}
            <div>
              <Label className="flex items-center gap-2 mb-2"><Phone className="h-4 w-4" /> Telefone</Label>
              <Input
                className="h-11"
                type="tel"
                inputMode="numeric"
                maxLength={14}
                placeholder="(99) 9999-9999"
                value={formatPhoneBR(customerPhone)}
                onChange={(e) => setCustomerPhone(unmaskPhone(e.target.value))}
              />
            </div>



            <Separator />

            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Taxa por dia:</span>
                <span className="font-medium">{formatCurrency(item.hourlyPrice)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Período:</span>
                <span className="font-medium">1 dia</span>
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
                <span className="text-2xl font-semibold text-primary">{totalPrice}</span>
              </div>
            </div>

            <Button onClick={handleConfirmRental} className="w-full h-11 font-semibold" size="lg" variant="secondary" disabled={submitting}>
              {submitting ? "Confirmando..." : "Confirmar Aluguel"}
            </Button>
          </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
