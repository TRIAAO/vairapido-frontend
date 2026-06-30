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

export async function listTickets() {
  const response = await api.get("/api/v1/tickets");
  return normalizeList(response.data);
}

export async function getTicket(ticketId) {
  const response = await api.get(`/api/v1/tickets/${ticketId}`);
  return response.data;
}

export async function getTicketByCode(ticketCode) {
  const response = await api.get(
    `/api/v1/tickets/code/${encodeURIComponent(ticketCode)}`
  );
  return response.data;
}

export async function issueTicket(payload) {
  const response = await api.post("/api/v1/tickets", payload);
  return response.data;
}

export async function useTicket(ticketId) {
  const response = await api.patch(`/api/v1/tickets/${ticketId}/use`);
  return response.data;
}

export async function cancelTicket(ticketId) {
  const response = await api.patch(`/api/v1/tickets/${ticketId}/cancel`);
  return response.data;
}

export async function previewBoarding(ticketCode) {
  const response = await api.get(
    `/api/v1/tickets/${encodeURIComponent(ticketCode)}/boarding-preview`
  );
  return response.data;
}

export async function boardTicketByCode(ticketCode) {
  const response = await api.patch(
    `/api/v1/tickets/${encodeURIComponent(ticketCode)}/board`
  );
  return response.data;
}
