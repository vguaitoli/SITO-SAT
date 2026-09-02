import { describe, expect, it } from "vitest";
import { profiloAltimetrico, proiettaProfilo } from "./altimetria";
import { distanzaFra } from "./gpx";

/**
 * Il profilo altimetrico.
 *
 * Geometrie sintetiche e minime: provano le regole, non imitano un percorso.
 * Nessun dato del GPX reale entra nel repository.
 *
 * La regola che questi test difendono più di ogni altra è la stessa in due
 * forme: **quello che il file non dice, il grafico non lo disegna**. Un buco di
 * quota interrompe il tratto, due segmenti restano due tratti, e nessuna
 * distanza viene inventata fra l'uno e l'altro.
 */

/** Punti equispaziati in longitudine, con quote date. */
const traccia = (quote, { lat = 40.5, lon0 = 9.1, passo = 0.01 } = {}) =>
  quote.map((quota, i) => ({ lon: lon0 + i * passo, lat, quota }));

const tutteLeQuote = (profilo) => profilo.tratti.flat().map((p) => p.quota);
const tutteLeDistanze = (profilo) => profilo.tratti.flat().map((p) => p.distanza);

describe("profiloAltimetrico", () => {
  it("un solo segmento continuo produce un solo tratto", () => {
    const p = profiloAltimetrico([traccia([10, 20, 30, 40])]);
    expect(p.tratti).toHaveLength(1);
    expect(p.tratti[0]).toHaveLength(4);
    expect(p.utilizzabile).toBe(true);
    expect(p.interrotto).toBe(false);
    expect(p.parziale).toBe(false);
  });

  it("due segmenti restano due tratti, senza collegamento", () => {
    const a = traccia([10, 20, 30]);
    const b = traccia([100, 110], { lat: 41.9, lon0: 9.9 });
    const p = profiloAltimetrico([a, b]);

    expect(p.tratti).toHaveLength(2);
    expect(p.interrotto).toBe(true);
    // Nessun tratto contiene punti di entrambi i segmenti: se venissero uniti,
    // ne resterebbe uno solo da cinque punti.
    expect(p.tratti.map((t) => t.length)).toEqual([3, 2]);
  });

  it("fra due segmenti non si aggiunge distanza", () => {
    const a = traccia([10, 20, 30]);
    // Il secondo segmento comincia lontanissimo: se il salto venisse misurato,
    // la distanza totale crescerebbe di oltre cento chilometri.
    const b = traccia([100, 110], { lat: 41.9, lon0: 9.9 });
    const p = profiloAltimetrico([a, b]);

    const dentroA = distanzaFra(a[0], a[1]) + distanzaFra(a[1], a[2]);
    const dentroB = distanzaFra(b[0], b[1]);
    expect(p.distanzaTotale).toBeCloseTo(dentroA + dentroB, 6);

    const salto = distanzaFra(a[2], b[0]);
    expect(salto).toBeGreaterThan(100000);
    expect(p.distanzaTotale).toBeLessThan(dentroA + dentroB + 1);
  });

  it("un buco di quota interrompe il tratto invece di essere interpolato", () => {
    const p = profiloAltimetrico([traccia([10, 20, null, null, 50, 60])]);

    expect(p.tratti).toHaveLength(2);
    expect(p.parziale).toBe(true);
    expect(p.puntiSenzaQuota).toBe(2);
    expect(p.puntiConQuota).toBe(4);
    // Le quote sono soltanto quelle lette: nessun 30 e nessun 40 inventati per
    // riempire il buco.
    expect(tutteLeQuote(p)).toEqual([10, 20, 50, 60]);
  });

  it("la distanza continua a scorrere sotto un buco di quota", () => {
    // Due punti dopo il buco, non uno: serve un tratto vero da confrontare.
    const punti = traccia([10, 20, null, 40, 50]);
    const p = profiloAltimetrico([punti]);
    const fino = (n) => {
      let s = 0;
      for (let i = 1; i <= n; i += 1) s += distanzaFra(punti[i - 1], punti[i]);
      return s;
    };

    // Il terreno sotto il buco è stato percorso: l'asse deve tenerne conto,
    // altrimenti il grafico si accorcerebbe e il secondo tratto slitterebbe
    // indietro come se il buco non fosse mai esistito.
    expect(p.tratti).toHaveLength(2);
    expect(p.distanzaTotale).toBeCloseTo(fino(4), 6);
    expect(p.tratti[1][0].distanza).toBeCloseTo(fino(3), 6);
    // …e il salto sotto il buco è proprio quello del punto senza quota.
    expect(p.tratti[1][0].distanza - p.tratti[0].at(-1).distanza).toBeCloseTo(
      distanzaFra(punti[1], punti[2]) + distanzaFra(punti[2], punti[3]),
      6,
    );
  });

  it("un punto isolato fra due buchi non produce un tratto", () => {
    const p = profiloAltimetrico([traccia([null, 42, null])]);
    expect(p.tratti).toHaveLength(0);
    expect(p.utilizzabile).toBe(false);
    expect(p.puntiConQuota).toBe(1);
  });

  it("quota zero è un dato, non un'assenza", () => {
    const p = profiloAltimetrico([traccia([0, 0, 5, 0])]);
    // `if (!quota)` qui cancellerebbe tre punti su quattro.
    expect(p.tratti).toHaveLength(1);
    expect(p.tratti[0]).toHaveLength(4);
    expect(p.quotaMin).toBe(0);
    expect(p.quotaMax).toBe(5);
  });

  it("le quote negative sono valide", () => {
    const p = profiloAltimetrico([traccia([-12, -4, 0, 8])]);
    expect(p.quotaMin).toBe(-12);
    expect(p.quotaMax).toBe(8);
    expect(p.tratti[0]).toHaveLength(4);
  });

  it("un profilo piatto resta un profilo", () => {
    const p = profiloAltimetrico([traccia([300, 300, 300])]);
    expect(p.utilizzabile).toBe(true);
    expect(p.quotaMin).toBe(300);
    expect(p.quotaMax).toBe(300);
  });

  it("la distanza cumulativa cresce e coincide con distanzaFra", () => {
    const punti = traccia([10, 20, 30, 40, 50]);
    const p = profiloAltimetrico([punti]);
    const d = tutteLeDistanze(p);

    expect(d[0]).toBe(0);
    for (let i = 1; i < d.length; i += 1) expect(d[i]).toBeGreaterThan(d[i - 1]);
    let somma = 0;
    for (let i = 1; i < punti.length; i += 1) {
      somma += distanzaFra(punti[i - 1], punti[i]);
      expect(d[i]).toBeCloseTo(somma, 9);
    }
    expect(p.distanzaTotale).toBeCloseTo(somma, 9);
  });

  it("minimo e massimo vengono da tutti i segmenti", () => {
    const p = profiloAltimetrico([traccia([100, 200]), traccia([5, 900], { lat: 41.2 })]);
    expect(p.quotaMin).toBe(5);
    expect(p.quotaMax).toBe(900);
  });

  it("senza alcuna quota il profilo non è utilizzabile", () => {
    const p = profiloAltimetrico([traccia([null, null, null])]);
    expect(p.utilizzabile).toBe(false);
    expect(p.tratti).toHaveLength(0);
    expect(p.quotaMin).toBeNull();
    expect(p.quotaMax).toBeNull();
  });

  it("senza segmenti non si rompe", () => {
    for (const vuoto of [[], [[]], undefined, null]) {
      const p = profiloAltimetrico(vuoto);
      expect(p.utilizzabile).toBe(false);
      expect(p.distanzaTotale).toBe(0);
    }
  });

  it("non tocca i punti in ingresso", () => {
    const segmenti = [traccia([10, null, 30]), traccia([40, 50], { lat: 41 })];
    const copia = JSON.parse(JSON.stringify(segmenti));
    profiloAltimetrico(segmenti);
    expect(segmenti).toEqual(copia);
  });

  it("nessun NaN e nessun Infinity, in nessun caso", () => {
    const casi = [
      traccia([10, 20, 30]),
      traccia([0, 0, 0]),
      traccia([-5, 0, 5]),
      traccia([10, null, 30]),
      [{ lon: 9.1, lat: 40.5, quota: 12 }, { lon: 9.1, lat: 40.5, quota: 12 }], // due punti sovrapposti
    ];
    for (const seg of casi) {
      const p = profiloAltimetrico([seg]);
      for (const v of [p.distanzaTotale, p.quotaMin, p.quotaMax]) {
        if (v !== null) expect(Number.isFinite(v)).toBe(true);
      }
      for (const punto of p.tratti.flat()) {
        expect(Number.isFinite(punto.distanza)).toBe(true);
        expect(Number.isFinite(punto.quota)).toBe(true);
      }
    }
  });
});

