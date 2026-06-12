import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  Sun,
  Moon,
  Calendar,
  User,
  Fish,
  LogIn,
  UserPlus,
  LogOut,
  Settings,
  Package,
  Heart,
  MapPin,
  Shield,
  Bell,
  HelpCircle,
  Headphones,
  ArrowRightLeft,
  Menu,
} from "lucide-react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Link, Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import logo from "@/assets/logo.jpg";
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface HeaderProps {
  transparent?: boolean;
  // Escopo de busca: 'events' | 'rental' | 'purchase' | 'hosting' | 'home'.
  // Se não fornecido, será inferido pela rota atual.
  searchScope?: "events" | "rental" | "purchase" | "hosting" | "home";
}

const Header = ({ transparent = false, searchScope }: HeaderProps) => {
  const { theme, setTheme } = useTheme();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdminValidated, setIsAdminValidated] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [profile, setProfile] = useState<{
    nome?: string;
    email?: string;
    telefone?: string;
  }>({});
  const location = useLocation();
  const navigate = useNavigate();

  const authEmail = useMemo(() => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem("auth_email");
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setIsLoggedIn(
      !!(
        window.localStorage.getItem("auth_token") ||
        window.localStorage.getItem("auth_access_token")
      ),
    );
  }, []);

  useEffect(() => {
    let mounted = true;
    const validateAdmin = async () => {
      if (typeof window === "undefined") return;
      const token =
        window.localStorage.getItem("auth_token") ||
        window.localStorage.getItem("auth_access_token");
      if (!token) {
        if (mounted) setIsAdminValidated(false);
        return;
      }
      try {
        await api.get("/api/auth/admin-check");
        if (mounted) setIsAdminValidated(true);
      } catch {
        if (mounted) setIsAdminValidated(false);
      }
    };
    if (isLoggedIn) {
      validateAdmin();
    } else {
      setIsAdminValidated(false);
    }
    return () => {
      mounted = false;
    };
  }, [isLoggedIn]);

  const fetchProfile = async () => {
    if (!authEmail) return;
    try {
      setLoadingProfile(true);
      const { data } = await api.get("/user/usuarios/me", {
        params: { email: authEmail },
      });
      // Backend fields may be: nome, email, telefone
      setProfile({
        nome: data?.nome ?? data?.name ?? "",
        email: data?.email ?? authEmail ?? "",
        telefone: data?.telefone ?? data?.phone ?? "",
      });
    } catch (err) {
      toast.error("Não foi possível carregar seu perfil.");
    } finally {
      setLoadingProfile(false);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      fetchProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn]);

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const handleLogout = () => {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem("auth_token");
    window.localStorage.removeItem("auth_access_token");
    window.localStorage.removeItem("auth_refresh_token");
    window.localStorage.removeItem("auth_email");
    window.localStorage.removeItem("auth_role");
    toast.success("Você saiu da sua conta.");
    window.location.assign("/auth/");
  };

  const handleSwitchToAdminFrontend = () => {
    if (!isAdminValidated) return;
    const target = String(import.meta.env.VITE_ADMIN_APP_URL ?? "/admin/");
    window.location.assign(target || "/admin/");
  };

  // ===== Busca em tempo real =====
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Array<{ id: string | number; name: string; image?: string; type: "event" | "rental" | "product" | "room" }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const inferredScope: "events" | "home" | "rental" | "purchase" | "hosting" = (() => {
    if (searchScope) return searchScope;
    const path = location.pathname || "";
    if (path === "/" || path === "") return "home";
    if (path.startsWith("/events")) return "events";
    if (path.startsWith("/store")) return "rental"; 
    if (path.startsWith("/hospedagem")) return "hosting";
    return "home";
  })();

  const handleSearchSubmit = () => {
    const q = query.trim();
    if (!q) return;
    if (inferredScope === "events") {
      navigate(`/events?q=${encodeURIComponent(q)}`);
    } else if (inferredScope === "rental") {
      navigate(`/store?tab=rental&q=${encodeURIComponent(q)}`);
    } else if (inferredScope === "purchase") {
      navigate(`/store?tab=purchase&q=${encodeURIComponent(q)}`);
    } else if (inferredScope === "hosting") {
      navigate(`/hospedagem/rooms?q=${encodeURIComponent(q)}`);
    } else {
      // home: por padrão enviar para eventos
      navigate(`/events?q=${encodeURIComponent(q)}`);
    }
    setShowSuggestions(false);
  };

  const normalizeText = (value: string) => {
    return value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  };

  const fetchEventSuggestions = async (q: string) => {
    try {
      const { data } = await api.get("/events", {
        params: { name: q, page: 1, limit: 8, status: "ALL" },
      });
      const arr = Array.isArray(data?.items) ? data.items : [];
      return arr.slice(0, 8).map((e: any) => ({
        id: String(e.id),
        name: String(e.title ?? "Evento"),
        image:
          (Array.isArray(e.images) ? e.images?.[0] : undefined) ||
          (typeof e.imageUrl === "string" ? e.imageUrl : undefined) ||
          "https://placehold.co/64x64?text=E",
        type: "event" as const,
      }));
    } catch {
      return [];
    }
  };

  const fetchRentalSuggestions = async (q: string) => {
    try {
      const { data } = await api.get("/user/products/rental", { params: { search: q, limit: 8 } });
      const arr = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
      const filtered = arr.filter((i: any) => String(i.name ?? "").toLowerCase().includes(q.toLowerCase()));
      return filtered.slice(0, 8).map((i: any) => ({
        id: i.id,
        name: String(i.name ?? "Aluguel"),
        image: i.image || i.images?.[0] || "https://placehold.co/64x64?text=A",
        type: "rental" as const,
      }));
    } catch {
      return [];
    }
  };

  const fetchProductSuggestions = async (q: string) => {
    try {
      const { data } = await api.get("/user/products/sale", { params: { search: q, limit: 8 } });
      const arr = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
      const filtered = arr.filter((i: any) => String(i.name ?? "").toLowerCase().includes(q.toLowerCase()));
      return filtered.slice(0, 8).map((i: any) => ({
        id: i.id,
        name: String(i.name ?? "Produto"),
        image: i.image || i.images?.[0] || "https://placehold.co/64x64?text=P",
        type: "product" as const,
      }));
    } catch {
      return [];
    }
  };

  const roomsCacheRef = useRef<{ data: any[]; fetchedAt: number } | null>(null);
  const roomImageCacheRef = useRef<Map<string, string>>(new Map());

  const fetchRoomSuggestions = async (q: string) => {
    const needle = normalizeText(q);
    const now = Date.now();
    try {
      const cached = roomsCacheRef.current;
      const shouldRefetch = !cached || now - cached.fetchedAt > 1000 * 60 * 5;
      const list = shouldRefetch
        ? (await api.get("/api/chales")).data
        : cached.data;
      const arr = Array.isArray(list) ? list : [];
      if (shouldRefetch) {
        roomsCacheRef.current = { data: arr, fetchedAt: now };
      }

      const matches = arr.filter((item: any) => {
        const haystack = [
          item?.name,
          item?.description,
          item?.unitType,
          item?.type,
          ...(Array.isArray(item?.amenities) ? item.amenities : []),
          ...(Array.isArray(item?.extras) ? item.extras : []),
          ...(Array.isArray(item?.characteristics) ? item.characteristics : []),
        ]
          .filter(Boolean)
          .map((v: any) => normalizeText(String(v)));
        return haystack.some((v: string) => v.includes(needle));
      });

      const top = matches.slice(0, 8);

      const resolved = await Promise.all(
        top.map(async (item: any) => {
          const id = String(item?.id ?? "");
          const images = Array.isArray(item?.images) ? item.images : [];
          const first = images?.[0];
          const listImage =
            typeof first === "string"
              ? first
              : typeof first?.imageUrl === "string"
                ? first.imageUrl
                : undefined;

          if (listImage) {
            return {
              id,
              name: String(item?.name ?? "Quarto"),
              image: listImage,
              type: "room" as const,
            };
          }

          const cachedImage = id ? roomImageCacheRef.current.get(id) : undefined;
          if (cachedImage) {
            return {
              id,
              name: String(item?.name ?? "Quarto"),
              image: cachedImage,
              type: "room" as const,
            };
          }

          const imagesCount = Number(item?.imagesCount ?? 0);
          if (!id || imagesCount <= 0) {
            return {
              id: id || item?.id,
              name: String(item?.name ?? "Quarto"),
              image: "https://placehold.co/64x64?text=H",
              type: "room" as const,
            };
          }

          try {
            const { data: detail } = await api.get(`/api/chales/${id}`);
            const detailImages = Array.isArray(detail?.images) ? detail.images : [];
            const firstDetail = detailImages?.[0];
            const imageUrl =
              typeof firstDetail === "string"
                ? firstDetail
                : typeof firstDetail?.imageUrl === "string"
                  ? firstDetail.imageUrl
                  : undefined;

            if (imageUrl) {
              roomImageCacheRef.current.set(id, imageUrl);
            }

            return {
              id,
              name: String(item?.name ?? "Quarto"),
              image: imageUrl || "https://placehold.co/64x64?text=H",
              type: "room" as const,
            };
          } catch {
            return {
              id,
              name: String(item?.name ?? "Quarto"),
              image: "https://placehold.co/64x64?text=H",
              type: "room" as const,
            };
          }
        }),
      );

      return resolved;
    } catch {
      return [];
    }
  };

  useEffect(() => {
    let timeout: number | undefined;
    const run = async () => {
      const q = query.trim();
      if (!q) {
        setSuggestions([]);
        setShowSuggestions(false);
        setIsSearching(false);
        return;
      }
      setIsSearching(true);
      // Busca por escopo
      if (inferredScope === "events") {
        const ev = await fetchEventSuggestions(q);
        setSuggestions(ev);
      } else if (inferredScope === "rental") {
        const [rn, ev] = await Promise.all([fetchRentalSuggestions(q), fetchEventSuggestions(q)]);
        const combined: typeof suggestions = [];
        const max = 12;
        let i = 0;
        while (combined.length < max && (rn[i] || ev[i])) {
          if (rn[i]) combined.push(rn[i]);
          if (ev[i]) combined.push(ev[i]);
          i++;
        }
        setSuggestions(combined);
      } else if (inferredScope === "purchase") {
        const [pr, ev] = await Promise.all([fetchProductSuggestions(q), fetchEventSuggestions(q)]);
        const combined: typeof suggestions = [];
        const max = 12;
        let i = 0;
        while (combined.length < max && (pr[i] || ev[i])) {
          if (pr[i]) combined.push(pr[i]);
          if (ev[i]) combined.push(ev[i]);
          i++;
        }
        setSuggestions(combined);
      } else if (inferredScope === "hosting") {
        const [rm, ev] = await Promise.all([fetchRoomSuggestions(q), fetchEventSuggestions(q)]);
        const combined: typeof suggestions = [];
        const max = 12;
        let i = 0;
        while (combined.length < max && (rm[i] || ev[i])) {
          if (rm[i]) combined.push(rm[i]);
          if (ev[i]) combined.push(ev[i]);
          i++;
        }
        setSuggestions(combined);
      } else {
        // home: agregar
        const [ev, rn, pr, rm] = await Promise.all([
          fetchEventSuggestions(q),
          fetchRentalSuggestions(q),
          fetchProductSuggestions(q),
          fetchRoomSuggestions(q),
        ]);
        // limitar total a 12, intercalando
        const combined: typeof suggestions = [];
        const max = 12;
        let i = 0;
        while (combined.length < max && (ev[i] || rn[i] || pr[i] || rm[i])) {
          if (ev[i]) combined.push(ev[i]);
          if (rn[i]) combined.push(rn[i]);
          if (pr[i]) combined.push(pr[i]);
          if (rm[i]) combined.push(rm[i]);
          i++;
        }
        setSuggestions(combined);
      }
      setShowSuggestions(true);
      setIsSearching(false);
    };
    timeout = window.setTimeout(run, 300);
    return () => {
      if (timeout) window.clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, inferredScope]);

  // Sincroniza a busca com a rota de eventos enquanto digita
  useEffect(() => {
    if (inferredScope !== "events") return;
    const q = query.trim();
    const params = new URLSearchParams(location.search);
    const currentQ = params.get("q") || "";
    let timeout: number | undefined;
    timeout = window.setTimeout(() => {
      if (q && q !== currentQ) {
        navigate(`/events?q=${encodeURIComponent(q)}`, { replace: true });
      }
      if (!q && currentQ) {
        // limpa q quando o campo for esvaziado
        params.delete("q");
        navigate({ pathname: "/events", search: params.toString() ? `?${params.toString()}` : "" }, { replace: true });
      }
    }, 300);
    return () => { if (timeout) window.clearTimeout(timeout); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, inferredScope, location.search]);

  const handleSuggestionClick = (s: { id: string | number; type: "event" | "rental" | "product" | "room" }) => {
    // Navega com parâmetros para abrir modal correspondente
    if (s.type === "event") {
      navigate(`/events?eventId=${s.id}`);
    } else if (s.type === "rental") {
      navigate(`/store?tab=rental&rentalId=${s.id}`);
    } else if (s.type === "room") {
      navigate(`/hospedagem/rooms/${s.id}`);
    } else {
      navigate(`/store?tab=purchase&productId=${s.id}`);
    }
    setShowSuggestions(false);
  };

  const requestPasswordChange = async () => {
    if (!authEmail) {
      toast.error("Não foi possível identificar seu e-mail.");
      return;
    }
    try {
      await api.post(`/auth/request-password-change`, null, { params: { email: authEmail } });
      toast.success("Enviamos um e-mail com o link para trocar a senha.");
      setAccountOpen(false);
    } catch (err) {
      toast.error("Falha ao solicitar troca de senha.");
    }
  };
  const getInitials = (name?: string) => {
    if (!name) return "U";
    const parts = name.trim().split(/\s+/);
    const first = parts[0]?.[0] ?? "U";
    const last = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
    return (first + last).toUpperCase();
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-colors ${
        transparent
          ? "bg-transparent text-white border-transparent backdrop-blur-0 shadow-none"
          : "bg-navbar text-navbar-foreground border-b border-border/40 backdrop-blur-sm shadow-sm"
      }`}
    >

      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link to="/">
          <div className="flex items-center space-x-3">
            <img src={logo} alt="DuZé Pesqueiro Logo" className="h-10 w-10 rounded-md shadow-md" />
            <h1 className="text-xl font-semibold tracking-wide">DuZé Pesqueiro</h1>
          </div>
        </Link>

        {/* Navigation */}
        <nav className="hidden min-[769px]:flex items-center space-x-8">
          <RouterLink
            to="/events"
            className="font-medium hover:text-[#F2C14E] transition-colors duration-200"
          >
            Eventos
          </RouterLink>
          <RouterLink
            to="/store"
            className="font-medium hover:text-[#F2C14E] transition-colors duration-200"
          >
            Loja
          </RouterLink>
          <RouterLink
            to="/hospedagem/home"
            className="font-medium hover:text-[#F2C14E] transition-colors duration-200"
          >
            Hospedagem
          </RouterLink>
          <RouterLink
            to="/about"
            className="font-medium hover:text-[#F2C14E] transition-colors duration-200"
          >
            Sobre
          </RouterLink>
        </nav>

        {/* Right Side Controls */}
        <div className="hidden min-[769px]:flex items-center space-x-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/70" />
            <Input
              type="search"
              placeholder="Buscar..."
              className="pl-10 w-64 bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:ring-2 focus:ring-[#F2C14E]"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => query.trim() && setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSearchSubmit();
                }
              }}
            />
            {showSuggestions && (
              <div
                className={`absolute left-0 right-0 mt-2 w-64 rounded-md border shadow-xl z-50 bg-popover text-popover-foreground border-border`}
                role="listbox"
              >
                {isSearching && (
                  <div className="px-3 py-2 text-sm text-muted-foreground">Buscando...</div>
                )}
                {!isSearching && suggestions.length === 0 && (
                  <div className="px-3 py-2 text-sm text-muted-foreground">Nenhum resultado</div>
                )}
                {!isSearching && suggestions.map((s) => (
                  <button
                    key={`${s.type}:${s.id}`}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-accent hover:text-accent-foreground text-left"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleSuggestionClick(s)}
                  >
                    <img src={s.image} alt={s.name} className="h-8 w-8 rounded-full object-cover ring-1 ring-border" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{s.type === "event" ? "Evento" : s.type === "rental" ? "Aluguel" : s.type === "product" ? "Produto" : "Hospedagem"}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* User account */}
          <HoverCard>
            <HoverCardTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full text-white hover:text-[#F2C14E] hover:bg-transparent">
                <User className="h-5 w-5" />
              </Button>
            </HoverCardTrigger>
            <HoverCardContent className="w-56 bg-white text-black shadow-xl border border-gray-200" align="end">
              <div className="flex flex-col gap-2">
                {!isLoggedIn ? (
                  <>
                    <Button
                      variant="ghost"
                      className="justify-start gap-2 w-full"
                      onClick={() => {
                        const target = String(import.meta.env.VITE_AUTH_APP_URL ?? '');
                        if (target) {
                          window.location.assign(target);
                        } else {
                          toast.info("Abra o app de autenticação para fazer login.");
                        }
                      }}
                    >
                      <LogIn className="h-4 w-4" />
                      Entrar
                    </Button>
                    <Button
                      variant="ghost"
                      className="justify-start gap-2 w-full"
                      onClick={() => {
                        const target = String(import.meta.env.VITE_AUTH_APP_URL ?? '');
                        if (target) {
                          window.location.assign(target);
                        } else {
                          toast.info("Abra o app de autenticação para registrar.");
                        }
                      }}
                    >
                      <UserPlus className="h-4 w-4" />
                      Registrar
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      className="justify-start gap-2 w-full"
                      onClick={() => setAccountOpen(true)}
                    >
                      <Settings className="h-4 w-4" />
                      Conta
                    </Button>
                    <Separator />
                    <Button
                      variant="ghost"
                      className="justify-start gap-2 w-full text-destructive hover:text-destructive"
                      onClick={handleLogout}
                    >
                      <LogOut className="h-4 w-4" />
                      Sair
                    </Button>
                  </>
                )}
              </div>
            </HoverCardContent>
          </HoverCard>

          {/* Theme Toggle */}
          {isAdminValidated && (
            <Button
              variant="outline"
              size="icon"
              onClick={handleSwitchToAdminFrontend}
              aria-label="Trocar para frontend de administrador"
              className={
                transparent
                  ? "border-white/20 bg-blue/10 text-white hover:bg-white/10 hover:text-[#F2C14E]"
                  : "border-border bg-background/80 text-foreground hover:bg-accent hover:text-accent-foreground"
              }
            >
              <ArrowRightLeft className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="outline"
            size="icon"
            onClick={toggleTheme}
            className="border-white/20 bg-blue/10 text-white hover:bg-white/10 hover:text-[#F2C14E]"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>

        {/* Mobile Menu */}
        <Button
          variant="outline"
          size="icon"
          className="min-[769px]:hidden ml-2 bg-navbar-foreground/10 border-navbar-foreground/30 text-navbar-foreground active:bg-navbar-foreground/20"
          onClick={() => setMobileMenuOpen(true)}
        >
          <Menu className="h-4 w-4" />
        </Button>
      </div>

      {/* Mobile Navigation Sheet */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent
          side="left"
          className="w-[85vw] sm:max-w-xs flex flex-col h-full"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <SheetHeader className="text-left">
            <SheetTitle>Menu</SheetTitle>
            <SheetDescription>Navegue pelo DuZé Pesqueiro</SheetDescription>
          </SheetHeader>

          <div className="mt-6 flex flex-col gap-6 flex-1 overflow-y-auto">
            {/* Mobile Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar..."
                className="pl-10 w-full"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSearchSubmit();
                    setMobileMenuOpen(false);
                  }
                }}
              />
            </div>

            {/* Navigation Links */}
            <nav className="flex flex-col gap-3">
              <RouterLink
                to="/events"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2 text-lg font-medium active:bg-accent focus-visible:bg-accent rounded-md transition-colors"
              >
                <Calendar className="h-5 w-5" />
                Eventos
              </RouterLink>
              <RouterLink
                to="/store"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2 text-lg font-medium active:bg-accent focus-visible:bg-accent rounded-md transition-colors"
              >
                <Package className="h-5 w-5" />
                Loja
              </RouterLink>
              <RouterLink
                to="/hospedagem/home"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2 text-lg font-medium active:bg-accent focus-visible:bg-accent rounded-md transition-colors"
              >
                <MapPin className="h-5 w-5" />
                Hospedagem
              </RouterLink>
              <div className="-mt-1 pl-11">
                <RouterLink
                  to="/hospedagem/rooms"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 text-base font-medium text-muted-foreground active:bg-accent focus-visible:bg-accent rounded-md transition-colors"
                >
                  Quartos
                </RouterLink>
                <RouterLink
                  to="/hospedagem/my-reservations"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 text-base font-medium text-muted-foreground active:bg-accent focus-visible:bg-accent rounded-md transition-colors"
                >
                  Minhas reservas
                </RouterLink>
              </div>
              <RouterLink
                to="/about"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2 text-lg font-medium active:bg-accent focus-visible:bg-accent rounded-md transition-colors"
              >
                <HelpCircle className="h-5 w-5" />
                Sobre
              </RouterLink>
            </nav>

            <Separator />

            {/* User & Theme Actions */}
            <div className="flex flex-col gap-3">
              <Button 
                variant="ghost" 
                className="justify-start gap-3 px-3 text-lg font-medium"
                onClick={() => {
                  setMobileMenuOpen(false);
                  toggleTheme();
                }}
              >
                {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                {theme === "dark" ? "Modo Claro" : "Modo Escuro"}
              </Button>

              {isAdminValidated && (
                <Button
                  variant="ghost"
                  className="justify-start gap-3 px-3 text-lg font-medium"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleSwitchToAdminFrontend();
                  }}
                >
                  <ArrowRightLeft className="h-5 w-5" />
                  Administração
                </Button>
              )}

              <Button
                variant="ghost"
                className="justify-start gap-3 px-3 text-lg font-medium"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setAccountOpen(true);
                }}
              >
                <User className="h-5 w-5" />
                Minha Conta
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Account Sheet (responsive) */}
      <Sheet open={accountOpen} onOpenChange={setAccountOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md h-[100dvh] max-h-[100dvh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Minha Conta</SheetTitle>
            <SheetDescription>Meus dados pessoais</SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {loadingProfile ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : (
              <>
                {/* Perfil resumido */}
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12 ring-2 ring-border/60">
                    <AvatarImage src={undefined} alt={profile.nome || "Usuário"} />
                    <AvatarFallback>{getInitials(profile.nome)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-base font-semibold">{profile.nome || "Seu nome"}</p>
                    <p className="text-sm text-muted-foreground">{profile.email || "email@exemplo.com"}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <Badge variant="secondary">Membro</Badge>
                      <Badge className="bg-primary/20 text-primary">Nível Bronze</Badge>
                    </div>
                  </div>
                </div>

                {/* Ações rápidas */}
                <div>
                  <p className="text-sm font-medium mb-3">Ações rápidas</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Button variant="outline" className="justify-start gap-2" onClick={() => { navigate("/store?history=orders"); setAccountOpen(false); }}>
                      <Package className="h-4 w-4" /> Meus pedidos
                    </Button>
                    <Button variant="outline" className="justify-start gap-2" onClick={() => toast.info("Em breve: Favoritos")}>
                      <Heart className="h-4 w-4" /> Favoritos
                    </Button>
                    <Button variant="outline" className="justify-start gap-2" onClick={() => { navigate("/store?history=rentals"); setAccountOpen(false); }}>
                      <MapPin className="h-4 w-4" /> Alugueis
                    </Button>
                    <Button
                      variant="outline"
                      className="justify-start gap-2"
                      onClick={() => {
                        navigate("/events?myEvents=1");
                        setAccountOpen(false);
                      }}
                    >
                      <Calendar className="h-4 w-4" /> Eventos
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Gestão da conta */}
                <div className="space-y-3">
                  <p className="text-sm font-medium">Minha conta</p>
                  <div className="space-y-2">
                    <Button variant="ghost" className="w-full justify-start gap-2">
                      <User className="h-4 w-4" /> Dados pessoais
                    </Button>
                    <Button variant="ghost" className="w-full justify-start gap-2" onClick={requestPasswordChange}>
                      <Shield className="h-4 w-4" /> Segurança (trocar senha)
                    </Button>
                    <Button variant="ghost" className="w-full justify-start gap-2" onClick={() => toast.info("Em breve: Notificações") }>
                      <Bell className="h-4 w-4" /> Notificações
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Suporte e ajuda */}
                <div className="space-y-3">
                  <p className="text-sm font-medium">Suporte</p>
                  <div className="space-y-2">
                    <Button variant="ghost" className="w-full justify-start gap-2" onClick={() => toast.info("Em breve: Ajuda") }>
                      <HelpCircle className="h-4 w-4" /> Ajuda
                    </Button>
                    <Button variant="ghost" className="w-full justify-start gap-2" onClick={() => toast.info("Em breve: Atendimento") }>
                      <Headphones className="h-4 w-4" /> Atendimento
                    </Button>
                    {/* Removido: Rastreamento */}
                  </div>
                </div>

                <Separator />

                {/* Ações finais */}
                <div className="flex flex-col gap-3">
                  <Button variant="destructive" className="w-full justify-center gap-2" onClick={handleLogout}>
                    <LogOut className="h-4 w-4" /> Sair
                  </Button>
                  <Button variant="outline" className="w-full" onClick={() => setAccountOpen(false)}>
                    Fechar
                  </Button>
                </div>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

    </header>

  );
};

export default Header;
