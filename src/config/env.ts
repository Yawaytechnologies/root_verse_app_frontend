export const API_BASE =
  (process.env.EXPO_PUBLIC_API_BASE_URL || "https://rootverse-backend-5qoo.onrender.com")
    .replace(/\/$/, "");

    export const ENV = {
  API_BASE,
};