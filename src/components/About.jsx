import React from "react";
import Reveal from "@/components/Reveal";
import Photo from "@/components/Photo";

export default function About() {
  return (
    <section id="chi-siamo" className="overflow-hidden bg-[var(--obsidian)] topo-dark py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          {/* Fotografia reale */}
          <Reveal className="relative order-2 lg:order-1">
            <Photo
              slug="chi-siamo-gruppo"
              ratio="4/3"
              sizes="(min-width: 1024px) 45vw, 100vw"
              className="w-full"
              overlay
            />
            <div className="absolute -bottom-5 -right-5 max-w-[200px] bg-[var(--cta)] px-8 py-6 lg:-right-8">
              <p className="font-heading text-5xl leading-none text-[var(--granite-mist)]">100%</p>
              <p className="mt-2 font-body text-xs leading-tight text-[var(--granite-mist)]/80">
                Sardegna autentica, fuori dai sentieri turistici
              </p>
            </div>
          </Reveal>

          {/* Testo */}
          <div className="order-1 lg:order-2">
            <Reveal>
              <p className="font-button mb-4 text-xs uppercase tracking-[0.3em] text-[var(--accent-soft)]">
                Chi Siamo
              </p>
              <h2 className="mb-8 font-heading text-5xl leading-none text-[var(--granite-mist)] lg:text-7xl">
                Passione.
                <br />
                Esperienza.
                <br />
                <span className="text-[var(--accent)]">Sardegna.</span>
              </h2>
            </Reveal>
            <div className="fissure-light mb-8" />
            <Reveal delay={0.1}>
              <div className="space-y-5 font-body text-lg leading-relaxed text-[var(--granite-mist)]/80">
                <p>
                  Sardegna Trail Avventura nasce dalla passione per il mondo del
                  fuoristrada e dall'amore per questa terra. Ogni percorso è stato
                  selezionato per offrire emozioni autentiche, panorami unici e
                  divertimento in totale sicurezza.
                </p>
                <p className="border-l-2 border-[var(--accent)] pl-6 text-xl font-medium text-[var(--granite-mist)]">
                  Non proponiamo semplici escursioni. Creiamo esperienze che rimangono
                  nella memoria.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
