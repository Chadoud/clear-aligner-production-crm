import { AUTH_TOKEN_KEY } from "@/constants/authStorage.js";

export function hasAuthSession() {
  try {
    return Boolean(sessionStorage.getItem(AUTH_TOKEN_KEY));
  } catch {
    return false;
  }
}
