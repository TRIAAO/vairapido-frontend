import api from "./client";

export async function listTransportCompanies() {
  const response = await api.get("/api/v1/transport-companies");
  return response.data;
}