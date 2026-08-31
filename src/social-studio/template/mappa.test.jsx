import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import MappaPercorso, { TOLLERANZA_DISEGNO_PX } from "./Mappa";
import { creaVista } from "../motori/proiezione";
import { riquadro } from "../motori/gpx";

/**
 * La traccia disegnata dal componente vero.
 *
 * I test sulla utility provano la matematica; questo prova che finisca intatta
 * nel disegno. Sono due cose diverse, e per due volte la differenza è contata:
 * la formula sbagliata — `0.5 / scala / 360` — viveva nel componente, non nella
 * funzione di semplificazione; e la quantizzazione a un decimale viveva in
 * `tracciaPath`, dopo che la semplificazione aveva già rispettato il limite.
 *
 * Da qui la regola di questo file: si misura sull'attributo `d` realmente
 * prodotto, usando le coordinate **come sono scritte**, e senza margini. Un
 * margine di tolleranza sulla tolleranza è esattamente ciò che nascondeva il
 * secondo difetto.
 *
 * Geometria sintetica, come sempre: il GPX reale resta fuori dal repository.
 */

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let contenitore;
let radice;

beforeEach(() => {
  contenitore = document.createElement("div");
  document.body.appendChild(contenitore);
  radice = createRoot(contenitore);
});

afterEach(() => {
  act(() => radice.unmount());
  contenitore.remove();
});

/** Un anello con tremolio fitto: molti punti, pochi davvero necessari. */
function anello(n = 2000, chiuso = true) {
  const punti = [];
  for (let i = 0; i < n; i += 1) {
    const a = (i / n) * Math.PI * 2;
    const r = 0.3 + 0.0004 * Math.sin(i * 0.9);
    punti.push({ lon: 9.3 + r * Math.cos(a), lat: 40.8 + r * Math.sin(a), quota: 100 });
  }
  if (chiuso) punti.push(punti[0]);
  return punti;
}

/**
 * Un anello costruito apposta per lavorare **al limite**.
 *
 * Il tremolio ha due frequenze e ampiezza dell'ordine del pixel: Douglas–Peucker
 * è costretto a fermarsi a un soffio dalla tolleranza invece che molto sotto.
 * Serve a questo. Un arco liscio non andrebbe bene — la suddivisione binaria lo
 * risolve a circa 0,26 px, e da lì nessun arrotondamento riuscirebbe a superare
 * il mezzo pixel: il test passerebbe anche con il difetto in casa.
 *
 * Con questo campione, invece, riportare `toFixed(1)` in `tracciaPath` porta
 * l'errore misurato a 0,52–0,54 px su tutte e quattro le viste qui sotto.
 */
function anelloAlLimite(n = 4000) {
  const punti = [];
  for (let i = 0; i < n; i += 1) {
    const a = (i / n) * Math.PI * 2;
    const r = 0.3 + 0.0004 * Math.sin(i * 0.7) + 0.00024 * Math.sin(i * 0.113);
    punti.push({ lon: 9.3 + r * Math.cos(a), lat: 40.8 + r * Math.sin(a), quota: 100 });
  }
  punti.push(punti[0]);
  return punti;
}

const CONFIG = { zoom: 1, spostamento: { x: 0, y: 0 }, rotazione: 0, margine: 0.14, mostraMarker: false, mostraNomi: false, localita: [], spessoreTraccia: 7 };

function disegna(segmenti, larghezza, altezza, extra = {}) {
  act(() => {
    radice.render(
      <MappaPercorso
        segmenti={segmenti}
        configurazione={{ ...CONFIG, ...extra }}
        larghezza={larghezza}
        altezza={altezza}
      />,
    );
  });
  // I path della traccia: quelli con molti comandi, non costa né marker.
  return [...contenitore.querySelectorAll("path")]
    .map((p) => p.getAttribute("d") || "")
    .filter((d) => (d.match(/[ML]/g) || []).length > 3);
}

