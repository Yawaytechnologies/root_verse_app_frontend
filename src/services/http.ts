import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

export const API_BASE = (
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  "https://rootverse-backend-5qoo.onrender.com"
).replace(/\/$/, "");

const AUTH_TOKEN_KEY = "auth_token";

// Optional in-memory token (can be set by any session bootstrap flow)
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

async function withAuthHeaders(init?: RequestInit): Promise<RequestInit> {
  const token =
    _authToken || (await AsyncStorage.getItem(AUTH_TOKEN_KEY).catch(() => null));

  const headers = new Headers(init?.headers || {});

  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return {
    ...init,
    headers,
  };
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

  return data.message || data.error || data.msg || data.detail || `HTTP ${status}`;
}

export async function httpJson<T>(
  path: string,
  init?: RequestInit,
  ms = 15000
): Promise<T> {
  const url = `${API_BASE}${normalizePath(path)}`;
  const finalInit = await withAuthHeaders(init);

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
  const finalInit = await withAuthHeaders({ method: "PUT", body: form });

  const res = (await Promise.race([fetch(url, finalInit), timeout(ms)])) as Response;
  const data = await parseResponse(res);

  if (!res.ok) {
    throw new Error(extractErrorMessage(data, res.status));
  }

  return data as T;
}

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
