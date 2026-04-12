import api from "./api";

const EVENTS_BASE_PATH = "/api/admin/events";

const setParamIfDefined = (params, key, value) => {
  if (value === undefined || value === null || value === "") {
    return;
  }
  params[key] = value;
};

const appendIfDefined = (formData, key, value) => {
  if (value === undefined || value === null || value === "") {
    return;
  }
  formData.append(key, value);
};

const toEventFormData = (eventData, imageFiles = [], includeStatus = false) => {
  const formData = new FormData();
  appendIfDefined(formData, "title", eventData?.title?.trim());
  appendIfDefined(formData, "description", eventData?.description?.trim());
  appendIfDefined(formData, "rules", eventData?.rules?.trim());
  appendIfDefined(formData, "location", eventData?.location?.trim());
  appendIfDefined(formData, "totalSlots", eventData?.totalSlots);
  appendIfDefined(formData, "eventDate", eventData?.eventDate);
  appendIfDefined(formData, "eventTime", eventData?.eventTime);
  appendIfDefined(formData, "isPaid", eventData?.isPaid);
  if (eventData?.isPaid) {
    appendIfDefined(formData, "price", eventData?.price);
  } else {
    appendIfDefined(formData, "price", 0);
  }
  if (includeStatus) {
    appendIfDefined(formData, "status", eventData?.status);
  }
  imageFiles.forEach((file) => {
    formData.append("images", file);
  });
  return formData;
};

const buildListParams = (filters = {}) => {
  const params = {};
  setParamIfDefined(params, "title", filters.title);
  setParamIfDefined(params, "date", filters.date);
  setParamIfDefined(params, "time", filters.time);
  setParamIfDefined(params, "location", filters.location);
  setParamIfDefined(params, "participants", filters.participants);
  setParamIfDefined(params, "status", filters.status);
  setParamIfDefined(params, "page", filters.page);
  setParamIfDefined(params, "limit", filters.limit);
  return params;
};

export const getAllEvents = async (filters = {}) => {
  const response = await api.get(EVENTS_BASE_PATH, { params: buildListParams(filters) });
  return response.data;
};

export const getEventById = async (id) => {
  const response = await api.get(`${EVENTS_BASE_PATH}/${id}`);
  return response.data;
};

export const createEvent = async (eventData, imageFiles = []) => {
  const payload = toEventFormData(eventData, imageFiles, false);
  const response = await api.post(EVENTS_BASE_PATH, payload, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export const updateEvent = async (id, eventData, imageFiles = []) => {
  const payload = toEventFormData(eventData, imageFiles, true);
  const response = await api.patch(`${EVENTS_BASE_PATH}/${id}`, payload, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export const deleteEvent = async (id) => {
  await api.delete(`${EVENTS_BASE_PATH}/${id}`);
};

export const getEventKpis = async (params = {}) => {
  const response = await api.get("/api/admin/events/kpis/all", { params });
  return response.data;
};

export const getWeeklyEventsChart = async (params = {}) => {
  const response = await api.get("/api/admin/events/charts/weekly", { params });
  return response.data;
};

export const getMonthlyEventsChart = async (params = {}) => {
  const response = await api.get("/api/admin/events/charts/monthly", { params });
  return response.data;
};

export const getYearlyEventsChart = async (params = {}) => {
  const response = await api.get("/api/admin/events/charts/yearly", { params });
  return response.data;
};
