import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import kn from './kn';

// Lightweight i18n. English strings are the keys, so a missing translation
// simply shows the English text. The choice is remembered in localStorage.
const KEY = 'kdc_lang';
const LangContext = createContext({ lang: 'en', setLang: () => {}, t: (s) => s });

function readLang() {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'en' || saved === 'kn') return saved;
  } catch { /* storage blocked */ }
  return 'en';
}

const norm = (s) => s.replace(/\s+/g, ' ').trim();

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(readLang);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next) => {
    setLangState(next);
    try { localStorage.setItem(KEY, next); } catch { /* ignore */ }
  }, []);

  const t = useCallback(
    (text) => {
      if (lang !== 'kn' || typeof text !== 'string') return text;
      return kn[norm(text)] ?? text;
    },
    [lang],
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export const useLang = () => useContext(LangContext);
