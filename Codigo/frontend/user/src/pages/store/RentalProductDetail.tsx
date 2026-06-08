import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Calendar as CalendarIcon, CheckCircle, ChevronLeft, ChevronRight, DollarSign, ImageOff, Package, Phone } from "lucide-react";
import { addDays, format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import LoadingSpinner from "@/components/LoadingSpinner";
import { RentalItem } from "@/pages/FishingGear";
import { getAllRentalProducts, api } from "@/lib/api";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { formatPhoneBR, unmaskPhone } from "@/lib/phone";
import { ReviewsSection } from "@/components/reviews/ReviewsSection";
import { Card } from "@/components/ui/card";

export const RentalProductDetail = ({
  onBooked,
}: {
  onBooked: (payload: { dto: any; itemName: string; renterName: string; customerPhone: string }) => void;
}) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [item, setItem] = useState<RentalItem | null>(null);
  const [startDate, setStartDate] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);
  const [renterName, setRenterName] = useState<string>("");
  const [customerPhone, setCustomerPhone] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [imageIndex, setImageIndex] = useState<number>(0);

  useEffect(() => {
    setImageIndex(0);
  }, [id]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const all = await getAllRentalProducts({ limit: 100 });
        const raw = all.find((p: any) => String(p.id) === String(id));
        if (!raw) {
          if (mounted) setItem(null);
          return;
        }
        const images = Array.isArray(raw.images)
          ? raw.images.filter(Boolean).slice(0, 10)
          : [];
        const image = raw.image || images[0] || "https://placehold.co/600x600?text=Aluguel";
        const mapped: RentalItem = {
          id: String(raw.id),
          name: String(raw.name || ""),
          description: String(raw.description || ""),
          hourlyPrice: Number(raw.hourlyPrice ?? raw.salePrice ?? 0),
          available: Number(raw.available ?? raw.stockQuantity ?? 0),
          image,
          images: images.length ? images : [image],
          fullDescription: raw.fullDescription ?? raw.description ?? "",
          unavailableDates: (raw.unavailableDates || []).map((s: string) => new Date(s)),
        };
        if (mounted) setItem(mapped);
      } catch {
        if (mounted) setItem(null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [id]);

  const startDateObj = startDate
    ? (() => {
        const [y, m, d] = startDate.split("-").map(Number);
        return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0, 0);
      })()
    : undefined;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const unavailableSet = new Set(
    (item?.unavailableDates || []).map((d) => format(d, "yyyy-MM-dd"))
  );

  const galleryImages = (item?.images?.length ? item.images : item ? [item.image] : []).filter(Boolean).slice(0, 10);
  const currentImage = galleryImages[imageIndex] || item?.image;
  const formatCurrency = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const totalPrice = formatCurrency((item?.hourlyPrice ?? 0) * (quantity > 0 ? quantity : 0));

  const handleConfirmRental = async () => {
    if (!item) return;
    try {
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
      setSubmitting(false);
      onBooked({ dto, itemName: item.name, renterName, customerPhone });
      navigate("/store?tab=rental");
    } catch (err: any) {
      console.error("Erro ao confirmar aluguel", err);
      setSubmitting(false);
      const msg = err?.response?.data?.message || "Falha ao confirmar aluguel.";
      toast.error(msg);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto py-16">
        <LoadingSpinner />
      </div>
    );
  }

  if (!id || !item) {
    return (
      <div className="max-w-6xl mx-auto">
        <Button variant="ghost" className="mb-6 h-11" onClick={() => navigate("/store?tab=rental")}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <div className="rounded-xl border border-border/50 bg-muted/20 p-6 text-muted-foreground">
          Item de aluguel não encontrado.
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <Button variant="ghost" className="mb-2 h-11" onClick={() => navigate("/store?tab=rental")}>
        <ChevronLeft className="h-4 w-4 mr-2" />
        Voltar
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 space-y-6">
          <div className="space-y-3">
            <Card className="relative overflow-hidden bg-card/90 backdrop-blur-sm border border-border/50">
              <div className="relative aspect-[4/3] bg-muted/20">
                {currentImage ? (
                  <img src={currentImage} alt={item.name} className="w-full h-full object-contain p-6" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                    <ImageOff className="h-6 w-6" aria-hidden="true" />
                  </div>
                )}
              </div>
              {galleryImages.length > 1 ? (
                <>
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="absolute left-3 top-1/2 h-10 w-10 -translate-y-1/2 rounded-full"
                    onClick={() => setImageIndex((current) => (current - 1 + galleryImages.length) % galleryImages.length)}
                    aria-label="Imagem anterior"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="absolute right-3 top-1/2 h-10 w-10 -translate-y-1/2 rounded-full"
                    onClick={() => setImageIndex((current) => (current + 1) % galleryImages.length)}
                    aria-label="Próxima imagem"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </>
              ) : null}
            </Card>
            {galleryImages.length > 1 ? (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {galleryImages.map((src, index) => (
                  <button
                    key={`${src}-${index}`}
                    type="button"
                    className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl border bg-muted/20 ${index === imageIndex ? "border-primary" : "border-border/60"}`}
                    onClick={() => setImageIndex(index)}
                    aria-label={`Ver imagem ${index + 1}`}
                  >
                    <img src={src} alt={`${item.name} ${index + 1}`} className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <Card className="rounded-2xl border border-border/50 bg-card/90 backdrop-blur-sm p-6 space-y-3">
            <h1 className="font-display text-2xl font-semibold">{item.name}</h1>
            <p className="text-sm text-muted-foreground">{item.fullDescription}</p>
            <Separator />
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Taxa por dia:</span>
              <span className="font-medium">{formatCurrency(Number(item.hourlyPrice || 0))}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Disponível:</span>
              <span className="font-medium">{item.available}</span>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-5">
          <Card className="rounded-2xl border border-border/50 bg-card/90 backdrop-blur-sm p-6 space-y-6 lg:sticky lg:top-28">
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
                    {startDateObj ? format(startDateObj, "dd/MM/yyyy") : <span>Selecionar data</span>}
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
              <span className="font-medium">{formatCurrency(Number(item.hourlyPrice || 0))}</span>
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
          </Card>
        </div>
      </div>

      <ReviewsSection domain="RENTAL" targetId={item.id} />
    </div>
  );
};

