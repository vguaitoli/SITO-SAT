import React from "react";
import { Lock } from "lucide-react";
import { FornitoreArchivio } from "./ContestoArchivio";
import StatoArchivio from "./StatoArchivio";
import { CATEGORIE, ELENCO_CATEGORIE } from "../design/categorie";
import { brandLockAttivo } from "../fondamenta/brand-lock";
import StressTest from "./StressTest";
import { editorPerRubrica, statoRubrica } from "./registro-editor";

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
      <div className="min-h-screen bg-[var(--obsidian)] text-[var(--text-on-dark)]">
        <Intestazione />
        <main className="mx-auto max-w-6xl space-y-8 px-6 py-8 lg:px-10">
          <StatoArchivio />
          <Rubriche />
          <EditorAperto />
          <StressTest />
        </main>
      </div>
    </FornitoreArchivio>
  );
}

function Intestazione() {
  const lucchetto = brandLockAttivo();
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
            {ETICHETTA_RUBRICA_APERTA}
          </span>
        </div>
      </div>
    </header>
  );
}

/**
 * La rubrica su cui si lavora oggi.
 *
 * Sostituisce il vecchio «Fase 5.1», che era il numero di un capitolo di
 * lavorazione e invecchiava a ogni checkpoint. Questa dicitura dice invece che
 * cosa si sta usando, e cambia solo quando cambia davvero.
 */
const RUBRICA_APERTA = "eventi";
const ETICHETTA_RUBRICA_APERTA =
  `Rubrica ${CATEGORIE[RUBRICA_APERTA].numero} / ${CATEGORIE[RUBRICA_APERTA].nome.toUpperCase()}`;

/**
 * L'editor della rubrica aperta, risolto dal registro.
 *
 * Nessun ripiego: se la rubrica non ha un editor non si monta niente e lo si
 * dice. Montare l'editor EVENTI su un'altra rubrica creerebbe bozze con la
 * categoria sbagliata e campi che non le appartengono.
 */
function EditorAperto() {
  const Editor = editorPerRubrica(RUBRICA_APERTA);
  if (!Editor) {
    return (
      <section className="border border-[var(--border-on-dark)] p-5">
        <p className="font-body text-xs text-granite-mist/60">
          Nessun editor per la rubrica «{RUBRICA_APERTA}».
        </p>
      </section>
    );
  }
  return <Editor />;
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
  return (
    <li
      className="bg-[var(--obsidian)] p-4"
      data-rubrica={c.id}
      data-stato={disponibile ? "disponibile" : "da-implementare"}
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
      <span
        className="mt-2 inline-block font-button text-[10px] uppercase tracking-[0.16em]"
        style={{ color: disponibile ? c.accento : "rgba(245,235,217,0.3)" }}
      >
        {disponibile ? "Disponibile" : "Da implementare"}
      </span>
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
