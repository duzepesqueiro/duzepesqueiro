import api from "./api";

export const getInventoryItems = async (filters) => {
  const search = typeof filters?.search === "string" ? filters.search.trim() : "";
  const params = search ? { search } : undefined;
  const response = await api.get('/admin/inventory/items', { params });
  return response.data;
};

export const getInventoryKpis = async () => {
  const response = await api.get('/admin/estoque/kpis');
  return response.data;
};

export const getInventoryHeatmap = async () => {
  const response = await api.get('/admin/estoque/heatmap');
  return response.data;
};

export const getReorderSuggestions = async () => {
  const response = await api.get('/admin/estoque/sugestoes-reposicao');
  return response.data;
};

export const getSupplierPerformance = async () => {
  const response = await api.get('/admin/estoque/fornecedores/performance');
  return response.data;
};

export const listSuppliers = async (search = '') => {
  const params = { page: 1, limit: 100 };
  if (search?.trim()) {
    params.search = search.trim();
  }
  const response = await api.get('/suppliers', { params });
  return response.data;
};

export const createSupplier = async (payload) => {
  const response = await api.post('/suppliers', payload);
  return response.data;
};

export const createSaleItem = async (item) => {
  const response = await api.post('/admin/vendas/items', item);
  return response.data;
};

export const updateSaleItem = async (id, item) => {
  const response = await api.put(`/admin/vendas/items/${id}`, item);
  return response.data;
};

export const uploadProductImage = async (productId, file) => {
  const formData = new FormData();
  formData.append('image', file);
  const response = await api.post(`/products/${productId}/image`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const uploadProductImages = async (productId, files) => {
  const formData = new FormData();
  Array.from(files || []).forEach((file) => {
    formData.append('images', file);
  });
  const response = await api.post(`/products/${productId}/images`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const deleteSaleItem = async (id) => {
  const response = await api.delete(`/admin/vendas/items/${id}`);
  return response.data;
};

export const seedSaleItems = async (items = []) => {
  const results = await Promise.allSettled(items.map((it) => createSaleItem(it)));
  const summary = {
    total: items.length,
    success: results.filter((r) => r.status === "fulfilled").length,
    failed: results.filter((r) => r.status === "rejected").length,
    errors: results
      .filter((r) => r.status === "rejected")
      .map((r) => r.reason?.response?.data || r.reason?.message),
  };
  return summary;
};
