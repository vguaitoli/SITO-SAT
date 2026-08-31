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
 * **Il secondo difetto, che dalla prima correzione discendeva.** Dipendere dal
 * solo id significa anche che l'effetto trattiene la `esegui` del render in
 * cui l'id è cambiato — cioè di *prima* che le grafiche fuori schermo
 * esistessero. Ma è proprio montandole che nascono le loro segnalazioni: uno
 * sforo presente solo in una Story nascosta non entrava in quella chiusura, e
 * il pre-flight lo dichiarava assente. Il pacchetto veniva catturato lo
 * stesso, con un errore dentro che nessuno aveva visto.
 *
 * Rimettere `esegui` fra le dipendenze avrebbe riportato il primo difetto:
 * cambia identità a ogni battitura, e ogni cambio annullerebbe l'export in
 * corso. La soluzione è tenerla in un riferimento aggiornato a ogni render e
 * chiamarla **al momento dell'uso**: l'effetto continua a dipendere dal solo
 * id, e chi viene chiamato è sempre l'ultimo.
 *
 * @param {object} opzioni
 * @param {(ctx: {cosa: string, ignoraAvvisi: boolean, lavoro: object,
 *   onAvanzamento: Function}) => Promise<object>} opzioni.esegui
 *   Fa la cattura e restituisce l'esito. Iniettato: così i test verificano il
 *   coordinamento senza html2canvas.
 * @param {() => Promise<void>} [opzioni.attendiDisegno]
 * @param {() => Promise<{pronto: boolean}>} [opzioni.attendiPronto]
 *   Attesa che le grafiche richieste siano montate **e** che le loro
 *   segnalazioni siano arrivate. Chi monta sa quando ha finito; questo hook
 *   no, e non deve indovinarlo con un tempo fisso.
 *
 *   **Il contratto è chiuso in difetto.** Ometterla lascia il ciclo com'era —
 *   nessun varco da attraversare, nessuna promessa da mantenere. Fornirla
 *   significa impegnarsi a dire com'è andata: solo `{ pronto: true }` autorizza
 *   l'esportazione. `{ pronto: false }`, `undefined`, `null`, `{}` e qualunque
 *   altra forma la fermano.
 *
 *   La differenza non è pedanteria. Un esito assente e un esito «tutto bene»
 *   sono indistinguibili se si guarda solo `pronto === false`: è così che una
 *   funzione che cadeva in fondo senza `return` autorizzava quindici PNG di cui
 *   nessuno aveva verificato il contenuto. Chi non risponde non acconsente.
 */
/** Vero solo davanti a un sì dichiarato. Tutto il resto è un no. */
function prontoDavvero(esito) {
  return Boolean(esito) && typeof esito === "object" && esito.pronto === true;
}

/** Come si chiama, in italiano, la cosa tornata al posto di un esito. */
function nomeDi(esito) {
  if (esito === undefined) return "undefined";
  if (esito === null) return "null";
  if (typeof esito !== "object") return `un ${typeof esito}`;
  if (!("pronto" in esito)) return "un oggetto senza campo «pronto»";
  return `un oggetto con «pronto» di tipo ${typeof esito.pronto}`;
}

/**
 * Traduce un esito di prontezza in qualcosa che il pannello sappia dire.
 *
 * Un `{ pronto: false }` ben formato porta con sé i propri motivi e si mostrano
 * quelli. Una risposta malformata non ha motivi da mostrare: si dice che il
 * controllo di prontezza non ha risposto come deve, perché l'alternativa —
 * tacere e proseguire — è il difetto che questo contratto esiste per impedire.
 */
function descriviProntezza(esito) {
  if (esito && typeof esito === "object" && esito.pronto === false) return esito;
  return {
    malformato: nomeDi(esito),
    messaggio:
      "Il controllo di prontezza non ha dichiarato l'esito: senza un sì esplicito " +
      "l'esportazione non parte.",
  };
}

export function useLavoroExport({ esegui, attendiDisegno = attendiUnFrame, attendiPronto }) {
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

  /*
   * Gli aggiornabili, letti al momento dell'uso e non alla creazione della
   * richiesta.
   *
   * L'assegnazione sta in un effetto **dichiarato prima** di quello
   * dell'esportazione: dentro uno stesso commit gli effetti girano nell'ordine
   * di dichiarazione, quindi quando l'export parte il riferimento è già quello
   * del render corrente.
   */
  const eseguiRif = useRef(esegui);
  const attendiProntoRif = useRef(attendiPronto);
  useEffect(() => {
    eseguiRif.current = esegui;
    attendiProntoRif.current = attendiPronto;
  });

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

        /*
         * Le grafiche sono nel DOM, ma le loro segnalazioni possono non essere
         * ancora tutte arrivate: `TestoAdattivo` misura quando i font sono
         * pronti, e quella misura è ciò che produce gli sfori. Si aspetta che
         * il registro smetta di cambiare — una condizione, non un tempo.
         */
        if (attendiProntoRif.current) {
          const prontezza = await attendiProntoRif.current();
          if (fermato()) return;
          /*
           * Solo un sì esplicito apre il varco.
           *
           * Non si chiede «è andata male?» ma «è andata bene?»: la prima
           * domanda tratta il silenzio come consenso, la seconda no. Quando la
           * risposta non è `{ pronto: true }` non si chiama `esegui`, quindi
           * non si fotografa, non si costruisce lo ZIP e non si scarica
           * niente. Se non si può dimostrare che il pre-flight ha davanti lo
           * stato completo, il file non si produce.
           */
          if (!prontoDavvero(prontezza)) {
            /*
             * I discriminanti si scrivono **dopo** i dettagli.
             *
             * Un esito è dato dell'esterno, e un dato dell'esterno che porta
             * un campo `esito` o `tipo` non deve poter decidere come viene
             * letto: `{ pronto: false, esito: "fatto" }` diventerebbe un
             * successo, e il pannello mostrerebbe un'esportazione riuscita che
             * non è avvenuta. L'ordine dello spread è la difesa.
             */
            setDaConfermare({
              ...descriviProntezza(prontezza),
              tipo: cosa,
              esito: "nonPronto",
            });
            return;
          }
        }

        // Transizione visuale: `id` non cambia, quindi l'effetto non si rilancia.
        setRichiesta((r) => (r && r.id === id ? { ...r, fase: "cattura" } : r));

        const esito = await eseguiRif.current({
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
     *
     * `exhaustive-deps` chiede `richiesta` e `attendiDisegno`, e ha ragione a
     * chiederle: sono lette nel corpo. Metterle però riporta il difetto che
     * questo hook esiste per evitare — `richiesta` cambia identità a ogni
     * passaggio di fase, l'effetto si ripulirebbe, il lavoro si marcherebbe
     * annullato e lo stato non si libererebbe più. Di `richiesta` serve solo
     * l'istantanea del momento in cui la richiesta è nata, ed è quella che si
     * legge; `attendiDisegno` è una dipendenza di costruzione, non di ciclo.
     * L'esenzione è la deviazione, non la regola.
     */
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
