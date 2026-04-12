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

// Helpers para buscar dados base
async function fetchSales() {
  const res = await api.get("/api/admin/vendas/sales");
  return Array.isArray(res?.data) ? res.data : [];
}

async function fetchItems() {
  const res = await api.get("/api/admin/vendas/items");
  return Array.isArray(res?.data) ? res.data : [];
}

export const getSalesKpis = async () => {
  return safeRequest(
    (async () => {
      const sales = await fetchSales();
      const totalRevenue = sales.reduce((sum, s) => sum + (s?.totalPrice || 0), 0);
      const totalOrders = sales.length;
      const avgOrderValue = totalOrders ? (totalRevenue / totalOrders) : 0;

      // Progresso e metas simples (placeholder baseado em receita)
      const monthlyTarget = 10000; // ajuste conforme sua meta
      const progress = Math.round(Math.min(100, (totalRevenue / monthlyTarget) * 100));

      const kpis = [
        {
          id: "revenue",
          iconBg: "bg-primary/10",
          icon: "DollarSign",
          iconColor: "text-primary",
          change: 12.5,
          type: "currency",
          value: Math.round(totalRevenue),
          label: "Receita Total",
          period: "último mês",
          target: `Meta: R$ ${monthlyTarget.toLocaleString("pt-BR")}`,
          progress,
        },
        {
          id: "orders",
          iconBg: "bg-secondary/10",
          icon: "ShoppingCart",
          iconColor: "text-secondary",
          change: 8.2,
          type: "number",
          value: totalOrders,
          label: "Pedidos",
          period: "último mês",
          target: "Meta: 250",
          progress: Math.round(Math.min(100, (totalOrders / 250) * 100)),
        },
        {
          id: "aov",
          iconBg: "bg-accent/10",
          icon: "CreditCard",
          iconColor: "text-accent",
          change: 3.4,
          type: "currency",
          value: Math.round(avgOrderValue),
          label: "Ticket Médio",
          period: "último mês",
          target: "Meta: R$ 80",
          progress: Math.round(Math.min(100, (avgOrderValue / 80) * 100)),
        },
        {
          id: "growth",
          iconBg: "bg-warning/10",
          icon: "TrendingUp",
          iconColor: "text-warning",
          change: 5.1,
          type: "number",
          value: 12, // taxa de crescimento simulada
          label: "Crescimento (%)",
          period: "vs. mês anterior",
          target: "Meta: 15%",
          progress: 80,
        },
      ];

      return { data: kpis };
    })(),
    { data: [] }
  );
};

export const getSalesPerformance = async () => {
  return safeRequest(
    (async () => {
      const [sales, items] = await Promise.all([fetchSales(), fetchItems()]);
      const itemCostMap = new Map(items.map(i => [i?.id, i?.unitCost || 0]));

      // Agrupar por dia
      const byDay = new Map();
      for (const s of sales) {
        const date = s?.createdAt ? new Date(s.createdAt) : null;
        if (!date || isNaN(date.getTime())) continue;
        const key = date.toISOString().slice(0, 10); // YYYY-MM-DD
        const revenue = s?.totalPrice || 0;
        const unitCost = itemCostMap.get(s?.saleItemId) || 0;
        const cost = (s?.quantity || 0) * unitCost;
        const marginPct = revenue > 0 ? ((revenue - cost) / revenue) * 100 : 0;
        const prev = byDay.get(key) || { revenue: 0, profitMarginSum: 0, count: 0 };
        prev.revenue += revenue;
        prev.profitMarginSum += marginPct;
        prev.count += 1;
        byDay.set(key, prev);
      }

      const chartData = Array.from(byDay.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([period, agg]) => ({
          period,
          revenue: Math.round(agg.revenue),
          profitMargin: Number((agg.profitMarginSum / (agg.count || 1)).toFixed(1)),
        }));

      return { data: chartData };
    })(),
    { data: [] }
  );
};

export const getTopProducts = async () => {
  return safeRequest(
    (async () => {
      const [sales, items] = await Promise.all([fetchSales(), fetchItems()]);
      const byItem = new Map();

      const itemInfo = new Map(items.map(i => [i?.id, i]));

      for (const s of sales) {
        const id = s?.saleItemId;
        const info = itemInfo.get(id) || {};
        const revenue = s?.totalPrice || 0;
        const qty = s?.quantity || 0;
        const cost = qty * (info?.unitCost || 0);
        const marginPct = revenue > 0 ? ((revenue - cost) / revenue) * 100 : 0;
        const prev = byItem.get(id) || {
          id,
          name: s?.productName || info?.product || info?.name || "Produto",
          category: info?.category || "",
          image: info?.image || "",
          revenue: 0,
          quantity: 0,
          profitMarginSum: 0,
          count: 0,
        };
        prev.revenue += revenue;
        prev.quantity += qty;
        prev.profitMarginSum += marginPct;
        prev.count += 1;
        byItem.set(id, prev);
      }

      const productsData = Array.from(byItem.values()).map(p => ({
        id: p.id,
        name: p.name,
        category: p.category,
        image: p.image,
        revenue: Math.round(p.revenue),
        quantity: p.quantity,
        profitMargin: Number((p.profitMarginSum / (p.count || 1)).toFixed(1)),
        change: 0, // placeholder
      }));

      return { data: productsData };
    })(),
    { data: [] }
  );
};

export const getCustomerAnalytics = async () => {
  return safeRequest(
    api.get('/api/admin/sales/analytics/customers'),
    { data: { customerData: [], segmentData: [] } }
  );
};
