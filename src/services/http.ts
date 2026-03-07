import { Platform } from "react-native";

export const API_BASE = (
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  "https://rootverse-backend-5qoo.onrender.com"
).replace(/\/$/, "");

/** in-memory auth token (set by authSession slice) */
let _authToken: string | null = null;

export function setAuthToken(token: string | null) {
  _authToken = token;
}

export function getAuthToken() {
  return _authToken;
}

function timeout(ms: number) {
  return new Promise((_, rej) => setTimeout(() => rej(new Error("Timeout")), ms));
}

function normalizePath(path: string) {
  if (!path) return "/";
  return path.startsWith("/") ? path : `/${path}`;
}

function withAuthHeaders(init?: RequestInit) {
  const headers = new Headers(init?.headers ?? undefined);

  // attach token if present and not already set
  if (_authToken && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${_authToken}`);
  }

  return { ...init, headers };
}

async function parseResponse(res: Response) {
  const text = await res.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function extractErrorMessage(data: any, status: number) {
  if (!data) return `HTTP ${status}`;

  if (typeof data === "string") return data;

  // common patterns
  return (
    data.message ||
    data.error ||
    data.msg ||
    data.detail ||
    `HTTP ${status}`
  );
}

export async function httpJson<T>(
  path: string,
  init?: RequestInit,
  ms = 15000
): Promise<T> {
  const url = `${API_BASE}${normalizePath(path)}`;
  const finalInit = withAuthHeaders(init);

  const res = (await Promise.race([fetch(url, finalInit), timeout(ms)])) as Response;
  const data = await parseResponse(res);

  if (!res.ok) {
    throw new Error(extractErrorMessage(data, res.status));
  }

  return data as T;
}

export async function httpPutForm<T>(
  path: string,
  form: FormData,
  ms = 20000
): Promise<T> {
  const url = `${API_BASE}${normalizePath(path)}`;

  // FormData: don't set Content-Type manually (fetch sets boundary)
  const finalInit = withAuthHeaders({ method: "PUT", body: form });

  const res = (await Promise.race([fetch(url, finalInit), timeout(ms)])) as Response;
  const data = await parseResponse(res);

  if (!res.ok) {
    throw new Error(extractErrorMessage(data, res.status));
  }

  return data as T;
}

/** Web needs File/Blob, native can use {uri,name,type} */
export async function appendImageToForm(
  form: FormData,
  field: string,
  uri: string,
  filename: string
) {
  if (Platform.OS !== "web") {
    form.append(field, { uri, name: filename, type: "image/jpeg" } as any);
    return;
  }

  const r = await fetch(uri);
  const blob = await r.blob();
  const file = new File([blob], filename, { type: blob.type || "image/jpeg" });
  form.append(field, file);
}

/** ✅ single http object */
export const http = {
  getJson: <T>(path: string, ms?: number) =>
    httpJson<T>(path, { method: "GET" }, ms),

  postJson: <T>(path: string, body: any, ms?: number) =>
    httpJson<T>(
      path,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body ?? {}),
      },
      ms
    ),

  putJson: <T>(path: string, body: any, ms?: number) =>
    httpJson<T>(
      path,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body ?? {}),
      },
      ms
    ),

  putForm: <T>(path: string, form: FormData, ms?: number) =>
    httpPutForm<T>(path, form, ms),
};