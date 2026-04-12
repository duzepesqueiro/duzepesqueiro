import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import heroLake from "@/assets/hero-lake.jpg";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { registerRequest, safeError } from "@/lib/api";
import PeixeAberto from "@/assets/peixe-aberto.png";
import PeixeFechado from "@/assets/peixe-fechado.png";


// API_BASE centralizado em @/lib/api

const Cadastro = () => {
  const [nome, setNome] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [documento, setDocumento] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmSenha, setConfirmSenha] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showSenha, setShowSenha] = useState(false);
  const [showConfirmSenha, setShowConfirmSenha] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Mascara/normaliza telefone: (##) #####-#### ou (##) ####-####
  const formatTelefone = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length === 0) return "";
    const ddd = digits.slice(0, 2);
    if (digits.length <= 2) return `(${ddd}`;
    if (digits.length <= 6) return `(${ddd}) ${digits.slice(2)}`;
    if (digits.length <= 10) return `(${ddd}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    return `(${ddd}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const strong = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{6,}$/;
    if (senha !== confirmSenha) {
      toast({ title: "Senhas diferentes", description: "As senhas não coincidem.", variant: "destructive" });
      return;
    }
    if (!strong.test(senha)) {
      toast({
        title: "Senha fraca",
        description: "A senha deve ter no mínimo 6 caracteres com letras maiúsculas, minúsculas, números e caracteres especiais.",
        variant: "destructive"
      });
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        username: username.trim(),
        email: email.trim(),
        password: senha,
        fullName: nome.trim(),
        phone: telefone.replace(/\D/g, "") || undefined,
        document: documento.replace(/\D/g, "") || undefined,
      };
      const resp = await registerRequest(payload);
      if (!resp.ok) {
        const msg = await safeError(resp);
        throw new Error(msg || `Erro ${resp.status}`);
      }
      toast({ title: "Cadastro realizado", description: "Enviamos um código para confirmar seu e-mail." });
      navigate("/verificar-email", { state: { email } });
    } catch (err: any) {
      toast({ title: "Falha no cadastro", description: err?.message || "Tente novamente.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background com overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${heroLake})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/95 via-primary/85 to-secondary/90 backdrop-blur-[2px]" />
      </div>

      {/* Conteúdo */}
      <div className="relative z-10 w-full md:w-1/2 mx-auto">
        <div className="text-center mb-8 space-y-2">
          <h1 className="text-4xl md:text-5xl font-bold text-white drop-shadow-lg">
            DuZé Pesqueiro
          </h1>
          <p className="text-white/90 text-lg">
            Crie sua conta e faça parte da nossa comunidade
          </p>
        </div>

        <Card className="w-full shadow-2xl border-white/20 bg-white/95 backdrop-blur-sm">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Criar Conta</CardTitle>
            <CardDescription className="text-center">
              Preencha seus dados para se cadastrar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Coluna Esquerda */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome Completo</Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="Seu nome"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      required
                      className="transition-all duration-300 focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="username">Nome de Usuário</Label>
                    <Input
                      id="username"
                      type="text"
                      placeholder="seu.usuario"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      className="transition-all duration-300 focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="transition-all duration-300 focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="document">CPF (opcional)</Label>
                    <Input
                      id="document"
                      type="text"
                      value={documento}
                      onChange={(e) => setDocumento(e.target.value)}
                      placeholder="Apenas números"
                      className="transition-all duration-300 focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                {/* Coluna Direita */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="(00) 00000-0000"
                      inputMode="numeric"
                      pattern="\(\d{2}\) \d{4,5}-\d{4}"
                      title="Formato: (99) 99999-9999"
                      maxLength={15}
                      value={telefone}
                      onChange={(e) => setTelefone(formatTelefone(e.target.value))}
                      className="transition-all duration-300 focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div className="space-y-2 relative">
                    <Label htmlFor="password">Senha</Label>
                    <Input
                      id="password"
                      type={showSenha ? "text" : "password"}
                      placeholder="Mínimo 6 caracteres"
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      required
                      className="transition-all duration-300 focus:ring-2 focus:ring-primary"
                    />
                    <button
                      type="button"
                      aria-label={showSenha ? "Ocultar senha" : "Mostrar senha"}
                      onClick={() => setShowSenha((v) => !v)}
                      className="absolute right-3 top-10 hover:opacity-80 transition-all"
                    >
                      <img
                        src={showSenha ? PeixeAberto : PeixeFechado}
                        alt={showSenha ? "Ocultar senha" : "Mostrar senha"}
                        className="w-6 h-6 object-contain"
                      />
                    </button>
                  </div>
                  <div className="space-y-2 relative">
                    <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                    <Input
                      id="confirmPassword"
                      type={showConfirmSenha ? "text" : "password"}
                      placeholder="Digite a senha novamente"
                      value={confirmSenha}
                      onChange={(e) => setConfirmSenha(e.target.value)}
                      required
                      className="transition-all duration-300 focus:ring-2 focus:ring-primary"
                    />
                    <button
                      type="button"
                      aria-label={showConfirmSenha ? "Ocultar senha" : "Mostrar senha"}
                      onClick={() => setShowConfirmSenha((v) => !v)}
                      className="absolute right-3 top-9 text-muted-foreground hover:text-foreground"
                    >
                      <img
                        src={showConfirmSenha ? PeixeAberto : PeixeFechado}
                        alt={showConfirmSenha ? "Ocultar senha" : "Mostrar senha"}
                        className="w-6 h-6 object-contain"
                      />
                    </button>
                  </div>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-all duration-300 shadow-lg hover:shadow-xl"
                disabled={submitting}
              >
                {submitting ? "Registrando..." : "Criar Conta"}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">Já tem uma conta? </span>
              <Link 
                to="/" 
                className="text-primary font-semibold hover:underline transition-all"
              >
                Fazer login
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Cadastro;

// safeError agora centralizado em @/lib/api
