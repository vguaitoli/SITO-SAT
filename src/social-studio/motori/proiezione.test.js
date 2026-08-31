import { describe, expect, it } from "vitest";
import { creaVista, semplificaProiettato, tracciaPath } from "./proiezione";
import { TOLLERANZA_DISEGNO_PX } from "../template/Mappa";

/**
 * Semplificazione della traccia per il disegno.
 *
 * La garanzia è una sola e si enuncia in pixel: **fra la polilinea disegnata e
 * quella vera non ci sono più di mezzo pixel**. Prima la tolleranza si
 * calcolava in gradi con `0.5 / scala / 360`, dividendo per 360 una seconda
 * volta dopo che `mercatore` l'aveva già fatto: veniva 360 volte troppo
 * piccola e non toglieva quasi niente.
 *
 * Le geometrie qui sono sintetiche e minime: servono a provare la matematica,
 * non a imitare un percorso. Il GPX reale non entra nel repository.
 */

/** I vertici scritti in un attributo `d`, riletti come numeri. */
function leggiVertici(d) {
  const n = (d.match(/-?\d*\.?\d+(?:[eE][-+]?\d+)?/g) || []).map(Number);
  return Array.from({ length: n.length / 2 }, (_, i) => [n[i * 2], n[i * 2 + 1]]);
}

/** Errore massimo, in pixel, fra la polilinea piena e quella tenuta. */
function erroreMassimo(pieni, tenuti) {
  const distanza = (p, a, b) => {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const len2 = dx * dx + dy * dy;
    if (len2 === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
    const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2));
    return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
  };
  const chiave = (p) => `${p[0]},${p[1]}`;
  const tenutiSet = new Set(tenuti.map(chiave));
  const indici = pieni.map((p, i) => (tenutiSet.has(chiave(p)) ? i : -1)).filter((i) => i >= 0);
  let max = 0;
  for (let k = 0; k < indici.length - 1; k += 1) {
    for (let i = indici[k] + 1; i < indici[k + 1]; i += 1) {
      max = Math.max(max, distanza(pieni[i], pieni[indici[k]], pieni[indici[k + 1]]));
    }
  }
  return max;
}

/**
 * Errore di una spezzata **data**, senza accoppiarne i vertici ai punti pieni.
 *
 * Diversamente da {@link erroreMassimo}, qui i vertici non devono ritrovarsi fra
 * i punti originali: si misura la distanza di ogni punto vero dalla spezzata
 * così com'è. È l'unico modo di dare un numero a una polilinea le cui coordinate
 * possono essere state alterate dopo la semplificazione.
 */
function errorePolilinea(pieni, vertici) {
  const distanza = (p, a, b) => {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const len2 = dx * dx + dy * dy;
    if (len2 === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
    const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2));
    return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
  };
  let max = 0;
  for (const p of pieni) {
    let minima = Infinity;
    for (let k = 0; k < vertici.length - 1; k += 1) {
      minima = Math.min(minima, distanza(p, vertici[k], vertici[k + 1]));
    }
    max = Math.max(max, minima);
  }
  return max;
}

/** Un arco poco profondo e fitto: la semplificazione si ferma vicino al limite. */
const arcoFitto = (n, freccia) =>
  Array.from({ length: n }, (_, i) => [i * 0.6, freccia * Math.sin((i / (n - 1)) * Math.PI)]);

/** Un dente di sega: ampiezza nota, quindi errore atteso calcolabile a mano. */
const denteDiSega = (n, ampiezza) =>
  Array.from({ length: n }, (_, i) => [i * 10, i % 2 === 0 ? 0 : ampiezza]);

/** Una linea quasi retta, con scarti sotto la soglia. */
const quasiRetta = (n, scarto) =>
  Array.from({ length: n }, (_, i) => [i, i % 2 === 0 ? 0 : scarto]);

