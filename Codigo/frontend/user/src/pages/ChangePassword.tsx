import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function ChangePassword() {
  const [email, setEmail] = useState<string>("");
  const [token, setToken] = useState<string>("");
  const [currentPassword, setCurrentPassword] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const qEmail = params.get("email");
      const qToken = params.get("token");
      if (qEmail) setEmail(qEmail);
      if (qToken) setToken(qToken);
      if (!qEmail || !qToken) {
        setError("Link inválido: parâmetro ausente.");
      }
    } catch {
      setError("Falha ao ler os parâmetros do link.");
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!email || !token) {
      setError("Link inválido ou expirado.");
      return;
    }
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("Preencha todos os campos.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("A confirmação da senha não coincide.");
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/auth/change-password", {
        email,
        token,
        currentPassword,
        newPassword,
      });
      setMessage("Senha atualizada com sucesso. Você já pode usar a nova senha.");
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "Falha ao atualizar senha.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-10">
      <div className="duze-container flex justify-center">
        <div className="w-full sm:max-w-md bg-white shadow rounded-md p-6">
          <h1 className="text-xl font-semibold mb-2">Trocar senha</h1>
          <p className="text-sm text-gray-600 mb-4">
            Insira sua senha atual, a nova senha e a confirmação.
          </p>

          {error && (
            <div className="mb-3 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
          {message && (
            <div className="mb-3 rounded border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-700">
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-sm text-gray-700 mb-1">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                placeholder="seu@email.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Senha atual</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                placeholder="Digite sua senha atual"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Nova senha</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                placeholder="Digite a nova senha"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Confirmar nova senha</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                placeholder="Confirme a nova senha"
                required
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded bg-blue-600 text-white px-4 py-2 text-sm hover:bg-blue-700 disabled:opacity-60"
            >
              {submitting ? "Confirmando..." : "Confirmar"}
            </button>
          </form>
          <p className="text-xs text-gray-500 mt-3">
            Este link expira após alguns minutos por segurança.
          </p>
        </div>
      </div>
    </div>
  );
}
