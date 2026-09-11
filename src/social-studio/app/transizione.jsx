import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { COLORI } from "../design/tokens";

/**
 * Chiedere il permesso prima di far perdere lavoro.
 *
 * `EditorEvento` tiene il contenuto in stato locale: smontarlo, sostituirne il
 * contenuto o ricaricare la pagina butta via tutto quello che non è ancora
 * nell'archivio, e senza dirlo. Finché c'era un solo editor il problema non si
 * vedeva — non c'era dove andare. Con un secondo editor la transizione diventa
 * un gesto normale, e §16.4 la elenca come prerequisito da risolvere **prima**
 * di abilitare TOUR.
 *
 * Il contratto è minimo e sta in tre pezzi:
 *
 * - l'editor **registra una guardia**: sa dire se ha lavoro non salvato e sa
 *   salvarlo, restituendo se il salvataggio è riuscito;
 * - chi vuole cambiare qualcosa **richiede una transizione** passando l'azione
 *   da eseguire, invece di eseguirla;
 * - il fornitore, se serve, **chiede a chi guarda** e procede solo secondo la
 *   risposta.
 *
 * Sta in un modulo suo, e non dentro `registro-editor.js`, per evitare il ciclo:
 * il registro importa `EditorEvento`, che a sua volta ha bisogno di questo
 * contratto. Questo modulo non importa nessuno dei due.
 */

const Contesto = createContext(null);

/** Che cosa può rispondere chi guarda il dialogo. */
export const RISPOSTE = { annulla: "annulla", scarta: "scarta", salva: "salva" };

/**
 * Gli esiti di una richiesta, dichiarati.
 *
 * `occupato` non è un errore: è la risposta a una seconda richiesta arrivata
 * mentre la prima è ancora aperta. Due dialoghi sovrapposti perderebbero uno
 * dei due `risolvi`, e chi ha chiesto resterebbe in attesa per sempre.
 */
export const ESITI = {
  fatto: "fatto",
  annullato: "annullato",
  occupato: "occupato",
  fallito: "fallito",
};

/**
 * Registra la guardia dell'editor.
 *
 * @param {{sporco: () => boolean, salva: () => Promise<boolean>, etichetta?: string}} guardia
 */
export function useRegistraGuardia(guardia) {
  const contesto = useContext(Contesto);
  /*
   * La guardia si registra **una volta sola**, e legge lo stato fresco da un
   * riferimento. Registrarla a ogni render — perché `sporco` cambia — farebbe
   * girare l'effetto a ogni battuta di tasto, e una richiesta in volo potrebbe
   * trovarsi la guardia sostituita a metà.
   */
  const rif = useRef(guardia);
  rif.current = guardia;

  const stabile = useMemo(
    () => ({
      sporco: () => Boolean(rif.current?.sporco?.()),
      salva: async () => Boolean(await rif.current?.salva?.()),
      get etichetta() {
        return rif.current?.etichetta;
      },
    }),
    [],
  );

  useEffect(() => {
    if (!contesto) return undefined;
    return contesto.registraGuardia(stabile);
  }, [contesto, stabile]);
}

/**
 * Richiede una transizione: si passa **l'azione**, non si esegue.
 *
 * @returns {(azione: () => unknown, opzioni?: {etichetta?: string}) => Promise<{esito: string}>}
 */
export function useRichiediTransizione() {
  const contesto = useContext(Contesto);
  return contesto ? contesto.richiedi : eseguiSenzaProtezione;
}

/**
 * Senza fornitore l'azione si esegue e basta.
 *
 * È il caso dei test che montano l'editor da solo: non si vuole che il
 * comportamento cambi per l'assenza di un guscio, e non si vuole nemmeno che
 * l'assenza faccia fallire in silenzio.
 */
async function eseguiSenzaProtezione(azione) {
  await azione();
  return { esito: ESITI.fatto };
}

