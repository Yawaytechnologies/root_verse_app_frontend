// src/services/auth/api.ts
const API_BASE =
  process.env.EXPO_PUBLIC_API_BASE_URL || "https://rootverse-backend.onrender.com";

export async function getJson<T>(path: string): Promise<T> {
  const url = `${API_BASE}${path}`;

  const res = await fetch(url);
  const text = await res.text();

  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {}

  if (!res.ok) {
    throw new Error(
      (json && (json.message || json.error)) || text || `Request failed (${res.status})`
    );
  }

  return (json ?? {}) as T;
}

export async function postFormData<T>(path: string, formData: FormData): Promise<T> {
  const url = `${API_BASE}${path}`;

  const res = await fetch(url, {
    method: "POST",
    body: formData,
    headers: {
      Accept: "application/json",
      // ❌ DO NOT set Content-Type for FormData in React Native
    },
  });

  const text = await res.text();

  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {}

  if (!res.ok) {
    throw new Error(
      (json && (json.message || json.error)) || text || `Request failed (${res.status})`
    );
  }

  return (json ?? {}) as T;
}
