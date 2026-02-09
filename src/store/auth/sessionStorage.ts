import * as SecureStore from "expo-secure-store";

const KEY = "rv_auth_session_v1";

export type StoredSession = {
  token: string;
  expiresAt: number; // ms epoch
  savedAt: number;   // ms epoch
};

export async function saveSession(s: StoredSession) {
  await SecureStore.setItemAsync(KEY, JSON.stringify(s));
}

export async function loadSession(): Promise<StoredSession | null> {
  const raw = await SecureStore.getItemAsync(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredSession;
  } catch {
    return null;
  }
}

export async function clearSession() {
  await SecureStore.deleteItemAsync(KEY);
}

/** Try to read JWT exp; fallback to 30 days TTL */
const _b64chars =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";

function base64Decode(input: string) {
  const str = input.replace(/[^A-Za-z0-9+/=]/g, "");
  let output = "";
  let i = 0;

  while (i < str.length) {
    const enc1 = _b64chars.indexOf(str.charAt(i++));
    const enc2 = _b64chars.indexOf(str.charAt(i++));
    const enc3 = _b64chars.indexOf(str.charAt(i++));
    const enc4 = _b64chars.indexOf(str.charAt(i++));

    const chr1 = (enc1 << 2) | (enc2 >> 4);
    const chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
    const chr3 = ((enc3 & 3) << 6) | enc4;

    output += String.fromCharCode(chr1);
    if (enc3 !== 64) output += String.fromCharCode(chr2);
    if (enc4 !== 64) output += String.fromCharCode(chr3);
  }

  return output;
}

export function deriveExpiresAt(token: string) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) throw new Error("NOT_JWT");

    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = payload + "===".slice((payload.length + 3) % 4);

    // avoid TS "always true" + avoid Buffer
    const atobFn = (globalThis as any)?.atob as undefined | ((s: string) => string);
    const decoded = typeof atobFn === "function" ? atobFn(padded) : base64Decode(padded);

    const json = JSON.parse(decoded);
    if (typeof json?.exp === "number") return json.exp * 1000;
  } catch {
    // ignore
  }

  return Date.now() + 30 * 24 * 60 * 60 * 1000;
}
