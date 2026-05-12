import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { resources } from "./translations";

const STORAGE_KEY = "app_language";

let initPromise: Promise<void> | null = null;

export type AppLanguage = "en" | "ta";

function normalizeLanguage(lang?: string | null): AppLanguage {
  const value = String(lang ?? "").toLowerCase();

  if (value === "ta" || value.startsWith("ta-")) {
    return "ta";
  }

  return "en";
}

export async function initI18n() {
  if (i18n.isInitialized) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    let saved: string | null = null;

    try {
      saved = await AsyncStorage.getItem(STORAGE_KEY);
    } catch (error) {
      console.warn("get language failed:", error);
    }

    const lng = normalizeLanguage(saved);

    await i18n.use(initReactI18next).init({
      resources,
      lng,
      fallbackLng: "en",
      ns: ["translation"],
      defaultNS: "translation",
      compatibilityJSON: "v3",
      interpolation: {
        escapeValue: false,
      },
      returnNull: false,
      returnEmptyString: false,
      react: {
        useSuspense: false,
      },
    });
  })();

  try {
    await initPromise;
  } finally {
    initPromise = null;
  }
}

export async function setAppLanguage(lang: AppLanguage) {
  if (!i18n.isInitialized) {
    await initI18n();
  }

  const safeLang = normalizeLanguage(lang);

  try {
    await AsyncStorage.setItem(STORAGE_KEY, safeLang);
  } catch (error) {
    console.warn("save language failed:", error);
  }

  await i18n.changeLanguage(safeLang);
}

export function getCurrentLanguage(): AppLanguage {
  return normalizeLanguage(i18n.language);
}

export default i18n;