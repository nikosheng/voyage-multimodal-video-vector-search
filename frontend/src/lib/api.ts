// Thin fetch wrapper for the backend API. Handles the admin JWT token and
// JSON/multipart request bodies.

const TOKEN_KEY = "wish_admin_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  auth = false,
): Promise<T> {
  const headers = new Headers(options.headers);
  if (auth) {
    const token = getToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }
  const res = await fetch(path, { ...options, headers });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail ?? detail;
    } catch {
      // ignore JSON parse failure
    }
    throw new Error(detail);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export function apiGet<T>(path: string, auth = false) {
  return request<T>(path, { method: "GET" }, auth);
}

export function apiPost<T>(path: string, body: unknown, auth = false) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  return request<T>(path, { method: "POST", headers, body: JSON.stringify(body) }, auth);
}

export function apiPatch<T>(path: string, body: unknown, auth = false) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  return request<T>(path, { method: "PATCH", headers, body: JSON.stringify(body) }, auth);
}

export function apiDelete<T>(path: string, auth = false) {
  return request<T>(path, { method: "DELETE" }, auth);
}

export function apiUpload<T>(path: string, formData: FormData, auth = false, method = "POST") {
  return request<T>(path, { method, body: formData }, auth);
}