export function FornitoreTransizione({ children }) {
  const guardia = useRef(null);
  /*
   * La richiesta attiva sta in un **riferimento**, non nello stato.
   *
   * Serve per tre ragioni. `richiedi` è stabile — deve esserlo, o registrarla
   * farebbe girare gli effetti a ogni render — e quindi non vedrebbe mai uno
   * stato aggiornato: senza il riferimento due chiamate ravvicinate
   * passerebbero entrambe il controllo. Risolvere una promessa è un effetto
   * collaterale, e dentro un aggiornatore di stato React può invocarlo in
   * ritardo o due volte, lasciando appeso chi attende. E soprattutto: il
   * riferimento si aggiorna **subito**, prima di qualunque `await`, mentre uno
   * stato arriverebbe al render successivo — troppo tardi per fare da blocco.
   */
  const vivaRif = useRef(null);
  const contatore = useRef(0);
  /*
   * Lo stato serve solo a disegnare il dialogo: è una proiezione della
   * richiesta viva, identificata dal suo numero. Ogni aggiornamento passa da
   * quel numero, così la continuazione di un'operazione lenta non può chiudere
   * il dialogo di un'altra richiesta né scriverci dentro il proprio errore.
   */
  const [dialogo, setDialogo] = useState(null);

  const registraGuardia = useCallback((g) => {
    guardia.current = g;
    return () => {
      if (guardia.current === g) guardia.current = null;
    };
  }, []);

  /** Tocca il dialogo solo se sullo schermo c'è ancora quella richiesta. */
  const aggiornaDialogo = useCallback((id, fn) => {
    setDialogo((d) => (d && d.id === id ? fn(d) : d));
  }, []);

  /**
   * Congeda una richiesta: risolve **una volta sola** e rilascia il blocco.
   *
   * Restituisce anche la risposta, perché il ramo senza dialogo non passa da
   * una promessa esterna: ritorna direttamente.
   */
  const concludi = useCallback((viva, esito, errore) => {
    const risposta = errore === undefined ? { esito } : { esito, errore };
    if (vivaRif.current === viva) vivaRif.current = null;
    viva.fase = "congedata";
    setDialogo((d) => (d && d.id === viva.id ? null : d));
    const risolvi = viva.risolvi;
    viva.risolvi = null;
    if (risolvi) risolvi(risposta);
    return risposta;
  }, []);

  /**
   * Esegue l'azione e ne riporta l'esito vero.
   *
   * `fatto` si dice **dopo** che l'azione è finita, non prima: chi ha chiesto
   * deve poter contare sul fatto che, ricevuta la risposta, la transizione è
   * avvenuta. Un errore diventa `fallito` con il suo motivo, invece di
   * diventare una rejection che nessuno raccoglie.
   */
  const esegui = useCallback(
    async (viva) => {
      viva.fase = "agisce";
      setDialogo((d) => (d && d.id === viva.id ? null : d));
      try {
        await viva.azione();
      } catch (errore) {
        return concludi(viva, ESITI.fallito, errore);
      }
      return concludi(viva, ESITI.fatto);
    },
    [concludi],
  );

  const richiedi = useCallback(
    async (azione, { etichetta } = {}) => {
      /*
       * Il blocco si prende **prima** di qualunque attesa, anche quando
       * l'editor è pulito e non c'è niente da chiedere. Fra il controllo e
       * l'acquisizione non deve poter passare nessun altro: il corpo di una
       * funzione asincrona gira sincrono fino al primo `await`, ed è quella
       * finestra che tiene valida la promessa.
       */
      if (vivaRif.current) return { esito: ESITI.occupato };

      const g = guardia.current;
      const viva = {
        id: (contatore.current += 1),
        etichetta: etichetta || g?.etichetta,
        azione,
        risolvi: null,
        fase: "apre",
        annullata: false,
      };
      vivaRif.current = viva;

      if (!g || !g.sporco()) return esegui(viva);

      viva.fase = "chiede";
      // La promessa si crea prima di mostrare il dialogo: quando compare, chi
      // risponde trova già un `risolvi` a cui rispondere.
      const attesa = new Promise((risolvi) => {
        viva.risolvi = risolvi;
      });
      setDialogo({
        id: viva.id,
        etichetta: viva.etichetta,
        salvataggio: false,
        annullata: false,
        erroreSalvataggio: null,
      });
      return attesa;
    },
    [esegui],
  );

  const rispondi = useCallback(
    async (risposta) => {
      const viva = vivaRif.current;
      if (!viva) return;

      if (risposta === RISPOSTE.annulla) {
        if (viva.fase === "chiede") {
          // Niente in volo: si chiude subito, e non parte nulla.
          concludi(viva, ESITI.annullato);
          return;
        }
        if (viva.fase === "salva") {
          /*
           * La scrittura è già partita e non si può ritirare. Si marca la
           * richiesta: la sua continuazione troverà `annullata` e non avvierà
           * l'azione. Chi ha chiesto riceve `annullato` soltanto quando la
           * scrittura è finita, perché fino ad allora il blocco deve restare —
           * l'archivio sta cambiando, e lasciar entrare un'altra transizione
           * la farebbe partire da una base che si sta muovendo.
           */
          viva.annullata = true;
          aggiornaDialogo(viva.id, (d) => ({ ...d, annullata: true }));
        }
        // In fase di azione è tardi: l'azione è già partita.
        return;
      }

      /*
       * Salvare e scartare si possono solo mentre si sta decidendo. Durante la
       * scrittura un secondo clic duplicherebbe scritture e azioni: i pulsanti
       * si disabilitano, ma la difesa non può stare in un attributo.
       */
      if (viva.fase !== "chiede") return;

      if (risposta === RISPOSTE.scarta) {
        await esegui(viva);
        return;
      }
      if (risposta !== RISPOSTE.salva) return;

      viva.fase = "salva";
      aggiornaDialogo(viva.id, (d) => ({ ...d, salvataggio: true, erroreSalvataggio: null }));

      let riuscito = false;
      let motivo = null;
      try {
        riuscito = Boolean(await guardia.current?.salva?.());
      } catch (e) {
        // Una guardia che lancia è un fallimento come un altro: non deve
        // diventare una rejection che esce da un gestore di clic.
        riuscito = false;
        motivo = e?.message ? String(e.message) : null;
      }

      /*
       * Dopo l'attesa niente è più garantito. Si verificano identità — è
       * ancora **questa** la richiesta attiva? — e annullamento, prima di
       * applicare qualsiasi effetto.
       */
      if (vivaRif.current !== viva) return;

      if (viva.annullata) {
        concludi(viva, ESITI.annullato);
        return;
      }

      if (!riuscito) {
        // Si torna a poter decidere: il lavoro resta aperto e la scelta è
        // ancora sul tavolo, compreso lo scarto.
        viva.fase = "chiede";
        aggiornaDialogo(viva.id, (d) => ({
          ...d,
          salvataggio: false,
          erroreSalvataggio: motivo || true,
        }));
        return;
      }

      await esegui(viva);
    },
    [concludi, esegui, aggiornaDialogo],
  );

  /*
   * Smontare il fornitore non deve lasciare né azioni tardive né promesse
   * appese. Ciò che è in volo non si può ritirare, ma la sua continuazione non
   * troverà più la richiesta attiva e non farà partire niente.
   */
  useEffect(
    () => () => {
      const viva = vivaRif.current;
      /*
       * Azzerare il riferimento **è** ciò che ferma le continuazioni: al
       * ritorno dal loro `await` non si riconosceranno più come la richiesta
       * attiva e non applicheranno alcun effetto. Non serve altro, e usare qui
       * `annullata` renderebbe quel controllo di identità una ridondanza mai
       * esercitata.
       */
      vivaRif.current = null;
      if (!viva) return;
      // Se l'azione è già partita la concluderà chi l'ha avviata: risolvere
      // qui darebbe una risposta sbagliata, e la darebbe due volte.
      if (viva.fase === "agisce") return;
      const risolvi = viva.risolvi;
      viva.risolvi = null;
      viva.fase = "congedata";
      if (risolvi) risolvi({ esito: ESITI.annullato });
    },
    [],
  );

  const valore = useMemo(
    () => ({ registraGuardia, richiedi }),
    [registraGuardia, richiedi],
  );

  return (
    <Contesto.Provider value={valore}>
      {children}
      {dialogo && <Dialogo dialogo={dialogo} onRispondi={rispondi} />}
    </Contesto.Provider>
  );
}

