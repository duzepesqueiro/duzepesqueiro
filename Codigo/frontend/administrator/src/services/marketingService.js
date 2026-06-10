import api from "../utils/api";

export const listMarketingRecipients = async (params) => {
  return api.get("/api/admin/marketing/recipients", { params });
};

export const sendMarketingCampaign = async (payload) => {
  return api.post("/api/admin/marketing/campaigns/send", payload);
};

