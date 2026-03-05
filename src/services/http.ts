// src/http.ts
import { Platform } from "react-native";

export const API_BASE = (
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  "https://rootverse-backend-5qoo.onrender.com/"
).replace(/\/$/, "");

function isNetworkLikeError(e: any) {
  const msg = String(e?.message || e || "");
  return (
    msg.includes("Network request failed") ||
    msg.includes("Failed to fetch") ||
    msg.includes("Timeout") ||
    msg.includes("AbortError") ||
    msg.includes("aborted")
  );
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit | undefined,
  ms: number
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);

  try {
    return await fetch(url, { ...(init || {}), signal: controller.signal });
  } catch (e: any) {
    // ✅ normalize all bad-network cases into one code your app understands
    if (isNetworkLikeError(e)) throw new Error("NETWORK_ERROR");
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

async function readBody(res: Response) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function httpJson<T>(
  path: string,
  init?: RequestInit,
  ms = 15000
): Promise<T> {
  const url = `${API_BASE}${path}`;

  const res = await fetchWithTimeout(url, init, ms);
  const data = await readBody(res);

  if (!res.ok) {
    // ✅ ONLY 401 = auth invalid
    if (res.status === 401) throw new Error("UNAUTHORIZED");

    const msg =
      (data && (data.message || data.error)) ||
      (typeof data === "string" ? data : null) ||
      `HTTP ${res.status}`;

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

  const res = await fetchWithTimeout(
    url,
    { method: "PUT", body: form },
    ms
  );

  const data = await readBody(res);

  if (!res.ok) {
    if (res.status === 401) throw new Error("UNAUTHORIZED");

    const msg =
      (data && (data.message || data.error)) ||
      (typeof data === "string" ? data : null) ||
      `HTTP ${res.status}`;

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
  getJson: <T>(path: string, ms?: number) =>
    httpJson<T>(path, { method: "GET" }, ms),

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

  putForm: <T>(path: string, form: FormData, ms?: number) =>
    httpPutForm<T>(path, form, ms),
};