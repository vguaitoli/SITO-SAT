import { describe, expect, it } from "vitest";
import {
  CATEGORIE, ELENCO_CATEGORIE, formatoValido, ID_CATEGORIE,
  predefinitiCategoria, varianteValida,
} from "./categorie";
import { areaUtile, dentroAreaSicura, FORMATI } from "./formati";
import { COLORI } from "./tokens";
import { PROPRIETA_BLOCCATE, PROPRIETA_LIBERE, puoiModificare } from "../fondamenta/brand-lock";
import { CATEGORIE as CATEGORIE_SCHEMA } from "../fondamenta/schema";

describe("le otto rubriche", () => {
  it("sono otto, numerate da 01 a 08", () => {
    expect(ELENCO_CATEGORIE).toHaveLength(8);
    expect(ELENCO_CATEGORIE.map((c) => c.numero)).toEqual([
      "01", "02", "03", "04", "05", "06", "07", "08",
    ]);
  });

  it("coincidono con quelle dichiarate nello schema", () => {
    // Due elenchi che divergono sono un errore che si scopre a runtime.
    expect([...ID_CATEGORIE].sort()).toEqual([...CATEGORIE_SCHEMA].sort());
  });

  it("hanno pesi che sommano a cento", () => {
    for (const c of ELENCO_CATEGORIE) {
      expect(c.pesoFoto + c.pesoGrafica, `${c.nome}`).toBe(100);
    }
  });

  it("hanno pesi fotografici diversi fra loro: non sono otto copie", () => {
    const pesi = new Set(ELENCO_CATEGORIE.map((c) => c.pesoFoto));
    expect(pesi.size).toBeGreaterThanOrEqual(5);
  });

  it("rispettano la gerarchia dichiarata nel brief", () => {
    expect(CATEGORIE.crew.pesoFoto).toBe(95);
    expect(CATEGORIE.sardegna.pesoFoto).toBe(90);
    expect(CATEGORIE.guide.pesoFoto).toBe(80);
    expect(CATEGORIE.info.pesoFoto).toBe(20);
    // Info è l'unica su fondo chiaro.
    expect(CATEGORIE.info.fondoChiaro).toBe(true);
    expect(ELENCO_CATEGORIE.filter((c) => c.fondoChiaro)).toHaveLength(1);
  });

  it("hanno da due a tre varianti approvate", () => {
    for (const c of ELENCO_CATEGORIE) {
      expect(c.varianti.length, `${c.nome}`).toBeGreaterThanOrEqual(2);
      expect(c.varianti.length, `${c.nome}`).toBeLessThanOrEqual(3);
    }
  });
});

describe("l'accento #E18A3C", () => {
  it("è l'accento della sola rubrica EVENTI", () => {
    expect(CATEGORIE.eventi.accento).toBe("#E18A3C");
    const altre = ELENCO_CATEGORIE.filter((c) => c.id !== "eventi");
    for (const c of altre) {
      expect(c.accento, `${c.nome} non deve usare l'arancio degli eventi`).toBe(COLORI.accento);
    }
  });

  it("non sostituisce l'accento globale del sito", () => {
    // Il token del sito resta l'oxblood: è il punto della decisione «ibrida».
    expect(COLORI.accento).toBe("#A0612A");
    expect(COLORI.accentoEventi).toBe("#E18A3C");
  });
});

describe("varianti e formati", () => {
  it("accetta solo le varianti approvate", () => {
    expect(varianteValida("sardegna", "full-bleed")).toBe(true);
    expect(varianteValida("sardegna", "neon")).toBe(false);
    expect(varianteValida("inesistente", "standard")).toBe(false);
  });

  it("accetta solo i formati previsti per la rubrica", () => {
    expect(formatoValido("eventi", "carosello")).toBe(true);
    // Il carosello è previsto solo dove ha senso.
    expect(formatoValido("crew", "carosello")).toBe(false);
    expect(formatoValido("info", "carosello")).toBe(true);
  });

  it("i predefiniti si caricano dalla rubrica", () => {
    const p = predefinitiCategoria("eventi");
    expect(p.accento).toBe("#E18A3C");
    expect(p.pesoFoto).toBe(50);
    expect(p.variante).toBe("standard");
  });
});

describe("formati e aree di sicurezza", () => {
  it("il Post è 1080×1350 e la Story 1080×1920", () => {
    expect([FORMATI.post.larghezza, FORMATI.post.altezza]).toEqual([1080, 1350]);
    expect([FORMATI.story.larghezza, FORMATI.story.altezza]).toEqual([1080, 1920]);
  });

  it("la Story non è un Post stirato: ha margini propri", () => {
    // In alto la barra di avanzamento, in basso «rispondi» e lo sticker.
    expect(FORMATI.story.margine.alto).toBeGreaterThan(FORMATI.post.margine.alto * 2);
    expect(FORMATI.story.margine.basso).toBeGreaterThan(FORMATI.post.margine.basso * 3);
  });

  it("riserva alla Story una fascia per lo sticker del link", () => {
    expect(FORMATI.story.zonaSticker.altezza).toBeGreaterThan(0);
  });

  it("il carosello ha otto slide fisse", () => {
    expect(FORMATI.carosello.slide).toBe(8);
  });

  it("calcola l'area utile al netto dei margini", () => {
    const a = areaUtile("post");
    expect(a).toEqual({ x: 84, y: 84, larghezza: 1080 - 168, altezza: 1350 - 168 });
  });

  it("riconosce un elemento fuori dall'area sicura", () => {
    expect(dentroAreaSicura("post", { x: 84, y: 84, larghezza: 100, altezza: 100 }).dentro).toBe(true);

    const fuori = dentroAreaSicura("story", { x: 20, y: 20, larghezza: 200, altezza: 200 });
    expect(fuori.dentro).toBe(false);
    expect(fuori.sfori).toContain("alto");
    expect(fuori.sfori).toContain("sinistra");
  });

  it("segnala un logo che sborda in basso su Story", () => {
    const f = FORMATI.story;
    const logo = { x: f.margine.sinistro, y: f.altezza - 200, larghezza: 300, altezza: 80 };
    expect(dentroAreaSicura("story", logo).sfori).toContain("basso");
  });
});

describe("Brand Lock", () => {
  it("blocca ciò che costituisce l'identità", () => {
    for (const p of ["font", "palette", "logo", "margini", "numerazione", "proporzioni"]) {
      expect(puoiModificare(p, true).consentito, p).toBe(false);
    }
  });

  it("lascia libero il contenuto", () => {
    for (const p of ["testi", "fotografie", "ritaglio", "gpx", "caption", "tappe"]) {
      expect(puoiModificare(p, true).consentito, p).toBe(true);
    }
  });

  it("blocca per prudenza ciò che non è classificato", () => {
    // Una proprietà nuova non dichiarata non deve passare per distrazione.
    const esito = puoiModificare("proprietaMaiVista", true);
    expect(esito.consentito).toBe(false);
    expect(esito.motivo).toMatch(/PROPRIETA_LIBERE/);
  });

  it("da disattivato consente tutto", () => {
    expect(puoiModificare("font", false).consentito).toBe(true);
    expect(puoiModificare("proprietaMaiVista", false).consentito).toBe(true);
  });

  it("non elenca la stessa proprietà fra libere e bloccate", () => {
    const doppie = PROPRIETA_BLOCCATE.filter((p) => PROPRIETA_LIBERE.includes(p));
    expect(doppie).toEqual([]);
  });
});
