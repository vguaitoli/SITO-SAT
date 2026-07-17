import React, { useState } from "react";
import SiteNav from "@/components/SiteNav";
import Footer from "@/components/Footer";
import MobileCta from "@/components/MobileCta";
import TourDetails, { tours } from "@/components/TourDetails.jsx?modalfix=1";

/**
 * Catalogo completo dei tour. Il formato (weekend / settimana / su misura),
 * che prima era un secondo sistema di scelta in home, qui diventa un semplice
 * filtro: la navigazione primaria resta quella per mezzo (le esperienze).
 */
const FILTRI = [
  { id: null, label: "Tutti" },
  { id: "weekend", label: "Weekend" },
  { id: "week", label: "Settimana" },
  { id: "custom", label: "Su misura" },
];

const conteggio = (group) =>
  group === null ? tours.length : tours.filter((t) => t.groups.includes(group)).length;

export default function TourItinerari() {
  const urlParams = new URLSearchParams(window.location.search);
  const [filtro, setFiltro] = useState(urlParams.get("filter") || null);

  return (
    <div className="bg-[var(--obsidian)]">
      <SiteNav />

      <header className="mx-auto max-w-7xl px-5 pb-10 pt-32 lg:px-8 lg:pt-40">
        <p className="font-button mb-4 text-xs uppercase tracking-[0.3em] text-[var(--accent-soft)]">
          Il catalogo
        </p>
        <h1 className="font-heading text-5xl leading-none text-[var(--granite-mist)] lg:text-7xl">
          Tutti gli <span className="text-[var(--accent)]">itinerari</span>
        </h1>
        <p className="mt-6 max-w-2xl font-body text-lg text-[var(--granite-mist)]/70">
          Ogni tour con scheda tecnica completa: durata, chilometri, livello, percentuale
          di sterrato, punti di interesse e periodo consigliato. Filtra per formato o
          scegli il mezzo dalle esperienze.
        </p>

        {/* Filtro per formato */}
        <div className="mt-8 flex flex-wrap gap-2" role="group" aria-label="Filtra i tour per formato">
          {FILTRI.map((f) => {
            const attivo = filtro === f.id;
            return (
              <button
                key={f.label}
                type="button"
                onClick={() => setFiltro(f.id)}
                aria-pressed={attivo}
                className={`font-button text-xs uppercase tracking-[0.15em] px-4 py-2.5 transition-colors ${
                  attivo
                    ? "bg-[var(--cta)] text-[var(--cta-text)]"
                    : "border border-[var(--border-on-dark)] text-[var(--granite-mist)]/80 hover:border-[var(--accent)] hover:text-[var(--accent-soft)]"
                }`}
              >
                {f.label}
                <span className={attivo ? "ml-2 opacity-70" : "ml-2 opacity-50"}>{conteggio(f.id)}</span>
              </button>
            );
          })}
        </div>
      </header>

      <TourDetails
        activeFilter={filtro}
        onClearFilter={() => setFiltro(null)}
        showAllByDefault
        hideHeader
      />

      <Footer />
      <MobileCta />
    </div>
  );
}