describe("semplificaProiettato", () => {
  it("non supera mai la tolleranza dichiarata", () => {
    // Denti da 3 px: sopra mezzo pixel, quindi vanno tenuti.
    const punti = denteDiSega(201, 3);
    const ridotti = semplificaProiettato(punti, 0.5);
    expect(erroreMassimo(punti, ridotti)).toBeLessThanOrEqual(0.5);
  });

  it("la garanzia vale per qualunque tolleranza, non solo per mezzo pixel", () => {
    const punti = denteDiSega(401, 7);
    for (const t of [0.1, 0.5, 1, 2, 5]) {
      const ridotti = semplificaProiettato(punti, t);
      expect(erroreMassimo(punti, ridotti), `tolleranza ${t}`).toBeLessThanOrEqual(t);
    }
  });

  it("riduce davvero una polilinea densa", () => {
    // Scarti da 0,05 px: sotto la soglia, quindi la linea collassa.
    const punti = quasiRetta(2001, 0.05);
    const ridotti = semplificaProiettato(punti, 0.5);
    expect(ridotti.length).toBe(2);
    // Con la vecchia tolleranza — 360 volte più piccola — non sarebbe successo.
    expect(semplificaProiettato(punti, 0.5 / 360).length).toBeGreaterThan(1000);
  });

  it("conserva primo e ultimo punto", () => {
    const punti = denteDiSega(101, 4);
    const ridotti = semplificaProiettato(punti, 0.5);
    expect(ridotti[0]).toEqual(punti[0]);
    expect(ridotti.at(-1)).toEqual(punti.at(-1));
  });

  it("un anello chiuso resta chiuso", () => {
    const anello = [];
    for (let i = 0; i < 360; i += 1) {
      const a = (i * Math.PI) / 180;
      anello.push([500 + 200 * Math.cos(a), 500 + 200 * Math.sin(a)]);
    }
    // Chiuso davvero: l'ultimo punto **è** il primo, come nel GPX reale, non
    // il suo equivalente trigonometrico a meno di un errore di virgola mobile.
    anello.push(anello[0]);
    expect(anello[0]).toEqual(anello.at(-1));
    const ridotto = semplificaProiettato(anello, 0.5);
    expect(ridotto[0]).toEqual(ridotto.at(-1));
    expect(ridotto.length).toBeLessThan(anello.length);
    expect(erroreMassimo(anello, ridotto)).toBeLessThanOrEqual(0.5);
  });

  it("tolleranza zero conserva tutti i punti", () => {
    const punti = denteDiSega(51, 3);
    expect(semplificaProiettato(punti, 0)).toHaveLength(punti.length);
    expect(semplificaProiettato(punti, -1)).toHaveLength(punti.length);
  });

  it("non inventa punti: il risultato è un sottoinsieme dell'originale", () => {
    const punti = denteDiSega(201, 3);
    const ridotti = semplificaProiettato(punti, 0.5);
    const originali = new Set(punti.map((p) => `${p[0]},${p[1]}`));
    for (const p of ridotti) expect(originali.has(`${p[0]},${p[1]}`)).toBe(true);
    // E nell'ordine di partenza.
    const indici = ridotti.map((p) => punti.findIndex((q) => q[0] === p[0] && q[1] === p[1]));
    expect(indici).toEqual([...indici].sort((a, b) => a - b));
  });

  it("non tocca i punti in ingresso", () => {
    const punti = denteDiSega(101, 3);
    const copia = JSON.parse(JSON.stringify(punti));
    semplificaProiettato(punti, 0.5);
    expect(punti).toEqual(copia);
  });

  it("meno di tre punti torna com'è", () => {
    expect(semplificaProiettato([], 0.5)).toEqual([]);
    expect(semplificaProiettato([[0, 0]], 0.5)).toEqual([[0, 0]]);
    expect(semplificaProiettato([[0, 0], [1, 1]], 0.5)).toEqual([[0, 0], [1, 1]]);
  });
});

/* ------------------------------------------------------------------ *
 * La garanzia dopo la proiezione vera
 * ------------------------------------------------------------------ */

describe("mezzo pixel sul canvas, in ogni vista", () => {
  /** Una traccia geografica sintetica: un cerchio con del tremolio sopra. */
  const traccia = (n = 1500) =>
    Array.from({ length: n + 1 }, (_, i) => {
      const a = (i / n) * Math.PI * 2;
      const tremolio = 0.0004 * Math.sin(i * 0.7);
      return { lon: 9.3 + (0.3 + tremolio) * Math.cos(a), lat: 40.8 + (0.3 + tremolio) * Math.sin(a) };
    });

  const bb = (punti) => ({
    minLon: Math.min(...punti.map((p) => p.lon)), maxLon: Math.max(...punti.map((p) => p.lon)),
    minLat: Math.min(...punti.map((p) => p.lat)), maxLat: Math.max(...punti.map((p) => p.lat)),
  });

  const viste = [
    ["Story", { larghezza: 1240, altezza: 930 }],
    ["carosello", { larghezza: 960, altezza: 720 }],
    ["tela minuscola", { larghezza: 200, altezza: 150 }],
    ["zoom 3", { larghezza: 1240, altezza: 930, zoom: 3 }],
    ["ruotata 37°", { larghezza: 1240, altezza: 930, rotazione: 37 }],
    ["spostata", { larghezza: 1240, altezza: 930, spostamento: { x: 0.2, y: -0.1 } }],
  ];

  it.each(viste)("in vista «%s» l'errore resta sotto mezzo pixel", (_nome, opzioni) => {
    const punti = traccia();
    const { proietta } = creaVista({ riquadro: bb(punti), margine: 0.14, ...opzioni });
    const proiettati = punti.map((p) => proietta(p.lon, p.lat));
    const ridotti = semplificaProiettato(proiettati, TOLLERANZA_DISEGNO_PX);

    expect(erroreMassimo(proiettati, ridotti)).toBeLessThanOrEqual(TOLLERANZA_DISEGNO_PX);
    // E la semplificazione dev'essere reale, non simbolica.
    expect(ridotti.length).toBeLessThan(proiettati.length * 0.6);
  });

  it("cambiando misura della tela il calcolo si rifà", () => {
    const punti = traccia();
    const r = bb(punti);
    const conta = (larghezza, altezza) => {
      const { proietta } = creaVista({ riquadro: r, larghezza, altezza, margine: 0.14 });
      return semplificaProiettato(punti.map((p) => proietta(p.lon, p.lat)), TOLLERANZA_DISEGNO_PX).length;
    };
    // Più grande è la tela, più dettaglio serve per restare sotto mezzo pixel.
    expect(conta(2480, 1860)).toBeGreaterThan(conta(1240, 930));
    expect(conta(1240, 930)).toBeGreaterThan(conta(310, 233));
  });

  it("cambiando zoom il calcolo si rifà", () => {
    const punti = traccia();
    const r = bb(punti);
    const conta = (zoom) => {
      const { proietta } = creaVista({ riquadro: r, larghezza: 1240, altezza: 930, margine: 0.14, zoom });
      return semplificaProiettato(punti.map((p) => proietta(p.lon, p.lat)), TOLLERANZA_DISEGNO_PX).length;
    };
    expect(conta(4)).toBeGreaterThan(conta(1));
  });
});

