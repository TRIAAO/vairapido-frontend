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

export async function listTrips() {
  const response = await api.get("/api/v1/trips");
  return normalizeList(response.data);
}

export async function listBookings() {
  const response = await api.get("/api/v1/bookings");
  return normalizeList(response.data);
}

export async function listTickets() {
  const response = await api.get("/api/v1/tickets");
  return normalizeList(response.data);
}

export async function getOperatorOverview() {
  const [tripsResult, bookingsResult, ticketsResult] = await Promise.allSettled([
    listTrips(),
    listBookings(),
    listTickets()
  ]);

  return {
    trips: tripsResult.status === "fulfilled" ? tripsResult.value : [],
    bookings: bookingsResult.status === "fulfilled" ? bookingsResult.value : [],
    tickets: ticketsResult.status === "fulfilled" ? ticketsResult.value : [],
    errors: {
      trips: tripsResult.status === "rejected" ? tripsResult.reason : null,
      bookings: bookingsResult.status === "rejected" ? bookingsResult.reason : null,
      tickets: ticketsResult.status === "rejected" ? ticketsResult.reason : null
    }
  };
}