import React, { useCallback, useEffect, useRef, useState } from "react";
import { useBlocker } from "react-router-dom";
import { Dialogo, RISPOSTE, guardieSporche } from "./transizione";

/**
 * La protezione del lavoro non salvato **durante la navigazione**.
 *
 * Il sistema di transizioni intercetta i gesti dell'interfaccia — creare una
 * bozza, aprirne un'altra, chiudere l'editor — perché quei gesti passano tutti
 * da `richiedi`. La navigazione no: un link interno, un `navigate()` o il tasto
 * Indietro smontano l'albero senza chiedere niente a nessuno, e il lavoro non
 * ancora nell'archivio se ne va in silenzio. `beforeunload` copre il ricarico e
 * la chiusura della scheda, ma non la navigazione dentro l'applicazione: è
 * un'altra cosa e non se ne accorge.
 *
 * Qui si chiude quel percorso, e si chiude **dal router**. Un ascoltatore dei
 * clic coprirebbe i link e nient'altro: `navigate()` non è un clic, e Indietro
 * nemmeno. Toccare `history` a mano coprirebbe tutto e romperebbe il router,
 * che su quella API costruisce il proprio stato.
 *
 * ## Tutte le guardie, non quella del proprio fornitore
 *
 * I fornitori delle transizioni sono due — lo Studio e il banco TOUR, separato
 * apposta perché la guardia di TOUR non cancelli quella di EVENTI — ma uscire
 * dalla pagina li smonta insieme. Qui non si guarda un contesto: si guarda il
 * registro globale, dove ogni editor vivo si è iscritto. Con due editor sporchi
 * si salvano **entrambi**, e nessuno dei due può essere ignorato perché è
 * registrato dall'altra parte.
 *
 * ## La richiesta viva sta in un riferimento
 *
 * Fra il clic su «Salva e continua» e la fine delle scritture passa tempo, e in
 * quel tempo può succedere tutto: un secondo clic, un annullamento, una
 * modifica in un editor che era pulito, lo smontaggio della pagina. Uno stato
 * di React arriverebbe al render successivo — troppo tardi per fare da blocco —
 * quindi la richiesta e la sua fase vivono in un **riferimento**, aggiornato
 * prima di qualunque `await`. Ogni continuazione, al ritorno dalla propria
 * attesa, verifica di appartenere ancora alla richiesta viva prima di toccare
 * il dialogo o di chiamare `proceed`/`reset`. È la stessa disciplina del
 * `FornitoreTransizione`, sullo stesso problema.
 *
 * ## Va montata dentro un router di dati
 *
 * `useBlocker` chiede il contesto del router di dati: esiste sotto
 * `RouterProvider`, non sotto `BrowserRouter`. È il motivo dell'integrazione
 * minima in `App.jsx`.
 */
