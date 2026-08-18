import React from "react";
import { AlertTriangle, CheckCircle2, Lock, XCircle } from "lucide-react";
import { FornitoreArchivio } from "./ContestoArchivio";
import StatoArchivio from "./StatoArchivio";
import { ELENCO_CATEGORIE } from "../design/categorie";
import { brandLockAttivo } from "../fondamenta/brand-lock";
import StressTest from "./StressTest";
import EditorEvento from "./EditorEvento";
import { COLORI } from "../design/tokens";

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
          <EditorEvento />
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
            Fase 5.1
          </span>
        </div>
      </div>
    </header>
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
          <li key={c.id} className="bg-[var(--obsidian)] p-4">
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
              {c.varianti.length} varianti
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Segno({ livello }) {
  if (livello === "errore") return <XCircle size={14} className="mt-0.5 shrink-0" style={{ color: "#E2857A" }} aria-hidden="true" />;
  if (livello === "avviso") return <AlertTriangle size={14} className="mt-0.5 shrink-0" style={{ color: COLORI.accentoEventi }} aria-hidden="true" />;
  return <CheckCircle2 size={14} className="mt-0.5 shrink-0" style={{ color: COLORI.verdeChiaro }} aria-hidden="true" />;
}
