import React, { useLayoutEffect } from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import Foto from "./Foto";
import { FornitoreProblemi } from "./primitivi";
import { geometriaCover } from "./geometria-foto";

/**
 * Le due modalità di `Foto`, e perché la seconda esiste.
 *
 * html2canvas 1.4.1 non legge `object-fit`: disegna l'immagine intera dentro il
 * riquadro intero, con due scale diverse. Nel browser la fotografia era giusta,
 * nel PNG usciva allungata — un difetto invisibile finché non si apriva il file.
 * La modalità esplicita dà all'immagine larghezza, altezza e offset in pixel, e
 * lascia il ritaglio all'`overflow` del contenitore.
 *
 * Il patto è che la modalità predefinita — quella di tutte le grafiche EVENTI —
 * non cambi di un attributo.
 */

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let contenitore;
let radice;
let ImmagineOriginale;

/**
 * Un `Image` che dichiara dimensioni decise dalla prova.
 *
 * In jsdom un'immagine non si carica mai: senza questo, la modalità esplicita
 * resterebbe per sempre in attesa e non ci sarebbe niente da misurare.
 */
function pilotaImmagini({ larghezza, altezza }, { carica = true } = {}) {
  globalThis.Image = class {
    constructor() {
      this.naturalWidth = 0;
      this.naturalHeight = 0;
      this.complete = false;
    }
    set src(v) {
      this._src = v;
      if (!carica) return;
      queueMicrotask(() => {
        this.naturalWidth = larghezza;
        this.naturalHeight = altezza;
        this.complete = true;
        this.onload?.();
      });
    }
    get src() {
      return this._src;
    }
  };
}

beforeEach(() => {
  ImmagineOriginale = globalThis.Image;
  contenitore = document.createElement("div");
  document.body.appendChild(contenitore);
  radice = createRoot(contenitore);
});

afterEach(() => {
  act(() => radice.unmount());
  contenitore.remove();
  globalThis.Image = ImmagineOriginale;
});

let misureInSospeso;

async function monta(elemento) {
  const lettore = { current: null };
  const misure = { current: null };
  await act(async () => {
    radice.render(
      <FornitoreProblemi onProblemi={() => {}} lettore={lettore} misure={misure}>
        {elemento}
      </FornitoreProblemi>,
    );
  });
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
  misureInSospeso = misure.current;
}

const img = () => contenitore.querySelector("img");
const stile = () => img().style;

const PANORAMICA = { larghezza: 1800, altezza: 832 };
const VERTICALE = { larghezza: 900, altezza: 1600 };
const POST = { larghezza: 1080, altezza: 1350 };
const STORY = { larghezza: 1080, altezza: 1920 };

const ritaglio = (extra = {}) => ({
  idBlob: "b",
  zoom: 1,
  x: 0.5,
  y: 0.5,
  specchiata: false,
  ...extra,
});

/* ================================================================== *
 * La modalità di sempre
 * ================================================================== */

describe("senza `dimensioni` non cambia niente", () => {
  it("resta `object-fit: cover` con posizione e zoom in percentuale", async () => {
    pilotaImmagini(PANORAMICA);
    await monta(
      <Foto sorgente="foto.webp" ritaglio={ritaglio({ zoom: 1.2, x: 0.3, y: 0.7 })} velo={null} />,
    );

    expect(stile().objectFit).toBe("cover");
    expect(stile().objectPosition).toBe("30% 70%");
    expect(stile().transform).toBe("scale(1.2)");
    expect(stile().transformOrigin).toBe("30% 70%");
    expect(stile().width).toBe("100%");
    expect(stile().height).toBe("100%");
    // Nessuna geometria esplicita: niente left/top in pixel.
    expect(stile().left).toBe("");
    expect(stile().top).toBe("");
  });

  it("la specchiatura si somma allo zoom, come prima", async () => {
    pilotaImmagini(PANORAMICA);
    await monta(<Foto sorgente="foto.webp" ritaglio={ritaglio({ specchiata: true })} velo={null} />);
    expect(stile().transform).toBe("scale(1) scaleX(-1)");
  });

  it("non dichiara nessuna misura in sospeso: non ne ha bisogno", async () => {
    pilotaImmagini(PANORAMICA, { carica: false });
    await monta(<Foto sorgente="foto.webp" ritaglio={ritaglio()} velo={null} />);
    expect(img()).not.toBeNull();
    expect(misureInSospeso()).toBe(0);
  });

  it("senza sorgente resta il segnaposto, in tutte e due le modalità", async () => {
    pilotaImmagini(PANORAMICA);
    await monta(<Foto sorgente={null} etichettaVuoto="Foto da caricare" />);
    expect(img()).toBeNull();
    expect(contenitore.textContent).toContain("Foto da caricare");

    await monta(<Foto sorgente={null} dimensioni={POST} etichettaVuoto="Foto da caricare" />);
    expect(img()).toBeNull();
    expect(contenitore.textContent).toContain("Foto da caricare");
  });
});

