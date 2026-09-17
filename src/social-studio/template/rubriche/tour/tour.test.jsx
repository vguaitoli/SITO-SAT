import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import PostTour from "./PostTour";
import StoryTour from "./StoryTour";
import { FornitoreProblemi } from "../../primitivi";
import { GEOMETRIA, ZONE_INSTAGRAM } from "../../../design/tour";
import { geometriaCover } from "../../geometria-foto";

/**
 * Il prototipo visivo TOUR, guardato nel DOM.
 *
 * Non si controlla «com'è venuto»: si controlla dove stanno le cose, che cosa
 * compare e che cosa non compare. Le due domande che un'anteprima ridotta non
 * sa rispondere sono proprio queste — un logo dentro la fascia dello sticker e
 * un claim sparito in silenzio si vedono solo a misura reale o non si vedono
 * affatto.
 */

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let contenitore;
let radice;
let problemi;
let ImmagineOriginale;

/**
 * Le fotografie, in jsdom, non si caricano mai.
 *
 * TOUR usa la geometria esplicita di `Foto` — html2canvas non legge
 * `object-fit` — e quella geometria ha bisogno delle dimensioni vere del file.
 * Senza questo, ogni prova resterebbe davanti a un riquadro in attesa. Le
 * dimensioni sono quelle della fotografia di prova: panoramica, 1800×832.
 */
function pilotaImmagini(larghezza = 1800, altezza = 832) {
  globalThis.Image = class {
    constructor() {
      this.naturalWidth = 0;
      this.naturalHeight = 0;
      this.complete = false;
    }
    set src(v) {
      this._src = v;
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
  pilotaImmagini();
  contenitore = document.createElement("div");
  document.body.appendChild(contenitore);
  radice = createRoot(contenitore);
  problemi = [];
});

afterEach(() => {
  act(() => radice.unmount());
  contenitore.remove();
  globalThis.Image = ImmagineOriginale;
});

/** L'attesa copre il raggruppamento da 80 ms di `FornitoreProblemi`. */
const assesta = async () => {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 140));
  });
};

async function monta(albero) {
  await act(async () => {
    radice.render(
      <FornitoreProblemi
        onProblemi={(p) => {
          problemi = p;
        }}
      >
        {albero}
      </FornitoreProblemi>,
    );
  });
  await assesta();
}

const q = (sel) => contenitore.querySelector(sel);
const qa = (sel) => [...contenitore.querySelectorAll(sel)];
const testoDi = () => contenitore.textContent || "";

/** Una bozza TOUR sintetica: nessun tour reale, nessun dato operativo. */
const ritaglio = (idBlob) => ({ idBlob, zoom: 1.1, x: 0.5, y: 0.5, specchiata: false });

const BOZZA = {
  categoria: "tour",
  fattuali: {
    nome: "Percorso Di Prova",
    categoria: "Enduro",
    durata: "3 Giorni",
    km: "240 km",
    livello: "Medio",
    periodo: "Aprile – Ottobre",
    prezzo: "890 €",
    url: "https://esempio.test/tour/percorso-di-prova",
  },
  editoriale: {
    titoloBreve: "Percorso Di Prova",
    claim: "Una frase breve di prova.",
    cta: "Scopri il tour",
  },
  media: { cover: ritaglio("b-cover"), esperienza: [], sfondi: {} },
};

const con = (rami) => ({
  ...BOZZA,
  fattuali: { ...BOZZA.fattuali, ...(rami.fattuali || {}) },
  editoriale: { ...BOZZA.editoriale, ...(rami.editoriale || {}) },
  media: rami.media || BOZZA.media,
});

/* ================================================================== *
 * Intestazione, marchio e telaio
 * ================================================================== */

