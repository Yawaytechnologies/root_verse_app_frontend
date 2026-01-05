export async function safeFetchJson<T>(
  url: string,
  opts?: RequestInit,
  timeoutMs = 10000
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, { ...(opts || {}), signal: controller.signal });
    const text = await res.text();

    let data: any = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }

    if (!res.ok) {
      const msg =
        (data && (data.message || data.error)) ||
        `Request failed (${res.status})`;
      throw new Error(msg);
    }

    return data as T;
  } finally {
    clearTimeout(timer);
  }
}
