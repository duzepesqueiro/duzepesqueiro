export const isAuthenticated = (): boolean => {
  if (typeof window === "undefined") return false;
  return !!window.localStorage.getItem("auth_token");
};

export const redirectToLogin = (pendingAction?: string) => {
  try {
    if (typeof window !== "undefined") {
      if (pendingAction) {
        window.localStorage.setItem("pending_action", pendingAction);
      }
      // Keep a hint of where the user was
      window.localStorage.setItem("return_url", window.location.href);
      window.localStorage.removeItem("auth_token");
      window.localStorage.removeItem("auth_access_token");
      window.localStorage.removeItem("auth_refresh_token");
      window.localStorage.removeItem("auth_role");
      window.localStorage.removeItem("auth_email");
    }
  } catch {}

  const target = (import.meta as any)?.env?.VITE_AUTH_APP_URL || "/auth/";
  window.location.assign(target);
};

export const consumePendingAction = (): string | null => {
  if (typeof window === "undefined") return null;
  const action = window.localStorage.getItem("pending_action");
  if (action) {
    try { window.localStorage.removeItem("pending_action"); } catch {}
  }
  return action;
};
