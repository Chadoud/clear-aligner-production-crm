import { useState, useCallback, useEffect, type ReactNode } from "react";
import { createSafeContext } from "@/core/context/createSafeContext";
import { fetchMe } from "@/repositories/AuthRepository";
import { invalidateCabinetCache } from "@/data/cabinets";
import {
  AUTH_TOKEN_KEY,
  AUTH_USER_KEY,
  AUTH_UNAUTHORIZED_EVENT,
} from "@/constants/authStorage";

export interface AuthUser {
  id: number;
  username: string;
  fullName: string | null;
  role: "company" | "doctor";
  cabinetId: number | null;
  rights?: number[];
  profileImage?: string | null;
  profileImageUrl?: string | null;
  directProfileImage?: string | null;
  directProfileImageUrl?: string | null;
}

interface AuthContextValue {
  token: string | null;
  user: AuthUser | null;
  userType: string | null;
  isCompany: boolean;
  isDoctor: boolean;
  userRights: number[];
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
  /** Re-fetch `/auth/me` (e.g. after My Profile save) so header `fullName` matches DB. */
  refreshUser: () => Promise<void>;
}

const [AuthContextBase, useAuth] =
  createSafeContext<AuthContextValue>("AuthContext");
export { useAuth };

function readSession(): { token: string | null; user: AuthUser | null } {
  try {
    const token = sessionStorage.getItem(AUTH_TOKEN_KEY);
    const raw = sessionStorage.getItem(AUTH_USER_KEY);
    if (token && raw) {
      return { token, user: JSON.parse(raw) as AuthUser };
    }
  } catch {
    // corrupted storage — ignore
  }
  return { token: null, user: null };
}

function updateStoredUser(user: AuthUser) {
  try {
    sessionStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  } catch {
    // ignore
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(readSession);

  // Refresh user (with rights) on mount when we have a token
  useEffect(() => {
    if (!state.token) return;
    fetchMe()
      .then(({ user }: { user: AuthUser }) => {
        setState((prev) => ({ ...prev, user }));
        updateStoredUser(user);
      })
      .catch(() => {
        // 401 or network error — leave existing session as-is
      });
  }, [state.token]);

  // Sync with 401: ApiClient dispatches AUTH_UNAUTHORIZED_EVENT; we clear state
  useEffect(() => {
    const handler = () => setState({ token: null, user: null });
    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, handler);
    return () => window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, handler);
  }, []);

  const login = useCallback((token: string, user: AuthUser) => {
    invalidateCabinetCache();
    try {
      sessionStorage.setItem(AUTH_TOKEN_KEY, token);
      sessionStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    } catch {
      // ignore storage errors
    }
    setState({ token, user });
  }, []);

  const logout = useCallback(() => {
    invalidateCabinetCache();
    try {
      sessionStorage.removeItem(AUTH_TOKEN_KEY);
      sessionStorage.removeItem(AUTH_USER_KEY);
    } catch {
      // ignore storage errors
    }
    setState({ token: null, user: null });
  }, []);

  const refreshUser = useCallback(async () => {
    if (!state.token) return;
    try {
      const { user: nextUser }: { user: AuthUser } = await fetchMe();
      setState((prev) => ({ ...prev, user: nextUser }));
      updateStoredUser(nextUser);
    } catch {
      // 401 or network — keep current session
    }
  }, [state.token]);

  const value: AuthContextValue = {
    token: state.token,
    user: state.user,
    userType: state.user?.role ?? null,
    isCompany: state.user?.role === "company",
    isDoctor: state.user?.role === "doctor",
    userRights: state.user?.rights ?? [],
    login,
    logout,
    refreshUser,
  };

  return (
    <AuthContextBase.Provider value={value}>
      {children}
    </AuthContextBase.Provider>
  );
}
