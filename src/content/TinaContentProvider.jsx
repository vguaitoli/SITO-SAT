import { createContext, useContext, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { useTina } from "tinacms/dist/react";
import snapshot from "@/content/tina-snapshot.json";
import rentalPageFallback from "../../content/rental/index.json";
import { normalizeEvents, normalizeSettings, normalizeTours } from "@/content/normalize";
import { useI18n } from "@/i18n/I18nProvider";
import { resolveRoute } from "@/i18n/routes";

const TinaContentContext = createContext(null);

/**
 * TinaCMS riscrive i percorsi delle immagini verso il proprio CDN, nella forma
 * assets.tina.io/<clientId>/__staging/<branch>/__file/<percorso>. Sul CDN però
 * esiste solo ciò che è stato caricato dall'editor, cioè la sola cartella
 * media/cms: tutte le altre immagini vivono nel repository e da quegli URL
 * restituiscono 404. Riportiamo ogni percorso al file locale, che esiste sempre,
 * viene servito dal nostro dominio ed evita una richiesta a terzi.
 */
const TINA_CDN_FILE = /^https?:\/\/assets\.tina\.io\/.*?\/__file\//;

function toLocalMedia(value) {
  if (typeof value === "string") return value.replace(TINA_CDN_FILE, "/");
  if (Array.isArray(value)) return value.map(toLocalMedia);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        // I metadati di Tina (_content_source, _sys, …) passano intatti: servono
        // a tinaField per l'editing visuale e non contengono percorsi immagine.
        key.startsWith("_") ? item : toLocalMedia(item),
      ]),
    );
  }
  return value;
}

function useEditableDocument(entry, documentName, formId, primary) {
  const options = {
    query: entry.query,
    variables: entry.variables,
    data: entry.data,
  };

  if (primary) {
    options.experimental___selectFormByFormId = () => formId;
  }

  const response = useTina(options);
  return toLocalMedia(response.data?.[documentName] || entry.data[documentName]);
}

export function TinaContentProvider({ children }) {
  const { pathname, search } = useLocation();
  const { locale, localize } = useI18n();
  const requestedDocument = new URLSearchParams(search).get("tinaDocument");
  const currentRoute = resolveRoute(pathname);
  const primaryDocument =
    requestedDocument === "siteSettings"
      ? "siteSettings"
      : currentRoute.name === "home"
        ? "homepage"
        : currentRoute.name === "events" || currentRoute.name === "eventDetail"
          ? "eventCatalog"
          : currentRoute.name === "tours" || currentRoute.name === "tourDetail"
            ? "tourCatalog"
            : currentRoute.name === "experiences" && currentRoute.params.cat === "noleggio"
              ? "rentalPage"
              : "siteSettings";

  const homepage = useEditableDocument(
    snapshot.homepage,
    "homepage",
    "content/homepage/index.json",
    primaryDocument === "homepage",
  );
  const tourCatalog = useEditableDocument(
    snapshot.tourCatalog,
    "tourCatalog",
    "content/tours/index.json",
    primaryDocument === "tourCatalog",
  );
  const eventCatalog = useEditableDocument(
    snapshot.eventCatalog,
    "eventCatalog",
    "content/events/index.json",
    primaryDocument === "eventCatalog",
  );
  const rentalEntry = snapshot.rentalPage || {
    data: { rentalPage: rentalPageFallback },
    query: "query rentalPageFallback { __typename }",
    variables: {},
  };
  const rentalPage = useEditableDocument(
    rentalEntry,
    "rentalPage",
    "content/rental/index.json",
    primaryDocument === "rentalPage",
  );
  const siteSettings = useEditableDocument(
    snapshot.siteSettings,
    "siteSettings",
    "content/settings/index.json",
    primaryDocument === "siteSettings",
  );

  const value = useMemo(() => {
    if (locale === "it") {
      const settings = normalizeSettings(siteSettings);
      return {
        homepage,
        rentalPage,
        siteSettings,
        ...settings,
        tours: normalizeTours(tourCatalog),
        events: normalizeEvents(eventCatalog),
      };
    }

    const settings = normalizeSettings(localize(siteSettings));
    return {
      homepage: localize(homepage),
      rentalPage: localize(rentalPage),
      siteSettings,
      ...settings,
      tours: localize(normalizeTours(tourCatalog)),
      events: localize(normalizeEvents(eventCatalog)),
    };
  }, [eventCatalog, homepage, locale, localize, rentalPage, siteSettings, tourCatalog]);

  return <TinaContentContext.Provider value={value}>{children}</TinaContentContext.Provider>;
}

export function useSiteContent() {
  const value = useContext(TinaContentContext);
  if (!value) {
    throw new Error("useSiteContent deve essere usato dentro TinaContentProvider.");
  }
  return value;
}