/**
 * Il dialogo: tre uscite, nessuna implicita.
 *
 * Modale davvero — copre la pagina — perché mentre si decide non si deve poter
 * continuare a scrivere: una modifica fatta adesso non sarebbe compresa né nel
 * salvataggio né nello scarto, e andrebbe persa senza che nessuno l'abbia
 * chiesto.
 *
 * Mentre una scrittura è in volo il dialogo resta, ma cambia: dice che cosa sta
 * succedendo e lascia una sola uscita. Chiuderlo darebbe l'impressione che la
 * transizione sia avvenuta quando non lo è ancora.
 */
function Dialogo({ dialogo, onRispondi }) {
  const primo = useRef(null);
  const { salvataggio, annullata, erroreSalvataggio } = dialogo;
  // Mentre si annulla non c'è più niente da decidere: si aspetta soltanto che
  // la scrittura già partita finisca.
  const inAttesa = salvataggio || annullata;

  useEffect(() => {
    primo.current?.focus();
  }, []);

  useEffect(() => {
    const daTastiera = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onRispondi(RISPOSTE.annulla);
      }
    };
    window.addEventListener("keydown", daTastiera);
    return () => window.removeEventListener("keydown", daTastiera);
  }, [onRispondi]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="transizione-titolo"
      aria-busy={inAttesa ? "true" : undefined}
      data-transizione="dialogo"
      data-fase={annullata ? "annulla" : salvataggio ? "salva" : "chiede"}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
    >
      <div className="w-full max-w-md border border-[var(--border-on-dark)] bg-[var(--obsidian)] p-5">
        <h2
          id="transizione-titolo"
          className="mb-2 flex items-start gap-2 font-button text-xs uppercase tracking-[0.2em] text-[var(--accent-soft)]"
        >
          <AlertTriangle size={14} className="mt-0.5 flex-none" aria-hidden="true" />
          Modifiche non salvate
        </h2>
        <p className="mb-4 font-body text-xs leading-snug text-granite-mist/70">
          {dialogo.etichetta
            ? `${dialogo.etichetta} sostituisce il lavoro in corso, che non è ancora nell'archivio.`
            : "Il lavoro in corso non è ancora nell'archivio e andrebbe perso."}
        </p>
        {annullata && (
          <p className="mb-4 font-body text-xs text-granite-mist/70" role="status">
            Annullato. Il salvataggio già partito sta finendo: la transizione non avverrà.
          </p>
        )}
        {!annullata && salvataggio && (
          <p className="mb-4 font-body text-xs text-granite-mist/70" role="status">
            Salvataggio in corso…
          </p>
        )}
        {erroreSalvataggio && (
          <p className="mb-4 font-body text-xs" style={{ color: "#E2857A" }}>
            {typeof erroreSalvataggio === "string"
              ? `Il salvataggio non è riuscito: ${erroreSalvataggio}. Il lavoro resta aperto.`
              : "Il salvataggio non è riuscito: il lavoro resta aperto. Vedi il messaggio accanto al pulsante «Salva la bozza»."}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <button
            ref={primo}
            type="button"
            disabled={annullata}
            onClick={() => onRispondi(RISPOSTE.annulla)}
            className="btn-mech border border-[var(--border-on-dark)] px-3 py-2 font-button text-[10px] uppercase tracking-[0.16em] transition-colors hover:border-[var(--accent)] disabled:opacity-40"
          >
            Annulla
          </button>
          <button
            type="button"
            disabled={inAttesa}
            onClick={() => onRispondi(RISPOSTE.salva)}
            className="btn-mech border px-3 py-2 font-button text-[10px] uppercase tracking-[0.16em] transition-colors disabled:opacity-40"
            style={{ borderColor: COLORI.verdeChiaro, color: COLORI.verdeChiaro }}
          >
            Salva e continua
          </button>
          <button
            type="button"
            disabled={inAttesa}
            onClick={() => onRispondi(RISPOSTE.scarta)}
            className="btn-mech border border-[var(--border-on-dark)] px-3 py-2 font-button text-[10px] uppercase tracking-[0.16em] text-granite-mist/60 transition-colors hover:border-[var(--accent)] disabled:opacity-40"
          >
            Scarta modifiche
          </button>
        </div>
      </div>
    </div>
  );
}
