/**
 * Esportazione delle slide in PNG.
 *
 * Le slide vengono disegnate nel DOM alla loro misura reale (1080×1350) e poi
 * fotografate con html2canvas — già presente fra le dipendenze del progetto.
 * Disegnare alla misura reale, invece di ingrandire un'anteprima, è ciò che
 * garantisce che il PNG sia identico a quello che si vede nell'editor.
 */
import html2canvas from "html2canvas";
import { creaZip } from "./zip";
import { SLIDE, TELA } from "./slide/tokens";

/**
 * Cattura un nodo DOM in PNG.
 *
 * @param {HTMLElement} nodo
 * @returns {Promise<Blob>}
 */
export async function catturaPng(nodo) {
  const canvas = await html2canvas(nodo, {
    width: TELA.larghezza,
    height: TELA.altezza,
    scale: 1, // il nodo è già a misura: nessun ricampionamento
    backgroundColor: null,
    useCORS: true,
    logging: false,
    // Le slide non scrollano: senza questo html2canvas userebbe lo scroll
    // della pagina e ritaglierebbe l'immagine nel punto sbagliato.
    scrollX: 0,
    scrollY: 0,
    windowWidth: TELA.larghezza,
    windowHeight: TELA.altezza,
  });

  return new Promise((risolvi, rifiuta) => {
    canvas.toBlob(
      (blob) => (blob ? risolvi(blob) : rifiuta(new Error("Conversione in PNG non riuscita."))),
      "image/png",
    );
  });
}

/** Nome file della slide, secondo la convenzione del format. */
export function nomeFile(idSlide) {
  return SLIDE.find((s) => s.id === idSlide)?.file || `${idSlide}.png`;
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
  // Il revoke immediato interrompe il download su alcuni browser.
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/** Nome dell'archivio, ricavato dal titolo dell'evento. */
export function nomeArchivio(carosello) {
  const base =
    String(carosello.nome || "carosello")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "carosello";
  return `${base}-instagram.zip`;
}

/**
 * Esporta tutte le slide in un unico ZIP.
 *
 * @param {Map<string, HTMLElement>} nodi   id slide → nodo a misura reale
 * @param {object} carosello
 * @param {(fatto: number, totale: number) => void} [onAvanzamento]
 */
export async function esportaCarosello(nodi, carosello, onAvanzamento) {
  const file = [];
  for (let i = 0; i < SLIDE.length; i += 1) {
    const slide = SLIDE[i];
    const nodo = nodi.get(slide.id);
    if (!nodo) continue;
    const blob = await catturaPng(nodo);
    file.push({ nome: slide.file, dati: new Uint8Array(await blob.arrayBuffer()) });
    onAvanzamento?.(i + 1, SLIDE.length);
  }
  return { zip: creaZip(file), nome: nomeArchivio(carosello) };
}
