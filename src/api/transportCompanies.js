import api from "./client";

export async function listTransportCompanies() {
  const response = await api.get("/api/v1/transport-companies");
  return response.data;
}

export async function getTransportCompany(companyId) {
  const response = await api.get(`/api/v1/transport-companies/${companyId}`);
  return response.data;
}

export async function createTransportCompany(payload) {
  const response = await api.post("/api/v1/transport-companies", payload);
  return response.data;
}

export async function updateTransportCompany(companyId, payload) {
  const response = await api.put(
    `/api/v1/transport-companies/${companyId}`,
    payload
  );

  return response.data;
}

export async function activateTransportCompany(companyId) {
  const response = await api.patch(
    `/api/v1/transport-companies/${companyId}/activate`
  );

  return response.data;
}

export async function deactivateTransportCompany(companyId) {
  const response = await api.patch(
    `/api/v1/transport-companies/${companyId}/deactivate`
  );

  return response.data;
}

export async function deleteTransportCompany(companyId) {
  const response = await api.delete(`/api/v1/transport-companies/${companyId}`);
  return response.data;
}