/* ================================================================== *
 * La modalità esplicita
 * ================================================================== */

describe("con `dimensioni` la geometria è in pixel", () => {
  const casi = [
    ["panoramica su Post", PANORAMICA, POST, 1, 0.5, 0.5],
    ["panoramica su Story", PANORAMICA, STORY, 1, 0.5, 0.5],
    ["panoramica su Story con zoom", PANORAMICA, STORY, 1.35, 0.52, 0.38],
    ["verticale su Post", VERTICALE, POST, 1, 0.5, 0.5],
    ["verticale su Post, fuoco in alto a sinistra", VERTICALE, POST, 1, 0, 0],
    ["verticale su Story con zoom", VERTICALE, STORY, 1.6, 1, 1],
  ];

  it.each(casi)("%s: proporzioni intatte e riquadro coperto", async (_nome, intrinseca, box, zoom, x, y) => {
    pilotaImmagini(intrinseca);
    await monta(
      <Foto sorgente="foto.webp" ritaglio={ritaglio({ zoom, x, y })} dimensioni={box} velo={null} />,
    );

    const atteso = geometriaCover({ intrinseca, contenitore: box, zoom, x, y });
    const px = (v) => Number.parseFloat(v);

    expect(px(stile().width)).toBeCloseTo(atteso.larghezza, 3);
    expect(px(stile().height)).toBeCloseTo(atteso.altezza, 3);
    expect(px(stile().left)).toBeCloseTo(atteso.sinistra, 3);
    expect(px(stile().top)).toBeCloseTo(atteso.alto, 3);

    // La prova vera: una scala sola, quindi le proporzioni del file restano.
    expect(px(stile().width) / px(stile().height)).toBeCloseTo(
      intrinseca.larghezza / intrinseca.altezza,
      6,
    );
    // E il riquadro è coperto: nessun bordo scoperto.
    expect(px(stile().left)).toBeLessThanOrEqual(0.001);
    expect(px(stile().top)).toBeLessThanOrEqual(0.001);
    expect(px(stile().left) + px(stile().width)).toBeGreaterThanOrEqual(box.larghezza - 0.001);
    expect(px(stile().top) + px(stile().height)).toBeGreaterThanOrEqual(box.altezza - 0.001);

    // Nessun `object-fit`: è proprio quello che la cattura non legge.
    expect(stile().objectFit).toBe("");
    expect(stile().objectPosition).toBe("");
  });

  it("la panoramica su Post e su Story riceve due scale diverse", async () => {
    pilotaImmagini(PANORAMICA);
    await monta(<Foto sorgente="f.webp" ritaglio={ritaglio()} dimensioni={POST} velo={null} />);
    const altezzaPost = Number.parseFloat(stile().height);
    await monta(<Foto sorgente="f.webp" ritaglio={ritaglio()} dimensioni={STORY} velo={null} />);
    const altezzaStory = Number.parseFloat(stile().height);

    expect(altezzaPost).toBeCloseTo(1350, 3);
    expect(altezzaStory).toBeCloseTo(1920, 3);
    expect(altezzaStory).toBeGreaterThan(altezzaPost);
  });

  it("la specchiatura è una trasformazione sola, senza scala", async () => {
    pilotaImmagini(PANORAMICA);
    await monta(
      <Foto sorgente="f.webp" ritaglio={ritaglio({ specchiata: true })} dimensioni={POST} velo={null} />,
    );
    // Lo zoom è già nella larghezza: raddoppiarlo qui deformerebbe due volte.
    expect(stile().transform).toBe("scaleX(-1)");
    expect(Number.parseFloat(stile().width) / Number.parseFloat(stile().height)).toBeCloseTo(
      1800 / 832,
      6,
    );
  });

  it("senza specchiatura non mette nessuna trasformazione", async () => {
    pilotaImmagini(PANORAMICA);
    await monta(<Foto sorgente="f.webp" ritaglio={ritaglio()} dimensioni={POST} velo={null} />);
    expect(stile().transform).toBe("");
  });

  it("il velo resta sopra la fotografia", async () => {
    pilotaImmagini(PANORAMICA);
    await monta(
      <Foto sorgente="f.webp" ritaglio={ritaglio()} dimensioni={POST} velo="linear-gradient(red, blue)" />,
    );
    const figli = [...contenitore.querySelectorAll("div > *")];
    const indiceImg = figli.findIndex((e) => e.tagName === "IMG");
    const indiceVelo = figli.findIndex((e) => e.style?.background?.includes("linear-gradient"));
    expect(indiceImg).toBeGreaterThanOrEqual(0);
    expect(indiceVelo).toBeGreaterThan(indiceImg);
  });
});

