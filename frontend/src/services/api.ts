import axios, { AxiosError } from "axios";

const TOKEN_KEY = "dmjobsentrix_token";

export const tokenStore = {
  get: (): string | null => localStorage.getItem(TOKEN_KEY),
  set: (t: string): void => localStorage.setItem(TOKEN_KEY, t),
  clear: (): void => localStorage.removeItem(TOKEN_KEY),
};

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:8000",
});

api.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err: AxiosError) => {
    const isLogin = err.config?.url?.includes("/auth/login");
    if (err.response?.status === 401 && !isLogin) {
      tokenStore.clear();
      window.dispatchEvent(new Event("auth:expired"));
    }
    return Promise.reject(err);
  },
);

interface ApiErrorBody {
  error?: { message?: string; details?: { field: string; msg: string }[] };
}

/** Turn any thrown value into a message that is safe to show the user. */
export function errorMessage(err: unknown): string {
  if (axios.isAxiosError<ApiErrorBody>(err)) {
    if (!err.response) return "Can't reach the server. Check your connection and try again.";
    const e = err.response.data?.error;
    if (e?.details?.length) return e.details.map((d) => `${d.field.replace("body.", "")}: ${d.msg}`).join("; ");
    if (e?.message) return e.message;
  }
  return "Something went wrong. Try again.";
}

export default api;
