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

export async function listBookings() {
  const response = await api.get("/api/v1/bookings");
  return normalizeList(response.data);
}

export async function listBookingsByCompany(companyId) {
  const response = await api.get(`/api/v1/bookings/company/${companyId}`);
  return normalizeList(response.data);
}

export async function getBooking(bookingId) {
  const response = await api.get(`/api/v1/bookings/${bookingId}`);
  return response.data;
}

export async function getBookingByCode(bookingCode) {
  const response = await api.get(
    `/api/v1/bookings/code/${encodeURIComponent(bookingCode)}`
  );
  return response.data;
}

export async function confirmBookingPayment(bookingId) {
  const response = await api.patch(`/api/v1/bookings/${bookingId}/confirm-payment`);
  return response.data;
}

export async function issueBookingTicket(bookingId) {
  const response = await api.patch(`/api/v1/bookings/${bookingId}/issue-ticket`);
  return response.data;
}

export async function cancelBooking(bookingId) {
  const response = await api.patch(`/api/v1/bookings/${bookingId}/cancel`);
  return response.data;
}

export async function expireOverdueBookings() {
  const response = await api.post("/api/v1/bookings/expire-overdue");
  return response.data;
}
