import axios from "axios";
import { getToken, logout } from "../utils/auth";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "https://api-vairapido.triacompany.com",
  timeout: 30000
});

api.interceptors.request.use((config) => {
  const token = getToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;

    if (status === 401) {
      logout();
      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);

export function extractApiError(error) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    "Não foi possível concluir a operação."
  );
}

export async function loginRequest(payload) {
  const response = await api.post("/api/v1/auth/login", payload);
  return response.data;
}

export async function getBoardingPreview(ticketCode) {
  const response = await api.get(`/api/v1/tickets/${encodeURIComponent(ticketCode)}/boarding-preview`);
  return response.data;
}

export async function markBoarding(ticketCode) {
  const response = await api.patch(`/api/v1/tickets/${encodeURIComponent(ticketCode)}/board`);
  return response.data;
}

export default api;