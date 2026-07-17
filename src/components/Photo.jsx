import React from "react";
import { fotoProps } from "@/data/foto-helpers";
import { cn } from "@/lib/utils";

/**
 * Immagine reale responsive con prevenzione del layout shift.
 *
 * - `slug`   : slug della foto nel manifest (src/data/foto.js)
 * - `sizes`  : attributo sizes per lo srcset (default: piena larghezza)
 * - `priority`: true per le immagini above-the-fold (eager + fetchpriority alto)
 * - `ratio`  : forza un aspect-ratio (es. "16/9"); default = ratio reale della foto
 *
 * Il wrapper mantiene l'aspect-ratio così il box occupa spazio prima del load.
 */
export default function Photo({
  slug,
  className = "",
  imgClassName = "",
  sizes = "100vw",
  priority = false,
  ratio,
  overlay = false,
  ...rest
}) {
  const props = fotoProps(slug);
  if (!props) {
    if (import.meta.env.DEV) console.warn(`Photo: slug non trovato "${slug}"`);
    return null;
  }

  const style = ratio
    ? { aspectRatio: ratio.replace("/", " / ") }
    : { aspectRatio: `${props.aspect}` };

  return (
    <div className={cn("relative overflow-hidden", className)} style={style}>
      <img
        src={props.src}
        srcSet={props.srcSet}
        sizes={sizes}
        alt={props.alt}
        width={1600}
        height={Math.round(1600 / props.aspect)}
        loading={priority ? "eager" : "lazy"}
        decoding={priority ? "auto" : "async"}
        fetchpriority={priority ? "high" : "auto"}
        className={cn("h-full w-full object-cover", imgClassName)}
        {...rest}
      />
      {overlay && (
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#1C1814]/80 via-[#1C1814]/10 to-transparent" />
      )}
    </div>
  );
}
