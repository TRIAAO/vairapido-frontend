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

  if (Array.isArray(data?.messages)) {
    return data.messages;
  }

  return [];
}

export async function sendPaymentInstructions(bookingId) {
  const response = await api.post(
    `/api/v1/whatsapp/send-payment-instructions/${bookingId}`
  );
  return response.data;
}

export async function sendTicketMessage(ticketId) {
  const response = await api.post(`/api/v1/whatsapp/send-ticket/${ticketId}`);
  return response.data;
}

export async function backfillMissingWhatsAppMessages() {
  const response = await api.post("/api/v1/whatsapp/messages/backfill-missing");
  return response.data;
}

export async function getWhatsAppCloudStatus() {
  const response = await api.get("/api/v1/whatsapp/cloud/status");
  return response.data;
}

export async function sendRealWhatsAppMessage(messageId) {
  const response = await api.post(`/api/v1/whatsapp/messages/${messageId}/send-real`);
  return response.data;
}

export async function sendPendingRealWhatsAppMessages() {
  const response = await api.post("/api/v1/whatsapp/messages/send-pending-real");
  return normalizeList(response.data);
}

export async function listWhatsAppMessages() {
  const response = await api.get("/api/v1/whatsapp/messages");
  return normalizeList(response.data);
}

export async function getWhatsAppMessage(messageId) {
  const response = await api.get(`/api/v1/whatsapp/messages/${messageId}`);
  return response.data;
}

export async function markWhatsAppMessageSent(messageId) {
  const response = await api.patch(
    `/api/v1/whatsapp/messages/${messageId}/mark-sent`
  );
  return response.data;
}

export async function markWhatsAppMessageFailed(messageId) {
  const response = await api.patch(
    `/api/v1/whatsapp/messages/${messageId}/mark-failed`
  );
  return response.data;
}
