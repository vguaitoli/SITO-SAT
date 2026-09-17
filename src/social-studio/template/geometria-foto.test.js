import { describe, expect, it } from "vitest";
import { geometriaCover } from "./geometria-foto";

/**
 * La geometria che sostituisce `object-fit: cover` dove `object-fit` non viene
 * letto.
 *
 * Le due cose da dimostrare sono sempre le stesse, e sono numeriche: la scala è
 * **una sola** per i due assi — cioè le proporzioni non cambiano — e il
 * riquadro è **coperto**, cioè non restano bordi vuoti.
 */

const PANORAMICA = { larghezza: 1800, altezza: 832 }; // 2,16:1 — la fotografia vera
const VERTICALE = { larghezza: 900, altezza: 1600 }; // 0,5625:1
const QUADRATA = { larghezza: 1000, altezza: 1000 };

const POST = { larghezza: 1080, altezza: 1350 };
const STORY = { larghezza: 1080, altezza: 1920 };

/** Quanto l'immagine disegnata si discosta dalle proporzioni del file. */
const deformazione = (g, intrinseca) =>
  Math.abs(g.larghezza / g.altezza - intrinseca.larghezza / intrinseca.altezza);

/** Vero se il riquadro è coperto: nessun bordo scoperto, entro un pixel. */
const copre = (g, contenitore) =>
  g.sinistra <= 0.001 &&
  g.alto <= 0.001 &&
  g.sinistra + g.larghezza >= contenitore.larghezza - 0.001 &&
  g.alto + g.altezza >= contenitore.altezza - 0.001;

describe("le proporzioni non cambiano mai", () => {
  const casi = [];
  for (const [nomeI, intrinseca] of [
    ["panoramica", PANORAMICA],
    ["verticale", VERTICALE],
    ["quadrata", QUADRATA],
  ]) {
    for (const [nomeC, contenitore] of [["post", POST], ["story", STORY]]) {
      for (const zoom of [1, 1.35, 2.4]) {
        for (const [x, y] of [[0.5, 0.5], [0, 0], [1, 1], [0.52, 0.38]]) {
          casi.push([`${nomeI} su ${nomeC}, zoom ${zoom}, fuoco ${x}/${y}`, intrinseca, contenitore, zoom, x, y]);
        }
      }
    }
  }

  it.each(casi)("%s", (_nome, intrinseca, contenitore, zoom, x, y) => {
    const g = geometriaCover({ intrinseca, contenitore, zoom, x, y });
    // Una scala sola: larghezza e altezza scalano dello stesso fattore.
    expect(g.larghezza).toBeCloseTo(intrinseca.larghezza * g.scala, 6);
    expect(g.altezza).toBeCloseTo(intrinseca.altezza * g.scala, 6);
    expect(deformazione(g, intrinseca)).toBeLessThan(1e-9);
    // E il riquadro è coperto per intero.
    expect(copre(g, contenitore), `non copre: ${JSON.stringify(g)}`).toBe(true);
  });
});

describe("la fotografia vera nei due formati", () => {
  it("panoramica su Post: si allarga oltre il riquadro e si ritaglia ai lati", () => {
    const g = geometriaCover({ intrinseca: PANORAMICA, contenitore: POST, zoom: 1 });
    // Copre in altezza: 1350/832 è la scala che serve.
    expect(g.scala).toBeCloseTo(1350 / 832, 9);
    expect(g.altezza).toBeCloseTo(1350, 6);
    expect(g.larghezza).toBeCloseTo(1800 * (1350 / 832), 6);
    expect(g.larghezza).toBeGreaterThan(1080);
    // Centrata: l'eccedenza si divide in parti uguali.
    expect(g.sinistra).toBeCloseTo((1080 - g.larghezza) / 2, 6);
    expect(g.alto).toBeCloseTo(0, 6);
  });

  it("panoramica su Story: la scala cresce ancora, il ritaglio pure", () => {
    const g = geometriaCover({ intrinseca: PANORAMICA, contenitore: STORY, zoom: 1 });
    expect(g.scala).toBeCloseTo(1920 / 832, 9);
    expect(g.altezza).toBeCloseTo(1920, 6);
    // Su 9:16 la stessa fotografia va ingrandita molto di più che su 4:5.
    expect(g.scala).toBeGreaterThan(geometriaCover({ intrinseca: PANORAMICA, contenitore: POST, zoom: 1 }).scala);
  });

  it("verticale su Post: copre in larghezza e si ritaglia sopra e sotto", () => {
    const g = geometriaCover({ intrinseca: VERTICALE, contenitore: POST, zoom: 1 });
    expect(g.scala).toBeCloseTo(1080 / 900, 9);
    expect(g.larghezza).toBeCloseTo(1080, 6);
    expect(g.altezza).toBeGreaterThan(1350);
    expect(g.sinistra).toBeCloseTo(0, 6);
    expect(g.alto).toBeLessThan(0);
  });
});

