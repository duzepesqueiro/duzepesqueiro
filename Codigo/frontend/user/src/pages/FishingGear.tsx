import { useEffect, useState } from "react";
import { Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RentalSection } from "@/components/fishing/RentalSection";
import { ShoppingSection } from "@/components/fishing/ShoppingSection";
import { Calendar, Filter, History, ShoppingCart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/Header";
import { RentalHistory, RentalDTO } from "@/components/fishing/RentalHistory";
import { OrderHistory } from "@/components/fishing/OrderHistory";
import { getUserRentals, cancelRental, getAllRentalProducts, submitUserRating, getPendingRequests } from "@/lib/api";
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
import { RentalProductDetail } from "@/pages/store/RentalProductDetail";
import { SaleProductDetail } from "@/pages/store/SaleProductDetail";

export interface RentalItem {
  id: string;
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
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  image: string;
  images: string[];
  averageRating?: number;
  reviewsCount?: number;
}

export interface CartItem extends ShopItem {
  quantity: number;
}

const FishingGear = () => {
  const location = useLocation();
  const navigate = useNavigate();
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
      const catalog = await getAllRentalProducts({ limit: 100 });
      const items: RentalItem[] = catalog.map((d: any) => {
        const images = Array.isArray(d.images)
          ? d.images.filter(Boolean).slice(0, 10)
          : [];
        const image = d.image || images[0] || "https://placehold.co/600x600?text=Aluguel";

        return {
          id: d.id,
          name: d.name,
          description: d.description,
          hourlyPrice: Number(d.hourlyPrice ?? d.salePrice ?? 0),
          available: Number(d.available ?? d.stockQuantity ?? 0),
          image,
          images: images.length ? images : [image],
          fullDescription: d.fullDescription ?? d.description ?? "",
          unavailableDates: (d.unavailableDates || []).map((s: string) => new Date(s)),
        };
      });
      const nameMap = new Map<string, string>(items.map((it) => [it.id, it.name]));
      setRentalOrders(
        rentals.map((dto) => ({ dto, itemName: nameMap.get(String(dto.rentalItemId)) || "Item" }))
      );
    } catch (err) {
      console.error("Falha ao buscar seus aluguéis", err);
    }
  };

  const addToCart = (item: ShopItem, quantity = 1) => {
    // Enforce authentication before allowing add to cart
    // if (!isAuthenticated()) {
    //   redirectToLogin(`add_to_cart:${item.id}`);
    //   return;
    // }
    setCartItems((prev) => {
      const qty = Number(quantity || 0);
      if (qty <= 0) return prev;
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        const nextQty = existing.quantity + qty;
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
      if (qty > item.stock) {
        toast.error("Estoque insuficiente para adicionar esta quantidade.");
        return prev;
      }
      const next = [...prev, { ...item, quantity: qty }];
      toast.success("Item adicionado ao carrinho.");
      return next;
    });
  };

  const updateCartQuantity = (id: string, quantity: number) => {
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

    if (rentalIdParam) {
      navigate(`/store/rental/${rentalIdParam}`);
    } else if (productIdParam) {
      navigate(`/store/product/${productIdParam}`);
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
      <Header
        searchScope={
          location.pathname.includes("/store/rental/")
            ? "rental"
            : location.pathname.includes("/store/product/")
              ? "purchase"
              : activeTab === "rental"
                ? "rental"
                : "purchase"
        }
      />

      <main className="pt-24">
        <section className="relative overflow-hidden border-b border-border/40 bg-gradient-to-b from-muted/40 to-background">
          <div className="mx-auto max-w-7xl px-4 md:px-8 py-10 sm:py-12">
            <div className="mx-auto max-w-3xl text-center space-y-4 animate-fade-in-up">
              <p className="text-sm font-semibold tracking-wide text-primary">DuZe Pesqueiro</p>
              <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-semibold leading-tight">
                Loja de pesca
              </h1>
              <p className="text-base sm:text-lg text-muted-foreground">
                Alugue ou compre equipamentos com praticidade. Tudo em um só lugar: produtos, carrinho e histórico.
              </p>
            </div>
          </div>
          <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-[48rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,hsl(var(--secondary))_0%,transparent_60%)] opacity-25 blur-3xl" />
        </section>

      {/* Main Content */}
        <section className="py-10 sm:py-12">
          <div className="mx-auto max-w-7xl px-4 md:px-8">
          {globalLoading && (
            <div className="py-24">
              <LoadingSpinner />
            </div>
          )}
          <Routes>
            <Route
              index
              element={
                <Tabs
                  value={activeTab}
                  onValueChange={(v) => setActiveTab(v as "rental" | "purchase")}
                  className="w-full"
                  style={globalLoading ? { display: "none" } : undefined}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
                    <TabsList className="grid w-full max-w-md grid-cols-2 bg-card/80 backdrop-blur-sm border border-border/50 p-1 h-12">
                      <TabsTrigger value="rental" className="font-semibold">Aluguel</TabsTrigger>
                      <TabsTrigger value="purchase" className="relative font-semibold">
                        Compras
                        {totalItems > 0 && (
                          <span className="absolute -top-2 -right-2">
                            <Badge
                              variant="secondary"
                              className="h-6 min-w-6 rounded-full px-2 py-0 text-[11px] font-semibold shadow-sm"
                            >
                              {totalItems}
                            </Badge>
                          </span>
                        )}
                      </TabsTrigger>
                    </TabsList>

                    <div className="flex items-center gap-2">
                      <Sheet open={cartOpen} onOpenChange={setCartOpen}>
                        <SheetTrigger asChild>
                          <Button variant="outline" size="icon" className="relative h-11 w-11">
                            <ShoppingCart className="h-5 w-5" />
                            {totalItems > 0 && (
                              <span className="absolute -top-1 -right-1">
                                <Badge
                                  variant="secondary"
                                  className="h-6 min-w-6 rounded-full px-2 py-0 text-[11px] font-semibold shadow-sm"
                                >
                                  {totalItems}
                                </Badge>
                              </span>
                            )}
                          </Button>
                        </SheetTrigger>
                        <SheetContent
                          side="right"
                          className="w-full sm:max-w-lg md:max-w-xl h-[100dvh] overflow-hidden border-l border-border/50 bg-card/95 backdrop-blur-sm p-0"
                        >
                          <div className="flex h-full flex-col">
                            <SheetHeader className="px-6 pt-6 pb-4 border-b border-border/50">
                              <SheetTitle className="font-display text-2xl font-semibold">Carrinho</SheetTitle>
                              <SheetDescription>Revise seus itens e finalize o pedido.</SheetDescription>
                            </SheetHeader>
                            <div className="flex-1 overflow-y-auto px-6 py-6">
                              <CartSummary
                                cartItems={cartItems}
                                onUpdateQuantity={updateCartQuantity}
                                onPurchased={(buyerName, items) => {
                                  setCartOpen(false);
                                  setLastBuyerName(buyerName);
                                  if (items.length > 0) {
                                    items.forEach((it) => enqueueRatingPrompt({ type: "product", id: it.id, name: it.name }));
                                    const first = items[0];
                                    const prompt = { type: "product" as const, id: first.id, name: first.name };
                                    setTimeout(() => {
                                      showRatingToast(prompt, {
                                        onSubmit: async (rating, comment) => {
                                          try {
                                            await submitUserRating({ targetType: "PRODUCT", targetId: prompt.id, rating, comment });
                                            toast.success("Obrigado pela sua avaliação!");
                                          } catch (e) {
                                            toast.error("Não foi possível enviar sua avaliação.");
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
                            </div>
                          </div>
                        </SheetContent>
                      </Sheet>

                      <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
                        <SheetTrigger asChild>
                          <Button variant="outline" size="icon" className="h-11 w-11" onClick={() => setHistoryOpen(true)} aria-label="Abrir histórico">
                            <History className="h-5 w-5" />
                          </Button>
                        </SheetTrigger>
                        <SheetContent
                          side="right"
                          className="w-full sm:max-w-lg md:max-w-xl h-[100dvh] overflow-hidden border-l border-border/50 bg-card/95 backdrop-blur-sm p-0"
                        >
                          <div className="flex h-full flex-col">
                            <SheetHeader className="px-6 pt-6 pb-4 border-b border-border/50">
                              <SheetTitle className="font-display text-2xl font-semibold">Histórico</SheetTitle>
                              <SheetDescription>Compras e aluguéis do usuário.</SheetDescription>
                            </SheetHeader>
                            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
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

                            <Tabs value={historyTab} onValueChange={(v) => setHistoryTab(v as "orders" | "rentals")} className="w-full">
                              <div className="sticky top-0 z-10 bg-card/80 backdrop-blur-sm py-2">
                                <TabsList className="grid w-full max-w-md grid-cols-2 bg-card/70 backdrop-blur-sm border border-border/50 p-1 h-12">
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
                                  onCancel={async (id: string | number) => {
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
                        setRentalOrders((prev) => [{ dto, itemName }, ...prev]);
                        refreshUserRentals(renterName, customerPhone);
                        const rentalTargetId = String(dto?.productId ?? dto?.rentalItemId ?? "");
                        const prompt = { type: "rental" as const, id: rentalTargetId, name: itemName };
                        enqueueRatingPrompt(prompt);
                        setTimeout(() => {
                          showRatingToast(prompt, {
                            onSubmit: async (rating, comment) => {
                              try {
                                await submitUserRating({ targetType: "RENTAL", targetId: prompt.id, rating, comment });
                                toast.success("Obrigado pela sua avaliação!");
                              } catch (e) {
                                toast.error("Não foi possível enviar sua avaliação.");
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
                        return rid || undefined;
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
                        return pid || undefined;
                      })()}
                    />
                  </TabsContent>
                </Tabs>
              }
            />
            <Route
              path="rental/:id"
              element={
                <RentalProductDetail
                  onBooked={({ dto, itemName, renterName, customerPhone }) => {
                    setLastRenterName(renterName);
                    setLastPhone(customerPhone);
                    setRentalOrders((prev) => [{ dto, itemName }, ...prev]);
                    refreshUserRentals(renterName, customerPhone);
                    const rentalTargetId = String(dto?.productId ?? dto?.rentalItemId ?? "");
                    const prompt = { type: "rental" as const, id: rentalTargetId, name: itemName };
                    enqueueRatingPrompt(prompt);
                    setTimeout(() => {
                      showRatingToast(prompt, {
                        onSubmit: async (rating, comment) => {
                          try {
                            await submitUserRating({ targetType: "RENTAL", targetId: prompt.id, rating, comment });
                            toast.success("Obrigado pela sua avaliação!");
                          } catch (e) {
                            toast.error("Não foi possível enviar sua avaliação.");
                          } finally {
                            dequeueRatingPrompt(prompt.id);
                          }
                        },
                        onClose: () => dequeueRatingPrompt(prompt.id),
                      });
                    }, 300);
                  }}
                />
              }
            />
            <Route
              path="product/:id"
              element={
                <SaleProductDetail
                  onAddToCart={(item, qty) => {
                    addToCart(item, qty);
                  }}
                />
              }
            />
          </Routes>
        </div>
        </section>
      </main>

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
