const TOKEN_KEY = "vairapido_token";
const USER_KEY = "vairapido_user";

export function saveAuth(authResponse) {
  if (!authResponse?.token) {
    throw new Error("Token não retornado pelo servidor.");
  }

  localStorage.setItem(TOKEN_KEY, authResponse.token);

  const payload = parseJwt(authResponse.token);
  const responseUser = authResponse.user || {};

  const user = {
    id: responseUser.id || payload?.userId || payload?.id || "",
    email: responseUser.email || authResponse.email || authResponse.userEmail || payload?.sub || "",
    fullName: responseUser.fullName || authResponse.fullName || payload?.fullName || "",
    role: responseUser.role || authResponse.role || payload?.role || "",
    status: responseUser.status || payload?.status || "",
    transportCompanyId: responseUser.transportCompanyId || payload?.transportCompanyId || null
  };

  localStorage.setItem(USER_KEY, JSON.stringify(user));

  return user;
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getCurrentUser() {
  const token = getToken();
  const payload = token ? parseJwt(token) : null;
  const raw = localStorage.getItem(USER_KEY);

  if (!raw && !payload) {
    return null;
  }

  let storedUser = null;

  if (raw) {
    try {
      storedUser = JSON.parse(raw);
    } catch {
      storedUser = null;
    }
  }

  return {
    id: storedUser?.id || payload?.userId || payload?.id || "",
    email: storedUser?.email || payload?.sub || "",
    fullName: storedUser?.fullName || payload?.fullName || "",
    role: storedUser?.role || payload?.role || "",
    status: storedUser?.status || payload?.status || "",
    transportCompanyId: storedUser?.transportCompanyId || payload?.transportCompanyId || null
  };
}

export function isAuthenticated() {
  return Boolean(getToken());
}

export function hasAnyRole(allowedRoles = []) {
  const user = getCurrentUser();

  if (!user?.role) {
    return false;
  }

  return allowedRoles.includes(user.role);
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function parseJwt(token) {
  try {
    const base64Url = token.split(".")[1];

    if (!base64Url) {
      return null;
    }

    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split("")
        .map((char) => `%${`00${char.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join("")
    );

    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}