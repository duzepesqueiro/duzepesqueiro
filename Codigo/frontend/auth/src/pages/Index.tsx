import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import heroImage from "@/assets/hero-lake.jpg";
import DuzeLogo from "@/assets/DuZeImg.jpg";
import { useToast } from "@/components/ui/use-toast";
import {
  clearSession,
  ensureValidSession,
  forgotPasswordRequest,
  loginRequest,
  parseJson,
  safeError,
  setSession,
  type BackendRole,
  type LoginResponse,
} from "@/lib/api";
import PeixeAberto from "@/assets/peixe-aberto.png";
import PeixeFechado from "@/assets/peixe-fechado.png";

const Index = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const USER_APP_URL: string = (import.meta as any).env?.VITE_USER_APP_URL || "/user/";
  const ADMIN_APP_URL: string = (import.meta as any).env?.VITE_ADMIN_APP_URL || "/admin/";
  const googlePopupRef = useRef<Window | null>(null);

  const resolveTargetByRole = (role: BackendRole) =>
    role === "ADMIN" || role === "MANAGER" || role === "EMPLOYEE"
      ? ADMIN_APP_URL
      : USER_APP_URL;

  useEffect(() => {
    const bootstrap = async () => {
      const ok = await ensureValidSession();
      if (!ok) {
        return;
      }
      const role = (localStorage.getItem("auth_role") || "CUSTOMER").trim().toUpperCase() as BackendRole;
      const targetBase = resolveTargetByRole(role);
      window.location.assign(targetBase);
    };
    void bootstrap();
  }, []);

  const handleGoogleLogin = () => {
    clearSession();
    const width = 520;
    const height = 640;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    const popup = window.open(
      "/api/auth/google",
      "duze_google_oauth",
      `width=${width},height=${height},left=${left},top=${top},status=no,toolbar=no,menubar=no,location=no`,
    );
    googlePopupRef.current = popup;
    if (!popup) {
      toast({
        title: "Popup bloqueado",
        description: "Permita popups para concluir o login com Google.",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const resp = await loginRequest({ email, password });

      if (!resp.ok) {
        const msg = await safeError(resp);
        if (msg && msg.toLowerCase().includes("not confirmed")) {
          toast({ title: "Verifique seu e-mail", description: "Confirme seu e-mail para fazer login." });
          navigate("/verificar-email", { state: { email } });
          return;
        }
        throw new Error(msg || `Erro ${resp.status}`);
      }

      const data = await parseJson<LoginResponse>(resp);
      if (data?.accessToken && data?.refreshToken && data?.user?.role) {
        setSession({
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          role: data.user.role,
          email: data.user.email || email,
        });
      }
      const role = data?.user?.role || "CUSTOMER";
      const targetBase = resolveTargetByRole(role);
      const emailToUse = data?.user?.email || email;
      toast({ title: "Login efetuado", description: `Bem-vindo(a), ${emailToUse}.` });
      window.location.assign(targetBase);
    } catch (err: any) {
      toast({ title: "Falha no login", description: err?.message || "Tente novamente.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) {
        return;
      }
      const payload: any = event.data;
      if (!payload || payload.type !== "DUZE_AUTH_GOOGLE") {
        return;
      }
      if (payload.error) {
        clearSession();
        toast({
          title: "Falha no Google",
          description: payload.error,
          variant: "destructive",
        });
        try {
          googlePopupRef.current?.close();
        } catch {}
        return;
      }

      const token = String(payload.accessToken || "");
      const refreshToken = String(payload.refreshToken || "");
      const role = String(payload.role || "").trim().toUpperCase() as BackendRole;
      const email = String(payload.email || "");

      if (!token || !refreshToken || role !== "CUSTOMER") {
        clearSession();
        toast({
          title: "Falha no Google",
          description: "Autenticação inválida ou role não permitida.",
          variant: "destructive",
        });
        try {
          googlePopupRef.current?.close();
        } catch {}
        return;
      }

      setSession({ accessToken: token, refreshToken, role, email });
      toast({ title: "Login efetuado", description: "Bem-vindo(a)!" });
      try {
        googlePopupRef.current?.close();
      } catch {}
      window.location.assign(USER_APP_URL);
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [USER_APP_URL, toast]);

  const handleForgotPassword = async () => {
    if (!email || !email.includes("@")) {
      toast({ title: "Informe seu e-mail", description: "Digite seu e-mail para enviar a nova senha.", variant: "destructive" });
      return;
    }
    setSendingReset(true);
    try {
      const resp = await forgotPasswordRequest({ email });
      if (!resp.ok) {
        const msg = await safeError(resp);
        throw new Error(msg || `Erro ${resp.status}`);
      }
      const data = await parseJson<{ success: boolean; resetToken?: string }>(resp);
      if (data?.resetToken) {
        navigate(`/reset-password?token=${encodeURIComponent(data.resetToken)}`);
        toast({ title: "Token gerado", description: "Defina sua nova senha para concluir." });
        return;
      }
      toast({ title: "Solicitação enviada", description: "Verifique sua caixa de e-mail para redefinir sua senha." });
    } catch (err: any) {
      toast({ title: "Falha no envio", description: err?.message || "Tente novamente.", variant: "destructive" });
    } finally {
      setSendingReset(false);
    }
  };

  return (
    <div className="min-h-screen w-full relative flex items-center justify-center p-4">
      {/* Background Image with Overlay */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${heroImage})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/95 via-primary/85 to-secondary/90" />
      </div>

      {/* Login Card */}
      <Card className="w-full max-w-md relative z-10 shadow-2xl backdrop-blur-sm bg-card/95 border-border/50">
        <CardHeader className="space-y-3 text-center">
          <div className="flex justify-center mb-2">
            <div className="p-3 rounded-full bg-white/80 shadow-md">
              <img 
                src={DuzeLogo} 
                alt="Logo DuZé Pesqueiro" 
                className="w-16 h-16 object-cover rounded-full"
              />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold text-foreground">
            DuZé Pesqueiro
          </CardTitle>
          <CardDescription className="text-base text-muted-foreground">
            Faça login para acessar sua conta
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11 transition-all focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="space-y-2 relative">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium">
                  Senha
                </Label>
                <a 
                  href="#" 
                  onClick={(e) => { e.preventDefault(); if (!sendingReset) handleForgotPassword(); }}
                  className="text-sm text-primary hover:text-primary/80 transition-colors font-medium"
                >
                  {sendingReset ? "Enviando..." : "Esqueci minha senha"}
                </a>
              </div>
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-11 transition-all focus:ring-2 focus:ring-primary/20"
              />
              <button
                      type="button"
                      aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-10 hover:opacity-80 transition-all"
                    >
                      <img
                        src={showPassword ? PeixeAberto : PeixeFechado}
                        alt={showPassword ? "Ocultar senha" : "Mostrar senha"}
                        className="w-6 h-6 object-contain"
                      />
                    </button>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <Button 
              type="submit" 
              className="w-full h-11 text-base font-semibold bg-[#f2c14e] hover:bg-[#d9ad46] text-[#1a2832] shadow-md hover:shadow-lg transition-all"
              disabled={submitting}
            >
              {submitting ? "Entrando..." : "Entrar"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full h-11 text-base font-semibold"
              onClick={handleGoogleLogin}
            >
              Entrar com Google
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              Ainda não tem uma conta?{" "}
              <Link 
                to="/cadastro" 
                className="text-primary hover:text-primary/80 transition-colors font-semibold"
              >
                Criar conta
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>

      {/* Decorative Elements */}
      <div className="absolute bottom-8 left-8 text-white/60 text-sm hidden md:block">
        <p>© 2025 DuZé Pesqueiro</p>
      </div>
    </div>
  );
};

export default Index;
// safeError agora centralizado em @/lib/api
