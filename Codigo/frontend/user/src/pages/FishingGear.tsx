import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RentalSection } from "@/components/fishing/RentalSection";
import { ShoppingSection } from "@/components/fishing/ShoppingSection";
import { ShoppingCart, History, Filter, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/Header";
import { RentalHistory, RentalDTO } from "@/components/fishing/RentalHistory";
import { OrderHistory } from "@/components/fishing/OrderHistory";
import { getUserRentals, cancelRental, api, submitUserRating, getPendingRequests } from "@/lib/api";
import { getRentalCatalog } from "@/lib/rentalCatalog";
import LoadingSpinner from "@/components/LoadingSpinner";
import { isAuthenticated, redirectToLogin } from "@/lib/auth";
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { CartSummary } from "@/components/fishing/CartSummary";
import { showRatingToast } from "@/components/RatingToast";
import { enqueueRatingPrompt, dequeueRatingPrompt } from "@/lib/ratings";
import { toast } from "sonner";

export interface RentalItem {
  id: string | number;
  name: string;
  description: string;
  hourlyPrice: number;
  available: number;
  image: string;
  images: string[];
  fullDescription: string;
  unavailableDates: Date[];
}

export interface ShopItem {
  id: number;
  name: string;
  description: string;
  price: number;
  stock: number;
  image: string;
}

export interface CartItem extends ShopItem {
  quantity: number;
}

const FishingGear = () => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<"rental" | "purchase">("rental");
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [rentalOrders, setRentalOrders] = useState<Array<{ dto: RentalDTO; itemName: string }>>([]);
  const [lastRenterName, setLastRenterName] = useState<string>("");
  const [lastPhone, setLastPhone] = useState<string>("");
  const [lastBuyerName, setLastBuyerName] = useState<string>("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyTab, setHistoryTab] = useState<"orders" | "rentals">("orders");
  // Rating via lateral toast (15s), not dialog
  const [globalLoading, setGlobalLoading] = useState<boolean>(false);

  const refreshUserRentals = async (name?: string, phone?: string) => {
    try {
      const rentals: RentalDTO[] = await getUserRentals(name, phone);
      const items: RentalItem[] = await getRentalCatalog();
      const nameMap = new Map<string, string>(items.map((it) => [String(it.id), it.name]));
      setRentalOrders(
        rentals.map((dto) => ({ dto, itemName: nameMap.get(String(dto.rentalItemId)) || "Item" }))
      );
    } catch (err) {
      console.error("Falha ao buscar seus aluguéis", err);
    }
  };

  const addToCart = (item: ShopItem) => {
    // Enforce authentication before allowing add to cart
    // if (!isAuthenticated()) {
    //   redirectToLogin(`add_to_cart:${item.id}`);
    //   return;
    // }
    setCartItems((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        const nextQty = existing.quantity + 1;
        if (nextQty > item.stock) {
          // Evita exceder estoque
          toast.error("Estoque insuficiente para adicionar mais unidades.");
          return prev; // sem alteração
        }
        const updated = prev.map((i) =>
          i.id === item.id ? { ...i, quantity: nextQty } : i
        );
        toast.success("Item adicionado ao carrinho.");
        return updated;
      }
      if (item.stock <= 0) {
        toast.error("Este produto está sem estoque.");
        return prev;
      }
      const next = [...prev, { ...item, quantity: 1 }];
      toast.success("Item adicionado ao carrinho.");
      return next;
    });
  };

  const updateCartQuantity = (id: number, quantity: number) => {
    setCartItems((prev) => {
      const item = prev.find((i) => i.id === id);
      if (!item) return prev;
      const nextQty = Math.max(0, Math.min(quantity, item.stock));
      if (nextQty <= 0) {
        return prev.filter((i) => i.id !== id);
      }
      return prev.map((i) => (i.id === id ? { ...i, quantity: nextQty } : i));
    });
  };

  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get("tab");
    const rentalIdParam = params.get("rentalId");
    const productIdParam = params.get("productId");
    const historyParam = params.get("history");
    if (tabParam === "purchase" || tabParam === "rental") {
      setActiveTab(tabParam);
    } else if (rentalIdParam) {
      setActiveTab("rental");
    } else if (productIdParam) {
      setActiveTab("purchase");
    }

    if (historyParam === "orders" || historyParam === "rentals") {
      setHistoryOpen(true);
      setHistoryTab(historyParam);
    }
  }, [location.search]);

  // Ouve o estado global de loading emitido pelo cliente de API
  useEffect(() => {
    const handler = (e: Event) => {
      const pending = (e as CustomEvent)?.detail?.pending ?? 0;
      setGlobalLoading(pending > 0);
    };
    setGlobalLoading(getPendingRequests() > 0);
    if (typeof window !== 'undefined') {
      window.addEventListener('global-loading', handler);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('global-loading', handler);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header searchScope={activeTab === "rental" ? "rental" : "purchase"} />

      {/* Hero Section */}
      <section className="pt-32 pb-12 px-4 md:px-8">
        <div className="max-w-7xl mx-auto text-center space-y-4 animate-fade-in-up">
          <h1 className="text-5xl md:text-6xl font-bold">
            Equipamentos de Pesca
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Alugue ou compre equipamentos de pesca de qualidade para sua próxima aventura
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-12 px-4 md:px-8">
        <div className="max-w-7xl mx-auto">
          {globalLoading && (
            <div className="py-24">
              <LoadingSpinner />
            </div>
          )}
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as "rental" | "purchase")}
            className="w-full"
            style={globalLoading ? { display: 'none' } : undefined}
          >
            <div className="flex items-center justify-between mb-8">
              {/* Abas principais */}
              <TabsList className="grid max-w-md grid-cols-2">
                <TabsTrigger value="rental">Aluguel de equipamentos</TabsTrigger>
                <TabsTrigger value="purchase" className="relative">
                  Comprar produtos
                  {totalItems > 0 && (
                    <Badge
                      variant="destructive"
                      className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                    >
                      {totalItems}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              {/* Ícones alinhados à direita com espaçamento */}
              <div className="flex items-center gap-2">
                {/* Botão de carrinho como gatilho do modal */}
                <Sheet open={cartOpen} onOpenChange={setCartOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="icon" className="relative">
                      <ShoppingCart className="h-5 w-5" />
                      {totalItems > 0 && (
                        <span className="absolute -top-1 -right-1">
                          <Badge
                            variant="destructive"
                            className="h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                          >
                            {totalItems}
                          </Badge>
                        </span>
                      )}
                    </Button>
                  </SheetTrigger>
                  <SheetContent
                    side="right"
                    className="w-[80vw] sm:w-[80vw] md:w-[80vw] lg:w-[80vw] xl:w-[80vw] 2xl:w-[80vw] max-w-none sm:max-w-none md:max-w-none lg:max-w-none xl:max-w-none 2xl:max-w-none h-[100dvh] overflow-y-auto transition-all duration-300 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:slide-in-from-right-1/2 data-[state=closed]:slide-out-to-right-1/2"
                  >
                    <SheetHeader>
                      <SheetTitle className="sr-only">Carrinho</SheetTitle>
                      <SheetDescription className="sr-only">Resumo do carrinho e compra</SheetDescription>
                    </SheetHeader>
                    <CartSummary
                      cartItems={cartItems}
                      onUpdateQuantity={updateCartQuantity}
                      onPurchased={(buyerName, items) => {
                        // Fecha a barra lateral do carrinho ao concluir a compra
                        setCartOpen(false);
                        setLastBuyerName(buyerName);
                        if (items.length > 0) {
                          // Enfileira todos; mostra apenas o primeiro como toast lateral
                          items.forEach((it) => enqueueRatingPrompt({ type: "product", id: it.id, name: it.name }));
                          const first = items[0];
                          const prompt = { type: "product" as const, id: first.id, name: first.name };
                          // Exibe a avaliação após a confirmação (pequeno atraso para ordem visual)
                          setTimeout(() => {
                            showRatingToast(prompt, {
                              onSubmit: async (rating, comment) => {
                                try {
                                  await submitUserRating({ targetType: 'PRODUCT', targetId: prompt.id, rating, comment });
                                  toast.success('Obrigado pela sua avaliação!');
                                } catch (e) {
                                  toast.error('Não foi possível enviar sua avaliação.');
                                } finally {
                                  dequeueRatingPrompt(prompt.id);
                                }
                              },
                              onClose: () => dequeueRatingPrompt(prompt.id),
                            });
                          }, 300);
                          }
                      }}
                    />
                  </SheetContent>
                </Sheet>

                {/* Botão de histórico: compras e aluguéis */}
                <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="icon" onClick={() => setHistoryOpen(true)} aria-label="Abrir histórico">
                      <History className="h-5 w-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent
                    side="right"
                    className="w-[80vw] sm:w-[80vw] md:w-[80vw] lg:w-[80vw] xl:w-[80vw] 2xl:w-[80vw] max-w-none sm:max-w-none md:max-w-none lg:max-w-none xl:max-w-none 2xl:max-w-none h-[100dvh] max-h-[100dvh] overflow-y-auto overflow-x-hidden transition-all duration-300 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:slide-in-from-right-1/2 data-[state=closed]:slide-out-to-right-1/2"
                  >
                    <SheetHeader>
                      <SheetTitle>Histórico</SheetTitle>
                      <SheetDescription>Compras e Aluguéis do usuário</SheetDescription>
                    </SheetHeader>
                    <div className="mt-4 space-y-4">
                      {/* Toolbar de filtros em estilo e-commerce */}
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-2">
                          <Filter className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Filtros rápidos</span>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Select>
                            <SelectTrigger aria-label="Período" className="w-40 justify-between">
                              <span className="flex items-center gap-2"><Calendar className="h-4 w-4" /></span>
                            </SelectTrigger>
                            <SelectContent align="start">
                              <SelectItem value="30d">Últimos 30 dias</SelectItem>
                              <SelectItem value="6m">Últimos 6 meses</SelectItem>
                              <SelectItem value="12m">Últimos 12 meses</SelectItem>
                            </SelectContent>
                          </Select>
                          <Select>
                            <SelectTrigger aria-label="Status" className="w-40 justify-between">
                              Status
                            </SelectTrigger>
                            <SelectContent align="start">
                              <SelectItem value="all">Todos</SelectItem>
                              <SelectItem value="done">Concluído</SelectItem>
                              <SelectItem value="pending">Pendente</SelectItem>
                              <SelectItem value="canceled">Cancelado</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <Separator />

                      {/* Abas com cabeçalho fixo */}
                      <Tabs value={historyTab} onValueChange={(v) => setHistoryTab(v as "orders" | "rentals")} className="w-full">
                        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm py-2">
                          <TabsList className="grid w-full max-w-md grid-cols-2">
                            <TabsTrigger value="orders">Histórico de Compras</TabsTrigger>
                            <TabsTrigger value="rentals">Histórico de Aluguéis</TabsTrigger>
                          </TabsList>
                        </div>
                        <TabsContent value="orders" className="mt-4">
                          <OrderHistory initialBuyerName={lastBuyerName} />
                        </TabsContent>
                        <TabsContent value="rentals" className="mt-4">
                          <RentalHistory
                            orders={rentalOrders}
                            onCancel={async (id: number) => {
                              const updated = await cancelRental(id);
                              setRentalOrders((prev) =>
                                prev.map((o) =>
                                  o.dto.id === id
                                    ? { dto: { ...o.dto, returnTime: updated?.returnTime }, itemName: o.itemName }
                                    : o
                                )
                              );
                              if (lastRenterName || lastPhone) {
                                refreshUserRentals(lastRenterName, lastPhone);
                              }
                            }}
                            onUpdated={() => {
                              if (lastRenterName || lastPhone) {
                                refreshUserRentals(lastRenterName, lastPhone);
                              }
                            }}
                          />
                        </TabsContent>
                      </Tabs>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </div>

            <TabsContent value="rental" className="mt-0">
              <RentalSection
                onBooked={({ dto, itemName, renterName, customerPhone }) => {
                  setLastRenterName(renterName);
                  setLastPhone(customerPhone);
                  // Atualiza imediatamente com o último aluguel
                  setRentalOrders((prev) => [{ dto, itemName }, ...prev]);
                  // Depois busca histórico completo do usuário
                  refreshUserRentals(renterName, customerPhone);
                  const prompt = { type: "rental" as const, id: dto?.rentalItemId ?? 0, name: itemName };
                  enqueueRatingPrompt(prompt);
                  // Exibe após confirmação de aluguel (leve atraso)
                  setTimeout(() => {
                    showRatingToast(prompt, {
                      onSubmit: async (rating, comment) => {
                        try {
                          await submitUserRating({ targetType: 'RENTAL', targetId: prompt.id, rating, comment });
                          toast.success('Obrigado pela sua avaliação!');
                        } catch (e) {
                          toast.error('Não foi possível enviar sua avaliação.');
                        } finally {
                          dequeueRatingPrompt(prompt.id);
                        }
                      },
                      onClose: () => dequeueRatingPrompt(prompt.id),
                    });
                  }, 300);
                }}
                initialRentalId={(() => {
                  const params = new URLSearchParams(location.search);
                  const rid = params.get("rentalId");
                  return rid ? Number(rid) : undefined;
                })()}
              />
            </TabsContent>

            <TabsContent value="purchase" className="mt-0">
              <ShoppingSection
                cartItems={cartItems}
                onAddToCart={addToCart}
                onUpdateQuantity={updateCartQuantity}
                initialProductId={(() => {
                  const params = new URLSearchParams(location.search);
                  const pid = params.get("productId");
                  return pid ? Number(pid) : undefined;
                })()}
              />
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border/50">
        <div className="max-w-7xl mx-auto text-center text-muted-foreground">
          <p>&copy; 2025 Duzepesqueiro. Todos os direitos reservados.</p>
        </div>
      </footer>

      {/* Rating via toast (handled on events above) */}
    </div>
  );
};

export default FishingGear;
