import React from "react";
import { fotoProps } from "@/data/foto-helpers";

/**
 * Nastro fotografico a scorrimento infinito: foto reali in bianco e nero
 * che tornano a colori al passaggio del mouse. Stesso linguaggio visivo del
 * nastro nel footer (vedi Footer.jsx), riutilizzato per le pagine categoria.
 */
export default function PhotoRibbon({ slugs, className = "h-40 w-60 sm:h-52 sm:w-80" }) {
  const photos = (slugs || []).map(fotoProps).filter(Boolean);
  if (photos.length === 0) return null;

  return (
    <div className="overflow-hidden">
      <div className="flex gap-2 animate-[scroll_36s_linear_infinite] hover:[animation-play-state:paused] motion-reduce:animate-none">
        {[...photos, ...photos].map((photo, i) => (
          <img
            key={`${photo.slug}-${i}`}
            src={photo.src}
            srcSet={photo.srcSet}
            sizes="320px"
            alt={i < photos.length ? photo.alt : ""}
            aria-hidden={i >= photos.length ? true : undefined}
            loading="lazy"
            decoding="async"
            className={`flex-shrink-0 object-cover grayscale transition-all hover:grayscale-0 ${className}`}
          />
        ))}
      </div>
    </div>
  );
}
