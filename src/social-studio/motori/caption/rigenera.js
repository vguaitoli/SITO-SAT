import { estraiFattuali, paragrafi, ricomponi, verificaFattuale } from "./fact-lock";

/**
 * Generazione e rigenerazione della caption.
 *
 * Sta qui, e non dentro il componente, per una ragione precisa: è la parte che
 * deve essere verificabile senza montare un'interfaccia. Cosa parte verso il
 * provider e cosa sopravvive a una rigenerazione sono garanzie, e una garanzia
 * non testata è un'intenzione.
 *
 * Tre regole, tutte applicate qui:
 *
 * 1. **Il provider riceve i fatti congelati.** L'oggetto viene da
 *    `estraiFattuali`, che lo restituisce `Object.freeze`: nessun passaggio
 *    intermedio può alterarlo.
 * 2. **Il provider riceve solo testo.** Fotografie, GPX, ritagli, istantanea
 *    della fonte e configurazione della mappa non entrano nella richiesta. Non
 *    per prudenza generica: è la forma della richiesta a non prevederli, e un
 *    test lo verifica sull'oggetto serializzato.
 * 3. **I paragrafi bloccati sopravvivono davvero.** Al provider si dice quali
 *    sono, ma la garanzia non dipende dalla sua obbedienza: al ritorno
 *    `ricomponi` rimette al loro posto i paragrafi precedenti. Anche un
 *    provider che li ignorasse del tutto non riuscirebbe a cancellarli.
 */

/** I soli campi editoriali che partono. L'elenco è chiuso di proposito. */
function noteEditoriali(testi) {
  const righe = [];
  if (testi.descrizione) righe.push(testi.descrizione);
  const highlight = (testi.highlight || [])
    .map((h) => [h.titolo, h.descrizione].filter(Boolean).join(": "))
    .filter(Boolean);
  if (highlight.length) righe.push(`Punti da toccare: ${highlight.join(" · ")}`);
  if (testi.cta) righe.push(`Invito all'azione: ${testi.cta}`);
  if (testi.statoPosti && testi.statoPosti !== "disponibili") {
    righe.push(`Stato dei posti: ${testi.statoPosti}`);
  }
  return righe.join("\n\n").slice(0, 2000);
}

/**
 * Costruisce la richiesta per il provider.
 *
 * La forma è quella che `api/caption.js` accetta con uno schema `.strict()`:
 * un campo in più farebbe fallire la richiesta lato server invece di passare
 * inosservato. Le due definizioni si tengono deliberatamente allineate.
 *
 * @returns {{rubrica, lunghezza, fattuali, editoriale, paragrafiBloccati}}
 */
export function costruisciRichiesta(contenuto) {
  const testi = contenuto.editoriale || {};
  const caption = testi.caption || {};
  const bloccati = indiciBloccati(contenuto);
  const parti = paragrafi(caption.testo);

  return {
    rubrica: contenuto.categoria,
    lunghezza: caption.lunghezza || "standard",
    // Congelato all'origine: il provider riceve i fatti, non un oggetto
    // modificabile che qualcuno potrebbe "correggere" per strada.
    fattuali: estraiFattuali(contenuto),
    editoriale: {
      titolo: testi.titoloBreve || "",
      claim: testi.claim || "",
      note: noteEditoriali(testi),
    },
    paragrafiBloccati: bloccati
      .map((i) => parti[i]?.testo || "")
      .filter((t) => t.trim())
      .slice(0, 10)
      .map((t) => t.slice(0, 2000)),
  };
}

/** Gli indici bloccati, ripuliti: solo interi presenti, senza duplicati. */
export function indiciBloccati(contenuto) {
  const grezzi = contenuto.editoriale?.caption?.paragrafiBloccati || [];
  const quanti = paragrafi(contenuto.editoriale?.caption?.testo || "").length;
  return [...new Set(grezzi)]
    .filter((i) => Number.isInteger(i) && i >= 0 && i < quanti)
    .sort((a, b) => a - b);
}

/**
 * Genera o rigenera la caption di un contenuto.
 *
 * Non tocca il contenuto: restituisce il testo nuovo e ciò che serve a
 * decidere. È il chiamante a scrivere nello stato, così il flusso resta
 * ispezionabile.
 *
 * @param {object} opzioni
 * @param {{genera: Function}} opzioni.provider
 * @param {object} opzioni.contenuto
 * @returns {Promise<{testo: string, origine: string, richiesta: object,
 *   bloccatiConservati: number[], discordanze: object[]}>}
 */
export async function rigeneraCaption({ provider, contenuto }) {
  if (!provider?.genera) throw new Error("Nessun provider di caption disponibile.");

  const richiesta = costruisciRichiesta(contenuto);
  const bloccati = indiciBloccati(contenuto);
  const precedenti = paragrafi(contenuto.editoriale?.caption?.testo || "").map((p) => p.testo);

  const risposta = await provider.genera(richiesta);
  const nuovi = paragrafi(risposta?.testo || "").map((p) => p.testo);

  /*
   * Se il testo nuovo ha meno paragrafi di quelli bloccati, `ricomponi` li
   * riscriverebbe in coda lasciando buchi: si allunga l'elenco con stringhe
   * vuote fino a coprire l'indice più alto da conservare. Il paragrafo
   * bloccato torna al suo posto, non altrove.
   */
  const massimo = bloccati.length ? Math.max(...bloccati) : -1;
  while (nuovi.length <= massimo) nuovi.push("");

  const testo = ricomponi(nuovi, precedenti, bloccati);
  const fatti = estraiFattuali(contenuto);

  return {
    testo,
    origine: risposta?.origine || "sconosciuta",
    richiesta,
    bloccatiConservati: bloccati,
    // La verifica gira subito: chi rigenera vede all'istante se il testo nuovo
    // ha introdotto un numero che non coincide con i dati veri.
    discordanze: verificaFattuale(testo, fatti),
  };
}
