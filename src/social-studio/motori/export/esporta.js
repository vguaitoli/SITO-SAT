import { preflight } from "../preflight";
import { Annullato, catturaSequenza, nomeBase, scarica } from "./cattura";
import { creaZip } from "./zip";

/**
 * Esportazione completa.
 *
 * Un lavoro annullabile con avanzamento, non un pulsante che blocca tutto:
 * l'esportazione di un carosello dura decine di secondi, ed è un dato misurato,
 * non una previsione.
 *
 * Il pre-flight gira prima e può fermare l'esportazione: gli errori bloccano
 * perché produrrebbero file da rifare; gli avvisi si possono ignorare, ma
 * consapevolmente.
 */

/** Crea un lavoro di esportazione. Ritorna anche il modo di annullarlo. */
export function creaLavoroExport() {
  const controllore = new AbortController();
  return {
    segnale: controllore.signal,
    annulla: () => controllore.abort(),
    get annullato() {
      return controllore.signal.aborted;
    },
  };
}

/**
 * Esporta uno o più elementi in PNG e, se più di uno, in un archivio ZIP.
 *
 * @param {object} opzioni
 * @param {{id, nome, nodo, formato}[]} opzioni.elementi
 * @param {object} opzioni.contenuto
 * @param {object[]} [opzioni.vociMedia]
 * @param {object[]} [opzioni.problemi]
 * @param {boolean} [opzioni.ignoraAvvisi]
 * @param {string} [opzioni.caption]      finisce in caption.txt dentro lo ZIP
 * @param {object} opzioni.lavoro         da creaLavoroExport()
 * @param {(stato) => void} [opzioni.onAvanzamento]
 * @returns {Promise<{esito: "fatto"|"annullato"|"bloccato", ...}>}
 */
export async function esporta({
  elementi,
  contenuto,
  vociMedia = [],
  problemi = [],
  ignoraAvvisi = false,
  caption = "",
  lavoro,
  onAvanzamento,
}) {
  const controllo = preflight({
    contenuto,
    vociMedia,
    problemi,
    formato: elementi[0]?.formato || contenuto.formato,
  });

  if (!controllo.puoiEsportare) {
    return { esito: "bloccato", controllo };
  }
  if (controllo.avvisi.length && !ignoraAvvisi) {
    return { esito: "bloccato", controllo, soloAvvisi: true };
  }

  try {
    const { file, msTotale, memoria } = await catturaSequenza(elementi, {
      segnale: lavoro.segnale,
      onAvanzamento,
    });

    const base = nomeBase(contenuto.titolo || contenuto.fattuali?.nome);

    // Un solo elemento: si scarica il PNG e basta, senza incartarlo.
    if (file.length === 1) {
      scarica(file[0].blob, `${base}-${file[0].nome}`);
      return { esito: "fatto", file, msTotale, memoria, archivio: null };
    }

    const dentro = [];
    for (const f of file) {
      dentro.push({ nome: f.nome, dati: new Uint8Array(await f.blob.arrayBuffer()) });
    }
    // La caption viaggia con le grafiche; il GPX no, mai.
    if (caption.trim()) {
      dentro.push({ nome: "caption.txt", dati: new TextEncoder().encode(caption) });
    }

    const zip = creaZip(dentro);
    const nomeZip = `${base}.zip`;
    scarica(zip, nomeZip);

    return { esito: "fatto", file, msTotale, memoria, archivio: { nome: nomeZip, byte: zip.size } };
  } catch (errore) {
    if (errore instanceof Annullato || errore.name === "Annullato") {
      return { esito: "annullato" };
    }
    throw errore;
  }
}
