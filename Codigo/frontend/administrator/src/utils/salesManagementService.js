import api from "./api";

export const listAdminSales = async (params = {}) => {
  const response = await api.get("/api/admin/vendas/sales", { params });
  return response.data;
};

export const confirmAdminSale = async (id) => {
  const response = await api.post(`/api/admin/vendas/sales/${id}/confirm`);
  return response.data;
};

export const cancelAdminSale = async (id) => {
  const response = await api.post(`/api/admin/vendas/sales/${id}/cancel`);
  return response.data;
};

export const getAdminSale = async (id) => {
  const response = await api.get(`/api/admin/vendas/sales/${id}`);
  return response.data;
};

export const createAdminSale = async (payload) => {
  const response = await api.post(`/api/admin/vendas/sales`, payload);
  return response.data;
};

export const updateAdminSale = async (id, payload) => {
  const response = await api.patch(`/api/admin/vendas/sales/${id}`, payload);
  return response.data;
};
