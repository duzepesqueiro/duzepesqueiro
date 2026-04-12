const configuredBase = (import.meta as any).env?.VITE_API_BASE_URL || "/api";
const sanitizedBase = configuredBase.replace(/\/+$/, "");

export const API_BASE = sanitizedBase || "/api";

export type BackendRole = "ADMIN" | "MANAGER" | "EMPLOYEE" | "CUSTOMER";

export type LoginRequest = {
  email: string;
  password: string;
};

export type RegisterRequest = {
  username: string;
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  document?: string;
};

export type ConfirmEmailRequest = {
  token: string;
};

export type ForgotPasswordRequest = {
  email: string;
};

export type ResetPasswordRequest = {
  token: string;
  newPassword: string;
};

export type SessionData = {
  accessToken: string;
  refreshToken: string;
  role: BackendRole;
  email: string;
};

export type LoginResponse = {
  user: {
    id: string;
    username?: string;
    email?: string;
    fullName?: string;
    role: BackendRole;
  };
  accessToken: string;
  refreshToken: string;
};

export type RegisterResponse = {
  user: {
    id: string;
    username?: string;
    email?: string;
    fullName?: string;
    role: BackendRole;
  };
  requiresEmailConfirmation: boolean;
  confirmationToken?: string;
};

export type ConfirmEmailResponse = LoginResponse;

function normalizePath(path: string): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const baseHasApi = API_BASE.endsWith("/api") || API_BASE === "/api";
  if (baseHasApi) {
    return cleanPath.replace(/^\/api(?=\/|$)/, "");
  }
  return cleanPath;
}

async function requestJson<T>(
  method: "GET" | "POST" | "PATCH",
  path: string,
  body?: unknown,
  init?: RequestInit,
): Promise<Response> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(init?.headers || {}),
  };

  const resp = await fetch(`${API_BASE}${normalizePath(path)}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    ...init,
  });
  return resp;
}

export async function postJson(path: string, body: any, init?: RequestInit) {
  return requestJson("POST", path, body, init);
}

export async function postVoid(path: string, init?: RequestInit) {
  return requestJson("POST", path, undefined, init);
}

export async function safeError(resp: Response): Promise<string | undefined> {
  try {
    const data = await resp.json();
    if (Array.isArray(data?.message)) {
      return data.message.join(", ");
    }
    return (data && (data.message || data.error)) as string | undefined;
  } catch {
    return undefined;
  }
}

export async function parseJson<T>(resp: Response): Promise<T> {
  return (await resp.json()) as T;
}

export async function loginRequest(payload: LoginRequest): Promise<Response> {
  return postJson("/auth/login", payload);
}

export async function registerRequest(payload: RegisterRequest): Promise<Response> {
  return postJson("/auth/register", payload);
}

export async function confirmEmailRequest(payload: ConfirmEmailRequest): Promise<Response> {
  return postJson("/auth/confirm-email", payload);
}

export async function resendConfirmationRequest(payload: ForgotPasswordRequest): Promise<Response> {
  return postJson("/auth/resend-confirmation", payload);
}

export async function forgotPasswordRequest(payload: ForgotPasswordRequest): Promise<Response> {
  return postJson("/auth/forgot-password", payload);
}

export async function resetPasswordRequest(payload: ResetPasswordRequest): Promise<Response> {
  return postJson("/auth/reset-password", payload);
}

export async function refreshTokenRequest(refreshToken: string): Promise<Response> {
  return postJson("/auth/refresh", { refreshToken });
}

export function setSession(session: SessionData): void {
  localStorage.setItem("auth_token", session.accessToken);
  localStorage.setItem("auth_access_token", session.accessToken);
  localStorage.setItem("auth_refresh_token", session.refreshToken);
  localStorage.setItem("auth_role", session.role);
  localStorage.setItem("auth_email", session.email);
}

export function clearSession(): void {
  localStorage.removeItem("auth_token");
  localStorage.removeItem("auth_access_token");
  localStorage.removeItem("auth_refresh_token");
  localStorage.removeItem("auth_role");
  localStorage.removeItem("auth_email");
}

export async function ensureValidSession(): Promise<boolean> {
  const accessToken = localStorage.getItem("auth_token");
  const refreshToken = localStorage.getItem("auth_refresh_token");
  if (!accessToken || !refreshToken) {
    return false;
  }

  const meResp = await fetch(`${API_BASE}${normalizePath("/auth/me")}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (meResp.ok) {
    return true;
  }
  if (meResp.status !== 401) {
    return false;
  }

  const refreshResp = await refreshTokenRequest(refreshToken);
  if (!refreshResp.ok) {
    clearSession();
    return false;
  }
  const refreshed = await parseJson<LoginResponse>(refreshResp);
  if (!refreshed?.accessToken || !refreshed?.refreshToken || !refreshed?.user?.role) {
    clearSession();
    return false;
  }
  setSession({
    accessToken: refreshed.accessToken,
    refreshToken: refreshed.refreshToken,
    role: refreshed.user.role,
    email: refreshed.user.email || localStorage.getItem("auth_email") || "",
  });
  return true;
}