export default function SentinellaNavigazione() {
  /*
   * Si blocca solo quando cambia davvero pagina e c'è davvero lavoro aperto.
   * Un cambio di `search` o di hash sulla stessa rotta non smonta niente, e
   * fermarlo produrrebbe un dialogo per una transizione che non fa danni.
   *
   * La funzione è stabile: `useBlocker` la riesamina a ogni navigazione, e le
   * guardie si leggono **in quel momento** dal registro, non da uno stato
   * catturato alla registrazione.
   */
  const deveBloccare = useCallback(
    ({ currentLocation, nextLocation }) =>
      currentLocation.pathname !== nextLocation.pathname && guardieSporche().length > 0,
    [],
  );

  const bloccante = useBlocker(deveBloccare);

  /** L'ultimo blocco visto: non si chiama `proceed` su un oggetto superato. */
  const bloccanteRif = useRef(bloccante);
  bloccanteRif.current = bloccante;

  /**
   * La richiesta viva: identità, fase e annullamento.
   *
   * `fase` vale `chiede` mentre si decide, `salva` mentre le scritture sono in
   * volo, `congedata` quando è finita. Cambia **sincrono**, prima di qualunque
   * attesa: è così che due clic ravvicinati non avviano due cicli di
   * salvataggio, perché il secondo trova già una fase diversa da `chiede`.
   */
  const vivaRif = useRef(null);
  const contatore = useRef(0);
  const vivoRif = useRef(true);

  /** Ciò che il dialogo disegna: una proiezione della richiesta, non la sua verità. */
  const [vista, setVista] = useState(null);

  useEffect(() => {
    vivoRif.current = true;
    return () => {
      vivoRif.current = false;
      /*
       * Smontando, la richiesta viva smette di esistere: le continuazioni in
       * volo non si riconosceranno più e non chiameranno `proceed` né `reset`
       * su un router che non le aspetta più.
       */
      vivaRif.current = null;
    };
  }, []);

  /** Apre una richiesta quando il router si ferma, e la chiude quando riparte. */
  useEffect(() => {
    if (bloccante.state === "blocked") {
      const viva = { id: (contatore.current += 1), fase: "chiede", annullata: false };
      vivaRif.current = viva;
      setVista({
        id: viva.id,
        salvataggio: false,
        annullata: false,
        erroreSalvataggio: null,
        nota: null,
      });
      return;
    }
    vivaRif.current = null;
    setVista(null);
  }, [bloccante.state]);

  /** Tocca la vista solo se sullo schermo c'è ancora quella richiesta. */
  const aggiornaVista = useCallback((id, fn) => {
    setVista((v) => (v && v.id === id ? fn(v) : v));
  }, []);

  /**
   * Congeda la richiesta: **una volta sola**, e solo se è ancora la sua.
   *
   * Il riferimento si azzera **prima** di chiamare il router: è quello a
   * rendere impossibile un secondo `proceed`, non un controllo su uno stato che
   * arriverebbe al render dopo.
   */
  const concludi = useCallback((viva, come) => {
    if (vivaRif.current !== viva) return;
    viva.fase = "congedata";
    vivaRif.current = null;
    setVista(null);
    const b = bloccanteRif.current;
    if (b?.state !== "blocked") return;
    if (come === "procedi") b.proceed();
    else b.reset();
  }, []);

  /** Vero se questa continuazione appartiene ancora alla richiesta viva. */
  const ancoraMia = useCallback((viva) => vivoRif.current && vivaRif.current === viva, []);

  const rispondi = useCallback(
    async (risposta) => {
      const viva = vivaRif.current;
      if (!viva) return;

      if (risposta === RISPOSTE.annulla) {
        if (viva.fase === "chiede") {
          // Niente in volo: si chiude subito e non parte nulla.
          concludi(viva, "resta");
          return;
        }
        if (viva.fase === "salva") {
          /*
           * La scrittura è già partita e non si può ritirare: non la si
           * dichiara interrotta, la si lascia finire. Da qui in poi però non
           * parte nessun salvataggio nuovo e, quando l'ultima attesa si chiude,
           * **non si naviga**. Il blocco resta preso fino ad allora: lasciarlo
           * adesso farebbe entrare un'altra navigazione mentre l'archivio si
           * sta ancora muovendo.
           */
          viva.annullata = true;
          aggiornaVista(viva.id, (v) => ({ ...v, annullata: true }));
        }
        // In fase congedata è tardi: non c'è più niente da annullare.
        return;
      }

      /*
       * Salvare e scartare si possono solo mentre si decide. I pulsanti si
       * disabilitano, ma la difesa non può stare in un attributo: due risposte
       * nello stesso giro arriverebbero prima di qualunque ridisegno.
       */
      if (viva.fase !== "chiede") return;

      if (risposta === RISPOSTE.scarta) {
        // L'unica autorizzazione esplicita a uscire con lavoro non salvato.
        concludi(viva, "procedi");
        return;
      }
      if (risposta !== RISPOSTE.salva) return;

      viva.fase = "salva";
      aggiornaVista(viva.id, (v) => ({
        ...v,
        salvataggio: true,
        erroreSalvataggio: null,
        nota: null,
      }));

      // Una alla volta: due scritture in parallelo sullo stesso archivio sono
      // la corsa che il resto del sistema evita con cura.
      let motivo = null;
      for (const guardia of guardieSporche()) {
        if (viva.annullata) break;
        try {
          if (!(await guardia.salva())) {
            motivo = true;
            break;
          }
        } catch (e) {
          motivo = e?.message ? String(e.message) : true;
          break;
        }
        if (!ancoraMia(viva)) return;
      }

      if (!ancoraMia(viva)) return;

      if (viva.annullata) {
        // Le scritture partite sono finite: si resta dov'eravamo, con l'URL
        // che il blocco ha tenuto fermo.
        concludi(viva, "resta");
        return;
      }

      if (motivo !== null) {
        /*
         * Salvataggio fallito: **non si naviga**. Il lavoro resta dov'è, il
         * dialogo torna a poter decidere — compreso lo scarto — e chi legge sa
         * perché. Procedere qui sarebbe il modo più costoso di sbagliare: la
         * pagina se ne andrebbe portandosi via proprio ciò che non si è
         * riusciti a scrivere.
         */
        viva.fase = "chiede";
        aggiornaVista(viva.id, (v) => ({ ...v, salvataggio: false, erroreSalvataggio: motivo }));
        return;
      }

      /*
       * Il controllo finale, sulle guardie **rilette adesso**.
       *
       * L'elenco di partenza è una fotografia, e fra la prima scrittura e
       * l'ultima passa tempo vero: un editor già salvato può essere tornato
       * sporco, o un editor pulito può essersi sporcato. Navigare sulla
       * fotografia porterebbe via lavoro nato mentre si salvava — nato
       * esattamente nella finestra che questo dialogo esiste per coprire.
       *
       * Non si risalva da soli: sarebbe un ciclo che può non finire, e nessuno
       * l'ha chiesto. Si dice che cosa è successo e si lascia scegliere di
       * nuovo — riprovare, annullare, o scartare, che resta l'unica
       * autorizzazione esplicita a uscire con lavoro non salvato.
       */
      const rimaste = guardieSporche().length;
      if (rimaste > 0) {
        viva.fase = "chiede";
        aggiornaVista(viva.id, (v) => ({
          ...v,
          salvataggio: false,
          nota:
            rimaste === 1
              ? "Mentre si salvava sono sopraggiunte modifiche: c'è di nuovo lavoro non salvato. Riprova, oppure scarta per uscire comunque."
              : `Mentre si salvava sono sopraggiunte modifiche: ci sono di nuovo ${rimaste} lavori non salvati. Riprova, oppure scarta per uscire comunque.`,
        }));
        return;
      }

      concludi(viva, "procedi");
    },
    [concludi, aggiornaVista, ancoraMia],
  );

  if (bloccante.state !== "blocked" || !vista) return null;

  const quante = guardieSporche().length;

  return (
    <Dialogo
      dialogo={{
        salvataggio: vista.salvataggio,
        annullata: vista.annullata,
        erroreSalvataggio: vista.erroreSalvataggio,
        nota: vista.nota,
        /*
         * Si conta, non si nomina: l'`etichetta` di una guardia è il nome
         * dell'**azione** del fornitore — «Questa azione» per entrambi gli
         * editor veri — e usarla qui produceva «Questa azione, Questa azione».
         */
        messaggio:
          quante > 1
            ? `Stai lasciando questa pagina con ${quante} lavori non ancora nell'archivio: uscendo si perdono.`
            : "Stai lasciando questa pagina con lavoro non ancora nell'archivio: uscendo si perde.",
      }}
      onRispondi={rispondi}
    />
  );
}
