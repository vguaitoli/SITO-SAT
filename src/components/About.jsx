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
                  Fondata da Gianluca Serra, Sardegna Trail Avventura nasce dalla
                  passione per il fuoristrada, l'esplorazione e il territorio.
                  Accompagniamo viaggiatori italiani ed europei alla scoperta
                  dell'isola attraverso esperienze in Enduro, Maxienduro, Quad, SSV,
                  4x4 ed e-bike.
                </p>
                <p>
                  Collaboriamo con agriturismi, strutture ricettive, guide, pastori,
                  artigiani e produttori locali, contribuendo a un turismo
                  responsabile che valorizza le comunità e le aree interne anche nei
                  periodi di bassa stagione.
                </p>
                <p className="border-l-2 border-[var(--accent)] pl-6 text-xl font-medium text-[var(--granite-mist)]">
                  Non semplici escursioni, ma esperienze autentiche tra natura,
                  cultura e tradizioni sarde.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
