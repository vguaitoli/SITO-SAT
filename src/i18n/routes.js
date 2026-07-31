export const DEFAULT_LOCALE = "it";
export const SUPPORTED_LOCALES = ["it", "en", "fr"];

export const LOCALE_META = {
  it: { label: "Italiano", short: "IT", htmlLang: "it", dateLocale: "it-IT", ogLocale: "it_IT" },
  en: { label: "English", short: "EN", htmlLang: "en", dateLocale: "en-GB", ogLocale: "en_GB" },
  fr: { label: "Français", short: "FR", htmlLang: "fr", dateLocale: "fr-FR", ogLocale: "fr_FR" },
};

const ROUTES = {
  it: {
    home: "/",
    experiences: "/esperienze/:cat",
    tours: "/itinerari",
    tourDetail: "/tour/:slug",
    events: "/eventi",
    eventDetail: "/eventi/:slug",
    blog: "/blog",
    blogPost: "/blog/:id",
    privacy: "/privacy",
    cookies: "/cookie-policy",
  },
  en: {
    home: "/en",
    experiences: "/en/experiences/:cat",
    tours: "/en/tours",
    tourDetail: "/en/tours/:slug",
    events: "/en/events",
    eventDetail: "/en/events/:slug",
    blog: "/en/blog",
    blogPost: "/en/blog/:id",
    privacy: "/en/privacy",
    cookies: "/en/cookie-policy",
  },
  fr: {
    home: "/fr",
    experiences: "/fr/experiences/:cat",
    tours: "/fr/circuits",
    tourDetail: "/fr/circuits/:slug",
    events: "/fr/evenements",
    eventDetail: "/fr/evenements/:slug",
    blog: "/fr/blog",
    blogPost: "/fr/blog/:id",
    privacy: "/fr/confidentialite",
    cookies: "/fr/politique-cookies",
  },
};

const CATEGORY_SLUGS = {
  it: {
    maxienduro: "maxienduro",
    enduro: "enduro",
    quad: "quad",
    ssv: "ssv",
    "4x4": "4x4",
    "4x4-experience": "4x4-experience",
    "tour-stradali": "tour-stradali",
    "e-bike": "e-bike",
    "corsi-off-road": "corsi-off-road",
    noleggio: "noleggio",
  },
  en: {
    maxienduro: "maxienduro",
    enduro: "enduro",
    quad: "quad",
    ssv: "ssv",
    "4x4": "4x4",
    "4x4-experience": "4x4-passenger-experience",
    "tour-stradali": "road-tours",
    "e-bike": "e-bike",
    "corsi-off-road": "off-road-courses",
    noleggio: "rental",
  },
  fr: {
    maxienduro: "maxienduro",
    enduro: "enduro",
    quad: "quad",
    ssv: "ssv",
    "4x4": "4x4",
    "4x4-experience": "experience-4x4-passager",
    "tour-stradali": "circuits-routiers",
    "e-bike": "velo-electrique",
    "corsi-off-road": "stages-tout-terrain",
    noleggio: "location",
  },
};

function normalizePathname(pathname) {
  if (!pathname || pathname === "/") return "/";
  return pathname.replace(/\/+$/, "") || "/";
}

function categoryIdFromSlug(locale, slug) {
  return (
    Object.entries(CATEGORY_SLUGS[locale]).find(([, localizedSlug]) => localizedSlug === slug)?.[0] ||
    slug
  );
}

function fillPattern(pattern, params = {}) {
  return pattern.replace(/:([a-zA-Z]+)/g, (_, key) => encodeURIComponent(params[key] || ""));
}

function matchPattern(pathname, pattern) {
  const keys = [];
  const expression = pattern
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace(/:([a-zA-Z]+)/g, (_, key) => {
      keys.push(key);
      return "([^/]+)";
    });
  const match = pathname.match(new RegExp(`^${expression}/?$`));
  if (!match) return null;

  return Object.fromEntries(keys.map((key, index) => [key, decodeURIComponent(match[index + 1])]));
}

export function getLocaleFromPath(pathname) {
  const path = normalizePathname(pathname);
  if (path === "/en" || path.startsWith("/en/")) return "en";
  if (path === "/fr" || path.startsWith("/fr/")) return "fr";
  return DEFAULT_LOCALE;
}

export function routePath(locale, routeName, params) {
  const safeLocale = SUPPORTED_LOCALES.includes(locale) ? locale : DEFAULT_LOCALE;
  const pattern = ROUTES[safeLocale][routeName] || ROUTES[safeLocale].home;
  const localizedParams =
    routeName === "experiences" && params?.cat
      ? {
          ...params,
          cat:
            CATEGORY_SLUGS[safeLocale][categoryIdFromSlug(safeLocale, params.cat)] ||
            params.cat,
        }
      : params;
  return fillPattern(pattern, localizedParams);
}

export function resolveRoute(pathname) {
  const path = normalizePathname(pathname);
  const locale = getLocaleFromPath(path);

  for (const [name, pattern] of Object.entries(ROUTES[locale])) {
    const params = matchPattern(path, pattern);
    if (params) {
      return {
        locale,
        name,
        params:
          name === "experiences"
            ? { ...params, cat: categoryIdFromSlug(locale, params.cat) }
            : params,
      };
    }
  }

  return { locale, name: "notFound", params: {} };
}

export function switchLocalePath(pathname, locale) {
  const resolved = resolveRoute(pathname);
  if (resolved.name === "notFound") return routePath(locale, "home");
  return routePath(locale, resolved.name, resolved.params);
}

export function localizeHref(href, locale) {
  if (!href || /^(https?:|mailto:|tel:)/.test(href)) return href;
  if (href.startsWith("#")) return `${routePath(locale, "home")}${href}`;

  const base = "https://local.invalid";
  const parsed = new URL(href, base);
  const resolved = resolveRoute(parsed.pathname);
  const routeName = resolved.name === "notFound" ? "home" : resolved.name;
  const localized = routePath(locale, routeName, resolved.params);
  return `${localized}${parsed.search}${parsed.hash}`;
}

export function getAlternatePaths(pathname) {
  const resolved = resolveRoute(pathname);
  const routeName = resolved.name === "notFound" ? "home" : resolved.name;
  return Object.fromEntries(
    SUPPORTED_LOCALES.map((locale) => [
      locale,
      routePath(locale, routeName, resolved.params),
    ]),
  );
}

export function allRoutePatterns() {
  return ROUTES;
}
