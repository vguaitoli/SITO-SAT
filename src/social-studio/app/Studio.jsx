import React, { useEffect } from "react";
import { FornitoreArchivio } from "./ContestoArchivio";
import StatoArchivio from "./StatoArchivio";
import { CATEGORIE } from "../fondamenta/schema";

/**
 * STA Social Studio — guscio dell'applicazione.
 *
 * Fase 3: ci sono le fondamenta (archivio, schema, persistenza) e nient'altro.
 * Dashboard, editor e template arrivano nelle fasi successive; le rubriche qui
 * sotto sono elencate per far vedere l'impianto, non sono ancora navigabili.
 */

const NOMI_RUBRICHE = {
  tour: "Tour", eventi: "Eventi", trail: "Trail", sardegna: "Sardegna",
  guide: "Guide", garage: "Garage", crew: "Crew", info: "Info",
};

export default function Studio() {
  // Difesa in profondità: il vero blocco è il middleware lato server, ma se
  // qualcosa lo aggirasse la pagina non deve comunque finire in un indice.
  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow, noarchive";
    document.head.appendChild(meta);
    const titoloPrecedente = document.title;
    document.title = "STA Social Studio";
    return () => {
      meta.remove();
      document.title = titoloPrecedente;
    };
  }, []);

  return (
    <FornitoreArchivio>
      <div className="min-h-screen bg-[var(--obsidian)] text-[var(--text-on-dark)]">
        <header className="border-b border-[var(--border-on-dark)] px-6 py-5 lg:px-10">
          <div className="mx-auto flex max-w-5xl items-baseline justify-between gap-4">
            <div>
              <p className="font-button text-[10px] uppercase tracking-[0.3em] text-[var(--accent-soft)]">
                Sardegna Trail Avventura
              </p>
              <h1 className="mt-1 font-heading text-3xl leading-none">STA Social Studio</h1>
            </div>
            <span className="font-button text-[10px] uppercase tracking-[0.2em] text-granite-mist/40">
              Fase 3 · fondamenta
            </span>
          </div>
        </header>

        <main className="mx-auto max-w-5xl space-y-8 px-6 py-8 lg:px-10">
          <StatoArchivio />

          <section className="border border-[var(--border-on-dark)] p-5">
            <h2 className="mb-4 font-button text-xs uppercase tracking-[0.2em] text-[var(--accent-soft)]">
              Le otto rubriche
            </h2>
            <ol className="grid grid-cols-2 gap-px bg-[var(--border-on-dark)] sm:grid-cols-4">
              {CATEGORIE.map((id, i) => (
                <li key={id} className="bg-[var(--obsidian)] p-4">
                  <span className="font-button text-[10px] uppercase tracking-[0.2em] text-granite-mist/40">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="mt-1 block font-heading text-xl leading-none">
                    {NOMI_RUBRICHE[id]}
                  </span>
                </li>
              ))}
            </ol>
            <p className="mt-4 font-body text-xs leading-relaxed text-granite-mist/55">
              Template e editor arrivano dalla Fase 4. La rubrica Eventi resta in attesa del
              sorgente della locandina.
            </p>
          </section>
        </main>
      </div>
    </FornitoreArchivio>
  );
}
