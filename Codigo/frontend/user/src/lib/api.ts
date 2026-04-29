import axios from "axios";

const configuredBaseURL =
  typeof import.meta !== 'undefined' && (import.meta as any)?.env?.VITE_API_BASE_URL
    ? (import.meta as any).env.VITE_API_BASE_URL
    : "";
const baseURL = configuredBaseURL || "http://localhost:8080/api";

export const api = axios.create({
  baseURL,
});
const refreshClient = axios.create({ baseURL });
let isRefreshing = false;
let refreshQueue: Array<{ resolve: (token: string) => void; reject: (error: unknown) => void }> = [];

const clearSessionAndRedirect = () => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem("auth_token");
  window.localStorage.removeItem("auth_access_token");
  window.localStorage.removeItem("auth_refresh_token");
  window.localStorage.removeItem("auth_email");
  window.localStorage.removeItem("auth_role");
  const target = (import.meta as any)?.env?.VITE_AUTH_APP_URL || "/auth/";
  window.location.assign(target);
};

// Global loading tracking for UI overlays
let pendingRequests = 0;
const emitGlobalLoading = () => {
  try {
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('global-loading', { detail: { pending: pendingRequests } });
      window.dispatchEvent(event);
    }
  } catch {}
};

// Additional interceptors to manage global loading state
api.interceptors.request.use(
  (config) => {
    pendingRequests++;
    emitGlobalLoading();
    return config;
  },
  (error) => {
    pendingRequests = Math.max(0, pendingRequests - 1);
    emitGlobalLoading();
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    pendingRequests = Math.max(0, pendingRequests - 1);
    emitGlobalLoading();
    return response;
  },
  async (error) => {
    pendingRequests = Math.max(0, pendingRequests - 1);
    emitGlobalLoading();
    const originalRequest = error?.config as any;
    const status = error?.response?.status;
    if (!originalRequest || status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    const refreshToken = typeof window !== "undefined" ? localStorage.getItem("auth_refresh_token") : null;
    if (!refreshToken) {
      clearSessionAndRedirect();
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        refreshQueue.push({ resolve, reject });
      })
        .then((newToken) => {
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        })
        .catch((refreshErr) => Promise.reject(refreshErr));
    }

    isRefreshing = true;
    try {
      const refreshResponse = await refreshClient.post("/auth/refresh", { refreshToken });
      const newAccessToken = refreshResponse?.data?.accessToken;
      const newRefreshToken = refreshResponse?.data?.refreshToken;
      const newRole = refreshResponse?.data?.user?.role;
      const newEmail = refreshResponse?.data?.user?.email;
      if (!newAccessToken || !newRefreshToken) {
        throw new Error("Invalid refresh response");
      }

      localStorage.setItem("auth_token", newAccessToken);
      localStorage.setItem("auth_access_token", newAccessToken);
      localStorage.setItem("auth_refresh_token", newRefreshToken);
      if (newRole) {
        localStorage.setItem("auth_role", String(newRole).trim().toUpperCase());
      }
      if (newEmail) {
        localStorage.setItem("auth_email", newEmail);
      }

      refreshQueue.forEach(({ resolve }) => resolve(newAccessToken));
      refreshQueue = [];

      originalRequest.headers = originalRequest.headers || {};
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      return api(originalRequest);
    } catch (refreshErr) {
      refreshQueue.forEach(({ reject }) => reject(refreshErr));
      refreshQueue = [];
      clearSessionAndRedirect();
      return Promise.reject(refreshErr);
    } finally {
      isRefreshing = false;
    }
  }
);

export const getPendingRequests = () => pendingRequests;
api.interceptors.request.use(
  (config) => {
    if (typeof config.url === 'string') {
      const normalizedBase = (config.baseURL || '').replace(/\/+$/, '');
      const baseHasApiPrefix = normalizedBase.endsWith('/api') || normalizedBase === '/api';
      if (baseHasApiPrefix) {
        config.url = config.url.replace(/^\/api(?=\/|$)/, '');
      }
    }
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    if (token) {
      const headers = (config.headers ?? {}) as any;
      headers.Authorization = `Bearer ${token}`;
      config.headers = headers;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const getUserRentals = async (name?: string, phone?: string) => {
  const res = await api.get("/rentals/bookings");
  const items = Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data) ? res.data : [];
  return items.map((item: any) => ({
    id: item.id,
    rentalItemId: item.productId ?? item.rentalItemId,
    renterName: name || item.renterName || "Cliente",
    quantity: item.quantity,
    startDate: item.rentalDate?.slice?.(0, 10) || item.checkOutAt?.slice?.(0, 10) || item.startDate || item.createdAt?.slice?.(0, 10) || "",
    endDate: item.returnDate?.slice?.(0, 10) || item.checkInAt?.slice?.(0, 10) || item.endDate || item.createdAt?.slice?.(0, 10) || "",
    startTime: item.rentalDate ?? item.checkOutAt ?? undefined,
    endTime: item.returnDate ?? item.checkInAt ?? undefined,
    totalPrice: Number(item.subtotal ?? item.totalPrice ?? 0),
    status: item.status,
    createdAt: item.createdAt,
    returnTime: item.checkInAt ?? item.returnTime,
  }));
};

export const cancelRental = async (id: string | number) => {
  const res = await api.patch(`/rentals/bookings/${id}/cancel`);
  return res.data?.data ?? res.data;
};

export const getUserOrders = async (name?: string) => {
  const params = name ? { name } : {};
  const res = await api.get(`/user/loja/meus`, { params });
  return res.data;
};

export const cancelOrder = async (id: string | number) => {
  const res = await api.delete(`/user/loja/orders/${id}`);
  return res.data;
};

export const updateRental = async (id: string | number, payload: any) => {
  const newEndDate = payload?.newEndDate || payload?.endTime || payload?.endDate || payload?.returnDate;
  if (!newEndDate) {
    throw new Error('Informe a nova data de devolucao para atualizar o aluguel.');
  }
  const res = await api.patch(`/rentals/bookings/${id}/extend`, { newEndDate });
  return res.data?.data ?? res.data;
};

export const getUserProfile = async (): Promise<{
  id?: string;
  nome?: string;
  email?: string;
  telefone?: string;
} | null> => {
  const email = typeof window !== 'undefined' ? window.localStorage.getItem('auth_email') : null;
  const token = typeof window !== 'undefined' ? window.localStorage.getItem('auth_token') : null;
  // Evita chamadas não autenticadas que geram 401 no console
  if (!email || !token) return null;
  try {
    const { data } = await api.get('/user/usuarios/me', { params: { email } });
    return {
      id: (data?.id ?? undefined) as string | undefined,
      nome: data?.nome ?? data?.name ?? '',
      email: data?.email ?? email ?? '',
      telefone: data?.telefone ?? data?.phone ?? '',
    };
  } catch {
    // Em caso de 401 ou erro, retorna null sem quebrar o fluxo
    return null;
  }
};

export const submitUserRating = async (params: {
  targetType: 'PRODUCT' | 'RENTAL' | 'EVENT';
  targetId: string | number;
  rating: number;
  comment?: string;
}) => {
  const profile = await getUserProfile();
  if (!profile?.email) {
    throw new Error('Usuário não autenticado para enviar avaliação');
  }
  const res = await api.post('/user/ratings', {
    userEmail: profile.email,
    targetType: params.targetType,
    targetId: params.targetId,
    rating: params.rating,
    comment: params.comment,
  });
  return res.data;
};
