const TOKEN_KEY = "vairapido_token";
const USER_KEY = "vairapido_user";

export function saveAuth(authResponse) {
  if (!authResponse?.token) {
    throw new Error("Token não retornado pelo servidor.");
  }

  localStorage.setItem(TOKEN_KEY, authResponse.token);

  const user = {
    email: authResponse.email || authResponse.userEmail || parseJwt(authResponse.token)?.sub || "",
    fullName: authResponse.fullName || parseJwt(authResponse.token)?.fullName || "",
    role: authResponse.role || parseJwt(authResponse.token)?.role || ""
  };

  localStorage.setItem(USER_KEY, JSON.stringify(user));

  return user;
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getCurrentUser() {
  const raw = localStorage.getItem(USER_KEY);

  if (!raw) {
    const token = getToken();
    const payload = token ? parseJwt(token) : null;

    if (!payload) {
      return null;
    }

    return {
      email: payload.sub || "",
      fullName: payload.fullName || "",
      role: payload.role || ""
    };
  }

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
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