import api from "./client";

export async function listAdminUsers() {
  const response = await api.get("/api/v1/admin/users");
  return response.data;
}

export async function getAdminUser(userId) {
  const response = await api.get(`/api/v1/admin/users/${userId}`);
  return response.data;
}

export async function createAdminUser(payload) {
  const response = await api.post("/api/v1/admin/users", payload);
  return response.data;
}

export async function updateAdminUserRole(userId, role) {
  const response = await api.patch(`/api/v1/admin/users/${userId}/role`, {
    role
  });

  return response.data;
}

export async function updateAdminUserStatus(userId, active) {
  const response = await api.patch(`/api/v1/admin/users/${userId}/status`, {
    active
  });

  return response.data;
}

export async function updateAdminUserWhatsapp(
  userId,
  whatsapp,
  whatsappVerified = true
) {
  const response = await api.patch(`/api/v1/admin/users/${userId}/whatsapp`, {
    whatsapp,
    whatsappVerified
  });

  return response.data;
}

export async function verifyAdminUserWhatsapp(userId) {
  const response = await api.patch(`/api/v1/admin/users/${userId}/whatsapp/verify`);
  return response.data;
}

export async function clearAdminUserWhatsapp(userId) {
  const response = await api.delete(`/api/v1/admin/users/${userId}/whatsapp`);
  return response.data;
}

export async function deactivateAdminUser(userId) {
  const response = await api.delete(`/api/v1/admin/users/${userId}`);
  return response.data;
}