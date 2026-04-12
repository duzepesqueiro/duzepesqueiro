import api from "./api";

export const listAdminSales = async () => {
  const response = await api.get("api/admin/vendas/sales");
  return response.data;
};

export const confirmAdminSale = async (id) => {
  const response = await api.post(`api/admin/vendas/sales/${id}/confirm`);
  return response.data;
};

export const cancelAdminSale = async (id) => {
  const response = await api.post(`api/admin/vendas/sales/${id}/cancel`);
  return response.data;
};