/* ------------------------------------------------------------------ *
 * Dalla quota ai pixel
 * ------------------------------------------------------------------ */

describe("proiettaProfilo", () => {
  const RIQUADRO = { larghezza: 900, altezza: 120 };

  it("porta il profilo dentro il riquadro, zero in basso", () => {
    const p = profiloAltimetrico([traccia([0, 100, 50])]);
    const { tratti } = proiettaProfilo(p, RIQUADRO);
    const punti = tratti.flat();

    for (const [x, y] of punti) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(RIQUADRO.larghezza);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(RIQUADRO.altezza);
    }
    // La quota minima tocca il fondo, la massima il bordo alto.
    expect(punti[0][1]).toBeCloseTo(RIQUADRO.altezza, 9);
    expect(punti[1][1]).toBeCloseTo(0, 9);
    expect(punti[0][0]).toBeCloseTo(0, 9);
    expect(punti.at(-1)[0]).toBeCloseTo(RIQUADRO.larghezza, 9);
  });

  it("un profilo piatto sta a metà altezza e non produce NaN", () => {
    const p = profiloAltimetrico([traccia([300, 300, 300])]);
    const { tratti } = proiettaProfilo(p, RIQUADRO);
    for (const [x, y] of tratti.flat()) {
      expect(Number.isFinite(x)).toBe(true);
      expect(Number.isFinite(y)).toBe(true);
      expect(y).toBeCloseTo(RIQUADRO.altezza / 2, 9);
    }
  });

  it("punti tutti sovrapposti non producono NaN", () => {
    const fermo = [
      { lon: 9.1, lat: 40.5, quota: 10 },
      { lon: 9.1, lat: 40.5, quota: 20 },
    ];
    const { tratti } = proiettaProfilo(profiloAltimetrico([fermo]), RIQUADRO);
    for (const [x, y] of tratti.flat()) {
      expect(Number.isFinite(x)).toBe(true);
      expect(Number.isFinite(y)).toBe(true);
    }
  });

  it("le quote negative restano dentro il riquadro", () => {
    const p = profiloAltimetrico([traccia([-40, 0, 60])]);
    const { tratti, quotaMin, quotaMax } = proiettaProfilo(p, RIQUADRO);
    expect(quotaMin).toBe(-40);
    expect(quotaMax).toBe(60);
    for (const [, y] of tratti.flat()) {
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(RIQUADRO.altezza);
    }
  });

  it("i tratti separati restano separati anche in pixel", () => {
    const p = profiloAltimetrico([traccia([10, 20]), traccia([30, 40], { lat: 41.5 })]);
    const { tratti } = proiettaProfilo(p, RIQUADRO);
    expect(tratti).toHaveLength(2);
    expect(tratti.map((t) => t.length)).toEqual([2, 2]);
  });

  it("un profilo inutilizzabile non produce tratti", () => {
    const { tratti } = proiettaProfilo(profiloAltimetrico([traccia([null, null])]), RIQUADRO);
    expect(tratti).toEqual([]);
  });

  it("non tocca il profilo in ingresso", () => {
    const p = profiloAltimetrico([traccia([10, 20, 30])]);
    const copia = JSON.parse(JSON.stringify(p));
    proiettaProfilo(p, RIQUADRO);
    expect(p).toEqual(copia);
  });
});
