import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import api, { tokenStore } from "../services/api";
import type { User } from "../types";

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(!!tokenStore.get());

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  useEffect(() => {
    if (!tokenStore.get()) return;
    api
      .get<User>("/auth/me")
      .then((r) => setUser(r.data))
      .catch(() => tokenStore.clear())
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    window.addEventListener("auth:expired", logout);
    return () => window.removeEventListener("auth:expired", logout);
  }, [logout]);

  const login = useCallback(async (email: string, password: string) => {
    // FastAPI's OAuth2 form expects form-encoded `username` (we use the email).
    const body = new URLSearchParams({ username: email, password });
    const { data } = await api.post<{ access_token: string }>("/auth/login", body);
    tokenStore.set(data.access_token);
    const me = await api.get<User>("/auth/me");
    setUser(me.data);
  }, []);

  const register = useCallback(
    async (email: string, password: string, fullName: string) => {
      await api.post("/auth/register", { email, password, full_name: fullName || null });
      await login(email, password);
    },
    [login],
  );

  const value = useMemo(() => ({ user, loading, login, register, logout }), [user, loading, login, register, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
