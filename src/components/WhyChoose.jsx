import React from "react";
import Reveal from "@/components/Reveal";
import { fotoProps } from "@/data/foto-helpers";

const reasons = [
  { label: "Guide locali esperte", desc: "Sardi che conoscono ogni tratturo, non accompagnatori improvvisati." },
  { label: "Percorsi esclusivi", desc: "Tracciati costruiti negli anni, lontani dai circuiti turistici." },
  { label: "Natura incontaminata", desc: "Supramonte, Gennargentu, coste raggiungibili solo in fuoristrada." },
  { label: "Assistenza tecnica", desc: "Supporto meccanico e mezzo di appoggio lungo tutto il percorso." },
  { label: "Esperienze autentiche", desc: "Borghi, pinnette, prodotti locali: la Sardegna vera, non la cartolina." },
  { label: "Piccoli gruppi", desc: "Numeri contenuti per sicurezza, ritmo e attenzione a ogni partecipante." },
];

const photo = fotoProps("guida-sentiero");

export default function WhyChoose() {
  return (
    <section className="border-y border-[var(--accent)]/15 bg-[var(--obsidian)] topo-dark py-20 lg:py-32">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-start lg:gap-16">
          {/* Colonna narrativa: promessa di valore + volto reale della guida */}
          <Reveal>
            <p className="font-button mb-4 text-xs uppercase tracking-[0.3em] text-[var(--accent)]">
              Perché sceglierci
            </p>
            <h2 className="font-heading text-5xl leading-[0.95] text-[var(--text-on-dark)] lg:text-7xl">
              Ragioni concrete,{" "}
              <span className="text-[var(--accent)]">non slogan.</span>
            </h2>
            <p className="mt-6 max-w-md font-body text-lg leading-relaxed text-[var(--text-on-dark-muted)]">
              Guide sarde che conoscono ogni tratturo, percorsi costruiti negli
              anni e assistenza vera lungo tutto il tragitto. Ecco cosa ci
              distingue.
            </p>
            {photo && (
              <div className="mt-10 overflow-hidden shadow-2xl">
                <img
                  src={photo.src}
                  srcSet={photo.srcSet}
                  sizes="(min-width: 1024px) 560px, 100vw"
                  alt={photo.alt}
                  loading="lazy"
                  decoding="async"
                  className="aspect-[4/3] w-full object-cover transition-transform duration-700 hover:scale-105"
                />
              </div>
            )}
          </Reveal>

          {/* Elenco delle ragioni: numeri grandi, linee sottili, gerarchia netta */}
          <ul>
            {reasons.map((r, i) => (
              <Reveal
                as="li"
                key={r.label}
                delay={i * 0.06}
                className="flex gap-5 border-t border-[var(--border-on-dark)] py-6 first:border-t-0 first:pt-0 lg:py-7 lg:first:pt-0"
              >
                <span className="font-heading text-4xl leading-none text-[var(--accent)]/60 lg:text-5xl">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="font-body text-base font-semibold uppercase tracking-wide text-[var(--text-on-dark)]">
                    {r.label}
                  </h3>
                  <p className="mt-2 font-body text-sm leading-relaxed text-[var(--text-on-dark-muted)]">
                    {r.desc}
                  </p>
                </div>
              </Reveal>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
