import api from "../utils/api";

export async function listRatings({ page = 0, size = 10, targetType, targetId, userEmail } = {}) {
  const params = { page, size };
  if (targetType) params.targetType = targetType;
  if (typeof targetId === 'number') params.targetId = targetId;
  if (userEmail && userEmail.trim()) params.userEmail = userEmail.trim();
  const res = await api.get("/api/admin/ratings", { params });
  return res?.data;
}

export async function updateRating(id, { rating, comment }) {
  const payload = {};
  if (typeof rating === 'number') payload.rating = rating;
  if (typeof comment === 'string') payload.comment = comment;
  const res = await api.put(`/api/admin/ratings/${id}`, payload);
  return res?.data;
}

export async function deleteRating(id) {
  const res = await api.delete(`/api/admin/ratings/${id}`);
  return res?.data;
}

