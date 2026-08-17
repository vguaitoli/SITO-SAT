import { FAMIGLIE_RICHIESTE } from "../design/tokens";

/**
 * Disponibilità dei webfont.
 *
 * Perché non basta `document.fonts.status`: quella proprietà dice se c'è un
 * caricamento *in corso*, non se i font che servono sono pronti. Al primo
 * render nessun testo li ha ancora dipinti, quindi non sono stati richiesti,
 * quindi lo stato è «loaded» — e `check()` risponde false. Ci si convince di
 * avere i font mentre non ci sono, oppure si segnala un'assenza che poi non
 * viene più rivalutata.
 *
 * La strada affidabile è chiederli e attendere: `document.fonts.load()` avvia
 * il caricamento della famiglia indicata e risolve quando è utilizzabile.
 *
 * Questa funzione serve sia all'anteprima sia all'esportazione: è il punto in
 * cui si tiene la promessa di non sostituire silenziosamente un carattere.
 */

let promessa = null;

/**
 * Richiede i font del brand e attende che siano utilizzabili.
 *
 * @param {string[]} [famiglie]
 * @returns {Promise<{pronti: boolean, mancanti: string[]}>}
 */
export function assicuraFontPronti(famiglie = FAMIGLIE_RICHIESTE) {
  if (typeof document === "undefined" || !document.fonts) {
    return Promise.resolve({ pronti: true, mancanti: [] });
  }
  // Una sola richiesta per sessione: le successive riusano l'esito.
  if (promessa) return promessa;

  promessa = (async () => {
    await Promise.all(
      famiglie.flatMap((f) => [
        // Si chiedono i pesi effettivamente usati dai template: `load()`
        // scarica la variante che serve, non tutte.
        document.fonts.load(`400 16px "${f}"`).catch(() => null),
        document.fonts.load(`700 16px "${f}"`).catch(() => null),
      ]),
    );
    await document.fonts.ready;

    const mancanti = famiglie.filter((f) => !document.fonts.check(`16px "${f}"`));
    return { pronti: mancanti.length === 0, mancanti };
  })();

  return promessa;
}

/** Stato immediato, senza attendere. Usato dai controlli sincroni. */
export function fontMancanti(famiglie = FAMIGLIE_RICHIESTE) {
  if (typeof document === "undefined" || !document.fonts) return [];
  return famiglie.filter((f) => !document.fonts.check(`16px "${f}"`));
}

/** Azzera la cache. Serve solo ai test. */
export function dimenticaStatoFont() {
  promessa = null;
}
