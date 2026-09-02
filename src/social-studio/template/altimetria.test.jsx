import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import Altimetria from "./Altimetria";
import { FornitoreProblemi } from "./primitivi";
import { profiloAltimetrico, proiettaProfilo } from "../motori/altimetria";
import { PROFILO_ALTIMETRICO } from "./rubriche/eventi/zone";
import SlideCarosello, { SLIDE_CAROSELLO } from "./rubriche/eventi/CaroselloEvento";
import { contenutoVuoto } from "../fondamenta/schema";
import { fileDelPacchetto, PACCHETTO } from "../app/pacchetto";
import { preflight } from "../motori/preflight";

/**
 * Il profilo altimetrico disegnato dal componente vero.
 *
 * I test del motore provano la matematica; questi provano che finisca intatta
 * nell'SVG. La lezione dei capitoli 5.3.1H e 5.3.1I vale identica qui: si misura
 * sull'attributo `d` realmente prodotto, leggendo le coordinate **come sono
 * scritte**, e senza margini di comodo.
 *
 * Geometrie sintetiche: il GPX reale resta fuori dal repository.
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

const LARGHEZZA = 960;
/** L'area davvero disegnabile: il grafico meno i due rientri. */
const UTILE = PROFILO_ALTIMETRICO.grafico - PROFILO_ALTIMETRICO.rientro * 2;

/** Punti equispaziati con le quote date. */
const traccia = (quote, { lat = 40.5, lon0 = 9.1, passo = 0.004 } = {}) =>
  quote.map((quota, i) => ({ lon: lon0 + i * passo, lat, quota }));

/** Un dente di sega fitto: molti punti, molti dei quali superflui. */
const seghetto = (n, ampiezza = 40) =>
  traccia(Array.from({ length: n }, (_, i) => 200 + (i % 2 ? ampiezza : 0) + i * 0.4), {
    passo: 0.0006,
  });

/**
 * Un profilo fitto che lavora **vicino al limite**.
 *
 * Una salita sinusoidale ampia, sporcata da un tremolio di un metro. Su un
 * grafico alto 118 px quel tremolio vale frazioni di pixel: è la struttura che
 * la semplificazione deve togliere, ed è ciò che rende la misura dell'errore
 * una prova invece di una formalità. Con denti alti qualche metro non verrebbe
 * tolto niente e il test passerebbe senza dimostrare nulla.
 */
const profiloFitto = (n) =>
  traccia(
    Array.from({ length: n }, (_, i) => {
      const t = i / (n - 1);
      return 120 + 380 * Math.sin(t * Math.PI * 1.4) + Math.sin(i * 0.9);
    }),
    { passo: 0.0006 },
  );

/**
 * Monta il componente e restituisce i path della linea (non i riempimenti).
 *
 * Le segnalazioni si leggono con `lettore`, non con `onProblemi`: la notifica è
 * accorpata da un timer di 80 ms e dentro `act()` non scatterebbe mai. La
 * lettura sincrona esiste esattamente per questo.
 */
function disegna(segmenti, { lettore } = {}) {
  const albero = (
    <Altimetria segmenti={segmenti} larghezza={LARGHEZZA} metriche={{ dislivelloPositivo: 100, dislivelloNegativo: 90 }} />
  );
  act(() => {
    radice.render(
      lettore ? <FornitoreProblemi lettore={lettore}>{albero}</FornitoreProblemi> : albero,
    );
  });
  return [...contenitore.querySelectorAll("path")]
    .map((p) => p.getAttribute("d") || "")
    // Il riempimento è la stessa spezzata più la chiusura sul fondo: si
    // riconosce dalla «Z» e non va confuso con la linea.
    .filter((d) => d && !d.endsWith("Z"));
}

