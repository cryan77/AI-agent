/** Dev: Vite proxies `/api/*` → backend. Prod: set VITE_API_URL to your Railway backend URL. */
const API_BASE = import.meta.env.VITE_API_URL?.replace(/\/$/, "") ?? "/api";

export function apiUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (API_BASE === "/api") {
    return `/api${normalized}`;
  }
  return `${API_BASE}${normalized}`;
}
