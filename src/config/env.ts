export const API_BASE =
  (process.env.EXPO_PUBLIC_API_BASE_URL || "https://rootverse-backend.onrender.com")
    .replace(/\/$/, "");

    export const ENV = {
  API_BASE,
};