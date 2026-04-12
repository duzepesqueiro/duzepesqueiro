import api from "../utils/api";

// Lista todos os usuários (ADMIN)
export async function listUsers() {
  const res = await api.get("/api/admin/usuarios");
  return Array.isArray(res?.data) ? res.data : [];
}

// Buscar usuário logado por e-mail (USER/ADMIN)
export async function getUserByEmail(email) {
  const res = await api.get(`/api/user/usuarios/me`, { params: { email } });
  return res?.data;
}

// Criar usuário comum (USER)
export async function createUser(user) {
  const payload = normalizeUserCreatePayload({ ...user, isAdmin: false });
  if (!payload.email || !payload.nome || !payload.senha) {
    const err = new Error("Email, nome e senha são obrigatórios");
    err.response = { status: 400, data: { message: "Email, nome e senha são obrigatórios" } };
    throw err;
  }
  // Verifica duplicidade de e-mail no frontend para mensagem consistente
  try {
    const all = await listUsers();
    const dup = Array.isArray(all) && all.some(u => (u?.email || '').trim().toLowerCase() === (payload?.email || '').trim().toLowerCase());
    if (dup) {
      const err = new Error('E-mail já cadastrado');
      err.response = { status: 409, data: { message: 'E-mail já cadastrado' } };
      throw err;
    }
  } catch (_) {
    // Se falhar a verificação, segue com a criação e deixa o backend validar
  }
  const res = await api.post("/api/user/usuarios", payload);
  return res?.data;
}

// Criar usuário admin (ADMIN)
export async function createAdminUser(user) {
  const payload = normalizeUserCreatePayload({ ...user, isAdmin: true, emailConfirmado: true, ativo: true });
  // Verifica duplicidade de e-mail no frontend para mensagem consistente
  try {
    const all = await listUsers();
    const dup = Array.isArray(all) && all.some(u => (u?.email || '').trim().toLowerCase() === (payload?.email || '').trim().toLowerCase());
    if (dup) {
      const err = new Error('E-mail já cadastrado');
      err.response = { status: 409, data: { message: 'E-mail já cadastrado' } };
      throw err;
    }
  } catch (_) {
    // Se falhar a verificação, segue com a criação e deixa o backend validar
  }
  const res = await api.post("/api/admin/usuarios", payload);
  return res?.data;
}

// Criar usuário admin com senha definida (processo em duas etapas)
// 1) Registra o usuário via /api/auth/register para persistir passwordHash
// 2) Promove para ADMIN e marca emailConfirmado/ativo via /api/admin/usuarios/{id}
export async function createAdminUserWithPassword(user) {
  const email = (user?.email || "").trim().toLowerCase();
  const body = {
    email,
    nome: user?.nome || "",
    senha: user?.senha || "",
    telefone: user?.telefone || "",
    dataNascimento: user?.dataNascimento || null,
  };
  if (!body.email || !body.nome || !body.senha) {
    const err = new Error("Email, nome e senha são obrigatórios");
    err.response = { status: 400, data: { message: "Email, nome e senha são obrigatórios" } };
    throw err;
  }

  // Verifica duplicidade de e-mail para mensagem consistente
  try {
    const all = await listUsers();
    const dup = Array.isArray(all) && all.some(u => (u?.email || '').trim().toLowerCase() === email);
    if (dup) {
      const err = new Error('E-mail já cadastrado');
      err.response = { status: 409, data: { message: 'E-mail já cadastrado' } };
      throw err;
    }
  } catch (_) {
    // Se falhar a verificação, segue com o registro e deixa o backend validar
  }

  // Etapa 1: registrar usuário com senha
  const regRes = await api.post("/api/auth/register", body);
  const created = regRes?.data;
  const id = created?.id;
  if (!id) {
    const err = new Error("Falha ao registrar usuário");
    err.response = { status: 500, data: { message: "Falha ao registrar usuário" } };
    throw err;
  }

  // Etapa 2: promover para admin e ajustar flags
  const promotePayload = {
    isAdmin: true,
    admin: true,
    ativo: true,
  };
  const updRes = await api.put(`/api/admin/usuarios/${id}`, promotePayload);
  return updRes?.data;
}

// Atualizar usuário (ADMIN)
export async function updateUser(id, user) {
  const payload = normalizeUserUpdatePayload(user);
  const res = await api.put(`/api/admin/usuarios/${id}`, payload);
  return res?.data;
}

// Excluir usuário (ADMIN)
export async function deleteUser(id) {
  const res = await api.delete(`/api/admin/usuarios/${id}`);
  return res?.data;
}

// KPIs de usuários (ADMIN)
export async function getUsersKpis({ periodoDias = 30 } = {}) {
  const res = await api.get(`/api/admin/usuarios/kpis`, { params: { periodoDias } });
  return res?.data;
}

// Redefinir senha e enviar por e-mail (somente uso via admin UI)
// Usa endpoint de auth: gera uma nova senha forte e envia ao e-mail do usuário
export async function resetAdminPassword(email) {
  if (!email) throw new Error("E-mail obrigatório para redefinição de senha");
  const res = await api.post(`/api/auth/forgot-password`, null, { params: { email } });
  return res?.data;
}

function normalizeUserCreatePayload(u) {
  return {
    email: (u.email || "").trim().toLowerCase(),
    nome: u.nome || "",
    telefone: u.telefone || "",
    dataNascimento: u.dataNascimento || null,
    senha: u.senha || "",
    isAdmin: !!(u.isAdmin ?? u.admin),
    admin: !!(u.admin ?? u.isAdmin),
    ativo: u.ativo !== undefined ? !!u.ativo : true,
    emailConfirmado: u.emailConfirmado !== undefined ? !!u.emailConfirmado : false,
  };
}

function normalizeUserUpdatePayload(u) {
  return {
    isAdmin: !!(u.isAdmin ?? u.admin),
    admin: !!(u.admin ?? u.isAdmin),
    ativo: u.ativo !== undefined ? !!u.ativo : true,
  };
}
