import { existsSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getSeoEntries,
  getSeoForPath,
  getSitemapEntries,
  SITE_ORIGIN,
} from "./seo-config";
import { AFRICA_TRIPS } from "@/data/africa";
import { AFRICA_EN, AFRICA_FR } from "@/i18n/africa-messages";

function eventNode(pathname) {
  return getSeoForPath(pathname).structuredData["@graph"].find(
    (node) => node["@type"] === "Event",
  );
}

function collectLocalMedia(value, result = new Set()) {
  if (typeof value === "string" && value.startsWith(`${SITE_ORIGIN}/media/`)) {
    result.add(new URL(value).pathname);
  } else if (Array.isArray(value)) {
    value.forEach((item) => collectLocalMedia(item, result));
  } else if (value && typeof value === "object") {
    Object.values(value).forEach((item) => collectLocalMedia(item, result));
  }
  return result;
}

afterEach(() => {
  vi.useRealTimers();
});

describe("asset SEO", () => {
  it("ogni immagine locale pubblicata esiste in public", () => {
    const media = new Set();

    for (const entry of getSeoEntries()) {
      collectLocalMedia(entry.image, media);
      collectLocalMedia(entry.preloadImage, media);
      collectLocalMedia(entry.structuredData, media);
    }

    const missing = [...media].filter(
      (pathname) => !existsSync(path.join(process.cwd(), "public", pathname)),
    );
    expect(missing).toEqual([]);
  });
});

describe("indicizzazione dei viaggi Africa", () => {
  it("indicizza la pagina e tutti i viaggi italiani", () => {
    const sitemapPaths = getSitemapEntries().map((entry) => entry.path);

    expect(sitemapPaths).toContain("/viaggi-africa");
    for (const trip of AFRICA_TRIPS) {
      expect(sitemapPaths).toContain(`/viaggi-africa/${trip.slug}`);
    }
  });

  it("presenta ogni viaggio per moto, 4x4, quad e SSV", () => {
    for (const trip of AFRICA_TRIPS) {
      expect(trip.vehicles).toBe("Moto · 4x4 · Quad · SSV");
    }
  });

  it("indicizza tutte le versioni linguistiche", () => {
    expect(getSeoForPath("/en/africa-trips").indexable).toBe(true);
    expect(getSeoForPath("/fr/voyages-afrique").indexable).toBe(true);

    const sitemapPaths = getSitemapEntries().map((entry) => entry.path);
    for (const trip of AFRICA_TRIPS) {
      expect(sitemapPaths).toContain(`/en/africa-trips/${trip.slug}`);
      expect(sitemapPaths).toContain(`/fr/voyages-afrique/${trip.slug}`);
    }
  });

  it("traduce integralmente la proposta Marocco in EN e FR", () => {
    const morocco = AFRICA_TRIPS.find((trip) => trip.country === "Marocco");
    const sourceStrings = [
      morocco.country,
      morocco.title,
      morocco.subtitle,
      morocco.coverAlt,
      morocco.description,
      ...morocco.stages.flat(),
      "Proposta di itinerario",
      "Itinerario proposto, da validare con gli accompagnatori. Tracce, trasferimenti e pernottamenti sono da definire.",
      "Prezzo, servizi inclusi e date di partenza sono in preparazione.",
      "Foto: Jamou · Wikimedia Commons",
      "Ridimensionata e ritagliata",
    ];

    for (const source of sourceStrings) {
      expect(AFRICA_EN[source], `Traduzione EN mancante: ${source}`).toBeTruthy();
      expect(AFRICA_FR[source], `Traduzione FR mancante: ${source}`).toBeTruthy();
    }
  });
});

describe("ciclo di vita degli eventi nel JSON-LD", () => {
  it("marca un evento concluso e non pubblica più un'offerta acquistabile", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-21T10:00:00+02:00"));

    const event = eventNode("/eventi/wild-camp-ferragosto-2026");
    expect(event.eventStatus).toBe("https://schema.org/EventCompleted");
    expect(event.offers).toBeUndefined();
  });

  it("mantiene programmato e disponibile un evento futuro", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-21T10:00:00+02:00"));

    const event = eventNode("/eventi/sardinia-into-the-wild-2026");
    expect(event.eventStatus).toBe("https://schema.org/EventScheduled");
    expect(event.offers?.availability).toBe("https://schema.org/InStock");
  });
});