describe("le dimensioni intrinseche devono essere pronte", () => {
  it("finché non si conoscono non si disegna, e la misura è in sospeso", async () => {
    pilotaImmagini(PANORAMICA, { carica: false });
    await monta(<Foto sorgente="f.webp" ritaglio={ritaglio()} dimensioni={POST} velo={null} />);

    // Niente immagine: una geometria provvisoria è proprio ciò che non deve
    // finire in un PNG.
    expect(img()).toBeNull();
    expect(misureInSospeso()).toBe(1);
  });

  it("quando arrivano, si disegna e la misura si chiude", async () => {
    pilotaImmagini(PANORAMICA);
    await monta(<Foto sorgente="f.webp" ritaglio={ritaglio()} dimensioni={POST} velo={null} />);

    expect(img()).not.toBeNull();
    expect(misureInSospeso()).toBe(0);
  });
});

/* ================================================================== *
 * Le dimensioni appartengono alla sorgente che le ha prodotte
 * ================================================================== */

/**
 * Un `Image` con un caricamento per sorgente, aperto a comando.
 *
 * Serve a mettere in mano alla prova il momento esatto in cui una fotografia
 * risponde — e quello in cui ne risponde una superata.
 */
function pilotaPerSorgente(dimensioni) {
  const pendenti = new Map();
  globalThis.Image = class {
    constructor() {
      this.naturalWidth = 0;
      this.naturalHeight = 0;
      this.complete = false;
    }
    set src(v) {
      this._src = v;
      pendenti.set(v, {
        risolvi: () => {
          this.naturalWidth = dimensioni[v].larghezza;
          this.naturalHeight = dimensioni[v].altezza;
          this.complete = true;
          this.onload?.();
        },
        fallisci: () => this.onerror?.(),
      });
    }
    get src() {
      return this._src;
    }
  };
  return pendenti;
}

const DIMENSIONI = {
  "a.webp": PANORAMICA,
  "b.webp": VERTICALE,
};

/** Monta `Foto` e permette di cambiarle la sorgente senza smontarla. */
function Cambiabile({ sorgente, spia }) {
  return (
    <>
      <Foto sorgente={sorgente} ritaglio={ritaglio()} dimensioni={POST} velo={null} />
      {spia && <Spia registra={spia} />}
    </>
  );
}

