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

export async function listPayments() {
  const response = await api.get("/api/v1/payments");
  return normalizeList(response.data);
}

export async function getPayment(paymentId) {
  const response = await api.get(`/api/v1/payments/${paymentId}`);
  return response.data;
}

export async function getPaymentByCode(paymentCode) {
  const response = await api.get(
    `/api/v1/payments/code/${encodeURIComponent(paymentCode)}`
  );
  return response.data;
}

export async function createPayment(payload) {
  const response = await api.post("/api/v1/payments", payload);
  return response.data;
}

export async function confirmPayment(paymentId) {
  const response = await api.patch(`/api/v1/payments/${paymentId}/confirm`);
  return response.data;
}

export async function cancelPayment(paymentId) {
  const response = await api.patch(`/api/v1/payments/${paymentId}/cancel`);
  return response.data;
}

export async function expirePayment(paymentId) {
  const response = await api.patch(`/api/v1/payments/${paymentId}/expire`);
  return response.data;
}
