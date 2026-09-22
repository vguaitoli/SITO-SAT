import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import EditorTour from "./EditorTour";
import AnteprimaBozzaTour from "./AnteprimaBozzaTour";
import { FornitoreArchivio } from "./ContestoArchivio";
import { FornitoreTransizione } from "./transizione";
import { creaArchivioMemoria } from "../fondamenta/archivio";
import { contenutoVuoto } from "../fondamenta/schema";
import { tagVuoti } from "../media/libreria";
import { GEOMETRIA } from "../design/tour";
import { geometriaCover } from "../template/geometria-foto";
import { accendiAmbienteGrafico, spegniAmbienteGrafico } from "./ambiente-di-prova";

/**
 * L'anteprima della bozza aperta.
 *
 * Il difetto che queste prove escludono è il più insidioso di tutti: **un'
 * anteprima che disegna qualcosa che non è il proprio lavoro**. Sarebbe
 * precisa, convincente e falsa, e nessuno se ne accorgerebbe finché il PNG non
 * uscisse diverso da quel che si era visto.
 *
 * Il secondo è la sua variante geometrica: la Story che disegna la propria
 * fotografia con l'inquadratura di un'altra. Anche quello non si vede, perché
 * l'immagine c'è — semplicemente è tagliata come non l'ha tagliata nessuno.
 */

/** Quante volte il fornitore del registro è stato invocato: cresce a ogni render. */
const spie = vi.hoisted(() => ({ render: 0 }));

vi.mock("../template/primitivi", async (importaOriginale) => {
  const vero = await importaOriginale();
  return {
    ...vero,
    FornitoreProblemi: function FornitoreSorvegliato(props) {
      spie.render += 1;
      return React.createElement(vero.FornitoreProblemi, props);
    },
  };
});

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const TOUR = Object.freeze({
  slug: "prova-di-contratto",
  name: "Prova Di Contratto",
  type: "Enduro",
  descrizione: "Testo di prova importato dal sito.",
  prezzo: "100 €",
  km: "50 km",
  durata: "1 Giorno",
  livello: "Facile",
  periodo: "Aprile",
});

let contenitore;
let radice;
let immagini;

beforeEach(() => {
  spie.render = 0;
  immagini = accendiAmbienteGrafico();
  contenitore = document.createElement("div");
  document.body.appendChild(contenitore);
  radice = createRoot(contenitore);
});

afterEach(() => {
  act(() => radice.unmount());
  contenitore.remove();
  spegniAmbienteGrafico();
});

const respiro = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
};

/** Lascia scadere il raggruppamento a 80 ms del registro dei problemi. */
const assesta = async () => {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 140));
  });
};

const q = (sel) => contenitore.querySelector(sel);
const qa = (sel) => [...contenitore.querySelectorAll(sel)];
const bottone = (nome) =>
  qa("button").find((b) => (b.textContent || "").trim().toLowerCase().includes(nome.toLowerCase()));