describe("il punto focale sposta il ritaglio, non le proporzioni", () => {
  it("0 allinea a sinistra, 1 a destra, 0.5 centra", () => {
    const base = { intrinseca: PANORAMICA, contenitore: POST, zoom: 1 };
    const sinistra = geometriaCover({ ...base, x: 0 });
    const centro = geometriaCover({ ...base, x: 0.5 });
    const destra = geometriaCover({ ...base, x: 1 });

    expect(sinistra.sinistra).toBeCloseTo(0, 6);
    expect(destra.sinistra).toBeCloseTo(1080 - destra.larghezza, 6);
    expect(centro.sinistra).toBeGreaterThan(destra.sinistra);
    expect(centro.sinistra).toBeLessThan(sinistra.sinistra + 0.001);
    // La dimensione non cambia: il fuoco sposta, non ridimensiona.
    for (const g of [sinistra, centro, destra]) {
      expect(g.larghezza).toBeCloseTo(centro.larghezza, 6);
      expect(g.altezza).toBeCloseTo(centro.altezza, 6);
    }
  });

  it("un fuoco fuori dominio viene riportato dentro, non propagato", () => {
    const base = { intrinseca: PANORAMICA, contenitore: POST, zoom: 1 };
    expect(geometriaCover({ ...base, x: -3 }).sinistra).toBeCloseTo(
      geometriaCover({ ...base, x: 0 }).sinistra,
      6,
    );
    expect(geometriaCover({ ...base, y: 9 }).alto).toBeCloseTo(
      geometriaCover({ ...base, y: 1 }).alto,
      6,
    );
    // Un fuoco non numerico torna al centro invece di produrre NaN.
    const strano = geometriaCover({ ...base, x: "mezzo" });
    expect(Number.isFinite(strano.sinistra)).toBe(true);
    expect(strano.sinistra).toBeCloseTo(geometriaCover({ ...base, x: 0.5 }).sinistra, 6);
  });
});

describe("lo zoom ingrandisce, e continua a coprire", () => {
  it("moltiplica la scala di copertura", () => {
    const uno = geometriaCover({ intrinseca: PANORAMICA, contenitore: POST, zoom: 1 });
    const uno_e_mezzo = geometriaCover({ intrinseca: PANORAMICA, contenitore: POST, zoom: 1.5 });
    expect(uno_e_mezzo.scala).toBeCloseTo(uno.scala * 1.5, 9);
    expect(uno_e_mezzo.larghezza).toBeCloseTo(uno.larghezza * 1.5, 6);
    expect(uno_e_mezzo.altezza).toBeCloseTo(uno.altezza * 1.5, 6);
    expect(copre(uno_e_mezzo, POST)).toBe(true);
  });
});

describe("senza dimensioni non si disegna niente", () => {
  const nonCalcolabili = [
    ["intrinseca assente", { contenitore: POST }],
    ["intrinseca a zero", { intrinseca: { larghezza: 0, altezza: 0 }, contenitore: POST }],
    ["intrinseca parziale", { intrinseca: { larghezza: 1800 }, contenitore: POST }],
    ["contenitore assente", { intrinseca: PANORAMICA }],
    ["contenitore a zero", { intrinseca: PANORAMICA, contenitore: { larghezza: 0, altezza: 0 } }],
    ["zoom zero", { intrinseca: PANORAMICA, contenitore: POST, zoom: 0 }],
    ["zoom non numerico", { intrinseca: PANORAMICA, contenitore: POST, zoom: NaN }],
  ];

  it.each(nonCalcolabili)("%s: restituisce null", (_nome, opzioni) => {
    // `null` e non una geometria approssimata: disegnare con misure provvisorie
    // è esattamente il rischio che si sta chiudendo.
    expect(geometriaCover(opzioni)).toBeNull();
  });
});
