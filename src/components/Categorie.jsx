import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import Reveal from "@/components/Reveal";
import SectionHeading from "@/components/SectionHeading";
import { CATEGORIE } from "@/data/categorie";
import { fotoProps } from "@/data/foto-helpers";

/**
 * "Scegli la tua avventura": una card per ciascuna categoria, in una griglia
 * uniforme che scala con il numero di esperienze.
 */
function Card({ cat }) {
  const photo = fotoProps(cat.fotoCard);
  const cta = cat.tourType ? "Scopri i tour" : "Richiedi informazioni";
  return (
    <Link
      to={`/esperienze/${cat.id}`}
      className="group relative block aspect-[4/5] h-full overflow-hidden bg-[var(--obsidian)]"
      aria-label={`${cat.nome} — ${cta}`}
    >
      <img
        src={photo.src}
        srcSet={photo.srcSet}
        sizes="(min-width: 768px) 33vw, 50vw"
        alt={photo.alt}
        loading="lazy"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover opacity-75 transition-all duration-700 ease-out group-hover:scale-105 group-hover:opacity-95"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[var(--obsidian)] via-[var(--obsidian)]/45 to-transparent" />

      <div className="absolute inset-x-0 bottom-0 p-6 transition-transform duration-500 ease-out group-hover:-translate-y-1 lg:p-7">
        <p className="font-button text-[10px] uppercase tracking-[0.25em] text-[var(--accent-soft)]">
          {cat.claim}
        </p>
        <h3 className="mt-2 font-heading text-3xl tracking-wide text-[var(--granite-mist)]">
          {cat.nome}
        </h3>
        <p className="mt-2 font-body text-sm leading-relaxed text-[var(--granite-mist)]/75 line-clamp-3">
          {cat.intro}
        </p>
        <span className="mt-4 inline-flex items-center gap-2 font-button text-xs uppercase tracking-[0.2em] text-[var(--accent-soft)]">
          {cta}
          <ArrowRight
            size={15}
            className="transition-transform duration-300 group-hover:translate-x-1"
            aria-hidden="true"
          />
        </span>
      </div>
    </Link>
  );
}

export default function Categorie() {
  return (
    <section id="esperienze" className="bg-[var(--obsidian)] topo-dark py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <SectionHeading
          eyebrow="Le esperienze"
          title="Scegli la tua"
          accent="avventura"
          intro="Sei modi di vivere lo sterrato sardo, dalla maxienduro all'e-bike. Ogni mezzo ha il suo carattere, il suo ritmo e i suoi percorsi: scegli quello che fa per te."
          className="mb-14"
        />

        <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
          {CATEGORIE.map((cat, i) => (
            <Reveal key={cat.id} delay={i * 0.06}>
              <Card cat={cat} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
