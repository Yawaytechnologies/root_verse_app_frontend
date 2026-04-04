import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

export const API_BASE = (
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  "https://rootverse-backend-5qoo.onrender.com/"
).replace(/\/$/, "");

function timeout(ms: number) {
  return new Promise((_, rej) =>
    setTimeout(() => rej(new Error("Timeout")), ms)
  );
}

const AUTH_TOKEN_KEY = "auth_token";

async function withAuthHeaders(init?: RequestInit): Promise<RequestInit> {
  const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY).catch(() => null);
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

export async function httpJson<T>(
  path: string,
  init?: RequestInit,
  ms = 15000
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const requestInit = await withAuthHeaders(init);

  const res = (await Promise.race([
    fetch(url, requestInit),
    timeout(ms),
  ])) as Response;

  const text = await res.text();
  let data: any = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const msg = (data && (data.message || data.error)) || `HTTP ${res.status}`;
    throw new Error(msg);
  }

  return data as T;
}

export async function httpPutForm<T>(
  path: string,
  form: FormData,
  ms = 20000
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const requestInit = await withAuthHeaders({ method: "PUT", body: form });

  const res = (await Promise.race([
    fetch(url, requestInit),
    timeout(ms),
  ])) as Response;

  const text = await res.text();
  let data: any = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const msg = (data && (data.message || data.error)) || `HTTP ${res.status}`;
    throw new Error(msg);
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

/** ✅ EXPORT AN OBJECT so you can do: import { http } from "@/src/http" */
export const http = {
  getJson: <T>(path: string, ms?: number) => httpJson<T>(path, { method: "GET" }, ms),
  postJson: <T>(path: string, body: any, ms?: number) =>
    httpJson<T>(
      path,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
      ms
    ),
  putForm: <T>(path: string, form: FormData, ms?: number) => httpPutForm<T>(path, form, ms),
};
