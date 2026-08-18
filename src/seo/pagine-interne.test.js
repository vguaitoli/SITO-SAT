import { describe, expect, it } from "vitest";
import { getSeoEntries, getSeoForPath } from "./seo-config";

/**
 * Metadati delle pagine interne.
 *
 * `/admin/social` cadeva nel ramo «pagina non trovata»: il titolo del browser
 * diceva «Pagina non trovata | Sardegna Trail Avventura» su una pagina che
 * funziona, e la pagina si portava dietro canonical, hreflang, Open Graph e
 * dati strutturati di un indirizzo inesistente.
 */

describe("/admin/social", () => {
  const seo = getSeoForPath("/admin/social");

  it("si dichiara pagina privata", () => {
    expect(seo.privata).toBe(true);
    expect(seo.indexable).toBe(false);
  });

  it("ha un titolo che dice cosa è", () => {
    expect(seo.title).toBe("STA Social Studio | Sardegna Trail Avventura");
    expect(seo.title).not.toMatch(/non trovata/i);
  });

  it("è noindex, nofollow e noarchive", () => {
    expect(seo.robots).toBe("noindex, nofollow, noarchive");
  });

  it("non porta metadati pubblici", () => {
    // Nessun canonical, nessun hreflang, nessun Open Graph: su una pagina
    // interna sarebbero indicazioni sbagliate date a un pubblico che non c'è.
    for (const campo of ["canonical", "alternates", "image", "structuredData", "description"]) {
      expect(seo[campo], `«${campo}» non deve esserci`).toBeUndefined();
    }
  });

  it("vale anche per gli indirizzi sotto il prefisso", () => {
    expect(getSeoForPath("/admin/social/api/caption").privata).toBe(true);
  });

  it("non entra in sitemap né nel prerendering", () => {
    const percorsi = getSeoEntries().map((e) => e.path);
    expect(percorsi.some((p) => p.startsWith("/admin"))).toBe(false);
  });
});

describe("le altre rotte non cambiano", () => {
  it("la home resta indicizzabile e con i suoi metadati", () => {
    const home = getSeoForPath("/");
    expect(home.privata).toBeUndefined();
    expect(home.indexable).toBe(true);
    expect(home.canonical).toMatch(/^https?:\/\//);
    expect(home.alternates.it).toBeTruthy();
  });

  it("una pagina inesistente resta un 404 con il suo titolo", () => {
    const persa = getSeoForPath("/questa-non-esiste");
    expect(persa.privata).toBeUndefined();
    expect(persa.title).toMatch(/non trovata/i);
    expect(persa.robots).toBe("noindex, nofollow");
  });
});
