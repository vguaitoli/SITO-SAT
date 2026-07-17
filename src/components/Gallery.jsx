import React, { useState } from "react";
import GalleryLightbox from "@/components/GalleryLightbox";
import SectionHeading from "@/components/SectionHeading";
import { fotoProps } from "@/data/foto-helpers";

/**
 * Galleria editoriale: alterna mezzi, persone, percorsi, paesaggi e momenti
 * dell'esperienza. Tutte le foto sono reali (manifest src/data/foto.js).
 */
const items = [
  { slug: "hero-maxienduro-panorama", label: "Maxienduro", span: "col-span-2 row-span-2" },
  { slug: "hero-ssv-guado", label: "SSV" },
  { slug: "4x4-guado", label: "4x4" },
  { slug: "hero-quad-convoglio", label: "Quad" },
  { slug: "enduro-vetta", label: "Enduro" },
  { slug: "pranzo-tavolata", label: "I pranzi", span: "col-span-2" },
  { slug: "pinnetta-sosta", label: "Il territorio" },
  { slug: "guida-sentiero", label: "Le guide" },
  { slug: "ssv-spiaggia-flotta", label: "Le coste", span: "col-span-2" },
  { slug: "grotta-mineraria", label: "I percorsi" },
  { slug: "4x4-crinale", label: "I crinali" },
];

const images = items
  .map((it) => {
    const f = fotoProps(it.slug);
    return f ? { ...f, label: it.label, span: it.span || "" } : null;
  })
  .filter(Boolean);

export default function Gallery() {
  const [selectedIndex, setSelectedIndex] = useState(null);

  return (
    <section id="gallery" className="bg-[var(--obsidian)] topo-dark py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="mb-14 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <SectionHeading eyebrow="Gallery" title="L'avventura" accent="in immagini" className="mb-0" />
          <p className="max-w-md font-body text-base leading-relaxed text-[var(--granite-mist)]/60">
            Fotografie scattate durante i nostri tour. Nessuna posa, nessuno stock:
            solo la Sardegna come la trovi tu.
          </p>
        </div>

        <ul className="grid auto-rows-[150px] grid-cols-2 gap-2 lg:auto-rows-[220px] lg:grid-cols-4">
          {images.map((img, i) => (
            <li key={img.slug} className={img.span}>
              <button
                type="button"
                onClick={() => setSelectedIndex(i)}
                className="group relative block h-full w-full overflow-hidden"
                aria-label={`Apri la foto: ${img.alt}`}
              >
                <img
                  src={img.src}
                  srcSet={img.srcSet}
                  sizes="(min-width: 1024px) 25vw, 50vw"
                  alt={img.alt}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover grayscale-[30%] transition-all duration-500 group-hover:scale-105 group-hover:grayscale-0"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--obsidian)]/80 via-transparent to-transparent opacity-60 transition-opacity group-hover:opacity-90" />
                <span className="absolute bottom-4 left-4 z-10 font-button text-xs uppercase tracking-[0.2em] text-[var(--granite-mist)]">
                  {img.label}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <GalleryLightbox
        image={selectedIndex !== null ? images[selectedIndex] : null}
        onClose={() => setSelectedIndex(null)}
        onNext={() => setSelectedIndex((i) => (i + 1) % images.length)}
        onPrev={() => setSelectedIndex((i) => (i - 1 + images.length) % images.length)}
      />
    </section>
  );
}
