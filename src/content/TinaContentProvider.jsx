import { createContext, useContext, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { useTina } from "tinacms/dist/react";
import snapshot from "@/content/tina-snapshot.json";
import { normalizeEvents, normalizeSettings, normalizeTours } from "@/content/normalize";

const TinaContentContext = createContext(null);

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
  return response.data?.[documentName] || entry.data[documentName];
}

export function TinaContentProvider({ children }) {
  const { pathname, search } = useLocation();
  const requestedDocument = new URLSearchParams(search).get("tinaDocument");
  const primaryDocument = requestedDocument === "siteSettings"
    ? "siteSettings"
    : pathname === "/" ? "homepage" : pathname.startsWith("/eventi")
    ? "eventCatalog"
    : pathname.startsWith("/itinerari")
    ? "tourCatalog"
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
  const siteSettings = useEditableDocument(
    snapshot.siteSettings,
    "siteSettings",
    "content/settings/index.json",
    primaryDocument === "siteSettings",
  );

  const value = useMemo(() => {
    const settings = normalizeSettings(siteSettings);
    return {
      homepage,
      siteSettings,
      ...settings,
      tours: normalizeTours(tourCatalog),
      events: normalizeEvents(eventCatalog),
    };
  }, [eventCatalog, homepage, siteSettings, tourCatalog]);

  return <TinaContentContext.Provider value={value}>{children}</TinaContentContext.Provider>;
}

export function useSiteContent() {
  const value = useContext(TinaContentContext);
  if (!value) {
    throw new Error("useSiteContent deve essere usato dentro TinaContentProvider.");
  }
  return value;
}
