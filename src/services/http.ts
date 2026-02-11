import * as FileSystem from "expo-file-system";
import { Platform } from "react-native";

export const API_BASE = (
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  "https://rootverse-backend-5qoo.onrender.com/"
).replace(/\/$/, "");

function timeout(ms: number) {
  return new Promise((_, rej) =>
    setTimeout(() => rej(new Error("Timeout")), ms),
  );
}

/** ✅ Validate that a file:// URI points to an existing file */
async function validateFileUri(uri: string): Promise<boolean> {
  if (!uri || !uri.startsWith("file://")) return true; // allow non-file URIs

  try {
    const info = await FileSystem.getInfoAsync(uri);
    return info.exists && info.isDirectory !== true;
  } catch (e) {
    console.warn("[VALIDATE_FILE_URI]", uri, String(e?.message || e));
    return false;
  }
}

export async function httpJson<T>(
  path: string,
  init?: RequestInit,
  ms = 15000,
): Promise<T> {
  const url = `${API_BASE}${path}`;

  const res = (await Promise.race([fetch(url, init), timeout(ms)])) as Response;

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
  ms = 20000,
): Promise<T> {
  const url = `${API_BASE}${path}`;

  const res = (await Promise.race([
    fetch(url, { method: "PUT", body: form }),
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
  filename: string,
) {
  if (!uri) {
    console.warn("[APPEND_IMAGE] Empty URI for", filename);
    return;
  }

  if (Platform.OS !== "web") {
    // ✅ Validate file exists for file:// URIs (critical for APK offline queue)
    if (uri.startsWith("file://")) {
      const exists = await validateFileUri(uri);
      if (!exists) {
        console.warn("[APPEND_IMAGE] File not found:", uri, "for", filename);
        throw new Error(`Image file not found: ${filename} (${uri})`);
      }
    }

    form.append(field, { uri, name: filename, type: "image/jpeg" } as any);
    return;
  }

  // Web: fetch and convert to blob
  try {
    const r = await fetch(uri);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const blob = await r.blob();
    const file = new File([blob], filename, {
      type: blob.type || "image/jpeg",
    });
    form.append(field, file);
  } catch (e: any) {
    console.warn("[APPEND_IMAGE_WEB]", uri, String(e?.message || e));
    throw new Error(`Failed to append image ${filename}: ${e?.message || e}`);
  }
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
      ms,
    ),
  putForm: <T>(path: string, form: FormData, ms?: number) =>
    httpPutForm<T>(path, form, ms),
};
