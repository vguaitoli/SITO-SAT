import { describe, expect, it } from "vitest";
import { analizzaSnapshot } from "./controlla-snapshot.mjs";

/**
 * La guardia deve riconoscere lo snapshot riscritto dal dev server.
 *
 * Il caso reale: TinaCMS in locale sostituisce gli URL del CDN con percorsi
 * /media/cms/…, che in produzione non esistono. È già successo in questo
 * progetto, e senza controllo si scopre solo quando le immagini spariscono.
 */
describe("analizzaSnapshot", () => {
  it("accetta uno snapshot con soli URL del CDN", () => {
    const testo = JSON.stringify({
      logo: "https://assets.tina.io/abc/__file/media/logo.png",
      guida: "https://assets.tina.io/abc/__file/guide-gianluca.webp",
    });
    expect(analizzaSnapshot(testo)).toEqual({ locali: 0, cdn: 2, sospetto: false });
  });

  it("segnala i percorsi locali scritti dal dev server", () => {
    const testo = JSON.stringify({
      logo: "/media/cms/media/logo.png",
      guida: "/media/cms/guide-gianluca.webp",
    });
    const esito = analizzaSnapshot(testo);
    expect(esito.sospetto).toBe(true);
    expect(esito.locali).toBe(2);
  });

  it("segnala anche uno snapshot misto", () => {
    const testo = JSON.stringify({
      a: "https://assets.tina.io/abc/__file/x.png",
      b: "/media/cms/y.webp",
    });
    expect(analizzaSnapshot(testo)).toEqual({ locali: 1, cdn: 1, sospetto: true });
  });

  it("non confonde un percorso simile ma legittimo", () => {
    // /media/reali/ è la cartella pubblica del sito: non c'entra con Tina.
    const testo = JSON.stringify({ foto: "/media/reali/maxienduro-gallura-1200.webp" });
    expect(analizzaSnapshot(testo).sospetto).toBe(false);
  });

  it("regge uno snapshot vuoto", () => {
    expect(analizzaSnapshot("{}")).toEqual({ locali: 0, cdn: 0, sospetto: false });
  });
});
