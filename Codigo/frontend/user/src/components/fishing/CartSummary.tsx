import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Info, Minus, Package2, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { CartItem } from "@/pages/FishingGear";
import { toast } from "sonner";
import { createSalesOrder } from "@/lib/api";

interface CartSummaryProps {
  cartItems: CartItem[];
  onUpdateQuantity: (id: string, quantity: number) => void;
  onPurchased?: (buyerName: string, items: CartItem[]) => void;
}

export const CartSummary = ({ cartItems, onUpdateQuantity, onPurchased }: CartSummaryProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const formatCurrency = (value: number) =>
    value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const handleFinalize = async () => {
    // Require authentication on action
    // if (!isAuthenticated()) {
    //   redirectToLogin("purchase");
    //   return;
    // }

    setIsSubmitting(true);
    const purchasedSnapshot = cartItems.map((i) => ({ ...i }));
    try {
      await createSalesOrder({
        items: cartItems.map((item) => ({
          productId: item.id,
          quantity: item.quantity,
        })),
      });

      toast.success("Pedido registrado!", {
        description: "Seu pedido foi registrado. Em breve será possível pagar online via Mercado Pago.",
      });

      cartItems.forEach((item) => onUpdateQuantity(item.id, 0));
      try { onPurchased?.("", purchasedSnapshot); } catch {}
    } catch (err) {
      toast.error("Não foi possível processar o pedido.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Package2 className="h-4 w-4" />
          <span>
            {cartItems.length} item{cartItems.length !== 1 ? "s" : ""}
          </span>
        </div>
        {cartItems.length > 0 ? (
          <Badge variant="outline" className="bg-background/70 backdrop-blur-sm">
            Total: {formatCurrency(subtotal)}
          </Badge>
        ) : null}
      </div>

      {cartItems.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-background/70 text-primary shadow-sm">
            <ShoppingBag className="h-6 w-6" aria-hidden="true" />
          </div>
          <p className="mt-4 text-sm font-semibold">Seu carrinho está vazio</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Adicione produtos para finalizar seu pedido.
          </p>
        </div>
      ) : (
        <>
          <ScrollArea className="h-[48vh] pr-4">
            <div className="space-y-3">
              {cartItems.map((item) => (
                <Card key={item.id} className="overflow-hidden border border-border/50 bg-card/90 backdrop-blur-sm">
                  <div className="flex gap-4 p-4">
                    <div className="relative h-20 w-20 rounded-xl overflow-hidden flex-shrink-0 bg-muted">
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 space-y-2 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-semibold text-sm line-clamp-2 flex-1">{item.name}</h4>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
                          onClick={() => onUpdateQuantity(item.id, 0)}
                          aria-label={`Remover ${item.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-sm text-muted-foreground">
                          {formatCurrency(Number(item.price || 0))} cada
                        </span>
                        <Badge variant="secondary" className="font-semibold">
                          {formatCurrency(Number(item.price || 0) * Number(item.quantity || 0))}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          className="h-11 w-11"
                          onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                          aria-label="Diminuir quantidade"
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <Input
                          type="number"
                          min="1"
                          max={item.stock}
                          value={item.quantity}
                          onChange={(e) =>
                            onUpdateQuantity(
                              item.id,
                              Math.min(item.stock, Math.max(1, parseInt(e.target.value) || 1))
                            )
                          }
                          className="h-11 w-24 text-center"
                          inputMode="numeric"
                        />
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          className="h-11 w-11"
                          onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                          disabled={item.quantity >= item.stock}
                          aria-label="Aumentar quantidade"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </ScrollArea>

          <div className="space-y-3 rounded-2xl border border-border/50 bg-muted/20 p-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium">{formatCurrency(subtotal)}</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="font-semibold text-lg">Total</span>
              <span className="text-2xl font-semibold text-primary">{formatCurrency(subtotal)}</span>
            </div>
          </div>

          <Alert className="border-border/50 bg-muted/10">
            <Info className="h-4 w-4 text-primary" />
            <AlertDescription className="text-sm">
              O pagamento é realizado presencialmente no <strong>DuZé Pesqueiro</strong>. Este pedido é apenas uma reserva.
            </AlertDescription>
          </Alert>

          <Button
            onClick={handleFinalize}
            disabled={isSubmitting || cartItems.length === 0}
            className="w-full h-11 font-semibold"
            size="lg"
            variant="secondary"
          >
            {isSubmitting ? (
              <>
                <Package2 className="h-5 w-5 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <ShoppingBag className="h-5 w-5" />
                Finalizar pedido
              </>
            )}
          </Button>
        </>
      )}
    </div>
  );
};
