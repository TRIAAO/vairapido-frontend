import api from "./client";

function normalizeList(data) {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.content)) {
    return data.content;
  }

  if (Array.isArray(data?.items)) {
    return data.items;
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  return [];
}

export async function listPassengers() {
  const response = await api.get("/api/v1/passengers");
  return normalizeList(response.data);
}

export async function getPassenger(passengerId) {
  const response = await api.get(`/api/v1/passengers/${passengerId}`);
  return response.data;
}

export async function createPassenger(payload) {
  const response = await api.post("/api/v1/passengers", payload);
  return response.data;
}

export async function updatePassenger(passengerId, payload) {
  const response = await api.put(`/api/v1/passengers/${passengerId}`, payload);
  return response.data;
}

export async function deletePassenger(passengerId) {
  await api.delete(`/api/v1/passengers/${passengerId}`);
}
