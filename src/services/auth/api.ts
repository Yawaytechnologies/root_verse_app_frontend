export const API_BASE = "https://rootverse-backend.onrender.com";

export async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  const text = await res.text();

  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  if (!res.ok) {
    const msg =
      (json && (json.message || json.error)) ||
      text ||
      `Request failed (${res.status})`;
    throw new Error(msg);
  }

  return (json ?? {}) as T;
}

export async function postFormData<T>(path: string, formData: FormData): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    body: formData,
  });

  const text = await res.text();
  let json: any = null;

  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  if (!res.ok) {
    const msg =
      (json && (json.message || json.error)) ||
      text ||
      `Request failed (${res.status})`;
    throw new Error(msg);
  }

  return (json ?? {}) as T;
}
