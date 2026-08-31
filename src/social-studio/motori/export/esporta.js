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
 * consapevolmente — `ignoraAvvisi` non ha un valore predefinito comodo, e
 * nessun chiamante lo attiva per conto dell'utente.
 */

/**
 * Il GPX non entra in un pacchetto. Mai.
 *
 * La promessa non si affida al fatto che oggi la lista contenga solo PNG:
 * qualsiasi file che non sia un'immagine PNG fa fallire l'esportazione. Un
 * requisito che dipende dall'attenzione di chi scrive il prossimo chiamante
 * non è un requisito.
 */
export function vietaAssetSensibili(file) {
  for (const f of file) {
    const nome = String(f.nome || "").toLowerCase();
    if (nome === "caption.txt") continue;
    if (!nome.endsWith(".png")) {
      throw new Error(`Il pacchetto conterrebbe «${f.nome}»: sono ammessi solo PNG e caption.txt.`);
    }
  }
  return file;
}

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

    const zip = creaZip(vietaAssetSensibili(dentro));
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


/**
 * Esporta il pacchetto completo di un evento.
 *
 * Un solo ZIP con tutto ciò che serve a pubblicare: il Post 1080×1350, le sei
 * schermate della Story 1080×1920, le otto slide del carosello e la caption in
 * chiaro — quindici PNG e un file di testo. Chi pubblica scarica un file e ha
 * finito, invece di ripetere tre esportazioni diverse e ricordarsi di copiare
 * il testo a mano.
 *
 * **Il GPX non c'è.** Non perché non lo si aggiunga: perché
 * `vietaAssetSensibili` fa fallire l'esportazione se qualcosa che non sia un
 * PNG o `caption.txt` finisce nell'elenco.
 *
 * @param {object} opzioni
 * @param {{id, nome, nodo, formato}[]} opzioni.elementi  tutti i nodi, già montati
 * @param {object} opzioni.contenuto
 * @param {object[]} [opzioni.vociMedia]
 * @param {object[]} [opzioni.problemi]
 * @param {boolean} [opzioni.ignoraAvvisi]
 * @param {string} [opzioni.caption]
 * @param {object} opzioni.lavoro
 * @param {(stato) => void} [opzioni.onAvanzamento]
 */
export async function esportaPacchetto({
  elementi,
  contenuto,
  vociMedia = [],
  problemi = [],
  ignoraAvvisi = false,
  caption = "",
  lavoro,
  onAvanzamento,
}) {
  const mancanti = elementi.filter((e) => !e.nodo).map((e) => e.id);
  if (mancanti.length) {
    return { esito: "incompleto", mancanti };
  }

  /*
   * Il pacchetto contiene tre formati, e il pre-flight ha controlli che
   * dipendono dal formato — la slide del percorso esige il GPX, la Story ha
   * un'area sicura diversa. Si controllano tutti e si somma: un pacchetto è
   * esportabile solo se ogni suo pezzo lo è.
   */
  const formati = [...new Set(elementi.map((e) => e.formato || "post"))];
  const controlli = formati.map((formato) =>
    preflight({
      contenuto: { ...contenuto, formato: formato === "story" ? "story" : "carosello" },
      vociMedia,
      problemi,
      formato,
    }),
  );

  const errori = deduplica(controlli.flatMap((c) => c.errori));
  const avvisi = deduplica(controlli.flatMap((c) => c.avvisi));
  const controllo = { esiti: deduplica(controlli.flatMap((c) => c.esiti)), errori, avvisi, puoiEsportare: errori.length === 0 };

  if (errori.length) return { esito: "bloccato", controllo };
  if (avvisi.length && !ignoraAvvisi) return { esito: "bloccato", controllo, soloAvvisi: true };

  try {
    const { file, msTotale, memoria } = await catturaSequenza(elementi, {
      segnale: lavoro.segnale,
      onAvanzamento,
    });

    const dentro = [];
    for (const f of file) {
      dentro.push({ nome: f.nome, dati: new Uint8Array(await f.blob.arrayBuffer()) });
    }
    if (caption.trim()) {
      dentro.push({ nome: "caption.txt", dati: new TextEncoder().encode(caption) });
    }

    const base = nomeBase(contenuto.titolo || contenuto.fattuali?.nome, "evento");
    const zip = creaZip(vietaAssetSensibili(dentro));
    const nomeZip = `${base}-pacchetto.zip`;
    scarica(zip, nomeZip);

    return {
      esito: "fatto",
      file,
      msTotale,
      memoria,
      controllo,
      archivio: { nome: nomeZip, byte: zip.size, quanti: dentro.length },
    };
  } catch (errore) {
    if (errore instanceof Annullato || errore.name === "Annullato") {
      return { esito: "annullato" };
    }
    throw errore;
  }
}

/** Toglie i doppioni dagli esiti dei pre-flight ripetuti per formato. */
function deduplica(voci) {
  const visti = new Set();
  return voci.filter((v) => {
    const chiave = `${v.livello}|${v.id}|${v.messaggio}`;
    if (visti.has(chiave)) return false;
    visti.add(chiave);
    return true;
  });
}
