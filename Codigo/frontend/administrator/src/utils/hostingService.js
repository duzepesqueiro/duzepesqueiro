import api from "./api";

const CHALETS_BASE_PATH = "/api/chales";
const BLOCKS_BASE_PATH = "/api/bloqueios";
const RESERVATIONS_BASE_PATH = "/api/reservas";
const PRICING_RULES_BASE_PATH = "/api/precos/regras";

const cleanStringArray = (values) =>
  (Array.isArray(values) ? values : [])
    .map((item) => String(item || "").trim())
    .filter(Boolean);

const toChaletPayload = (chalet) => ({
  name: chalet?.name?.trim(),
  description: chalet?.description?.trim() || "",
  unitType: chalet?.unitType,
  status: chalet?.status,
  basePrice: Number(chalet?.basePrice) || 0,
  maxGuests: Number(chalet?.maxGuests) || 0,
  amenities: cleanStringArray(chalet?.amenities),
  rooms: cleanStringArray(chalet?.rooms),
  notes: chalet?.notes?.trim() || "",
});

const toBlockPayload = (block) => ({
  chaletId: block?.chaletId,
  dataInicio: block?.dataInicio,
  dataFim: block?.dataFim,
  reason: block?.reason,
  notes: block?.notes?.trim() || "",
  isActive: block?.isActive !== false,
});

const toManualReservationPayload = (reservation) => {
  const guests = Array.isArray(reservation?.guests) ? reservation.guests : [];
  const primaryGuest = guests[0] || {};
  return {
    chaletId: reservation?.chaletId,
    checkInDate: reservation?.checkInDate,
    checkOutDate: reservation?.checkOutDate,
    guestName: primaryGuest?.fullName || "",
    guestEmail: primaryGuest?.email || undefined,
    guestPhone: primaryGuest?.phone || undefined,
    adults: Number(reservation?.adults) || Math.max(guests.length, 1),
    children: Number(reservation?.children) || 0,
    vehiclePlate: reservation?.vehiclePlate?.trim() || undefined,
    notes: reservation?.notes?.trim() || undefined,
    guests: guests.map((guest, index) => ({
      fullName: guest?.fullName?.trim() || "",
      email: guest?.email?.trim() || undefined,
      phone: guest?.phone?.trim() || undefined,
      cpf: guest?.cpf?.trim() || undefined,
      isPrimary: index === 0,
    })),
  };
};

export const listChalets = async () => {
  const response = await api.get(CHALETS_BASE_PATH);
  return Array.isArray(response?.data) ? response.data : [];
};

export const getChaletById = async (id) => {
  const response = await api.get(`${CHALETS_BASE_PATH}/${id}`);
  return response?.data || null;
};

export const createChalet = async (chalet) => {
  const response = await api.post(CHALETS_BASE_PATH, toChaletPayload(chalet));
  return response.data;
};

export const updateChalet = async (id, chalet) => {
  const response = await api.put(`${CHALETS_BASE_PATH}/${id}`, toChaletPayload(chalet));
  return response.data;
};

export const deleteChalet = async (id) => {
  await api.delete(`${CHALETS_BASE_PATH}/${id}`);
};

