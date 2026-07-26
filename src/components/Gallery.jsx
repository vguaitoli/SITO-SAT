import React, { useState } from "react";
import GalleryLightbox from "@/components/GalleryLightbox";
import SectionHeading from "@/components/SectionHeading";
import { fotoProps } from "@/data/foto-helpers";

/**
 * Galleria editoriale: alterna mezzi, persone, percorsi, paesaggi e momenti
 * dell'esperienza. Tutte le foto sono reali (manifest src/data/foto.js).
 */
const items = [
  { slug: "hero-maxienduro-panorama", span: "col-span-2 row-span-2" },
  { slug: "hero-ssv-guado" },
  { slug: "4x4-guado" },
  { slug: "hero-quad-convoglio" },
  { slug: "enduro-vetta" },
  { slug: "pranzo-tavolata", span: "col-span-2" },
  { slug: "pinnetta-sosta" },
  { slug: "guida-sentiero" },
  { slug: "ssv-spiaggia-flotta", span: "col-span-2" },
  { slug: "grotta-mineraria" },
  { slug: "4x4-crinale" },
];

const images = items
  .map((it) => {
    const f = fotoProps(it.slug);
    return f ? { ...f, span: it.span || "" } : null;
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
                  width={1200}
                  height={Math.round(1200 / img.aspect)}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover grayscale-[30%] transition-all duration-500 group-hover:scale-105 group-hover:grayscale-0"
                />
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
