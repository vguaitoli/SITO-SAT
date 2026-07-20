import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useReducedMotion } from "framer-motion";
import { ArrowRight, Route } from "lucide-react";
import Reveal from "@/components/Reveal";
import SectionHeading from "@/components/SectionHeading";
import { CATEGORIE } from "@/data/categorie";
import { fotoProps } from "@/data/foto-helpers";

const SLIDE_MS = 4500;

/**
 * Carosello a dissolvenza tra le foto reali della categoria (cat.carosello).
 * In pausa al passaggio del mouse e disattivato con prefers-reduced-motion
 * (mostra solo la prima foto, ferma).
 */
function CardCarousel({ slugs, alt }) {
  const photos = slugs.map(fotoProps).filter(Boolean);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce || paused || photos.length < 2) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % photos.length);
    }, SLIDE_MS);
    return () => clearInterval(id);
  }, [reduce, paused, photos.length]);

  if (photos.length === 0) return null;

  return (
    <div
      className="absolute inset-0"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {photos.map((photo, i) => (
        <img
          key={photo.slug}
          src={photo.src}
          srcSet={photo.srcSet}
          sizes="(min-width: 768px) 33vw, 50vw"
          alt={i === 0 ? alt : ""}
          aria-hidden={i === 0 ? undefined : true}
          loading="lazy"
          decoding="async"
          className={`absolute inset-0 h-full w-full object-cover transition-all duration-700 ease-out ${
            i === index
              ? "opacity-75 group-hover:scale-105 group-hover:opacity-95"
              : "opacity-0"
          }`}
        />
      ))}
    </div>
  );
}

/**
 * "Scegli la tua avventura": una card per ciascuna categoria, in una griglia
 * uniforme che scala con il numero di esperienze.
 */
function Card({ cat }) {
  const slugs = cat.carosello?.length ? cat.carosello : [cat.fotoCard].filter(Boolean);
  const cta = cat.tourType ? "Scopri i tour" : "Richiedi informazioni";
  return (
    <Link
      to={`/esperienze/${cat.id}`}
      className="group relative block aspect-[4/5] h-full overflow-hidden bg-[var(--obsidian)]"
      aria-label={`${cat.nome} — ${cta}`}
    >
      {slugs.length > 0 ? (
        <CardCarousel slugs={slugs} alt={`${cat.nome}: ${cat.claim}`} />
      ) : (
        // Nessuna foto reale ancora disponibile per questa categoria: un'icona
        // al posto di una foto inventata o non pertinente.
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[var(--surface-dark-alt)] to-[var(--obsidian)]">
          <Route size={72} className="text-[var(--accent)]/25" aria-hidden="true" strokeWidth={1.25} />
        </div>
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[var(--obsidian)] via-[var(--obsidian)]/45 to-transparent" />

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
          intro="Otto modi di vivere la Sardegna, dallo sterrato più estremo ai tour su strada. Ogni mezzo ha il suo carattere, il suo ritmo e i suoi percorsi: scegli quello che fa per te."
          className="mb-14"
        />

        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
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