/**
 * Guarda il DOM **appena commesso**, prima che gli effetti passivi girino.
 *
 * È l'unica finestra in cui il difetto si vede: azzerare le misure in un
 * effetto arriva dopo che React ha già disegnato la sorgente nuova con la
 * geometria vecchia, e una prova che controlla a effetti esauriti non trova
 * più niente.
 */
function Spia({ registra }) {
  useLayoutEffect(() => {
    const i = document.querySelector("img");
    registra(i ? { src: i.getAttribute("src"), larghezza: i.style.width } : null);
  });
  return null;
}

async function cambiaSorgente(sorgente, spia) {
  const lettore = { current: null };
  const misure = { current: null };
  await act(async () => {
    radice.render(
      <FornitoreProblemi onProblemi={() => {}} lettore={lettore} misure={misure}>
        <Cambiabile sorgente={sorgente} spia={spia} />
      </FornitoreProblemi>,
    );
  });
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
  return { lettore, misure };
}

describe("cambiando sorgente, la geometria di prima non vale più", () => {
  it("B sospesa non viene disegnata con le dimensioni di A", async () => {
    const pendenti = pilotaPerSorgente(DIMENSIONI);

    await cambiaSorgente("a.webp");
    await act(async () => {
      pendenti.get("a.webp").risolvi();
    });
    const larghezzaDiA = Number.parseFloat(img().style.width);
    expect(larghezzaDiA).toBeCloseTo(
      geometriaCover({ intrinseca: PANORAMICA, contenitore: POST, zoom: 1 }).larghezza,
      3,
    );

    // B non ha ancora risposto: non c'è nessuna geometria utilizzabile.
    const { misure } = await cambiaSorgente("b.webp");

    expect(img()).toBeNull();
    expect(misure.current()).toBe(1);
  });

  it("nemmeno per un fotogramma B viene disegnata con la geometria di A", async () => {
    const pendenti = pilotaPerSorgente(DIMENSIONI);
    const visto = [];

    await cambiaSorgente("a.webp", (v) => visto.push(v));
    await act(async () => {
      pendenti.get("a.webp").risolvi();
    });
    const larghezzaDiA = img().style.width;

    visto.length = 0;
    await cambiaSorgente("b.webp", (v) => visto.push(v));

    // Ogni commit osservato: in nessuno B porta la larghezza di A.
    const sbagliati = visto.filter((v) => v && v.src === "b.webp" && v.larghezza === larghezzaDiA);
    expect(sbagliati, `fotogrammi con la geometria sbagliata: ${JSON.stringify(sbagliati)}`).toEqual([]);
    // E la prova non è vuota: qualche commit è stato davvero osservato.
    expect(visto.length).toBeGreaterThan(0);
  });

  it("quando B risponde usa le proprie dimensioni e libera la misura", async () => {
    const pendenti = pilotaPerSorgente(DIMENSIONI);
    await cambiaSorgente("a.webp");
    await act(async () => {
      pendenti.get("a.webp").risolvi();
    });
    const { misure } = await cambiaSorgente("b.webp");
    await act(async () => {
      pendenti.get("b.webp").risolvi();
    });

    const atteso = geometriaCover({ intrinseca: VERTICALE, contenitore: POST, zoom: 1 });
    expect(Number.parseFloat(img().style.width)).toBeCloseTo(atteso.larghezza, 3);
    expect(Number.parseFloat(img().style.height)).toBeCloseTo(atteso.altezza, 3);
    // Le proporzioni sono quelle di B, non quelle di A.
    expect(Number.parseFloat(img().style.width) / Number.parseFloat(img().style.height)).toBeCloseTo(
      VERTICALE.larghezza / VERTICALE.altezza,
      6,
    );
    expect(misure.current()).toBe(0);
  });

  it("la risposta tardiva di A, dopo il cambio, non tocca niente", async () => {
    const pendenti = pilotaPerSorgente(DIMENSIONI);
    await cambiaSorgente("a.webp");
    const { misure } = await cambiaSorgente("b.webp");

    // A risponde adesso: è una richiesta superata.
    await act(async () => {
      pendenti.get("a.webp").risolvi();
    });

    expect(img()).toBeNull();
    expect(misure.current()).toBe(1);

    // E quando risponde B, è B a comandare.
    await act(async () => {
      pendenti.get("b.webp").risolvi();
    });
    expect(Number.parseFloat(img().style.width) / Number.parseFloat(img().style.height)).toBeCloseTo(
      VERTICALE.larghezza / VERTICALE.altezza,
      6,
    );
  });

  it("se B fallisce non si riusa la geometria di A e non si dà il via libera", async () => {
    const pendenti = pilotaPerSorgente(DIMENSIONI);
    await cambiaSorgente("a.webp");
    await act(async () => {
      pendenti.get("a.webp").risolvi();
    });
    const { lettore, misure } = await cambiaSorgente("b.webp");

    await act(async () => {
      pendenti.get("b.webp").fallisci();
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 140));
    });

    expect(img()).toBeNull();
    // Il fallimento è un errore dichiarato, non un'attesa infinita.
    const guai = lettore.current().filter((p) => p.livello === "errore");
    expect(guai).toHaveLength(1);
    expect(guai[0].messaggio).toMatch(/non si è potuta caricare/i);
    // E la prontezza non arriva comunque.
    expect(misure.current()).toBe(1);
  });
});

