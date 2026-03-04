export type AuthUser = {
  id?: string;
  username?: string;
  email?: string;
};

const AUTH_USER_KEY = "studyhive_user";

export function setAuthUser(user: AuthUser) {
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  window.dispatchEvent(new Event("auth-changed"));
}

export function getAuthUser(): AuthUser | null {
  try {
    return JSON.parse(localStorage.getItem(AUTH_USER_KEY) ?? "") as AuthUser;
  } catch {
    return null;
  }
}
