import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { resources } from "./translations";

const STORAGE_KEY = "app_language";
let initPromise: Promise<void> | null = null;

export async function initI18n() {
  if (i18n.isInitialized) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    let saved: string | null = null;
    try {
      saved = await AsyncStorage.getItem(STORAGE_KEY);
    } catch (e) {
      console.warn("get language failed:", e);
    }

    const lng = saved === "ta" ? "ta" : "en";

    await i18n.use(initReactI18next).init({
      resources,
      lng,
      fallbackLng: "en",

      // ✅ important
      ns: ["translation"],
      defaultNS: "translation",

      interpolation: { escapeValue: false },
      returnNull: false,
      returnEmptyString: false,
    });
  })();

  try {
    await initPromise;
  } finally {
    initPromise = null;
  }
}

export async function setAppLanguage(lang: "en" | "ta") {
  if (!i18n.isInitialized) await initI18n();

  const safeLang: "en" | "ta" = lang === "ta" ? "ta" : "en";

  try {
    await AsyncStorage.setItem(STORAGE_KEY, safeLang);
  } catch (e) {
    console.warn("save language failed:", e);
  }

  await i18n.changeLanguage(safeLang);
}

export default i18n;