/**
 * I vertici di un path, come coppie di numeri.
 *
 * L'esponente è previsto dalla grammatica dei numeri SVG e `String` lo produce
 * per i valori vicinissimi a zero: se il lettore non lo riconoscesse spezzerebbe
 * `1e-7` in due numeri e la misura direbbe sciocchezze.
 */
const vertici = (d) => {
  const n = (d.match(/-?\d*\.?\d+(?:[eE][-+]?\d+)?/g) || []).map(Number);
  return Array.from({ length: n.length / 2 }, (_, i) => [n[i * 2], n[i * 2 + 1]]);
};

const distanza = (p, a, b) => {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const l2 = dx * dx + dy * dy;
  if (l2 === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
};

/**
 * Errore massimo fra la polilinea vera e quella **disegnata**.
 *
 * Il punto delicato è l'ultima riga del ciclo: la distanza si misura verso i
 * vertici `disegnati`, quelli scritti nell'attributo `d`, non verso i punti
 * pieni corrispondenti. La versione precedente accostava ogni vertice al punto
 * pieno più vicino e poi misurava fra i punti pieni — così le coordinate
 * serializzate non entravano mai nel conto, e l'errore introdotto dalla
 * quantizzazione risultava invisibile per costruzione.
 *
 * L'accostamento resta, ma serve solo a ritrovare la campata di appartenenza.
 * E gli estremi sono compresi (`i` parte da `indici[k]`): con l'arrotondamento
 * il vertice stesso si sposta, ed è uno degli scarti da misurare.
 */
function erroreMassimo(pieni, disegnati) {
  const indici = disegnati.map((v) => {
    let migliore = 0;
    let minima = Infinity;
    for (let i = 0; i < pieni.length; i += 1) {
      const d = Math.hypot(pieni[i][0] - v[0], pieni[i][1] - v[1]);
      if (d < minima) {
        minima = d;
        migliore = i;
      }
    }
    return migliore;
  });
  let max = 0;
  for (let k = 0; k < indici.length - 1; k += 1) {
    for (let i = indici[k]; i <= indici[k + 1]; i += 1) {
      max = Math.max(max, distanza(pieni[i], disegnati[k], disegnati[k + 1]));
    }
  }
  return max;
}

const proiettaTutti = (punti, larghezza, altezza, extra = {}) => {
  const { proietta } = creaVista({
    riquadro: riquadro([punti]), larghezza, altezza, margine: 0.14,
    zoom: 1, spostamento: { x: 0, y: 0 }, rotazione: 0, ...extra,
  });
  return punti.map((p) => proietta(p.lon, p.lat));
};

const viste = [
  ["Story 03", 1240, 930, {}],
  ["carosello 03", 960, 720, {}],
  ["zoom 3", 1240, 930, { zoom: 3 }],
  ["ruotata 37°", 1240, 930, { rotazione: 37 }],
  ["tela minuscola", 310, 233, {}],
  ["tela doppia", 2480, 1860, {}],
];

describe("traccia disegnata dal componente", () => {
  it.each(viste)("in «%s» non sfora mezzo pixel e riduce davvero", (_n, w, h, extra) => {
    const punti = anello();
    const path = disegna([punti], w, h, extra);
    expect(path.length).toBeGreaterThan(0);

    const disegnati = vertici(path[0]);
    const pieni = proiettaTutti(punti, w, h, extra);

    /*
     * Il cuore dei due capitoli. Con `0.5 / scala / 360` la tolleranza risultava
     * 360 volte troppo piccola e qui resterebbero quasi tutti i 2001 punti; con
     * `toFixed(1)` i vertici disegnati non sarebbero più quelli calcolati e la
     * seconda misura sforerebbe. Nessun margine: il limite è il limite.
     */
    expect(disegnati.length).toBeLessThan(punti.length * 0.5);
    expect(erroreMassimo(pieni, disegnati)).toBeLessThanOrEqual(TOLLERANZA_DISEGNO_PX);
  });

  it.each(viste)("in «%s» i vertici disegnati sono esattamente quelli calcolati", (_n, w, h, extra) => {
    const punti = anello();
    const disegnati = vertici(disegna([punti], w, h, extra)[0]);
    const pieni = proiettaTutti(punti, w, h, extra);

    /*
     * Fedeltà bit per bit. `String(numero)` dà la rappresentazione decimale più
     * corta che rileggendola torna identica, quindi ogni vertice del path deve
     * ritrovarsi *tale e quale* fra i punti proiettati — non «vicino a».
     *
     * È il test che qualunque quantizzazione fa cadere subito, su qualunque
     * vista e qualunque geometria, senza dipendere da quanto vicino al limite
     * si sia fermata la semplificazione.
     */
    let i = 0;
    for (const v of disegnati) {
      while (i < pieni.length && !(pieni[i][0] === v[0] && pieni[i][1] === v[1])) i += 1;
      expect({ vertice: v, trovato: i < pieni.length }).toEqual({ vertice: v, trovato: true });
      i += 1;
    }
  });

  it.each(viste.slice(0, 4))("in «%s» un campione al limite resta dentro mezzo pixel", (_n, w, h, extra) => {
    const punti = anelloAlLimite();
    const disegnati = vertici(disegna([punti], w, h, extra)[0]);
    const pieni = proiettaTutti(punti, w, h, extra);
    const errore = erroreMassimo(pieni, disegnati);

    expect(errore).toBeLessThanOrEqual(TOLLERANZA_DISEGNO_PX);
    /*
     * E il campione deve davvero lavorare al limite, altrimenti il test qui
     * sopra non dimostrerebbe granché: se un domani la semplificazione si
     * fermasse molto sotto la soglia, questa riga lo direbbe invece di lasciar
     * passare in silenzio un controllo diventato vuoto.
     */
    expect(errore).toBeGreaterThan(0.45);
  });

  it("l'anello disegnato resta chiuso", () => {
    const punti = anello();
    const d = disegna([punti], 1240, 930)[0];
    const v = vertici(d);
    expect(v[0]).toEqual(v.at(-1));
  });

  it("due segmenti restano due sottotracciati, senza ponti", () => {
    const a = anello(600);
    const b = a.map((p) => ({ ...p, lat: p.lat + 1.2 }));
    const path = disegna([a, b], 1240, 930);

    // Ogni traccia è disegnata due volte — alone sotto, tratto sopra — con lo
    // **stesso** path: quattro elementi, due geometrie.
    const distinti = [...new Set(path)];
    expect(path).toHaveLength(4);
    expect(distinti).toHaveLength(2);
    // Un solo «M» per geometria: i due segmenti non vengono uniti da una linea
    // che nel GPX non esiste.
    for (const d of distinti) expect((d.match(/M/g) || []).length).toBe(1);
    // E le due fasce di ordinate non si toccano: nessun vertice dell'uno cade
    // dentro l'altro, comunque i due path siano ordinati nel documento.
    const fasce = distinti
      .map((d) => vertici(d).map((v) => v[1]))
      .map((y) => [Math.min(...y), Math.max(...y)])
      .sort((a, b) => a[0] - b[0]);
    expect(fasce[0][1]).toBeLessThan(fasce[1][0]);
  });

  it("un solo segmento produce una sola geometria", () => {
    const path = disegna([anello(600)], 1240, 930);
    expect([...new Set(path)]).toHaveLength(1);
  });

  it("una tela più grande chiede più vertici", () => {
    const punti = anello();
    const piccola = vertici(disegna([punti], 310, 233)[0]).length;
    const grande = vertici(disegna([punti], 2480, 1860)[0]).length;
    expect(grande).toBeGreaterThan(piccola);
  });

  it("i punti in ingresso non vengono toccati", () => {
    const punti = anello(400);
    const copia = JSON.parse(JSON.stringify(punti));
    disegna([punti], 1240, 930);
    expect(punti).toEqual(copia);
  });
});
