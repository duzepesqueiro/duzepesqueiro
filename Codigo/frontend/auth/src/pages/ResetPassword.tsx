import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { resetPasswordRequest, safeError } from "@/lib/api";
import heroImage from "@/assets/hero-lake.jpg";
import DuzeLogo from "@/assets/DuZeImg.jpg";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [token, setToken] = useState(searchParams.get("token") || "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = useMemo(() => {
    return token.trim().length >= 10 && newPassword.length >= 6 && newPassword === confirmPassword && !submitting;
  }, [token, newPassword, confirmPassword, submitting]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) {
      return;
    }
    setSubmitting(true);
    try {
      const resp = await resetPasswordRequest({
        token: token.trim(),
        newPassword,
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
          <CardDescription>Informe o token recebido e sua nova senha.</CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="token">Token de recuperação</Label>
              <Input
                id="token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                required
                placeholder="Cole o token recebido"
              />
            </div>
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
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full h-11 text-base font-semibold" disabled={!canSubmit}>
              {submitting ? "Redefinindo..." : "Redefinir senha"}
            </Button>
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
