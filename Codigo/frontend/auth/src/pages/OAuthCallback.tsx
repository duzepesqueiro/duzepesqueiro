import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { clearSession } from "@/lib/api";

export default function OAuthCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const error = params.get("error");
    clearSession();
    if (error) {
      toast({
        title: "Acesso não permitido",
        description:
          error === "google_role_not_allowed"
            ? "Login com Google é permitido apenas para usuário comum."
            : "Falha na autenticação com Google.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Fluxo inválido",
        description: "Use o botão de login com Google na tela de autenticação.",
        variant: "destructive",
      });
    }
    navigate("/", { replace: true });
  }, [navigate, params, toast]);

  return null;
}
