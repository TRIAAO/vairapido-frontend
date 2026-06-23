import api from "./client";

export async function listRoutes() {
  const response = await api.get("/api/v1/routes");
  return response.data;
}

export async function getRoute(routeId) {
  const response = await api.get(`/api/v1/routes/${routeId}`);
  return response.data;
}

export async function createRoute(payload) {
  const response = await api.post("/api/v1/routes", payload);
  return response.data;
}

export async function updateRoute(routeId, payload) {
  const response = await api.put(`/api/v1/routes/${routeId}`, payload);
  return response.data;
}

export async function activateRoute(routeId) {
  const response = await api.patch(`/api/v1/routes/${routeId}/activate`);
  return response.data;
}

export async function deactivateRoute(routeId) {
  const response = await api.patch(`/api/v1/routes/${routeId}/deactivate`);
  return response.data;
}

export async function deleteRoute(routeId) {
  const response = await api.delete(`/api/v1/routes/${routeId}`);
  return response.data;
}