export const uploadChaletImages = async (chaletId, imageFiles = []) => {
  const files = Array.from(imageFiles || []);
  if (!files.length) {
    return [];
  }
  const formData = new FormData();
  files.forEach((file) => {
    formData.append("images", file);
  });
  const response = await api.post(`${CHALETS_BASE_PATH}/${chaletId}/imagens`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return Array.isArray(response?.data) ? response.data : [];
};

export const deleteChaletImage = async (chaletId, imageId) => {
  await api.delete(`${CHALETS_BASE_PATH}/${chaletId}/imagens/${imageId}`);
};

export const listBlocks = async () => {
  const response = await api.get(BLOCKS_BASE_PATH);
  return Array.isArray(response?.data) ? response.data : [];
};

export const getHostingOccupancyMap = async ({ chaletId, referenceDate }) => {
  const params = {};
  if (chaletId) {
    params.chaleId = chaletId;
  }
  if (referenceDate) {
    params.dataReferencia =
      referenceDate instanceof Date ? referenceDate.toISOString() : referenceDate;
  }
  const response = await api.get("/api/dashboard/hospedagem/mapa", { params });
  return response?.data || null;
};

export const getHostingDashboardKpis = async ({ periodo, dataReferencia, chaleId } = {}) => {
  const params = {};
  if (periodo) {
    params.periodo = periodo;
  }
  if (dataReferencia) {
    params.dataReferencia =
      dataReferencia instanceof Date ? dataReferencia.toISOString() : dataReferencia;
  }
  if (chaleId) {
    params.chaleId = chaleId;
  }
  const response = await api.get("/api/dashboard/hospedagem/kpis", { params });
  return response?.data || null;
};

export const getHostingDashboardRevenue = async ({ periodo, dataReferencia, chaleId } = {}) => {
  const params = {};
  if (periodo) {
    params.periodo = periodo;
  }
  if (dataReferencia) {
    params.dataReferencia =
      dataReferencia instanceof Date ? dataReferencia.toISOString() : dataReferencia;
  }
  if (chaleId) {
    params.chaleId = chaleId;
  }
  const response = await api.get("/api/dashboard/hospedagem/receita", { params });
  return response?.data || null;
};

export const createBlock = async (block) => {
  const response = await api.post(BLOCKS_BASE_PATH, toBlockPayload(block));
  return response.data;
};

export const listReservations = async (params) => {
  const response = await api.get(RESERVATIONS_BASE_PATH, { params });
  return Array.isArray(response?.data) ? response.data : [];
};

export const getReservationById = async (reservationId) => {
  const response = await api.get(`${RESERVATIONS_BASE_PATH}/${reservationId}`);
  return response?.data || null;
};

export const createManualReservation = async (reservation) => {
  const response = await api.post(`${RESERVATIONS_BASE_PATH}/manual`, toManualReservationPayload(reservation));
  return response.data;
};

export const uploadReservationTermsPdf = async (file) => {
  const formData = new FormData();
  formData.append("file", file);
  const response = await api.post(`${RESERVATIONS_BASE_PATH}/termos/upload`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response?.data || null;
};

export const processReservationCheckIn = async (reservationId) => {
  const response = await api.post(`${RESERVATIONS_BASE_PATH}/${reservationId}/checkin`);
  return response?.data;
};

export const processReservationCheckOut = async (reservationId) => {
  const response = await api.post(`${RESERVATIONS_BASE_PATH}/${reservationId}/checkout`);
  return response?.data;
};

export const cancelReservation = async (reservationId, motivo) => {
  const response = await api.post(`${RESERVATIONS_BASE_PATH}/${reservationId}/cancelar`, { motivo });
  return response?.data;
};

export const registerReservationNoShow = async (reservationId) => {
  const response = await api.post(`${RESERVATIONS_BASE_PATH}/${reservationId}/no-show`);
  return response?.data;
};

export const listPricingRules = async (includeInactive = true) => {
  const response = await api.get(PRICING_RULES_BASE_PATH, {
    params: { includeInactive },
  });
  return Array.isArray(response?.data) ? response.data : [];
};

export const createPricingRule = async (rule) => {
  const response = await api.post(PRICING_RULES_BASE_PATH, rule);
  return response?.data;
};

export const updatePricingRule = async (id, rule) => {
  const response = await api.put(`${PRICING_RULES_BASE_PATH}/${id}`, rule);
  return response?.data;
};

export const togglePricingRule = async (id, isActive) => {
  const response = await api.patch(`${PRICING_RULES_BASE_PATH}/${id}/toggle`, { isActive });
  return response?.data;
};

export const deletePricingRule = async (id) => {
  await api.delete(`${PRICING_RULES_BASE_PATH}/${id}`);
};
