import { useCallback, useEffect, useRef, useState } from "react";
import { attendiUnFrame } from "../motori/export/cattura";
import { creaLavoroExport } from "../motori/export/esporta";

/**
 * Ciclo di vita di un'esportazione.
 *
 * Sta in un hook proprio, e non dentro l'editor, perché è la parte che ha
 * sbagliato: l'editor la conteneva e nessuno dei test la toccava.
 *
 * Un'esportazione ha due fasi. Nella prima le grafiche vengono montate fuori
 * schermo alla loro misura reale — l'esportazione non può fotografare i nodi
 * dell'anteprima, che stanno sotto un `transform: scale()`. Nella seconda si
 * fotografa. Fra le due serve un giro di React e un disegno del browser, e
 * l'attesa usa `attendiUnFrame` perché in una scheda in secondo piano i frame
 * non scattano affatto.
 *
 * **Il difetto che questa struttura evita.** Prima l'effetto dipendeva
 * dall'intero oggetto della richiesta, fase compresa. Passare da «monta» a
 * «cattura» lo cambiava, quindi l'effetto si ripuliva e marcava il proprio
 * lavoro come annullato: al termine della cattura il rilascio dello stato non
 * avveniva più. Il PNG si scaricava — la cattura era finita — ma l'editor
 * restava occupato, i pulsanti spenti e i nodi fuori schermo montati. Un
 * secondo export non partiva. Che il file esista non dimostra che il ciclo
 * dell'interfaccia sia finito.
 *
 * Ora l'effetto dipende dal solo **identificativo** della richiesta. Il cambio
 * di fase è una transizione visuale e non tocca l'identità, quindi non annulla
 * niente. L'annullamento reagisce a tre cose sole: smontaggio, annullamento
 * esplicito, sostituzione della richiesta con una più recente.
 *
 * @param {object} opzioni
 * @param {(ctx: {cosa: string, ignoraAvvisi: boolean, lavoro: object,
 *   onAvanzamento: Function}) => Promise<object>} opzioni.esegui
 *   Fa la cattura e restituisce l'esito. Iniettato: così i test verificano il
 *   coordinamento senza html2canvas.
 * @param {() => Promise<void>} [opzioni.attendiDisegno]
 */
export function useLavoroExport({ esegui, attendiDisegno = attendiUnFrame }) {
  /** `null` | `{ id, cosa, ignoraAvvisi, fase: "monta"|"cattura" }` */
  const [richiesta, setRichiesta] = useState(null);
  const [avanzamento, setAvanzamento] = useState(null);
  const [daConfermare, setDaConfermare] = useState(null);
  /**
   * La richiesta viva e il suo lavoro: `{ id, lavoro }`.
   *
   * Il lavoro nasce **con la richiesta**, non alla cattura. Prima veniva creato
   * dopo le due attese di disegno, quindi premendo «Annulla» durante il
   * montaggio `lavoro.current` era `null` — oppure, peggio, il lavoro
   * dell'esportazione precedente, che veniva abortito al posto di questa.
   *
   * Tenerlo insieme all'id è ciò che rende l'annullamento indirizzabile: si
   * abortisce sempre la richiesta corrente e mai una passata.
   */
  const corrente = useRef(null);
  const contatore = useRef(0);

  /** Chiede un'esportazione. Ogni chiamata è una richiesta nuova, con un id nuovo. */
  const chiedi = useCallback((cosa, ignoraAvvisi = false) => {
    setDaConfermare(null);
    contatore.current += 1;
    const id = contatore.current;
    corrente.current = { id, lavoro: creaLavoroExport() };
    setRichiesta({ id, cosa, ignoraAvvisi, fase: "monta" });
  }, []);

  /** Annulla la richiesta viva, in qualunque fase si trovi. */
  const annulla = useCallback(() => corrente.current?.lavoro.annulla(), []);
  const chiudiConferma = useCallback(() => setDaConfermare(null), []);

  const id = richiesta?.id;

  useEffect(() => {
    if (!id) return undefined;
    const proprio = corrente.current;
    // Il lavoro deve essere quello di questa richiesta, non di un'altra.
    if (!proprio || proprio.id !== id) return undefined;
    const { cosa, ignoraAvvisi } = richiesta;
    let vivo = true;

    /** Vero se questa richiesta è stata annullata o sostituita. */
    const fermato = () => !vivo || proprio.lavoro.annullato;

    (async () => {
      try {
        // Annullando durante il montaggio, `esegui` non parte affatto: non c'è
        // niente da abortire a metà, e nessun file viene prodotto.
        await attendiDisegno();
        if (fermato()) return;
        await attendiDisegno();
        if (fermato()) return;

        // Transizione visuale: `id` non cambia, quindi l'effetto non si rilancia.
        setRichiesta((r) => (r && r.id === id ? { ...r, fase: "cattura" } : r));

        const esito = await esegui({
          cosa,
          ignoraAvvisi,
          lavoro: proprio.lavoro,
          onAvanzamento: setAvanzamento,
        });
        if (!vivo) return;

        setAvanzamento(
          esito?.esito === "fatto" && esito.archivio
            ? { pacchetto: esito.archivio, ms: esito.msTotale }
            : null,
        );
        if (esito?.esito === "bloccato") setDaConfermare({ tipo: cosa, ...esito });
        if (esito?.esito === "incompleto") {
          setDaConfermare({ tipo: cosa, esito: "incompleto", mancanti: esito.mancanti });
        }
      } catch (errore) {
        // Un guasto si mostra: non lascia l'interfaccia spenta in silenzio.
        // Non tutto ciò che viene lanciato è un `Error`.
        if (vivo) {
          setAvanzamento(null);
          setDaConfermare({
            tipo: cosa,
            esito: "errore",
            messaggio: errore instanceof Error ? errore.message : String(errore),
          });
        }
      } finally {
        // Il riferimento al lavoro non sopravvive alla richiesta che lo possiede.
        if (corrente.current?.id === id) corrente.current = null;
        /*
         * Si libera sempre — dopo un errore e dopo un annullamento — e **solo la
         * propria** richiesta: se nel frattempo ne è partita una più recente,
         * spegnerla sarebbe il difetto di prima al rovescio.
         */
        if (vivo) setRichiesta((r) => (r && r.id === id ? null : r));
      }
    })();

    return () => {
      vivo = false;
      /*
       * Si abortisce anche il lavoro, non solo si smette di ascoltare.
       *
       * Da non sopravvalutare: `html2canvas` non accetta un `AbortSignal`, e una
       * cattura già partita arriva in fondo per conto suo. Il segnale viene
       * controllato subito dopo, e quello che ferma è tutto il resto —
       * conversione in PNG, archivio, download. Il risultato che conta è che
       * dopo un annullamento non esca nessun file.
       */
      proprio.lavoro.annulla();
    };
    /*
     * Dipendenza: **solo** l'identificativo della richiesta.
     *
     * Non la fase, che cambia durante il lavoro e lo annullerebbe. Non il
     * contenuto né gli elementi, che cambiano a ogni battitura e
     * rilancerebbero l'esportazione mentre si scrive. Tutto il resto si legge
     * al momento dell'uso, dentro `esegui`.
     */
  }, [id]);

  return {
    richiesta,
    avanzamento,
    daConfermare,
    /** Vero mentre c'è una richiesta viva o un avanzamento in corso. */
    occupato: Boolean(richiesta || (avanzamento && !avanzamento.pacchetto)),
    chiedi,
    annulla,
    chiudiConferma,
  };
}