describe("un errore di caricamento non sopravvive al caricamento riuscito", () => {
  it("A fallisce, B carica, si torna ad A e questa volta A riesce", async () => {
    const pendenti = pilotaPerSorgente(DIMENSIONI);

    // 1. A fallisce: errore dichiarato, niente geometria, misura in sospeso.
    const primo = await cambiaSorgente("a.webp");
    await act(async () => {
      pendenti.get("a.webp").fallisci();
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 140));
    });
    expect(primo.lettore.current().filter((p) => p.livello === "errore")).toHaveLength(1);

    // 2. B carica senza problemi.
    await cambiaSorgente("b.webp");
    await act(async () => {
      pendenti.get("b.webp").risolvi();
    });

    // 3. Si torna ad A, e questa volta A risponde.
    const finale = await cambiaSorgente("a.webp");
    await act(async () => {
      pendenti.get("a.webp").risolvi();
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 140));
    });

    const atteso = geometriaCover({ intrinseca: PANORAMICA, contenitore: POST, zoom: 1 });
    expect(Number.parseFloat(img().style.width)).toBeCloseTo(atteso.larghezza, 3);
    expect(Number.parseFloat(img().style.height)).toBeCloseTo(atteso.altezza, 3);
    expect(finale.misure.current()).toBe(0);
    // L'errore di prima non è sopravvissuto al successo di adesso.
    expect(finale.lettore.current().filter((p) => p.livello === "errore")).toEqual([]);
  });

  it("il fallimento di B non si appiccica ad A quando si torna ad A", async () => {
    const pendenti = pilotaPerSorgente(DIMENSIONI);
    await cambiaSorgente("a.webp");
    await act(async () => {
      pendenti.get("a.webp").risolvi();
    });
    const larghezzaDiA = img().style.width;

    await cambiaSorgente("b.webp");
    await act(async () => {
      pendenti.get("b.webp").fallisci();
    });
    expect(img()).toBeNull();

    /*
     * Tornando ad A non si riusa la misura di prima: l'esito appartiene a una
     * sorgente sola, e A va rimisurata. Nel frattempo niente geometria e misura
     * in sospeso — il fallimento di B, però, non la segue.
     */
    const finale = await cambiaSorgente("a.webp");
    expect(img()).toBeNull();
    expect(finale.misure.current()).toBe(1);
    expect(finale.lettore.current().filter((p) => p.livello === "errore")).toEqual([]);

    await act(async () => {
      pendenti.get("a.webp").risolvi();
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 140));
    });
    expect(img().style.width).toBe(larghezzaDiA);
    expect(finale.lettore.current().filter((p) => p.livello === "errore")).toEqual([]);
    expect(finale.misure.current()).toBe(0);
  });
});
