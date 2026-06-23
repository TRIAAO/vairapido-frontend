import api from "./client";

export async function listTrips() {
  const response = await api.get("/api/v1/trips");
  return response.data;
}

export async function listTripsByCompany(companyId) {
  const response = await api.get(`/api/v1/trips/company/${companyId}`);
  return response.data;
}

export async function getTrip(tripId) {
  const response = await api.get(`/api/v1/trips/${tripId}`);
  return response.data;
}

export async function createTrip(payload) {
  const response = await api.post("/api/v1/trips", payload);
  return response.data;
}

export async function updateTrip(tripId, payload) {
  const response = await api.put(`/api/v1/trips/${tripId}`, payload);
  return response.data;
}

export async function activateTrip(tripId) {
  const response = await api.patch(`/api/v1/trips/${tripId}/activate`);
  return response.data;
}

export async function cancelTrip(tripId) {
  const response = await api.patch(`/api/v1/trips/${tripId}/cancel`);
  return response.data;
}

export async function completeTrip(tripId) {
  const response = await api.patch(`/api/v1/trips/${tripId}/complete`);
  return response.data;
}

export async function deleteTrip(tripId) {
  const response = await api.delete(`/api/v1/trips/${tripId}`);
  return response.data;
}