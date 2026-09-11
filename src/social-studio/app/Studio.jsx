import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { Lock } from "lucide-react";
import { FornitoreArchivio } from "./ContestoArchivio";
import StatoArchivio from "./StatoArchivio";
import { CATEGORIE, ELENCO_CATEGORIE } from "../design/categorie";
import { brandLockAttivo } from "../fondamenta/brand-lock";
import StressTest from "./StressTest";
import { editorPerRubrica, statoRubrica } from "./registro-editor";
import { ESITI, FornitoreTransizione, useRichiediTransizione } from "./transizione";

/**
 * STA Social Studio — guscio dell'applicazione.
 *
 * Design system, Brand Lock, Template Engine, anteprima dal vivo e pre-flight
 * sono in piedi e collegati fra loro. La rubrica EVENTI è completa da un capo
 * all'altro — bozze persistenti, Media Library con metadata, GPX reale, caption
 * con Fact Lock, pacchetto esportabile. Le altre sette rubriche hanno il
 * framework ma non i template.
 */
export default function Studio() {
  /*
   * Il `robots` non si scrive più qui: lo governa SeoHead, che conosce la rotta
   * e sa anche togliere i metadati pubblici ereditati dalla pagina precedente.
   * Due proprietari dello stesso tag producevano un titolo da 404 su una pagina
   * che esiste.
   */
  return (
    <FornitoreArchivio>
      {/*
        Il fornitore avvolge tutto: l'editor gli registra la propria guardia e
        il guscio gli chiede il permesso prima di ogni transizione. Senza,
        cambiare rubrica smonterebbe l'editor e con esso il lavoro non ancora
        nell'archivio — il prerequisito del §16.4.
      */}
      <FornitoreTransizione>
        <Navigazione>
          <div className="min-h-screen bg-[var(--obsidian)] text-[var(--text-on-dark)]">
            <Intestazione />
            <main className="mx-auto max-w-6xl space-y-8 px-6 py-8 lg:px-10">
              <StatoArchivio />
              <Rubriche />
              <EditorAperto />
              <StressTest />
            </main>
          </div>
        </Navigazione>
      </FornitoreTransizione>
    </FornitoreArchivio>
  );
}

/* ================================================================== *
 * Quale rubrica è aperta, e come si cambia
 * ================================================================== */

const ContestoNavigazione = createContext(null);

/** La rubrica da cui si parte. Le altre sette non sono ancora apribili. */
export const RUBRICA_INIZIALE = "eventi";

/**
 * Tiene la rubrica aperta e centralizza la richiesta di cambiarla.
 *
 * Il cambio passa **sempre** da qui, e in questo ordine: prima si guarda se la
 * destinazione esiste davvero, poi si chiede il permesso a chi ha lavoro
 * aperto. L'ordine conta. Chiedere prima e scoprire dopo che la destinazione
 * non è implementata farebbe comparire un dialogo per una transizione che non
 * potrà avvenire — e, se si scegliesse «Scarta», butterebbe via il lavoro per
 * niente.
 */
function Navigazione({ children }) {
  const [rubricaAperta, setRubricaAperta] = useState(RUBRICA_INIZIALE);
  const richiedi = useRichiediTransizione();

  const vaiA = useCallback(
    async (id) => {
      if (id === rubricaAperta) return { esito: ESITI.fatto };
      /*
       * Destinazione pianificata o inesistente: non si smonta niente e non si
       * chiede niente. È il registro a decidere, non questa funzione.
       */
      if (statoRubrica(id) !== "disponibile") return { esito: "indisponibile" };
      return richiedi(() => setRubricaAperta(id), {
        etichetta: `Aprire la rubrica ${CATEGORIE[id]?.nome || id}`,
      });
    },
    [rubricaAperta, richiedi],
  );

  const valore = useMemo(() => ({ rubricaAperta, vaiA }), [rubricaAperta, vaiA]);
  return <ContestoNavigazione.Provider value={valore}>{children}</ContestoNavigazione.Provider>;
}

function useNavigazione() {
  return useContext(ContestoNavigazione) || { rubricaAperta: RUBRICA_INIZIALE, vaiA: async () => ({ esito: ESITI.fatto }) };
}

/**
 * La dicitura di prodotto, derivata dalla rubrica aperta.
 *
 * Sostituisce il vecchio «Fase 5.1», che era il numero di un capitolo di
 * lavorazione e invecchiava a ogni checkpoint. Questa dice che cosa si sta
 * usando, e cambia soltanto quando cambia davvero.
 */
