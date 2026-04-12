import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useToast } from "@/components/ui/use-toast";
import {
  type BackendRole,
  confirmEmailRequest,
  parseJson,
  resendConfirmationRequest,
  safeError,
  setSession,
  type ConfirmEmailResponse,
} from "@/lib/api";
import heroImage from "@/assets/hero-lake.jpg";
import DuzeLogo from "@/assets/DuZeImg.jpg";

type LocationState = { email?: string } | null;

export default function VerificarEmail() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as LocationState) || {};
  const email = state?.email || "";
  const { toast } = useToast();
  const USER_APP_URL: string = (import.meta as any).env?.VITE_USER_APP_URL || "/user/";
  const ADMIN_APP_URL: string = (import.meta as any).env?.VITE_ADMIN_APP_URL || "/admin/";

  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(30);

  const canSubmit = useMemo(() => code.replace(/\D/g, "").length === 6 && !submitting, [code, submitting]);
  const canResend = useMemo(() => secondsLeft === 0 && !resending && !!email, [secondsLeft, resending, email]);
  const resolveTargetByRole = (role: BackendRole) =>
    role === "ADMIN" || role === "MANAGER" || role === "EMPLOYEE"
      ? ADMIN_APP_URL
      : USER_APP_URL;

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const t = setInterval(() => setSecondsLeft((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [secondsLeft]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    if (!email) {
      toast({ title: "E-mail ausente", description: "Volte e informe seu e-mail.", variant: "destructive" });
      navigate("/");
      return;
    }
    setSubmitting(true);
    try {
      const resp = await confirmEmailRequest({ token: code.replace(/\D/g, "") });

      if (!resp.ok) {
        const msg = await safeError(resp);
        throw new Error(msg || `Erro ${resp.status}`);
      }
      const data = await parseJson<ConfirmEmailResponse>(resp);
      const role = data?.user?.role || "CUSTOMER";
      const emailToUse = data?.user?.email || email;
      setSession({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        role,
        email: emailToUse,
      });
      toast({ title: "Verificado com sucesso", description: "Sua conta foi ativada." });
      const targetBase = resolveTargetByRole(role);
      window.location.assign(targetBase);
    } catch (err: any) {
      toast({ title: "Falha ao verificar", description: err?.message || "Tente novamente.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    setResending(true);
    try {
      const resp = await resendConfirmationRequest({ email });
      if (!resp.ok) {
        const msg = await safeError(resp);
        throw new Error(msg || `Erro ${resp.status}`);
      }
      toast({ title: "Código reenviado", description: `Enviamos um novo código para ${email}.` });
      setSecondsLeft(30);
    } catch (err: any) {
      toast({ title: "Falha ao reenviar", description: err?.message || "Tente novamente.", variant: "destructive" });
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen w-full relative flex items-center justify-center p-4">
      {/* Background */}
      <div className="absolute inset-0 z-0 bg-cover bg-center" style={{ backgroundImage: `url(${heroImage})` }}>
        <div className="absolute inset-0 bg-gradient-to-br from-primary/95 via-primary/85 to-secondary/90" />
      </div>

      <Card className="w-full max-w-md relative z-10 shadow-2xl backdrop-blur-sm bg-card/95 border-border/50">
        <CardHeader className="space-y-3 text-center">
          <div className="flex justify-center mb-2">
            <div className="p-3 rounded-full bg-white/80 shadow-md">
              <img src={DuzeLogo} alt="Logo DuZé Pesqueiro" className="w-16 h-16 object-cover rounded-full" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Verificação de E-mail</CardTitle>
          <CardDescription>
            {email ? (
              <span>
                Enviamos um código de 6 dígitos para <span className="font-semibold text-foreground">{email}</span>.
              </span>
            ) : (
              <span>Informe seu e-mail e tente novamente.</span>
            )}
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-5">
            <div className="space-y-2 text-center">
              <Label htmlFor="otp" className="text-sm font-medium">
                Código de verificação
              </Label>
              <div className="flex justify-center">
                <InputOTP id="otp" maxLength={6} value={code} onChange={setCode} containerClassName="justify-center">
                  <InputOTPGroup>
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <InputOTPSlot key={i} index={i} className="w-12 h-12 text-lg" />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>
            </div>

            <div className="text-center text-sm text-muted-foreground">
              Não recebeu? {" "}
              <button
                type="button"
                onClick={handleResend}
                disabled={!canResend}
                className="text-primary hover:text-primary/80 disabled:opacity-50 font-semibold"
              >
                {resending ? "Reenviando..." : secondsLeft > 0 ? `Reenviar em ${secondsLeft}s` : "Reenviar código"}
              </button>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full h-11 text-base font-semibold" disabled={!canSubmit}>
              {submitting ? "Confirmando..." : "Confirmar"}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              Digitou o e-mail errado? {" "}
              <Link to="/" className="text-primary hover:text-primary/80 font-semibold">
                Trocar e-mail
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

