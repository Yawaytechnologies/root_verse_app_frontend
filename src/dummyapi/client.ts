import AsyncStorage from "@react-native-async-storage/async-storage";

const RAW = process.env.EXPO_PUBLIC_API_BASE_URL;
if (!RAW) throw new Error("EXPO_PUBLIC_API_BASE_URL is not set");

const BASE_URL = String(RAW).replace(/\/+$/, "");

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await AsyncStorage.getItem("auth.token");

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) throw new Error(data?.detail || data?.message || "Request failed");
  return data as T;
}