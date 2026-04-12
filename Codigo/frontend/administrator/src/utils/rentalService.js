import api from './api';

export const getRentalKpis = async () => {
  const res = await api.get('/admin/alugueis/kpis');
  return Array.isArray(res?.data) ? res.data : [];
};

export const getRentalHistory = async () => {
  const res = await api.get('/admin/alugueis/history');
  return Array.isArray(res?.data) ? res.data : [];
};

export const getRentalTimeline = async (range = 'today') => {
  const res = await api.get('/admin/alugueis/timeline', { params: { range } });
  return Array.isArray(res?.data) ? res.data : [];
};

export const returnRental = async (rentalId, payload = {}) => {
  const res = await api.patch(`/admin/alugueis/${rentalId}/return`, payload);
  return res?.data;
};

export const updateRentalCondition = async (rentalId, payload = {}) => {
  const res = await api.patch(`/admin/alugueis/${rentalId}/condition`, payload);
  return res?.data;
};

export const createRentalItem = async (item) => {
  try {
    console.group('[rentalService] createRentalItem');
    console.debug('payload', item);
    const response = await api.post('/admin/alugueis', item);
    console.debug('response status', response?.status);
    console.debug('response data', response?.data);
    console.groupEnd();
    return response.data;
  } catch (error) {
    console.group('[rentalService] createRentalItem ERROR');
    console.error('message', error?.message);
    console.error('status', error?.response?.status);
    console.error('data', error?.response?.data);
    console.error('config', error?.config);
    console.groupEnd();
    throw error;
  }
};
