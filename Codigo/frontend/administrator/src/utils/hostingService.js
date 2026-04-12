import api from "./api";

const CHALETS_BASE_PATH = "/api/chales";
const BLOCKS_BASE_PATH = "/api/bloqueios";

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

export const listChalets = async () => {
  const response = await api.get(CHALETS_BASE_PATH);
  return Array.isArray(response?.data) ? response.data : [];
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

export const listBlocks = async () => {
  const response = await api.get(BLOCKS_BASE_PATH);
  return Array.isArray(response?.data) ? response.data : [];
};

export const createBlock = async (block) => {
  const response = await api.post(BLOCKS_BASE_PATH, toBlockPayload(block));
  return response.data;
};
