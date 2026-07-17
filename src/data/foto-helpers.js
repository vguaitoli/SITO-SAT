/**
 * Accesso alle fotografie reali generate da scripts/build-media.mjs.
 * Il manifest (src/data/foto.js) è generato: qui aggiungiamo solo helper
 * per selezionarle e per costruire src/srcset responsive.
 */
import { FOTO } from "@/data/foto";

const BASE = "/media/reali";
const byslug = new Map(FOTO.map((f) => [f.slug, f]));

/** Ritorna la voce del manifest per uno slug, o null se assente. */
export function foto(slug) {
  return byslug.get(slug) || null;
}

/** Tutte le foto di una categoria (maxienduro, enduro, quad, ssv, 4x4, generale). */
export function fotoDiCategoria(cat) {
  return FOTO.filter((f) => f.cat === cat);
}

/**
 * Props pronte per <img>/<Photo>: src di fallback, srcSet e aspect ratio.
 * `slug` può essere una stringa o già una voce del manifest.
 */
export function fotoProps(slug) {
  const f = typeof slug === "string" ? foto(slug) : slug;
  if (!f) return null;
  const widths = f.widths;
  const srcSet = widths.map((w) => `${BASE}/${f.slug}-${w}.webp ${w}w`).join(", ");
  const fallback = `${BASE}/${f.slug}-${widths[widths.length - 1]}.webp`;
  return { src: fallback, srcSet, alt: f.alt, aspect: f.aspect, slug: f.slug };
}