function Intestazione() {
  const lucchetto = brandLockAttivo();
  const { rubricaAperta } = useNavigazione();
  const r = CATEGORIE[rubricaAperta];
  const etichetta = `Rubrica ${r.numero} / ${r.nome.toUpperCase()}`;
  return (
    <header className="border-b border-[var(--border-on-dark)] px-6 py-5 lg:px-10">
      <div className="mx-auto flex max-w-6xl items-baseline justify-between gap-4">
        <div>
          <p className="font-button text-[10px] uppercase tracking-[0.3em] text-[var(--accent-soft)]">
            Sardegna Trail Avventura
          </p>
          <h1 className="mt-1 font-heading text-3xl leading-none">STA Social Studio</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-2 font-button text-[10px] uppercase tracking-[0.2em] text-granite-mist/50">
            <Lock size={13} aria-hidden="true" />
            Brand Lock {lucchetto ? "attivo" : "disattivato"}
          </span>
          <span className="font-button text-[10px] uppercase tracking-[0.2em] text-granite-mist/35">
            {etichetta}
          </span>
        </div>
      </div>
    </header>
  );
}

/**
 * L'editor della rubrica aperta, risolto dal registro.
 *
 * Nessun ripiego: se la rubrica non ha un editor non si monta niente e lo si
 * dice. Montare l'editor EVENTI su un'altra rubrica creerebbe bozze con la
 * categoria sbagliata e campi che non le appartengono.
 */
function EditorAperto() {
  const { rubricaAperta } = useNavigazione();
  const Editor = editorPerRubrica(rubricaAperta);
  if (!Editor) {
    return (
      <section className="border border-[var(--border-on-dark)] p-5">
        <p className="font-body text-xs text-granite-mist/60">
          Nessun editor per la rubrica «{rubricaAperta}».
        </p>
      </section>
    );
  }
  /*
   * La chiave è la rubrica: cambiandola React smonta l'editor precedente e
   * monta il nuovo con stato pulito, invece di riusare l'istanza e mescolare
   * il contenuto di due rubriche. È proprio quello smontaggio che la
   * protezione delle transizioni difende.
   */
  return <Editor key={rubricaAperta} />;
}

/**
 * Una rubrica nell'elenco delle otto.
 *
 * Mostra due cose che non vanno confuse: le varianti **previste**, che sono il
 * piano editoriale dichiarato in `categorie.js`, e lo stato, che dice cosa si
 * può davvero aprire oggi. Sette rubriche su otto sono previste e non ancora
 * costruite, e la card lo dice invece di lasciarlo intendere.
 */
function CardRubrica({ rubrica: c }) {
  const disponibile = statoRubrica(c.id) === "disponibile";
  const { rubricaAperta, vaiA } = useNavigazione();
  const aperta = rubricaAperta === c.id;
  return (
    <li
      className="bg-[var(--obsidian)] p-4"
      data-rubrica={c.id}
      data-stato={disponibile ? "disponibile" : "da-implementare"}
      data-aperta={aperta ? "sì" : "no"}
      aria-disabled={!disponibile}
      style={disponibile ? undefined : { opacity: 0.45 }}
    >
      <div className="flex items-baseline justify-between">
        <span className="font-button text-[10px] uppercase tracking-[0.2em] text-granite-mist/40">
          {c.numero}
        </span>
        <span
          className="h-2 w-2 rounded-full"
          style={{ background: c.accento }}
          title={`Accento ${c.accento}`}
        />
      </div>
      <span className="mt-1 block font-heading text-xl leading-none">{c.nome}</span>
      <span className="mt-2 block font-body text-[11px] leading-snug text-granite-mist/50">
        {c.pesoFoto}% foto · {c.pesoGrafica}% grafica
      </span>
      <span className="mt-1 block font-body text-[11px] text-granite-mist/35">
        {c.varianti.length} varianti previste
      </span>
      {/*
        Solo le rubriche con editor **e** template sono un pulsante: le altre
        sette restano un'etichetta, così non c'è nulla da premere che poi non
        succede. Il cambio passa da `vaiA`, che chiede prima al registro e poi
        a chi ha lavoro aperto.
      */}
      {disponibile ? (
        <button
          type="button"
          onClick={() => vaiA(c.id)}
          disabled={aperta}
          className="btn-mech mt-2 border px-2 py-1 font-button text-[10px] uppercase tracking-[0.16em] transition-colors"
          style={{ borderColor: c.accento, color: c.accento }}
        >
          {aperta ? "Aperta" : "Apri"}
        </button>
      ) : (
        <span
          className="mt-2 inline-block font-button text-[10px] uppercase tracking-[0.16em]"
          style={{ color: "rgba(245,235,217,0.3)" }}
        >
          Da implementare
        </span>
      )}
    </li>
  );
}

function Rubriche() {
  return (
    <section className="border border-[var(--border-on-dark)] p-5">
      <h2 className="mb-4 font-button text-xs uppercase tracking-[0.2em] text-[var(--accent-soft)]">
        Le otto rubriche
      </h2>
      <ol className="grid grid-cols-2 gap-px bg-[var(--border-on-dark)] sm:grid-cols-4">
        {ELENCO_CATEGORIE.map((c) => (
          <CardRubrica key={c.id} rubrica={c} />
        ))}
      </ol>
    </section>
  );
}