describe("intestazione e marchio sono locali, non del telaio", () => {
  it("il Post monta i propri e spegne quelli comuni", async () => {
    await monta(<PostTour contenuto={BOZZA} sorgenteCover="cover.webp" />);

    expect(q('[data-parte="intestazione"]')).not.toBeNull();
    expect(q('[data-parte="marchio"]')).not.toBeNull();
    // Quella del telaio non c'è: starebbe a y 72, fuori dall'area di sicurezza.
    expect(q('[data-parte="intestazione-telaio"]')).toBeNull();

    const g = GEOMETRIA.post;
    expect(q('[data-parte="intestazione"]').style.top).toBe(`${g.intestazione.y}px`);
    expect(q('[data-parte="marchio"]').style.top).toBe(`${g.marchio.y}px`);
    expect(testoDi()).toContain("01 / TOUR");
  });

  it("la Story monta i propri alle coordinate della Story", async () => {
    await monta(<StoryTour contenuto={BOZZA} sorgenteCover="cover.webp" />);

    const g = GEOMETRIA.story;
    expect(q('[data-parte="intestazione-telaio"]')).toBeNull();
    expect(q('[data-parte="intestazione"]').style.top).toBe(`${g.intestazione.y}px`);
    expect(q('[data-parte="marchio"]').style.top).toBe(`${g.marchio.y}px`);
    // Il logo del telaio comune starebbe a y 1631: dentro la fascia sticker.
    expect(g.marchio.y + g.marchio.altezza).toBeLessThan(ZONE_INSTAGRAM.sticker.y);
  });

  it("le due tele hanno la misura reale", async () => {
    await monta(<PostTour contenuto={BOZZA} sorgenteCover="c.webp" />);
    let tela = q("[data-slide]");
    expect(tela.style.width).toBe("1080px");
    expect(tela.style.height).toBe("1350px");

    await monta(<StoryTour contenuto={BOZZA} sorgenteCover="c.webp" />);
    tela = q("[data-slide]");
    expect(tela.style.width).toBe("1080px");
    expect(tela.style.height).toBe("1920px");
  });
});

describe("le zone vietate della Story restano vuote", () => {
  it("nessun elemento posizionato comincia dentro sticker o area risposta", async () => {
    await monta(<StoryTour contenuto={BOZZA} sorgenteCover="cover.webp" />);

    const dentroLeZone = qa("[style]")
      .filter((el) => el.style.position === "absolute" && el.style.top)
      .filter((el) => parseFloat(el.style.top) >= ZONE_INSTAGRAM.sticker.y)
      // La guida è l'unica cosa ammessa lì, ed è solo anteprima.
      .filter((el) => !el.hasAttribute("data-solo-anteprima"));

    expect(dentroLeZone.map((el) => el.getAttribute("data-parte") || el.tagName)).toEqual([]);
  });

  it("la guida dello sticker è solo anteprima e sta sulla fascia calcolata", async () => {
    await monta(<StoryTour contenuto={BOZZA} sorgenteCover="cover.webp" />);

    const guida = q("[data-solo-anteprima]");
    expect(guida).not.toBeNull();
    expect(guida.getAttribute("data-solo-anteprima")).toBe("true");
    expect(guida.style.top).toBe("1580px");
    expect(guida.style.height).toBe("180px");
    // È lo stesso segno che la cattura spegne prima di fotografare.
    expect(guida.style.top).toBe(`${ZONE_INSTAGRAM.sticker.y}px`);
  });

  it("il Post non ha nessuna guida: la fascia sticker non gli appartiene", async () => {
    await monta(<PostTour contenuto={BOZZA} sorgenteCover="cover.webp" />);
    expect(q("[data-solo-anteprima]")).toBeNull();
  });
});

/* ================================================================== *
 * I dati
 * ================================================================== */

describe("i dati disegnati", () => {
  it("il Post ne mostra tre, nell'ordine della priorità", async () => {
    await monta(<PostTour contenuto={BOZZA} sorgenteCover="cover.webp" />);
    expect(qa('[data-parte="dato"]').map((el) => el.dataset.campo)).toEqual([
      "durata",
      "km",
      "livello",
    ]);
    expect(q('[data-parte="filo"]')).not.toBeNull();
  });

  it("la Story ne mostra due, nell'ordine suo", async () => {
    await monta(<StoryTour contenuto={BOZZA} sorgenteCover="cover.webp" />);
    expect(qa('[data-parte="dato"]').map((el) => el.dataset.campo)).toEqual(["durata", "livello"]);
  });

  it("il valore è quello della bozza, senza unità aggiunte", async () => {
    await monta(
      <PostTour
        contenuto={con({ fattuali: { durata: "3", km: "240", livello: "Medio" } })}
        sorgenteCover="cover.webp"
      />,
    );
    const testo = testoDi();
    expect(testo).toContain("3");
    expect(testo).toContain("240");
    expect(testo).not.toContain("240 km");
    expect(testo).toContain("DURATA");
  });

  it("senza dati non disegna né celle né filetto", async () => {
    const vuota = con({
      fattuali: { durata: "", km: "", livello: "", periodo: "", prezzo: "", sterrato: "", area: "", mezzo: "" },
    });
    await monta(<PostTour contenuto={vuota} sorgenteCover="cover.webp" />);
    expect(qa('[data-parte="dato"]')).toHaveLength(0);
    expect(q('[data-parte="filo"]')).toBeNull();
  });

  it("un dato solo si vede lo stesso: bloccarlo spetta al pre-flight", async () => {
    const magra = con({
      fattuali: { durata: "3 Giorni", km: "", livello: "", periodo: "", prezzo: "", sterrato: "", area: "", mezzo: "" },
    });
    await monta(<PostTour contenuto={magra} sorgenteCover="cover.webp" />);
    expect(qa('[data-parte="dato"]').map((el) => el.dataset.campo)).toEqual(["durata"]);
  });

  it("altri dati disponibili oltre il massimo non sono un problema", async () => {
    await monta(<PostTour contenuto={BOZZA} sorgenteCover="cover.webp" />);
    // `periodo` e `prezzo` sono valorizzati e restano fuori per priorità: la
    // lista esiste per scegliere, e la scelta non è un difetto da segnalare.
    expect(qa('[data-parte="dato"]')).toHaveLength(3);
    expect(problemi.filter((p) => p.chiave.includes("dato"))).toEqual([]);
  });
});

