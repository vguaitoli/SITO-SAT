import { existsSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getSeoEntries, getSeoForPath, SITE_ORIGIN } from "./seo-config";

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
