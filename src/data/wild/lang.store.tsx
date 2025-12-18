import React, { createContext, useContext, useMemo, useState } from "react";

export type Lang = "en" | "ta";

type LangCtx = {
  lang: Lang;
  setLang: (v: Lang) => void;
  toggleLang: () => void;
};

const LanguageContext = createContext<LangCtx | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>("en");

  const value = useMemo(
    () => ({
      lang,
      setLang,
      toggleLang: () => setLang((p) => (p === "en" ? "ta" : "en")),
    }),
    [lang]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used inside <LanguageProvider />");
  return ctx;
}
