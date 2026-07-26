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
    <div className="w-full max-w-full overflow-x-clip">
      <div className="flex w-max animate-[scroll_36s_linear_infinite] hover:[animation-play-state:paused] motion-reduce:animate-none">
        {[0, 1].map((copy) => (
          <div
            key={copy}
            className="flex shrink-0 gap-2 pr-2"
            aria-hidden={copy === 1 ? true : undefined}
          >
            {photos.map((photo) => (
              <img
                key={`${photo.slug}-${copy}`}
                src={photo.src}
                srcSet={photo.srcSet}
                sizes="320px"
                alt={copy === 0 ? photo.alt : ""}
                width={640}
                height={Math.round(640 / photo.aspect)}
                loading="lazy"
                decoding="async"
                className={`flex-shrink-0 object-cover grayscale transition-all hover:grayscale-0 ${className}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
