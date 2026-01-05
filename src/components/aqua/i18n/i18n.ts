import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { resources } from "./translations";

const STORAGE_KEY = "app_language";

export async function initI18n() {
  const saved = await AsyncStorage.getItem(STORAGE_KEY);

  if (!i18n.isInitialized) {
    await i18n
      .use(initReactI18next)
      .init({
        resources,
        lng: saved || "en",
        fallbackLng: "en",
        interpolation: { escapeValue: false },
      });
  }
}

export async function setAppLanguage(lang: "en" | "ta") {
  await AsyncStorage.setItem(STORAGE_KEY, lang);
  await i18n.changeLanguage(lang);
}

export default i18n;
    