/* ================================================================== *
 * Claim, CTA, URL
 * ================================================================== */

describe("il claim", () => {
  it("vuoto: non compare e non produce avvisi", async () => {
    await monta(
      <PostTour contenuto={con({ editoriale: { claim: "" } })} sorgenteCover="cover.webp" />,
    );
    expect(q('[data-parte="claim"]')).toBeNull();
    expect(problemi.filter((p) => p.chiave.includes("claim"))).toEqual([]);
  });

  it("che entra: compare alla riga sua", async () => {
    await monta(<PostTour contenuto={BOZZA} sorgenteCover="cover.webp" />);
    const claim = q('[data-parte="claim"]');
    expect(claim).not.toBeNull();
    expect(claim.textContent).toBe("Una frase breve di prova.");
  });

  it("che non entra: omesso, e l'avviso lo dice", async () => {
    const lungo = "Una frase lunghissima che non entrerebbe mai nello spazio assegnato al claim.";
    // La misura non esiste in jsdom: la si mette noi, e solo per questo testo.
    const originale = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetHeight");
    Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
      configurable: true,
      get() {
        return this.textContent === lungo ? 500 : 0;
      },
    });

    try {
      await monta(
        <StoryTour contenuto={con({ editoriale: { claim: lungo } })} sorgenteCover="cover.webp" />,
      );

      expect(q('[data-parte="claim"]')).toBeNull();
      const avviso = problemi.find((p) => p.chiave.includes("claim"));
      expect(avviso).toBeDefined();
      expect(avviso.livello).toBe("avviso");
      expect(avviso.messaggio).toMatch(/omesso/i);
      /*
       * Non troncato e non visibile: l'unico nodo che porta ancora quel testo
       * è la sonda che l'ha misurato, nascosta e fuori dalla cattura.
       */
      const portatori = qa("div").filter((el) => el.textContent === lungo);
      expect(portatori).toHaveLength(1);
      expect(portatori[0].style.visibility).toBe("hidden");
      expect(portatori[0].getAttribute("aria-hidden")).toBe("true");
    } finally {
      Object.defineProperty(HTMLElement.prototype, "offsetHeight", originale);
    }
  });
});

describe("la CTA", () => {
  it("con testo: testo e freccia", async () => {
    await monta(<PostTour contenuto={BOZZA} sorgenteCover="cover.webp" />);
    const cta = q('[data-parte="cta"]');
    expect(cta).not.toBeNull();
    expect(cta.textContent).toContain("Scopri il tour");
    expect(cta.querySelector("svg")).not.toBeNull();
  });

  it("vuota: niente blocco e nessuna freccia orfana", async () => {
    await monta(
      <PostTour contenuto={con({ editoriale: { cta: "" } })} sorgenteCover="cover.webp" />,
    );
    expect(q('[data-parte="cta"]')).toBeNull();
    // Nessuna freccia sopravvive da sola: non è un'icona qualunque, è quella
    // della CTA. Le isoipse del telaio restano, e sono un'altra cosa.
    expect(qa(".lucide-arrow-right")).toHaveLength(0);
    expect(testoDi()).not.toContain("Scopri il tour");
  });

  it("l'URL di destinazione non viene mai disegnato", async () => {
    await monta(<PostTour contenuto={BOZZA} sorgenteCover="cover.webp" />);
    expect(testoDi()).not.toContain("https://");
    expect(testoDi()).not.toContain("esempio.test");
    await monta(<StoryTour contenuto={BOZZA} sorgenteCover="cover.webp" />);
    expect(testoDi()).not.toContain("esempio.test");
  });
});