const clic = async (el) => {
  if (!el) throw new Error("Elemento assente");
  await act(async () => {
    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  await respiro();
};

const premi = (nome) => clic(bottone(nome));

const scrivi = async (etichetta, valore) => {
  const el = qa("input, textarea").find((i) => i.getAttribute("aria-label") === etichetta);
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(
      el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype,
      "value",
    ).set;
    setter.call(el, valore);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await respiro();
};

const risolviFoto = async (larghezza = 2400, altezza = 2600) => {
  await act(async () => {
    immagini.risolviTutte(larghezza, altezza);
  });
  await respiro();
};

async function aggiungiFoto(archivio, nome) {
  return archivio.salvaBlob("immagine", new Blob(["x"], { type: "image/webp" }), {
    nome,
    tipoMime: "image/webp",
    larghezza: 2400,
    altezza: 2600,
    tag: tagVuoti(),
  });
}

/** Il riquadro di un formato dentro l'anteprima. */
const riquadro = (quale) => q(`[data-parte="anteprima-bozza"] [data-formato="${quale}"]`);
const prontezza = (quale) => riquadro(quale)?.querySelector("[data-prontezza]")?.dataset.prontezza;
/** L'immagine della fotografia: non il marchio, che è un asset del template. */
const fotoDi = (quale) =>
  [...riquadro(quale).querySelectorAll("img")].find(
    (i) => !(i.getAttribute("src") || "").includes("logo"),
  );

/* ================================================================== *
 * Nell'editor vero
 * ================================================================== */

describe("l'anteprima disegna la bozza aperta", () => {
  async function montaEditor(archivio = creaArchivioMemoria()) {
    await act(async () => {
      radice.render(
        <FornitoreArchivio archivio={archivio}>
          <FornitoreTransizione>
            <EditorTour tours={[TOUR]} urlBase="https://esempio.test" />
          </FornitoreTransizione>
        </FornitoreArchivio>,
      );
    });
    await respiro();
    return archivio;
  }

  const creaBozza = async () => {
    const select = q('select[aria-label="Tour dal sito"]');
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set;
      setter.call(select, TOUR.slug);
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await respiro();
    await premi("Crea bozza dal tour");
  };

  const scegliSlot = (slot) => clic(q(`[data-rubrica-slot="tour"] [data-slot="${slot}"]`));
  const scegliFoto = async (nome) => {
    const b = qa("button[title]").find((x) => (x.getAttribute("title") || "").startsWith(nome));
    await clic(b);
  };

  /**
   * Il difetto che questa prova esclude: l'anteprima che disegna la fixture.
   *
   * Il banco visivo sintetico esiste e va benissimo dov'è — là si guarda la
   * grafica — ma qui si guarda il **proprio lavoro**, e un titolo inventato al
   * posto del proprio sarebbe una bugia precisa.
   */
  it("i testi della bozza arrivano a entrambi i formati, e nessuna fixture", async () => {
    await montaEditor();
    await creaBozza();
    await scrivi("Titolo breve", "Titolo Scritto A Mano");
    await scrivi("CTA", "Invito scritto a mano");

    for (const quale of ["post", "story"]) {
      expect(riquadro(quale).textContent, quale).toContain("Titolo Scritto A Mano");
    }
    // Nessuna traccia del contenuto sintetico del banco visivo.
    const tutto = contenitore.textContent || "";
    expect(tutto).not.toContain("Percorso Di Prova");
    expect(tutto).not.toContain("Tre giorni di prova");
  });

  it("cover e Story disegnano ciascuna la propria sorgente", async () => {
    const archivio = creaArchivioMemoria();
    const idCover = await aggiungiFoto(archivio, "cover.webp");
    const idStory = await aggiungiFoto(archivio, "story.webp");
    const urlCover = await archivio.urlTemporaneo(idCover);
    const urlStory = await archivio.urlTemporaneo(idStory);

    await montaEditor(archivio);
    await creaBozza();
    await scegliSlot("cover");
    await scegliFoto("cover.webp");
    await premi("Assegna la foto selezionata");
    await scegliSlot("story");
    await scegliFoto("story.webp");
    await premi("Assegna la foto selezionata");
    await risolviFoto();

    expect(fotoDi("post").getAttribute("src")).toBe(urlCover);
    expect(fotoDi("story").getAttribute("src")).toBe(urlStory);
  });

  it("i due pannelli del pre-flight sono distinti, uno per formato", async () => {
    await montaEditor();
    await creaBozza();
    await assesta();

    const pannelli = qa('[data-parte="anteprima-bozza"] [data-pannello="preflight-tour"]');
    expect(pannelli).toHaveLength(2);
    // Senza cover il Post ha il proprio errore, la Story il suo: righe diverse.
    expect(riquadro("post").querySelector('[data-riga="post/foto-cover-assente"]')).toBeTruthy();
    expect(riquadro("story").querySelector('[data-riga="story/foto-story-assente"]')).toBeTruthy();
    // E nessuna riga di un formato finisce nel pannello dell'altro.
    expect(riquadro("post").querySelector('[data-riga^="story/"]')).toBeFalsy();
    expect(riquadro("story").querySelector('[data-riga^="post/"]')).toBeFalsy();
  });

  it("la Story senza fotografia propria dichiara il ripiego", async () => {
    const archivio = creaArchivioMemoria();
    await aggiungiFoto(archivio, "cover.webp");
    await montaEditor(archivio);
    await creaBozza();
    await scegliFoto("cover.webp");
    await premi("Assegna la foto selezionata");
    await risolviFoto();
    await assesta();

    expect(riquadro("story").querySelector('[data-ripiego="story"]')).toBeTruthy();
    expect(riquadro("story").textContent).toMatch(/ripiego cover/i);
    // Il Post non ripiega su niente: è la cover, e basta.
    expect(riquadro("post").querySelector('[data-ripiego="story"]')).toBeFalsy();
  });
});

/* ================================================================== *
 * Le corse, con sorgenti pilotate
 * ================================================================== */

/**
 * Qui l'anteprima si monta da sola, con le sorgenti scelte dalla prova.
 *
 * Non è un helper al posto dell'integrazione: è lo stesso componente che
 * l'editor monta, con le stesse prop, e serve a poter decidere **quando** una
 * fotografia risponde. Attraverso la libreria quel momento non si controlla, e
 * la finestra da osservare è proprio quella.
 */
describe("le sorgenti e la loro evidenza", () => {
  const bozza = (media) => ({
    ...contenutoVuoto({ categoria: "tour", formato: "post" }),
    editoriale: {
      ...contenutoVuoto({ categoria: "tour" }).editoriale,
      titoloBreve: "Titolo Della Bozza",
      cta: "Invito",
    },
    fattuali: {
      ...contenutoVuoto({ categoria: "tour" }).fattuali,
      durata: "1 Giorno",
      km: "50 km",
      livello: "Facile",
    },
    media,
  });

  const COVER = { idBlob: "img-cover", zoom: 1, x: 0.5, y: 0.5, specchiata: false };
  const STORY = { idBlob: "img-story", zoom: 2, x: 0.3, y: 0.7, specchiata: false };

  async function monta(sorgenti, media) {
    await act(async () => {
      radice.render(<AnteprimaBozzaTour contenuto={bozza(media)} sorgenti={sorgenti} />);
    });
    await respiro();
  }

  /**
   * Il difetto che questa prova esclude: la Story disegnata con
   * l'inquadratura della cover.
   *
   * Si confronta la geometria **reale** dell'immagine con quella che
   * `geometriaCover` calcola dal ritaglio della Story. Se la Story usasse il
   * ritaglio della cover — zoom 1 invece di 2 — i numeri non tornerebbero, e
   * nessun controllo sui soli `src` se ne accorgerebbe.
   */
  it("la Story usa il proprio ritaglio, non quello della cover", async () => {
    await monta(
      { cover: "https://esempio.test/cover.webp", story: "https://esempio.test/story.webp" },
      { cover: COVER, esperienza: [], sfondi: { tourStory: STORY } },
    );
    await risolviFoto(2400, 2600);

    const atteso = geometriaCover({
      intrinseca: { larghezza: 2400, altezza: 2600 },
      contenitore: GEOMETRIA.story.tela,
      zoom: STORY.zoom,
      x: STORY.x,
      y: STORY.y,
    });
    const conRitaglioDellaCover = geometriaCover({
      intrinseca: { larghezza: 2400, altezza: 2600 },
      contenitore: GEOMETRIA.story.tela,
      zoom: COVER.zoom,
      x: COVER.x,
      y: COVER.y,
    });
    // I due calcoli devono davvero differire, o la prova non direbbe niente.
    expect(atteso.larghezza).not.toBeCloseTo(conRitaglioDellaCover.larghezza, 3);

    const img = fotoDi("story");
    expect(Number.parseFloat(img.style.width)).toBeCloseTo(atteso.larghezza, 3);
    expect(Number.parseFloat(img.style.left)).toBeCloseTo(atteso.sinistra, 3);
  });

  it("finché la fotografia non ha risposto, non è pronta e il pre-flight blocca", async () => {
    await monta(
      { cover: "https://esempio.test/cover.webp", story: null },
      { cover: COVER, esperienza: [], sfondi: {} },
    );
    await assesta();

    expect(prontezza("post")).toBe("in-corso");
    expect(riquadro("post").querySelector('[data-riga="post/foto-in-corso"]')).toBeTruthy();
    // Nessuna immagine disegnata: senza dimensioni non c'è geometria.
    expect(fotoDi("post")).toBeUndefined();

    await risolviFoto();
    await assesta();
    expect(prontezza("post")).toBe("pronta");
    expect(riquadro("post").querySelector('[data-riga="post/foto-in-corso"]')).toBeFalsy();
  });

  it("una fotografia che non si carica è un errore, non un'assenza", async () => {
    await monta(
      { cover: "https://esempio.test/rotta.webp", story: null },
      { cover: COVER, esperienza: [], sfondi: {} },
    );
    await act(async () => {
      immagini.falliscilTutte();
    });
    await respiro();
    await assesta();

    expect(prontezza("post")).toBe("fallita");
    /*
     * Il fallimento lo dichiara il template attraverso il registro, e arriva
     * al pannello da `controlloSfori` come `sforo-foto`. Il pre-flight non ne
     * aggiunge un secondo: quando il registro parla, la voce è una sola.
     */
    expect(riquadro("post").querySelector('[data-riga="post/sforo-vista/foto"]')).toBeTruthy();
    expect(riquadro("post").textContent).toMatch(/non si è potuta caricare/i);
  });

  /**
   * Cambiando fotografia, l'evidenza della precedente resta un fatto vero su
   * un **altro** file. Usarla autorizzerebbe la nuova sulla base di dimensioni
   * che non le appartengono; e la risposta tardiva della vecchia non deve
   * poter rientrare quando non conta più.
   */
  it("cambiando sorgente non restano né geometria né misure della precedente", async () => {
    const prima = "https://esempio.test/prima.webp";
    const dopo = "https://esempio.test/dopo.webp";

    await monta({ cover: prima, story: null }, { cover: COVER, esperienza: [], sfondi: {} });
    await act(async () => {
      immagini.risolvi(prima, 2400, 2600);
    });
    await respiro();
    await assesta();
    expect(prontezza("post")).toBe("pronta");
    const larghezzaPrima = Number.parseFloat(fotoDi("post").style.width);

    // Si sostituisce la fotografia: la nuova non ha ancora risposto.
    await monta({ cover: dopo, story: null }, { cover: { ...COVER, idBlob: "img-dopo" }, esperienza: [], sfondi: {} });
    await assesta();

    expect(prontezza("post")).toBe("in-corso");
    expect(fotoDi("post")).toBeUndefined();

    // E la vecchia risponde adesso, in ritardo: non deve cambiare niente.
    await act(async () => {
      immagini.risolvi(prima, 4000, 4000);
    });
    await respiro();
    await assesta();
    expect(prontezza("post")).toBe("in-corso");

    // Solo la risposta della sorgente corrente la rende pronta.
    await act(async () => {
      // Proporzioni diverse, non solo dimensioni diverse: una fotografia in
      // scala darebbe la stessa geometria, e la prova non direbbe niente.
      immagini.risolvi(dopo, 1200, 2000);
    });
    await respiro();
    await assesta();
    expect(prontezza("post")).toBe("pronta");
    expect(Number.parseFloat(fotoDi("post").style.width)).not.toBeCloseTo(larghezzaPrima, 3);
  });

  /**
   * Un errore persistente non deve diventare un ciclo di ridisegno.
   *
   * È già successo: una callback ricostruita a ogni render faceva ritirare e
   * riscrivere l'effetto di segnalazione, il registro notificava, il genitore
   * aggiornava lo stato, e si ricominciava — una volta al secondo, per sempre.
   */
  it("con un errore che non passa, il ridisegno si ferma", async () => {
    await monta(
      { cover: "https://esempio.test/rotta.webp", story: null },
      { cover: COVER, esperienza: [], sfondi: {} },
    );
    await act(async () => {
      immagini.falliscilTutte();
    });
    await respiro();
    await assesta();

    const dopoAssestamento = spie.render;
    await assesta();
    await assesta();

    expect(spie.render).toBe(dopoAssestamento);
  });
});
