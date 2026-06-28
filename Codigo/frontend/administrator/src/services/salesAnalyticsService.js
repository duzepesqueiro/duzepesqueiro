import api from "../utils/api";

// Wrapper seguro para capturar erros de rede e retornar fallbacks estáveis
async function safeRequest(promise, fallback = { data: [] }) {
  try {
    const res = await promise;
    return res;
  } catch (err) {
    console.error("[salesAnalyticsService] request failed, returning fallback", err);
    // Garantir formato compatível com consumidores: objeto com .data
    return fallback;
  }
}

export const getSalesKpis = async (range = "month") => {
  return safeRequest(
    api.get("/api/admin/vendas/analytics/kpis", { params: { range } }),
    { data: { data: [] } }
  );
};

export const getSalesPerformance = async (range = "month") => {
  return safeRequest(
    api.get("/api/admin/vendas/analytics/performance", { params: { range } }),
    { data: { data: [] } }
  );
};

export const getTopProducts = async () => {
  return safeRequest(
    Promise.resolve({ data: [] }),
    { data: [] }
  );
};

export const getCustomerAnalytics = async (range = "month") => {
  return safeRequest(
    api.get('/api/admin/vendas/analytics/customers', { params: { range } }),
    { data: { data: { customerData: {}, segmentData: [] } } }
  );
};
