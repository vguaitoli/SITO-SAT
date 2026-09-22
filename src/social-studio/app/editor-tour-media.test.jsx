import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import EditorTour from "./EditorTour";
import MediaTour, { useUrlMedia } from "./MediaTour";
import { FornitoreArchivio } from "./ContestoArchivio";
import { FornitoreTransizione } from "./transizione";
import { creaArchivioMemoria } from "../fondamenta/archivio";
import { useBozzaTour } from "./useBozzaTour";
import { tagVuoti } from "../media/libreria";
import { accendiAmbienteGrafico, spegniAmbienteGrafico } from "./ambiente-di-prova";

/**
 * Fotografie e GPX dell'editor TOUR, sull'editor **vero**.
 *
 * Non sui helper: quello che deve reggere è il percorso intero — libreria,
 * slot, ritaglio, archivio, contenuto — perché è lì che i difetti di questa
 * famiglia vivono. Una fotografia «assegnata» che non arriva nel record, un
 * ritaglio applicato al file sbagliato, un GPX la cui geometria finisce nel
 * contenuto: nessuno di questi si vede provando una funzione per volta.
 *
 * L'archivio è **in memoria** e nasce vuoto a ogni prova: nessuna bozza di
 * prova tocca l'archivio personale, e nessun file entra nel repository. Il GPX
 * usato qui è una stringa sintetica costruita nella prova, con tre punti
 * inventati: non è una traccia reale e non ne descrive una.
 */

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

const ALTRO_TOUR = Object.freeze({
  ...TOUR,
  slug: "seconda-prova",
  name: "Seconda Prova",
});

const TOURS = Object.freeze([TOUR, ALTRO_TOUR]);

