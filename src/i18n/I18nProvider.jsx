import { createContext, useCallback, useContext, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { MESSAGES } from "@/i18n/messages";
import { localizeValue } from "@/i18n/translate";
import {
  getLocaleFromPath,
  localizeHref,
  LOCALE_META,
  routePath,
  switchLocalePath,
} from "@/i18n/routes";

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const { pathname } = useLocation();
  const locale = getLocaleFromPath(pathname);

  const t = useCallback(
    (source, fallback) => MESSAGES[locale]?.[source] || fallback || source,
    [locale],
  );
  const href = useCallback((target) => localizeHref(target, locale), [locale]);
  const route = useCallback(
    (name, params) => routePath(locale, name, params),
    [locale],
  );
  const switchTo = useCallback(
    (nextLocale) => switchLocalePath(pathname, nextLocale),
    [pathname],
  );
  const localize = useCallback((value) => localizeValue(value, locale), [locale]);

  const value = useMemo(
    () => ({
      locale,
      localeMeta: LOCALE_META[locale],
      t,
      href,
      route,
      switchTo,
      localize,
    }),
    [href, locale, localize, route, switchTo, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n deve essere usato dentro I18nProvider");
  return context;
}