/* ------------------------------------------------------------------ *
 * Segmenti distinti
 * ------------------------------------------------------------------ */

describe("segmenti distinti restano distinti", () => {
  it("ogni segmento produce un proprio sottotracciato, senza ponti", () => {
    // Due tratti lontani: se venissero uniti, comparirebbe un secondo «M»
    // dentro lo stesso path, oppure una linea fra i due.
    const a = Array.from({ length: 300 }, (_, i) => [i, 10 + (i % 2 ? 0.2 : 0)]);
    const b = Array.from({ length: 300 }, (_, i) => [i, 900 + (i % 2 ? 0.2 : 0)]);
    const path = [a, b].map((s) => tracciaPath(semplificaProiettato(s, TOLLERANZA_DISEGNO_PX)));

    expect(path).toHaveLength(2);
    for (const d of path) expect((d.match(/M/g) || []).length).toBe(1);
    // Nessun vertice dell'uno cade nella fascia dell'altro. Si guardano le
    // ordinate lette dal path, non le cifre con cui sono scritte: la vecchia
    // versione cercava la stringa «M0.0 10.0» e sarebbe caduta al primo
    // cambio di formato, che è esattamente ciò che questo capitolo fa.
    const ordinate = path.map((d) => leggiVertici(d).map((v) => v[1]));
    expect(Math.max(...ordinate[0])).toBeLessThan(Math.min(...ordinate[1]));
  });
});

/* ------------------------------------------------------------------ *
 * Serializzazione: il path deve dire la verità sui punti
 * ------------------------------------------------------------------ */

describe("tracciaPath non aggiunge errore", () => {
  it("scrive i vertici senza perdere una cifra", () => {
    // Valori scelti scomodi apposta: molte cifre decimali, ordini di grandezza
    // diversi, un negativo. `toFixed(1)` li mangerebbe tutti.
    const punti = [
      [364.8371928374652, 130.20000000000556],
      [875.1999999999999, 799.8000000000001],
      [-12.345678901234567, 0.0009765625],
      [620, 465],
    ];
    expect(leggiVertici(tracciaPath(punti))).toEqual(punti);
  });

  it("l'errore del path serializzato è quello della semplificazione, non di più", () => {
    const pieni = arcoFitto(1500, 90);
    const tenuti = semplificaProiettato(pieni, TOLLERANZA_DISEGNO_PX);
    const scritti = leggiVertici(tracciaPath(tenuti));

    /*
     * Quantizzando a un decimale ogni vertice si sposta fino a 0,05 px per asse,
     * e quello scarto si somma a un errore che la semplificazione aveva già
     * portato vicino alla tolleranza: il limite valeva sui punti calcolati e non
     * sul disegno. Qui le due misure devono coincidere esattamente.
     */
    expect(tenuti.length).toBeLessThan(pieni.length / 10);
    expect(errorePolilinea(pieni, scritti)).toBe(errorePolilinea(pieni, tenuti));
    expect(errorePolilinea(pieni, scritti)).toBeLessThanOrEqual(TOLLERANZA_DISEGNO_PX);
    // …e la misura non deve essere zero, o non direbbe nulla.
    expect(errorePolilinea(pieni, scritti)).toBeGreaterThan(0.1);
  });

  it("una polilinea vuota non produce path", () => {
    expect(tracciaPath([])).toBe("");
  });
});