const numeri = (d) => (d.match(/-?\d*\.?\d+(?:[eE][-+]?\d+)?/g) || []).map(Number);
const vertici = (d) => {
  const n = numeri(d);
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
 * Errore fra la spezzata vera e quella **disegnata**.
 *
 * Come in `mappa.test.jsx`: l'accostamento serve solo a ritrovare la campata, la
 * distanza si misura verso i vertici scritti nel path, estremi compresi.
 */
function erroreMassimo(pieni, disegnati) {
  const indici = disegnati.map((v) => {
    let migliore = 0;
    let minima = Infinity;
    for (let i = 0; i < pieni.length; i += 1) {
      const d = Math.hypot(pieni[i][0] - v[0], pieni[i][1] - v[1]);
      if (d < minima) { minima = d; migliore = i; }
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

describe("profilo disegnato dal componente", () => {
  it("un segmento continuo produce una sola linea", () => {
    const path = disegna([traccia([10, 80, 40, 120, 60])]);
    expect(path).toHaveLength(1);
    expect((path[0].match(/M/g) || []).length).toBe(1);
  });

  it("due segmenti producono due path, mai una linea di collegamento", () => {
    const path = disegna([traccia([10, 80, 40]), traccia([300, 360], { lat: 41.8, lon0: 9.9 })]);
    expect(path).toHaveLength(2);
    // Un solo «M» per path: se i due tratti venissero uniti, comparirebbe una
    // campata che nel file non esiste.
    for (const d of path) expect((d.match(/M/g) || []).length).toBe(1);
  });

  it("un buco di quota spezza la linea invece di attraversarlo", () => {
    const path = disegna([traccia([10, 80, null, null, 300, 360])]);
    expect(path).toHaveLength(2);
    const quoteDisegnate = path.flatMap((d) => vertici(d).map((v) => v[1]));
    // Quattro vertici, uno per ogni punto con quota: nessuno in più a coprire
    // il buco.
    expect(quoteDisegnate).toHaveLength(4);
  });

  it("le coordinate stanno dentro il viewBox", () => {
    const path = disegna([seghetto(400)]);
    const svg = contenitore.querySelector("svg");
    expect(svg.getAttribute("viewBox")).toBe(`0 0 ${LARGHEZZA} ${PROFILO_ALTIMETRICO.grafico}`);
    // Le coordinate stanno nell'area utile; il gruppo le trasla del rientro,
    // quindi anche il tratto più spesso resta dentro il riquadro.
    for (const d of path) {
      for (const [x, y] of vertici(d)) {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(LARGHEZZA);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThanOrEqual(UTILE);
      }
    }
    expect(svg.querySelector("g").getAttribute("transform")).toBe(`translate(0 ${PROFILO_ALTIMETRICO.rientro})`);
    // Il rientro deve coprire almeno metà spessore del tratto.
    expect(PROFILO_ALTIMETRICO.rientro).toBeGreaterThanOrEqual(2);
  });

  it("nessun NaN e nessun Infinity nell'attributo d", () => {
    for (const segmenti of [
      [traccia([10, 20, 30])],
      [traccia([0, 0, 0])],
      [traccia([-50, 0, 50])],
      [traccia([300, 300, 300])],
      [[{ lon: 9.1, lat: 40.5, quota: 5 }, { lon: 9.1, lat: 40.5, quota: 9 }]],
    ]) {
      for (const d of disegna(segmenti)) {
        expect(d).not.toMatch(/NaN|Infinity/);
        for (const n of numeri(d)) expect(Number.isFinite(n)).toBe(true);
      }
    }
  });

  it("un profilo piatto viene comunque disegnato, a metà altezza", () => {
    const path = disegna([traccia([300, 300, 300, 300])]);
    expect(path).toHaveLength(1);
    for (const [, y] of vertici(path[0])) {
      expect(y).toBeCloseTo(UTILE / 2, 6);
    }
  });

  it("la spezzata disegnata non sfora mezzo pixel", () => {
    const punti = profiloFitto(1400);
    const path = disegna([punti]);
    const { tratti } = proiettaProfilo(profiloAltimetrico([punti]), {
      larghezza: LARGHEZZA,
      altezza: UTILE,
    });

    const disegnati = vertici(path[0]);
    const errore = erroreMassimo(tratti[0], disegnati);

    // La semplificazione deve togliere molto, o la misura non prova nulla…
    expect(disegnati.length).toBeLessThan(tratti[0].length * 0.6);
    // …e deve fermarsi vicino alla soglia, non molto sotto: se un domani si
    // fermasse a un decimo di pixel, questo controllo diventerebbe vuoto senza
    // che nessuno se ne accorga.
    expect(errore).toBeGreaterThan(0.3);
    expect(errore).toBeLessThanOrEqual(PROFILO_ALTIMETRICO.tolleranzaPx);
  });

  it("i vertici disegnati sono esattamente quelli calcolati", () => {
    const punti = profiloFitto(700);
    const disegnati = vertici(disegna([punti])[0]);
    const { tratti } = proiettaProfilo(profiloAltimetrico([punti]), {
      larghezza: LARGHEZZA,
      altezza: UTILE,
    });
    // Fedeltà bit per bit: qualunque quantizzazione nella serializzazione la
    // farebbe cadere, su qualunque geometria.
    let i = 0;
    for (const v of disegnati) {
      while (i < tratti[0].length && !(tratti[0][i][0] === v[0] && tratti[0][i][1] === v[1])) i += 1;
      expect({ vertice: v, trovato: i < tratti[0].length }).toEqual({ vertice: v, trovato: true });
      i += 1;
    }
  });

  it("il riempimento si chiude sul fondo del proprio tratto, non di tutti", () => {
    act(() => {
      radice.render(<Altimetria segmenti={[traccia([10, 80]), traccia([300, 360], { lat: 41.8 })]} larghezza={LARGHEZZA} />);
    });
    const aree = [...contenitore.querySelectorAll("path")]
      .map((p) => p.getAttribute("d") || "")
      .filter((d) => d.endsWith("Z"));
    expect(aree).toHaveLength(2);
    for (const d of aree) expect((d.match(/M/g) || []).length).toBe(1);
  });

  it("non tocca i punti in ingresso", () => {
    const segmenti = [traccia([10, null, 30, 40])];
    const copia = JSON.parse(JSON.stringify(segmenti));
    disegna(segmenti);
    expect(segmenti).toEqual(copia);
  });
});

describe("il profilo dice quando non può disegnare", () => {
  /** Il registro letto adesso, senza aspettare l'accorpamento. */
  const registro = () => ({ current: null });

  it("senza quote utilizzabili segnala un errore e non disegna nulla", () => {
    const lettore = registro();
    const path = disegna([traccia([null, null, null])], { lettore });
    const visti = lettore.current();
    expect(path).toHaveLength(0);
    expect(visti).toHaveLength(1);
    expect(visti[0].livello).toBe("errore");
    expect(visti[0].messaggio).toMatch(/due punti consecutivi con quota/);
  });

  it("un punto isolato non basta: resta un errore", () => {
    const lettore = registro();
    disegna([traccia([null, 500, null])], { lettore });
    expect(lettore.current().map((v) => v.livello)).toEqual(["errore"]);
  });

  it("con quote parziali avvisa delle interruzioni", () => {
    const lettore = registro();
    disegna([traccia([10, 20, null, 40, 50])], { lettore });
    const visti = lettore.current();
    expect(visti).toHaveLength(1);
    expect(visti[0].livello).toBe("avviso");
    expect(visti[0].messaggio).toMatch(/tratti interrotti/);
  });

  it("con più segmenti avvisa che restano separati", () => {
    const lettore = registro();
    disegna([traccia([10, 20]), traccia([30, 40], { lat: 41.8 })], { lettore });
    const visti = lettore.current();
    expect(visti).toHaveLength(1);
    expect(visti[0].livello).toBe("avviso");
    expect(visti[0].messaggio).toMatch(/segmenti distinti/);
  });

  it("un profilo pulito non segnala niente", () => {
    const lettore = registro();
    disegna([traccia([10, 80, 40, 120])], { lettore });
    expect(lettore.current()).toHaveLength(0);
  });

  it("la segnalazione si ritira allo smontaggio", () => {
    const lettore = registro();
    disegna([traccia([null, null, null])], { lettore });
    expect(lettore.current()).toHaveLength(1);
    // Senza il ritiro, l'errore resterebbe nel pre-flight dopo un cambio di
    // formato, riferito a una grafica che non è più montata.
    act(() => {
      radice.render(<FornitoreProblemi lettore={lettore}><div /></FornitoreProblemi>);
    });
    expect(lettore.current()).toHaveLength(0);
  });
});

/* ------------------------------------------------------------------ *
 * La slide 03 del carosello
 * ------------------------------------------------------------------ */

describe("integrazione nella slide 03", () => {
  const base = contenutoVuoto({ categoria: "eventi", formato: "carosello" });
  const contenuto = (mostraAltimetria) => ({
    ...base,
    titolo: "Prova",
    fattuali: { ...base.fattuali, nome: "Prova", km: "120 km", sterrato: "80%", tappe: [] },
    mappa: { ...base.mappa, gpx: { idBlob: "g", nome: "t.gpx", byte: 1 }, mostraAltimetria, mostraIsola: false, mostraMarker: false, mostraNomi: false },
  });
  const tracciaFinta = {
    segmenti: [traccia(Array.from({ length: 200 }, (_, i) => 100 + 200 * Math.sin(i / 22)))],
    metriche: { dislivelloPositivo: 3200, dislivelloNegativo: 3100 },
  };

  const slide = (mostraAltimetria) => {
    act(() => {
      radice.render(
        <SlideCarosello id="percorso" contenuto={contenuto(mostraAltimetria)} traccia={tracciaFinta} />,
      );
    });
    return contenitore;
  };

  it("col profilo spento la slide non mostra nulla di altimetrico", () => {
    const c = slide(false);
    expect(c.textContent).not.toMatch(/profilo altimetrico/i);
    expect(c.textContent).not.toMatch(/quota m[ai]/i);
  });

  it("col profilo acceso compare il grafico e le sue letture", () => {
    const c = slide(true);
    expect(c.textContent).toMatch(/profilo altimetrico/i);
    expect(c.textContent).toMatch(/quota min/i);
    expect(c.textContent).toMatch(/quota max/i);
  });

  it("le metriche del profilo sono etichettate come dati GPX", () => {
    const testo = slide(true).textContent;
    // I 550 km commerciali e i chilometri della traccia sono due cose diverse:
    // il grafico dice da dove vengono i suoi.
    expect(testo).toMatch(/dati GPX/i);
    expect(testo).toMatch(/traccia GPX/i);
    expect(testo).toMatch(/D\+ GPX/);
  });

  it("accendere il profilo accorcia la mappa senza spostare il resto", () => {
    /** L'SVG della mappa: largo quanto la colonna utile e alto centinaia di px. */
    const altezzaMappa = () =>
      [...contenitore.querySelectorAll("svg")]
        .map((s) => ({ w: Number(s.getAttribute("width")), h: Number(s.getAttribute("height")) }))
        .filter((d) => d.w === 960 && d.h > 300)
        .map((d) => d.h)[0];

    slide(false);
    expect(altezzaMappa()).toBe(PROFILO_ALTIMETRICO.mappaSenzaProfilo);
    slide(true);
    expect(altezzaMappa()).toBe(PROFILO_ALTIMETRICO.mappaConProfilo);
    // La somma è il patto: la banda del percorso resta della stessa altezza,
    // quindi filetto, tappe, sterrato e marchio non si muovono.
    expect(
      PROFILO_ALTIMETRICO.mappaConProfilo + PROFILO_ALTIMETRICO.distanza + PROFILO_ALTIMETRICO.blocco,
    ).toBe(PROFILO_ALTIMETRICO.bandaPercorso);
  });

  it("l'intestazione e il grafico non possono toccarsi", () => {
    const { intestazione, distanzaIntestazione, grafico, blocco } = PROFILO_ALTIMETRICO;
    /*
     * Il picco del profilo tocca per definizione il bordo alto del grafico, e
     * la lettura della quota massima sta lì sopra: sul PNG reale i due si sono
     * incontrati per nove pixel. Lo stacco deve esistere e le tre misure devono
     * sommare esattamente, altrimenti una si prende lo spazio dell'altra.
     */
    expect(distanzaIntestazione).toBeGreaterThan(0);
    expect(intestazione + distanzaIntestazione + grafico).toBe(blocco);
    const svg = contenitore.querySelector("svg") || (slide(true), contenitore.querySelectorAll("svg")[1]);
    expect(svg).toBeTruthy();
  });

  it("il carosello resta di otto slide, profilo o non profilo", () => {
    expect(SLIDE_CAROSELLO).toHaveLength(8);
    expect(SLIDE_CAROSELLO.filter((s) => /altimetr/i.test(s.id))).toHaveLength(0);
  });

  it("il pacchetto resta di sedici file, profilo o non profilo", () => {
    // Il profilo è una riorganizzazione interna alla slide 03, non una nona
    // slide: se un domani qualcuno la aggiungesse, questo test cadrebbe.
    expect(PACCHETTO).toHaveLength(15);
    expect(fileDelPacchetto()).toHaveLength(16);
    expect(PACCHETTO.filter((p) => p.nome.startsWith("carosello/"))).toHaveLength(8);
  });
});

/* ------------------------------------------------------------------ *
 * Profilo richiesto, traccia non ricostruita
 * ------------------------------------------------------------------ */

describe("profilo richiesto con traccia non ricostruita", () => {
  /*
   * Il riferimento al GPX vive nel contenuto e si salva con la bozza; la traccia
   * analizzata vive nello stato dell'editor e va ricostruita a ogni apertura.
   * Fra i due c'è una finestra in cui `gpx.idBlob` esiste e `traccia` è `null`:
   * durante la reidratazione asincrona, se il blob è sparito dall'archivio, o se
   * il file è illeggibile.
   *
   * In quella finestra il profilo è **richiesto ma impossibile**, ed è
   * esattamente il caso che non deve passare in silenzio. Il giudizio su cosa
   * sia utilizzabile resta uno solo, dentro `Altimetria`: qui si prova che il
   * componente venga montato abbastanza da poterlo dare.
   */

  const base = contenutoVuoto({ categoria: "eventi", formato: "carosello" });
  const scheda = ({ profilo = true, gpx = true } = {}) => ({
    ...base,
    titolo: "Prova",
    fattuali: { ...base.fattuali, nome: "Prova", km: "120 km", sterrato: "80%", tappe: [] },
    editoriale: { ...base.editoriale, cta: "Scrivici" },
    mappa: {
      ...base.mappa,
      gpx: gpx ? { idBlob: "blob-1", nome: "t.gpx", byte: 10 } : null,
      mostraAltimetria: profilo,
      mostraIsola: false, mostraMarker: false, mostraNomi: false,
    },
  });

  const tracciaValida = {
    segmenti: [traccia(Array.from({ length: 160 }, (_, i) => 80 + 240 * Math.sin(i / 18)))],
    metriche: { dislivelloPositivo: 2400, dislivelloNegativo: 2350 },
  };

  /** Monta la slide 03 vera dentro il registro, e restituisce il lettore. */
  const monta = (contenuto, tracciaAttuale) => {
    const lettore = { current: null };
    act(() => {
      radice.render(
        <FornitoreProblemi lettore={lettore}>
          <SlideCarosello id="percorso" contenuto={contenuto} traccia={tracciaAttuale} />
        </FornitoreProblemi>,
      );
    });
    return lettore;
  };

  const rimonta = (contenuto, tracciaAttuale, lettore) => {
    act(() => {
      radice.render(
        <FornitoreProblemi lettore={lettore}>
          <SlideCarosello id="percorso" contenuto={contenuto} traccia={tracciaAttuale} />
        </FornitoreProblemi>,
      );
    });
  };

  const altezzaMappa = () =>
    [...contenitore.querySelectorAll("svg")]
      .map((s) => ({ w: Number(s.getAttribute("width")), h: Number(s.getAttribute("height")) }))
      .filter((d) => d.w === 960 && d.h > 300)
      .map((d) => d.h)[0];

  it("con la traccia non ancora ricostruita segnala un errore", () => {
    const lettore = monta(scheda(), null);
    const visti = lettore.current();
    expect(visti).toHaveLength(1);
    expect(visti[0].chiave).toBe("carosello/03/altimetria");
    expect(visti[0].livello).toBe("errore");
  });

  it("con una traccia ricostruita ma senza segmenti segnala lo stesso errore", () => {
    const lettore = monta(scheda(), { segmenti: [], metriche: {} });
    const visti = lettore.current();
    expect(visti).toHaveLength(1);
    expect(visti[0].chiave).toBe("carosello/03/altimetria");
    expect(visti[0].livello).toBe("errore");
  });

  it("quella segnalazione, passata al pre-flight, blocca davvero l'export", () => {
    const contenuto = scheda();
    const lettore = monta(contenuto, null);
    // Il problema vero, non uno costruito a mano per l'occasione.
    const esito = preflight({
      contenuto: { ...contenuto, formato: "carosello" },
      formato: "carosello",
      vociMedia: [],
      problemi: lettore.current(),
    });
    expect(esito.puoiEsportare).toBe(false);
    expect(esito.errori.some((e) => e.id === "sforo-carosello/03/altimetria")).toBe(true);
  });

  it("quando la traccia arriva, l'errore si ritira e il profilo compare", () => {
    const contenuto = scheda();
    const lettore = monta(contenuto, null);
    expect(lettore.current()).toHaveLength(1);

    rimonta(contenuto, tracciaValida, lettore);
    expect(lettore.current()).toHaveLength(0);
    expect(contenitore.textContent).toMatch(/profilo altimetrico/i);
    expect(altezzaMappa()).toBe(PROFILO_ALTIMETRICO.mappaConProfilo);
  });

  it("spegnendo l'opzione l'errore si ritira e la mappa torna intera", () => {
    const lettore = monta(scheda(), null);
    expect(lettore.current()).toHaveLength(1);

    rimonta(scheda({ profilo: false }), null, lettore);
    expect(lettore.current()).toHaveLength(0);
    expect(contenitore.textContent).not.toMatch(/profilo altimetrico/i);
    expect(altezzaMappa()).toBe(PROFILO_ALTIMETRICO.mappaSenzaProfilo);
  });

  it("senza riferimento GPX il componente tace: l'errore è del pre-flight, e uno solo", () => {
    const contenuto = scheda({ gpx: false });
    const lettore = monta(contenuto, null);
    // Nessuna segnalazione dinamica: senza riferimento non c'è niente da
    // ricostruire, e un terzo messaggio direbbe la stessa cosa una terza volta.
    expect(lettore.current()).toHaveLength(0);

    const esito = preflight({
      contenuto: { ...contenuto, formato: "carosello" },
      formato: "carosello",
      vociMedia: [],
      problemi: lettore.current(),
    });
    expect(esito.errori.filter((e) => e.id === "gpx")).toHaveLength(1);
    expect(esito.errori.filter((e) => e.id === "altimetria")).toHaveLength(1);
    expect(esito.errori.filter((e) => e.id.startsWith("sforo-"))).toHaveLength(0);
  });
});