/** Un GPX sintetico: tre punti inventati, nessun percorso reale. */
const GPX_BUONO = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1"><wpt lat="40.9" lon="9.5"><name>Punto Inventato</name></wpt>
<trk><name>Traccia di prova</name><trkseg>
<trkpt lat="40.90" lon="9.50"><ele>10</ele></trkpt>
<trkpt lat="40.95" lon="9.60"><ele>120</ele></trkpt>
<trkpt lat="41.00" lon="9.70"><ele>80</ele></trkpt>
</trkseg></trk></gpx>`;

const GPX_ROTTO = "<gpx><trk>";

/** Un Blob che si comporta da File: `name` e `size` servono al riferimento. */
function fileGpx(testo, nome = "prova.gpx") {
  const b = new Blob([testo], { type: "application/gpx+xml" });
  Object.defineProperty(b, "name", { value: nome });
  return b;
}

let contenitore;
let radice;
let immagini;

/*
 * Due cose che jsdom non ha e che servono al ritaglio.
 *
 * `setPointerCapture` non esiste sugli elementi: senza, il gestore di
 * `pointerdown` solleva e la prova misurerebbe l'ambiente invece del codice.
 * `getBoundingClientRect` restituisce tutti zeri: un riquadro largo zero rende
 * la conversione da pixel a punto focale una divisione per zero, e il valore
 * risultante non direbbe niente. Qui il riquadro è 200×250, e uno spostamento
 * di pixel diventa uno spostamento leggibile.
 */
function ancoraIlRiquadro() {
  if (!Element.prototype.setPointerCapture) {
    Element.prototype.setPointerCapture = function nonFaNiente() {};
    Element.prototype.releasePointerCapture = function nonFaNiente() {};
  }
  Element.prototype.getBoundingClientRect = function rettangolo() {
    return this.hasAttribute?.("data-riquadro-ritaglio")
      ? { left: 0, top: 0, width: 200, height: 250, right: 200, bottom: 250, x: 0, y: 0 }
      : { left: 0, top: 0, width: 0, height: 0, right: 0, bottom: 0, x: 0, y: 0 };
  };
}
const rettangoloVero = Element.prototype.getBoundingClientRect;

beforeEach(() => {
  ancoraIlRiquadro();
  immagini = accendiAmbienteGrafico();
  contenitore = document.createElement("div");
  document.body.appendChild(contenitore);
  radice = createRoot(contenitore);
});

afterEach(() => {
  act(() => radice.unmount());
  contenitore.remove();
  spegniAmbienteGrafico();
  Element.prototype.getBoundingClientRect = rettangoloVero;
});

const respiro = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
};

/**
 * Lascia esaurire una catena asincrona vera.
 *
 * La ricostruzione della traccia attraversa `leggiBlob`, `Blob.text()` e un
 * aggiornamento di stato: tre microtask non bastano, e contarli sarebbe un
 * numero scelto per far passare la prova invece che per descrivere il codice.
 * Qui si lascia girare la coda dei macrotask finché non resta niente.
 */
const assesta = async () => {
  for (let i = 0; i < 3; i += 1) {
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
  }
};

const testo = () => contenitore.textContent || "";
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

/** Mette una fotografia nella libreria dell'archivio, senza passare dal DOM. */
async function aggiungiFoto(archivio, nome, larghezza = 2400, altezza = 2600) {
  return archivio.salvaBlob("immagine", new Blob(["x"], { type: "image/webp" }), {
    nome,
    tipoMime: "image/webp",
    larghezza,
    altezza,
    tag: tagVuoti(),
  });
}

async function monta({ archivio = creaArchivioMemoria() } = {}) {
  await act(async () => {
    radice.render(
      <FornitoreArchivio archivio={archivio}>
        <FornitoreTransizione>
          <EditorTour tours={TOURS} urlBase="https://esempio.test" />
        </FornitoreTransizione>
      </FornitoreArchivio>,
    );
  });
  await respiro();
  return archivio;
}

const creaBozza = async (slug = TOUR.slug) => {
  const select = q('select[aria-label="Tour dal sito"]');
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set;
    setter.call(select, slug);
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await respiro();
  await premi("Crea bozza dal tour");
};

/**
 * Fa rispondere i caricamenti delle immagini.
 *
 * `Foto` disegna soltanto quando conosce le dimensioni intrinseche del file:
 * senza, non c'è geometria e un `<img>` sarebbe un rettangolo deformato. Le
 * risposte le decide la prova, così la finestra fra «assegnata» e «misurata»
 * si può osservare invece di sperare che sia già passata.
 */
const risolviFoto = async (larghezza = 2400, altezza = 2600) => {
  await act(async () => {
    immagini.risolviTutte(larghezza, altezza);
  });
  await respiro();
};

/** Sceglie uno slot TOUR nel selettore del pannello media. */
const scegliSlot = (slot) => clic(q(`[data-rubrica-slot="tour"] [data-slot="${slot}"]`));

/** Seleziona una fotografia nella libreria, per nome del file. */
const scegliFoto = async (nome) => {
  const b = qa("button[title]").find((x) => (x.getAttribute("title") || "").startsWith(nome));
  if (!b) throw new Error(`Nessuna miniatura «${nome}»`);
  await clic(b);
};

const statoLavoro = () => q("[data-stato-lavoro]")?.getAttribute("data-stato-lavoro");

/** Preme «Apri» sulla riga della bozza indicata, non sulla prima che capita. */
const apriBozza = async (titolo) => {
  const riga = qa('[data-elenco="bozze-tour"] li').find((l) =>
    (l.textContent || "").includes(titolo),
  );
  if (!riga) throw new Error(`Nessuna riga «${titolo}»`);
  await clic(riga.querySelector("button"));
};

/** Il record sul disco, che è l'unica prova che qualcosa è stato salvato. */
async function recordSalvato(archivio) {
  const [b] = await archivio.elenca({ categoria: "tour" });
  return b ? archivio.leggi(b.id) : null;
}

/* ================================================================== *
 * A. Gli slot di TOUR
 * ================================================================== */

describe("gli slot fotografici sono quelli di TOUR", () => {
  /**
   * Il difetto che questa prova esclude: un selettore che, non trovando gli
   * slot della rubrica, ricade su quelli di EVENTI. Comparirebbero «Vivrai
   * 1…4» e le tre schermate Story, e ogni clic scriverebbe in un ramo che la
   * bozza TOUR non ha — la fotografia sparirebbe senza un errore.
   */
  it("mostra due soli slot, cover e Story, e nessuno di EVENTI", async () => {
    await monta();
    await creaBozza();

    const pulsanti = qa('[data-rubrica-slot="tour"] [data-slot]');
    expect(pulsanti.map((b) => b.dataset.slot)).toEqual(["cover", "story"]);

    const etichette = pulsanti.map((b) => b.textContent);
    for (const estraneo of ["Vivrai", "Story 02", "Story 05", "Story 06", "Sfondo CTA"]) {
      expect(etichette.join(" "), estraneo).not.toContain(estraneo);
    }
  });

  it("i due ritagli sono indipendenti: uno per formato", async () => {
    const archivio = creaArchivioMemoria();
    await aggiungiFoto(archivio, "cover.webp");
    await aggiungiFoto(archivio, "story.webp");
    await monta({ archivio });
    await creaBozza();

    await scegliSlot("cover");
    await scegliFoto("cover.webp");
    await premi("Assegna la foto selezionata");
    await impostaZoom(1.4);

    await scegliSlot("story");
    await scegliFoto("story.webp");
    await premi("Assegna la foto selezionata");
    await impostaZoom(2);

    await premi("Salva");
    const record = await recordSalvato(archivio);

    expect(record.media.cover.zoom).toBeCloseTo(1.4, 5);
    expect(record.media.sfondi.tourStory.zoom).toBeCloseTo(2, 5);
    expect(record.media.cover.idBlob).not.toBe(record.media.sfondi.tourStory.idBlob);
    // E nessuno dei due è finito in un ramo di EVENTI.
    expect(record.media.esperienza).toEqual([]);
    expect(record.media.sfondi.cta ?? null).toBeNull();
  });

  /**
   * Lo slot Story **resta vuoto** quando la Story ripiega sulla cover: il
   * ripiego è un fatto del rendering, e un indicatore acceso racconterebbe una
   * fotografia che nessuno ha scelto per quel formato.
   */
  it("la Story senza fotografia propria usa la cover solo nel disegno", async () => {
    const archivio = creaArchivioMemoria();
    await aggiungiFoto(archivio, "cover.webp");
    await monta({ archivio });
    await creaBozza();

    await scegliFoto("cover.webp");
    await premi("Assegna la foto selezionata");
    await scegliSlot("story");

    expect(q('[data-rubrica-slot="tour"] [data-slot="cover"]').dataset.piena).toBe("si");
    expect(q('[data-rubrica-slot="tour"] [data-slot="story"]').dataset.piena).toBe("no");
    // L'interfaccia lo dice, invece di lasciarlo intendere.
    expect(q('[data-nota="ripiego-story"]')).toBeTruthy();
    // E l'anteprima dichiara che sta ripiegando.
    expect(q('[data-ripiego="story"]')).toBeTruthy();

    await premi("Salva");
    const record = await recordSalvato(archivio);
    expect(record.media.sfondi.tourStory ?? null).toBeNull();
  });

  it("assegnare, inquadrare e togliere passano dal contenuto, non dall'archivio", async () => {
    const archivio = creaArchivioMemoria();
    await aggiungiFoto(archivio, "cover.webp");
    await monta({ archivio });
    await creaBozza();
    await premi("Salva");

    await scegliFoto("cover.webp");
    await premi("Assegna la foto selezionata");
    expect(statoLavoro()).toBe("non-salvato");
    // Non ha scritto da sola: sul disco la cover è ancora assente.
    expect((await recordSalvato(archivio)).media.cover).toBeNull();

    await premi("Salva");
    expect((await recordSalvato(archivio)).media.cover.idBlob).toBeTruthy();

    await clic(q('[data-azione="rimuovi-foto"]'));
    expect(statoLavoro()).toBe("non-salvato");
    await premi("Salva");
    expect((await recordSalvato(archivio)).media.cover).toBeNull();

    // Togliere il riferimento non tocca il binario: la libreria ce l'ha ancora.
    expect(await archivio.elencaMedia()).toHaveLength(1);
  });

  it("un salvataggio dopo una modifica media produce una sola revisione", async () => {
    const archivio = creaArchivioMemoria();
    await aggiungiFoto(archivio, "cover.webp");
    await monta({ archivio });
    await creaBozza();
    await premi("Salva");
    const prima = (await recordSalvato(archivio)).versioni.length;

    await scegliFoto("cover.webp");
    await premi("Assegna la foto selezionata");
    await impostaZoom(1.5);
    await premi("Salva");

    expect((await recordSalvato(archivio)).versioni.length).toBe(prima + 1);
  });

  /** Nel contenuto va la chiave opaca; nel DOM l'URL che l'archivio produce. */
  it("la preview disegna dall'URL dell'archivio, non dall'idBlob", async () => {
    const archivio = creaArchivioMemoria();
    const id = await aggiungiFoto(archivio, "cover.webp");
    const atteso = await archivio.urlTemporaneo(id);
    await monta({ archivio });
    await creaBozza();
    await scegliFoto("cover.webp");
    await premi("Assegna la foto selezionata");
    await risolviFoto();

    const sorgenti = qa('[data-parte="anteprima-bozza"] img').map((i) => i.getAttribute("src"));
    // La fotografia della bozza c'è, ed è l'URL dell'archivio.
    expect(sorgenti).toContain(atteso);
    // E l'`idBlob` non compare come sorgente da nessuna parte: è una chiave.
    expect(qa("img").map((i) => i.getAttribute("src"))).not.toContain(id);
    expect(testo()).not.toContain(id);
  });
});

/** Muove lo zoom del ritaglio, che è il gesto che cambia l'inquadratura. */
async function impostaZoom(valore) {
  const slider = q('input[aria-label="Zoom"]');
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    setter.call(slider, String(valore));
    slider.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await respiro();
}

/* ================================================================== *
 * Un ritaglio rifiutato
 * ================================================================== */

/**
 * Il rifiuto di un riferimento non valido si prova al **confine pubblico**
 * dell'hook, con il pannello vero montato sopra.
 *
 * Dall'interfaccia un `idBlob` malformato non si può comporre — la libreria
 * produce solo chiavi buone — ma il confine deve reggere lo stesso: è quello
 * che difende da un backup manomesso, da una migrazione sbagliata e da
 * qualunque chiamante futuro. Qui l'hook è quello vero e il pannello è quello
 * vero; a essere costruita è la sola chiamata.
 */
describe("un ritaglio rifiutato non cambia niente", () => {
  function Banco({ cattivo }) {
    const b = useBozzaTour({ urlBase: "https://esempio.test" });
    const { url, ricarica } = useUrlMedia();
    return (
      <div>
        <button type="button" onClick={() => b.creaDaTour(TOUR)}>
          Crea
        </button>
        <button type="button" data-azione="scrivi-cattivo" onClick={() => b.scriviMedia("cover", cattivo)}>
          Scrivi un riferimento non valido
        </button>
        <button type="button" data-azione="slot-inesistente" onClick={() => b.scriviMedia("storyNumeri", null)}>
          Slot di un&apos;altra rubrica
        </button>
        <span data-sporco={b.sporco ? "si" : "no"} />
        <span data-cover={JSON.stringify(b.contenuto?.media?.cover ?? null)} />
        {b.contenuto && (
          <MediaTour
            contenuto={b.contenuto}
            leggiMedia={b.leggiMedia}
            scriviMedia={b.scriviMedia}
            url={url}
            onLibreriaCambiata={ricarica}
          />
        )}
      </div>
    );
  }

  const montaBanco = async (cattivo) => {
    const archivio = creaArchivioMemoria();
    await act(async () => {
      radice.render(
        <FornitoreArchivio archivio={archivio}>
          <FornitoreTransizione>
            <Banco cattivo={cattivo} />
          </FornitoreTransizione>
        </FornitoreArchivio>,
      );
    });
    await respiro();
    await premi("Crea");
    return archivio;
  };

  it.each([
    ["un percorso", { idBlob: "cartella/foto.jpg", zoom: 1, x: 0.5, y: 0.5 }],
    ["un data URL", { idBlob: "data:image/png;base64,AA", zoom: 1, x: 0.5, y: 0.5 }],
    ["un ritaglio senza fotografia", { idBlob: null, zoom: 1, x: 0.5, y: 0.5 }],
    ["uno zoom fuori dominio", { idBlob: "img-1", zoom: 99, x: 0.5, y: 0.5 }],
  ])("%s non entra, e la bozza resta com'era", async (_nome, cattivo) => {
    const archivio = await montaBanco(cattivo);
    const sporcoPrima = q("[data-sporco]").dataset.sporco;

    await clic(q('[data-azione="scrivi-cattivo"]'));

    expect(q("[data-cover]").dataset.cover).toBe("null");
    expect(q("[data-sporco]").dataset.sporco).toBe(sporcoPrima);
    expect(await archivio.elenca({ categoria: "tour" })).toEqual([]);
  });

  it("uno slot di un'altra rubrica non scrive niente e non è un successo", async () => {
    await montaBanco({ idBlob: "img-1", zoom: 1, x: 0.5, y: 0.5 });
    await clic(q('[data-azione="slot-inesistente"]'));
    expect(q("[data-cover]").dataset.cover).toBe("null");
  });
});

/* ================================================================== *
 * B. Il GPX
 * ================================================================== */

describe("il GPX della bozza", () => {
  const caricaFile = async (file) => {
    const input = q('input[aria-label="File GPX"]');
    Object.defineProperty(input, "files", { configurable: true, value: [file] });
    await act(async () => {
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await respiro();
  };

  const esitoGpx = () => q("[data-esito-gpx]")?.getAttribute("data-esito-gpx") ?? null;

  it("un file valido produce riferimento e geometria, e non salva da solo", async () => {
    const archivio = await monta();
    await creaBozza();
    await premi("Salva");

    await caricaFile(fileGpx(GPX_BUONO, "percorso-di-prova.gpx"));

    expect(esitoGpx()).toBe("gpx-caricato");
    expect(statoLavoro()).toBe("non-salvato");
    // Il riferimento persistibile.
    expect(q("[data-gpx-nome]").textContent).toBe("percorso-di-prova.gpx");
    expect(Number(q("[data-gpx-byte]").textContent.replace(/\D/g, ""))).toBeGreaterThan(0);
    // La geometria, che è un'altra cosa.
    const geometria = q('[data-gpx="geometria"]').textContent;
    expect(geometria).toMatch(/segmenti:\s*1/);
    expect(geometria).toMatch(/punti:\s*3/);

    // E sul disco non c'è ancora niente.
    expect((await recordSalvato(archivio)).mappa.gpx).toBeNull();
  });

  it("nel contenuto salvato c'è il riferimento e non la geometria", async () => {
    const archivio = await monta();
    await creaBozza();
    await caricaFile(fileGpx(GPX_BUONO));
    await premi("Salva");

    const record = await recordSalvato(archivio);
    expect(Object.keys(record.mappa.gpx).sort()).toEqual(["byte", "idBlob", "nome"]);

    // Nessuna traccia della geometria, da nessuna parte nel record.
    const serializzato = JSON.stringify(record);
    for (const parola of ["trkpt", "segmenti", "distanzaKm", "dislivello", "quotaMax"]) {
      expect(serializzato, parola).not.toContain(parola);
    }
    // E nessun waypoint diventato un fatto.
    expect(serializzato).not.toContain("Punto Inventato");
    expect(record.mappa.localita).toEqual([]);
    expect(record.fattuali.tappe).toEqual([]);
  });

  it("un XML rotto non entra nell'archivio e non sporca la bozza", async () => {
    const archivio = await monta();
    await creaBozza();
    await premi("Salva");

    await caricaFile(fileGpx(GPX_ROTTO, "rotto.gpx"));

    expect(esitoGpx()).toBe("gpx-illeggibile");
    expect(statoLavoro()).toBe("salvato");
    // Nessun binario orfano: si convalida prima di scrivere.
    expect(await archivio.elencaMedia({ tipo: "gpx" })).toEqual([]);
  });

  /**
   * Il riferimento c'è, il binario no. **Non si cancella**: è l'unica traccia
   * di che cosa ricaricare, e «Riprova» rilegge senza passare da una
   * riapertura della bozza.
   */
  it("un binario sparito lascia il riferimento e offre di riprovare", async () => {
    const archivio = await monta();
    await creaBozza();
    await caricaFile(fileGpx(GPX_BUONO, "sparito.gpx"));
    await premi("Salva");

    const [voce] = await archivio.elencaMedia({ tipo: "gpx" });
    await archivio.eliminaBlob(voce.id);

    await clic(q('[data-azione="ricarica-gpx"]'));
    await assesta();

    expect(esitoGpx()).toBe("gpx-blob-assente");
    expect(q("[data-gpx-nome]").textContent).toBe("sparito.gpx");
    expect(q('[data-gpx="geometria"]').textContent).toMatch(/il riferimento c'è, la traccia no/i);
    // Il riferimento è ancora sul disco: nessuna cancellazione silenziosa.
    expect((await recordSalvato(archivio)).mappa.gpx.nome).toBe("sparito.gpx");
  });

  it("riaprire la bozza ricostruisce la traccia dal binario", async () => {
    await monta();
    await creaBozza();
    await caricaFile(fileGpx(GPX_BUONO, "da-riaprire.gpx"));
    await premi("Salva");

    // Si crea e si salva un'altra bozza — da un tour diverso, così l'elenco
    // le distingue per titolo — e la prima si può riaprire pulita.
    await creaBozza(ALTRO_TOUR.slug);
    await premi("Salva");
    expect(q('[data-gpx="geometria"]').textContent).toMatch(/nessuna geometria/i);

    const riga = qa('[data-elenco="bozze-tour"] li').find((l) =>
      (l.textContent || "").includes("Prova Di Contratto"),
    );
    await clic(riga.querySelector("button"));
    await assesta();

    expect(esitoGpx()).toBe("gpx-ricostruito");
    expect(q('[data-gpx="geometria"]').textContent).toMatch(/punti:\s*3/);
    // L'apertura resta riuscita: la ricostruzione viaggia su un canale suo.
    expect(q("[data-esito]").getAttribute("data-esito")).toBe("aperta");
  });

  it("togliere il GPX lascia il file nell'archivio", async () => {
    const archivio = await monta();
    await creaBozza();
    await caricaFile(fileGpx(GPX_BUONO));
    await premi("Salva");

    await clic(q('[data-azione="rimuovi-gpx"]'));
    expect(esitoGpx()).toBe("gpx-rimosso");
    expect(statoLavoro()).toBe("non-salvato");

    await premi("Salva");
    expect((await recordSalvato(archivio)).mappa.gpx).toBeNull();
    // Il binario resta: una revisione può riportarlo, e chi scarta deve
    // ritrovare la base di prima.
    expect(await archivio.elencaMedia({ tipo: "gpx" })).toHaveLength(1);
  });

  it("«conserva GPX» è un'intenzione registrata, non una cancellazione", async () => {
    const archivio = await monta();
    await creaBozza();
    await caricaFile(fileGpx(GPX_BUONO));

    const casella = q('input[aria-label="Conserva il GPX dopo l\'export"]');
    await act(async () => {
      casella.click();
    });
    await respiro();

    expect(esitoGpx()).toBe("conserva-gpx-aggiornata");
    await premi("Salva");
    const record = await recordSalvato(archivio);
    expect(record.mappa.conservaGpx).toBe(!(await archivioValorePredefinito()));
    // Il file non è stato toccato.
    expect(await archivio.elencaMedia({ tipo: "gpx" })).toHaveLength(1);
  });

  /**
   * Una risposta superata non tocca né la traccia né l'esito.
   *
   * La lettura del file è asincrona; `rimuoviGpx` invalida il ciclo in volo e
   * **non** libera il blocco, che lo libera solo chi l'ha preso. Il risultato
   * del caricamento partito prima arriva quando non conta più: se lo
   * applicasse, un riferimento appena tolto ricomparirebbe da solo.
   */
  it("una risposta superata non riporta la traccia che era stata tolta", async () => {
    const archivio = await monta();
    await creaBozza();

    // Un file la cui lettura si apre e si chiude quando lo decide la prova.
    let sblocca;
    const lenta = new Promise((r) => {
      sblocca = r;
    });
    const file = fileGpx(GPX_BUONO, "lento.gpx");
    file.text = () => lenta.then(() => GPX_BUONO);

    const input = q('input[aria-label="File GPX"]');
    Object.defineProperty(input, "files", { configurable: true, value: [file] });
    await act(async () => {
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await respiro();

    // Mentre la lettura è aperta, si toglie il GPX.
    await clic(q('[data-azione="rimuovi-gpx"]'));
    expect(esitoGpx()).toBe("gpx-caricamento-annullato");

    // Adesso la lettura risponde: non deve applicare niente.
    await act(async () => {
      sblocca();
    });
    await assesta();

    expect(esitoGpx()).toBe("gpx-caricamento-annullato");
    expect(q('[data-gpx="geometria"]').textContent).toMatch(/nessuna geometria/i);
    expect(q('[data-gpx="riferimento"]').textContent).toMatch(/nessun riferimento/i);
    // E nessun binario orfano collegato alla bozza.
    await premi("Salva");
    expect((await recordSalvato(archivio)).mappa.gpx).toBeNull();
  });

  it("nessun GPX finisce nel DOM come sorgente o come testo della traccia", async () => {
    await monta();
    await creaBozza();
    await caricaFile(fileGpx(GPX_BUONO));

    expect(testo()).not.toContain("trkpt");
    expect(testo()).not.toContain("Punto Inventato");
    for (const el of qa("[src], [href]")) {
      const v = el.getAttribute("src") || el.getAttribute("href") || "";
      expect(v.endsWith(".gpx")).toBe(false);
    }
  });
});

/** Il valore predefinito di `conservaGpx` secondo lo schema, non secondo noi. */
async function archivioValorePredefinito() {
  const { contenutoVuoto } = await import("../fondamenta/schema");
  return Boolean(contenutoVuoto({ categoria: "tour" }).mappa.conservaGpx);
}

/* ================================================================== *
 * 6.3M.1 — l'esito di un gesto appartiene alla bozza su cui è avvenuto
 * ================================================================== */

/**
 * Il difetto: «Fotografia aggiornata. Non è ancora sul disco: salva.» era uno
 * stato locale del pannello, e il pannello non si smonta cambiando bozza.
 * Aprendo un'altra bozza quella frase restava sotto un contenuto su cui non era
 * stato fatto niente — e diceva pure che c'era qualcosa da salvare.
 *
 * La correzione non aggiunge un secondo guardiano: toglie la copia. Gli esiti
 * che l'hook **pubblica** (`media-assegnato`, `ritaglio-media-non-valido`) si
 * leggono da lui, che li azzera alla modifica successiva e li sostituisce
 * aprendo, creando o salvando. Al pannello restano i soli codici che l'hook non
 * pubblica — quelli che per definizione non cambiano niente.
 */
describe("l'esito di un gesto sui media non passa a un'altra bozza", () => {
  const esitoHook = () => q("[data-esito]")?.getAttribute("data-esito") ?? null;

  it("assegnata una foto ad A, aprendo B il messaggio di A non c'è più", async () => {
    const archivio = creaArchivioMemoria();
    await aggiungiFoto(archivio, "cover.webp");
    await monta({ archivio });

    await creaBozza(TOUR.slug);
    await premi("Salva");
    await creaBozza(ALTRO_TOUR.slug);
    await premi("Salva");

    await apriBozza("Prova Di Contratto");
    await scegliFoto("cover.webp");
    await premi("Assegna la foto selezionata");

    // Sulla bozza giusta il messaggio c'è, ed è quello.
    expect(esitoHook()).toBe("media-assegnato");
    expect(testo()).toMatch(/fotografia aggiornata/i);

    // L'assegnazione ha sporcato A: aprire B passa dalla protezione, e la si
    // attraversa scartando — quel che conta qui è che di A non resti niente.
    await apriBozza("Seconda Prova");
    await premi("Scarta modifiche");

    expect(esitoHook()).toBe("aperta");
    expect(testo()).not.toMatch(/fotografia aggiornata/i);
    expect(q("[data-esito-media]")).toBeFalsy();
  });

  it("dopo il salvataggio non resta un falso «non è ancora sul disco»", async () => {
    const archivio = creaArchivioMemoria();
    await aggiungiFoto(archivio, "cover.webp");
    await monta({ archivio });
    await creaBozza(TOUR.slug);
    await premi("Salva");

    await scegliFoto("cover.webp");
    await premi("Assegna la foto selezionata");
    expect(testo()).toMatch(/non è ancora sul disco/i);

    await premi("Salva");

    expect(esitoHook()).toBe("salvata");
    expect(testo()).not.toMatch(/fotografia aggiornata/i);
    // E nemmeno il codice grezzo: il pannello non deve tenere nessuna copia.
    expect(q("[data-esito-media]")).toBeFalsy();
    expect(statoLavoro()).toBe("salvato");
  });

  it("un ripristino non lascia il messaggio del gesto di prima", async () => {
    const archivio = creaArchivioMemoria();
    await aggiungiFoto(archivio, "cover.webp");
    await monta({ archivio });
    await creaBozza(TOUR.slug);
    await premi("Salva");
    await scegliFoto("cover.webp");
    await premi("Assegna la foto selezionata");
    await premi("Salva");

    await clic(q('[data-azione="rimuovi-foto"]'));
    expect(esitoHook()).toBe("media-assegnato");

    // La rimozione ha sporcato la bozza: il ripristino passa dalla protezione.
    await clic(q('[data-revisione="2"] button'));
    await premi("Scarta modifiche");
    await assesta();

    expect(esitoHook()).toBe("revisione-ripristinata");
    expect(testo()).not.toMatch(/fotografia aggiornata/i);
    expect(q("[data-esito-media]")).toBeFalsy();
  });

  /**
   * Slot attivo e selezione nella libreria sono **preferenze**: non
   * attribuiscono un fatto a nessuna bozza e non dichiarano niente di riuscito.
   * Azzerarle cambiando bozza sarebbe un fastidio senza una ragione.
   */
  it("slot attivo e selezione restano dove chi lavora li ha messi", async () => {
    const archivio = creaArchivioMemoria();
    await aggiungiFoto(archivio, "cover.webp");
    await monta({ archivio });
    await creaBozza(TOUR.slug);
    await premi("Salva");
    await creaBozza(ALTRO_TOUR.slug);
    await premi("Salva");

    await scegliSlot("story");
    await scegliFoto("cover.webp");
    await apriBozza("Prova Di Contratto");

    expect(q('[data-rubrica-slot="tour"] [data-slot="story"]').className).toContain("--accent");
    expect(bottone("Assegna la foto selezionata").disabled).toBe(false);
  });
});

/* ================================================================== *
 * 6.3M.1 — durante una scrittura il ritaglio non si muove
 * ================================================================== */

/**
 * Il difetto: la catena del blocco si fermava a metà.
 *
 * `EditorTour` passava `disabilitato` a `MediaTour`, che disabilitava
 * assegnazione, rimozione e specchiatura — e lasciava `Ritaglio` com'era.
 * Trascinare il punto focale, muovere lo slider o premere «Ripristina
 * inquadratura» continuavano a chiamare `onCambia`, cioè `scriviMedia`, mentre
 * la scrittura era in volo: la fotografia che finiva sul disco non era quella
 * che si era chiesto di salvare, e il salvataggio tornava `superata-da-modifiche`
 * per un gesto che l'interfaccia dichiarava impossibile.
 */
describe("il ritaglio è davvero fermo mentre si salva", () => {
  /** Un archivio la cui scrittura si apre e si chiude quando lo decide la prova. */
  function archivioSospendibile() {
    const archivio = creaArchivioMemoria();
    const vero = archivio.salva.bind(archivio);
    const stato = { sospendi: false, sblocca: null, scritture: 0 };
    archivio.salva = async (c) => {
      stato.scritture += 1;
      if (stato.sospendi) {
        await new Promise((r) => {
          stato.sblocca = r;
        });
      }
      return vero(c);
    };
    return { archivio, stato };
  }

  /**
   * Preme «Salva» senza trattenere la promessa di `premi`.
   *
   * Tenerla aperta mentre si aprono altri `act` annida gli ambiti di React e
   * lascia l'ambiente di prova in uno stato da cui la prova successiva non
   * riesce più a montare. Qui il clic sta in un `act` che si chiude: la
   * scrittura resta sospesa perché è l'archivio a non rispondere, non perché
   * qualcuno la stia aspettando.
   */
  const premiSalvaSenzaAspettare = async () => {
    await act(async () => {
      bottone("Salva").dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await respiro();
  };

  const sbloccaEattendi = async (stato) => {
    await act(async () => {
      stato.sblocca();
    });
    await assesta();
  };

  /** Il ritaglio dello slot attivo, letto dal DOM e non dagli stili. */
  const ritaglioMostrato = () =>
    JSON.parse(q("[data-ritaglio-corrente]").dataset.ritaglioCorrente);

  const slider = () => q('input[aria-label="Zoom"]');
  const reset = () => q('button[title="Ripristina inquadratura"]');
  const riquadro = () => q("[data-riquadro-ritaglio]");

  /** Prepara una bozza salvata con la cover assegnata e misurata. */
  async function conFotografia() {
    const { archivio, stato } = archivioSospendibile();
    await monta({ archivio });
    await aggiungiFoto(archivio, "cover.webp");
    await creaBozza(TOUR.slug);
    // La libreria si rilegge: la miniatura compare dopo il ricarico.
    await clic(q('[data-parte="media"] [data-slot="cover"]'));
    await assesta();
    await scegliFoto("cover.webp");
    await premi("Assegna la foto selezionata");
    await risolviFoto();
    await premi("Salva");
    return { archivio, stato };
  }

  it("con la scrittura sospesa, nessun gesto del ritaglio scrive", async () => {
    const { archivio, stato } = await conFotografia();
    const prima = (await recordSalvato(archivio)).media.cover;

    stato.sospendi = true;
    await premiSalvaSenzaAspettare();

    // 1. lo slider è davvero disabilitato, e muoverlo non cambia niente
    expect(slider().disabled).toBe(true);
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
      setter.call(slider(), "2.4");
      slider().dispatchEvent(new Event("change", { bubbles: true }));
    });
    await respiro();

    // 2. il reset è davvero disabilitato
    expect(reset().disabled).toBe(true);
    await act(async () => {
      reset().dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await respiro();

    // 3. il trascinamento non sposta il punto focale
    await act(async () => {
      const r = riquadro();
      r.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, clientX: 10, clientY: 10 }));
      r.dispatchEvent(new MouseEvent("pointermove", { bubbles: true, clientX: 90, clientY: 90 }));
      r.dispatchEvent(new MouseEvent("pointerup", { bubbles: true }));
    });
    await respiro();

    expect(ritaglioMostrato()).toEqual(prima);

    await sbloccaEattendi(stato);

    // Finita la scrittura i controlli tornano utilizzabili…
    expect(slider().disabled).toBe(false);
    expect(reset().disabled).toBe(false);
    // …e sul disco c'è quello che si era chiesto di salvare.
    expect((await recordSalvato(archivio)).media.cover).toEqual(prima);
    expect(statoLavoro()).toBe("salvato");
  });

  it("una trascinata cominciata prima del blocco non continua durante il blocco", async () => {
    const { archivio, stato } = await conFotografia();
    const prima = (await recordSalvato(archivio)).media.cover;

    // Si comincia a trascinare **prima** di salvare: questo gesto è legittimo
    // e scrive, ed è proprio il punto — il puntatore resta giù.
    await act(async () => {
      riquadro().dispatchEvent(
        new MouseEvent("pointerdown", { bubbles: true, clientX: 10, clientY: 10 }),
      );
    });
    await respiro();
    const alMomentoDelBlocco = ritaglioMostrato();
    expect(alMomentoDelBlocco.x).not.toBeCloseTo(prima.x, 5);

    stato.sospendi = true;
    await premiSalvaSenzaAspettare();

    // Il dito è ancora giù, e si muove: da qui in poi non deve più scrivere.
    await act(async () => {
      riquadro().dispatchEvent(
        new MouseEvent("pointermove", { bubbles: true, clientX: 190, clientY: 240 }),
      );
    });
    await respiro();

    expect(ritaglioMostrato()).toEqual(alMomentoDelBlocco);

    await sbloccaEattendi(stato);
    // Sul disco è finito quel che c'era quando si è premuto «Salva», non la
    // posizione raggiunta dal dito durante la scrittura.
    expect((await recordSalvato(archivio)).media.cover).toEqual(alMomentoDelBlocco);
  });
});