/* ================================================================== *
 * Le fotografie
 * ================================================================== */

describe("le fotografie", () => {
  it("il Post disegna la cover con il suo ritaglio, senza deformarla", async () => {
    await monta(<PostTour contenuto={BOZZA} sorgenteCover="cover.webp" />);
    const img = q("img[src='cover.webp']");
    expect(img).not.toBeNull();
    expect(testoDi()).not.toContain("Fotografia del tour");

    /*
     * Lo zoom del ritaglio sta nelle dimensioni, non in una trasformazione:
     * html2canvas non legge `object-fit`, e una geometria in percentuale
     * usciva deformata nel solo PNG.
     */
    const px = (v) => Number.parseFloat(v);
    const atteso = geometriaCover({
      intrinseca: { larghezza: 1800, altezza: 832 },
      contenitore: GEOMETRIA.post.tela,
      zoom: BOZZA.media.cover.zoom,
      x: BOZZA.media.cover.x,
      y: BOZZA.media.cover.y,
    });
    expect(px(img.style.width)).toBeCloseTo(atteso.larghezza, 3);
    expect(px(img.style.height)).toBeCloseTo(atteso.altezza, 3);
    // Le proporzioni del file restano quelle del file.
    expect(px(img.style.width) / px(img.style.height)).toBeCloseTo(1800 / 832, 6);
    expect(img.style.objectFit).toBe("");
  });

  it("il Post senza cover mostra il segnaposto, in anteprima", async () => {
    const senzaFoto = con({ media: { cover: null, esperienza: [], sfondi: {} } });
    await monta(<PostTour contenuto={senzaFoto} sorgenteCover={null} />);
    expect(q("img[src='cover.webp']")).toBeNull();
    expect(testoDi()).toContain("Fotografia del tour");
  });

  it("il Post senza cover non si prende la fotografia della Story", async () => {
    /*
     * Il ripiego esiste in un verso solo. Prendere la Story per il Post
     * riempirebbe il buco con un'inquadratura 9:16 su una tela 4:5, e — peggio
     * — nasconderebbe che la cover manca davvero.
     */
    const soloStory = con({
      media: { cover: null, esperienza: [], sfondi: { tourStory: ritaglio("b-story") } },
    });
    // La sorgente c'è: se il Post ripiegasse, disegnerebbe con il ritaglio 9:16.
    await monta(<PostTour contenuto={soloStory} sorgenteCover="cover.webp" />);
    expect(qa("img")).toHaveLength(1); // solo il logo del marchio
    expect(testoDi()).toContain("Fotografia del tour");
  });

  it("la Story usa il proprio slot quando c'è", async () => {
    const conStory = con({
      media: { cover: ritaglio("b-cover"), esperienza: [], sfondi: { tourStory: ritaglio("b-story") } },
    });
    await monta(
      <StoryTour contenuto={conStory} sorgenteStory="story.webp" sorgenteCover="cover.webp" />,
    );
    expect(q("img[src='story.webp']")).not.toBeNull();
    expect(q("[data-foto-ripiego]").getAttribute("data-foto-ripiego")).toBe("false");
  });

  it("la Story ripiega sulla cover, e il ripiego si vede", async () => {
    await monta(<StoryTour contenuto={BOZZA} sorgenteStory={null} sorgenteCover="cover.webp" />);
    expect(q("img[src='cover.webp']")).not.toBeNull();
    expect(q("[data-foto-ripiego]").getAttribute("data-foto-ripiego")).toBe("true");
  });

  it("la Story senza né l'uno né l'altra mostra il segnaposto", async () => {
    const senzaFoto = con({ media: { cover: null, esperienza: [], sfondi: {} } });
    await monta(<StoryTour contenuto={senzaFoto} sorgenteStory={null} sorgenteCover={null} />);
    expect(qa("img")).toHaveLength(1); // solo il logo del marchio
    expect(testoDi()).toContain("Fotografia del tour");
    expect(q("[data-foto-ripiego]").getAttribute("data-foto-ripiego")).toBe("false");
  });

  it("nel DOM non finiscono binari né data URL", async () => {
    await monta(<PostTour contenuto={BOZZA} sorgenteCover="cover.webp" />);
    const html = contenitore.innerHTML;
    expect(html).not.toContain("data:image");
    expect(html).not.toContain("base64,");
    expect(html).not.toContain("blob:");
  });
});
