import html2canvas from "html2canvas";
import { FORMATI } from "../../design/formati";
import { COLORI } from "../../design/tokens";
import { assicuraFontPronti } from "../font";

/**
 * Cattura delle grafiche in PNG.
 *
 * Il nodo fotografato è **lo stesso** che l'anteprima disegna, alla sua misura
 * reale: non esiste una seconda implementazione del template, quindi non c'è
 * nulla da tenere allineato fra ciò che si vede e ciò che si esporta.
 *
 * L'esportazione è un lavoro lungo — misurato: alcuni secondi per slide — e
 * quindi è progettata come tale: asincrona, con avanzamento e annullabile. Non
 * è un'ottimizzazione, è la conseguenza di un dato.
 */

/** Errore lanciato quando l'utente annulla. Si distingue da un guasto. */
export class Annullato extends Error {
  constructor() {
    super("Esportazione annullata.");
    this.name = "Annullato";
  }
}

/** Errore lanciato quando i font non sono utilizzabili. */
export class FontMancanti extends Error {
  constructor(famiglie) {
    super(
      `Font non disponibili: ${famiglie.join(", ")}. ` +
        "L'esportazione userebbe un carattere di sistema: interrotta.",
    );
    this.name = "FontMancanti";
    this.famiglie = famiglie;
  }
}

/**
 * Attende che il browser abbia dipinto.
 *
 * `requestAnimationFrame` non scatta in una scheda in background: se si cambia
 * scheda a metà esportazione, senza ripiego l'attesa non finirebbe mai. Il
 * timeout garantisce che il lavoro proceda comunque.
 */
const attendiUnFrame = () =>
  new Promise((risolvi) => {
    let fatto = false;
    const finisci = () => {
      if (fatto) return;
      fatto = true;
      risolvi();
    };
    requestAnimationFrame(() => requestAnimationFrame(finisci));
    setTimeout(finisci, 120);
  });

/**
 * Fotografa un nodo DOM.
 *
 * @param {HTMLElement} nodo    nodo a misura reale, senza trasformazioni
 * @param {object} opzioni
 * @param {string} [opzioni.formato]   per ricavare le dimensioni attese
 * @param {AbortSignal} [opzioni.segnale]
 * @returns {Promise<{blob: Blob, larghezza: number, altezza: number, ms: number}>}
 */
export async function cattura(nodo, { formato = "post", segnale } = {}) {
  if (!nodo) throw new Error("Nessun nodo da catturare.");
  if (segnale?.aborted) throw new Annullato();

  // Requisito esplicito: mai una sostituzione silenziosa del carattere.
  const { pronti, mancanti } = await assicuraFontPronti();
  if (!pronti) throw new FontMancanti(mancanti);

  const f = FORMATI[formato];
  const inizio = performance.now();

  // Gli elementi marcati come «solo anteprima» non finiscono nel PNG: il
  // segno «grafica provvisoria» serve a chi lavora, non a chi pubblica.
  const nascosti = [...nodo.querySelectorAll("[data-solo-anteprima]")];
  const visibilitaPrecedente = nascosti.map((el) => el.style.display);
  nascosti.forEach((el) => {
    el.style.display = "none";
  });

  try {
    await attendiUnFrame();
    if (segnale?.aborted) throw new Annullato();

    const canvas = await html2canvas(nodo, {
      width: f.larghezza,
      height: f.altezza,
      scale: 1, // il nodo è già a misura: nessun ricampionamento
      // Fondo opaco esplicito: con `null` i pixel non dipinti restano
      // trasparenti, e un PNG destinato a Instagram non deve avere
      // trasparenza — si vedrebbe nero o bianco a seconda di dove finisce.
      backgroundColor: COLORI.fondo,
      useCORS: true,
      logging: false,
      // Senza questi html2canvas userebbe lo scroll della pagina e
      // ritaglierebbe l'immagine nel punto sbagliato.
      scrollX: 0,
      scrollY: 0,
      windowWidth: f.larghezza,
      windowHeight: f.altezza,
    });

    if (segnale?.aborted) throw new Annullato();

    if (canvas.width !== f.larghezza || canvas.height !== f.altezza) {
      throw new Error(
        `Dimensioni inattese: ${canvas.width}×${canvas.height} invece di ${f.larghezza}×${f.altezza}.`,
      );
    }

    const blob = await new Promise((risolvi, rifiuta) => {
      canvas.toBlob(
        (b) => (b ? risolvi(b) : rifiuta(new Error("Conversione in PNG non riuscita."))),
        "image/png",
      );
    });

    return { blob, larghezza: canvas.width, altezza: canvas.height, ms: Math.round(performance.now() - inizio) };
  } finally {
    nascosti.forEach((el, i) => {
      el.style.display = visibilitaPrecedente[i];
    });
  }
}

/**
 * Cattura una sequenza di nodi, riportando l'avanzamento.
 *
 * Fra una cattura e l'altra si cede il controllo al browser: senza, otto
 * catture consecutive bloccherebbero l'interfaccia per mezzo minuto e
 * l'annullamento non arriverebbe mai.
 *
 * @param {{id: string, nome: string, nodo: HTMLElement, formato?: string}[]} elementi
 * @param {object} opzioni
 * @param {(stato: {fatti: number, totale: number, corrente: string, ms: number}) => void} [opzioni.onAvanzamento]
 * @param {AbortSignal} [opzioni.segnale]
 * @returns {Promise<{file: {nome: string, blob: Blob, ms: number}[], msTotale: number, memoria: object|null}>}
 */
export async function catturaSequenza(elementi, { onAvanzamento, segnale } = {}) {
  const file = [];
  const inizio = performance.now();
  const memoriaIniziale = leggiMemoria();

  for (let i = 0; i < elementi.length; i += 1) {
    if (segnale?.aborted) throw new Annullato();
    const el = elementi[i];

    const esito = await cattura(el.nodo, { formato: el.formato || "post", segnale });
    file.push({ nome: el.nome, blob: esito.blob, ms: esito.ms });

    onAvanzamento?.({
      fatti: i + 1,
      totale: elementi.length,
      corrente: el.nome,
      ms: esito.ms,
    });

    // Respiro fra le catture: tiene viva l'interfaccia e dà modo
    // all'annullamento di arrivare.
    await new Promise((r) => setTimeout(r, 0));
  }

  return {
    file,
    msTotale: Math.round(performance.now() - inizio),
    memoria: confrontaMemoria(memoriaIniziale),
  };
}

/** Memoria del documento, se il browser la espone (solo Chromium). */
export function leggiMemoria() {
  const m = performance.memory;
  return m ? { usata: m.usedJSHeapSize, limite: m.jsHeapSizeLimit } : null;
}

function confrontaMemoria(iniziale) {
  const finale = leggiMemoria();
  if (!iniziale || !finale) return null;
  return {
    iniziale: iniziale.usata,
    finale: finale.usata,
    delta: finale.usata - iniziale.usata,
    limite: finale.limite,
  };
}

/** Scarica un blob con il nome indicato. */
export function scarica(blob, nome) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Un revoke immediato interrompe il download su alcuni browser.
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/** Nome file a partire dal titolo del contenuto. */
export function nomeBase(titolo, ripiego = "contenuto") {
  return (
    String(titolo || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || ripiego
  );
}
