import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import {
  forgotPasswordRequest,
  resetPasswordRequest,
  safeError,
  verifyPasswordResetCodeRequest,
} from "@/lib/api";
import heroImage from "@/assets/hero-lake.jpg";
import DuzeLogo from "@/assets/DuZeImg.jpg";

export default function ResetPassword() {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const initialEmail = String((location.state as { email?: string } | null)?.email || "");
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [resetSessionToken, setResetSessionToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [step, setStep] = useState<"verify" | "reset">("verify");
  const [submittingCode, setSubmittingCode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resendingCode, setResendingCode] = useState(false);

  const canVerifyCode = useMemo(
    () => email.trim().includes("@") && /^\d{6}$/.test(code.trim()) && !submittingCode,
    [email, code, submittingCode],
  );
  const canResetPassword = useMemo(
    () =>
      resetSessionToken.trim().length > 0 &&
      newPassword.length >= 6 &&
      newPassword === confirmPassword &&
      !submitting,
    [resetSessionToken, newPassword, confirmPassword, submitting],
  );

  const handleCodeVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canVerifyCode) {
      return;
    }
    setSubmittingCode(true);
    try {
      const resp = await verifyPasswordResetCodeRequest({
        email: email.trim().toLowerCase(),
        code: code.trim(),
      });
      if (!resp.ok) {
        const msg = await safeError(resp);
        throw new Error(msg || `Erro ${resp.status}`);
      }
      const data = (await resp.json()) as { success: boolean; resetSessionToken?: string };
      if (!data?.resetSessionToken) {
        throw new Error("Não foi possível iniciar a sessão de redefinição.");
      }
      setResetSessionToken(data.resetSessionToken);
      setStep("reset");
      toast({
        title: "Código validado",
        description: "Agora informe e confirme sua nova senha.",
      });
    } catch (err: any) {
      toast({
        title: "Código inválido",
        description: err?.message || "Verifique o código e tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSubmittingCode(false);
    }
  };

  const handleResendCode = async () => {
    if (!email.trim().includes("@")) {
      toast({
        title: "Informe um e-mail válido",
        description: "Digite seu e-mail para reenviar o código.",
        variant: "destructive",
      });
      return;
    }
    setResendingCode(true);
    try {
      const resp = await forgotPasswordRequest({ email: email.trim().toLowerCase() });
      if (!resp.ok) {
        const msg = await safeError(resp);
        throw new Error(msg || `Erro ${resp.status}`);
      }
      toast({
        title: "Código reenviado",
        description: "Confira o seu e-mail para obter o novo código.",
      });
    } catch (err: any) {
      toast({
        title: "Falha ao reenviar",
        description: err?.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setResendingCode(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canResetPassword) {
      return;
    }
    setSubmitting(true);
    try {
      const resp = await resetPasswordRequest({
        resetSessionToken,
        newPassword,
        confirmPassword,
      });
      if (!resp.ok) {
        const msg = await safeError(resp);
        throw new Error(msg || `Erro ${resp.status}`);
      }
      toast({ title: "Senha redefinida", description: "Agora faça login com sua nova senha." });
      navigate("/");
    } catch (err: any) {
      toast({ title: "Falha ao redefinir", description: err?.message || "Tente novamente.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full relative flex items-center justify-center p-4">
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
          <CardTitle className="text-2xl font-bold">Redefinir Senha</CardTitle>
          <CardDescription>
            {step === "verify"
              ? "Informe seu e-mail e o código de 6 dígitos recebido."
              : "Agora defina e confirme sua nova senha."}
          </CardDescription>
        </CardHeader>

        <form onSubmit={step === "verify" ? handleCodeVerification : handleResetSubmit}>
          <CardContent className="space-y-4">
            {step === "verify" ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="seu@email.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="code">Código de verificação</Label>
                  <Input
                    id="code"
                    value={code}
                    onChange={(e) =>
                      setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    required
                    inputMode="numeric"
                    placeholder="Digite os 6 dígitos"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">Nova senha</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="Repita a nova senha"
                  />
                </div>
              </>
            )}
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            {step === "verify" ? (
              <>
                <Button
                  type="submit"
                  className="w-full h-11 text-base font-semibold"
                  disabled={!canVerifyCode}
                >
                  {submittingCode ? "Validando..." : "Validar código"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-11 text-base font-semibold"
                  onClick={handleResendCode}
                  disabled={resendingCode}
                >
                  {resendingCode ? "Reenviando..." : "Reenviar código"}
                </Button>
              </>
            ) : (
              <Button
                type="submit"
                className="w-full h-11 text-base font-semibold"
                disabled={!canResetPassword}
              >
                {submitting ? "Redefinindo..." : "Redefinir senha"}
              </Button>
            )}
            <div className="text-center text-sm text-muted-foreground">
              <Link to="/" className="text-primary hover:text-primary/80 font-semibold">
                Voltar ao login
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
