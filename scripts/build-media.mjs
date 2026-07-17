/**
 * Genera le immagini web del sito a partire dalle fotografie reali originali.
 *
 * Le originali NON vengono mai modificate: vivono fuori dal repo (SOURCE_DIR)
 * e questo script produce solo copie ridimensionate in public/media/reali/.
 *
 * Uso:  node scripts/build-media.mjs
 *
 * Ogni voce di PHOTOS mappa un file originale su uno slug del sito. La categoria
 * indica il mezzo riconoscibile nello scatto: viene assegnata solo quando il
 * mezzo è identificabile con certezza, altrimenti la foto resta "generale".
 */
import { mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import sharp from "sharp";

const SOURCE_DIR = "/Users/vittorioguaitoli/Desktop/FOTO SARDA SITO 2 - WEB";
const OUT_DIR = path.resolve("public/media/reali");

// Larghezze generate per ogni foto: alimentano srcset/sizes lato componente.
const WIDTHS = [480, 768, 1200, 1800];

const PHOTOS = [
  // ---- Hero: una foto per categoria, per rappresentare tutto il brand ----
  { src: "IMG_1646.webp", slug: "hero-maxienduro-panorama", cat: "maxienduro",
    alt: "Due maxienduro parcheggiate su uno sterrato panoramico con le montagne sarde sullo sfondo" },
  { src: "20260329_174144.webp", slug: "hero-enduro-gruppo", cat: "enduro",
    alt: "Moto da enduro e rider su un sentiero fiorito tra le montagne della Sardegna" },
  { src: "WhatsApp Image 2026-07-13 at 15.26.50.webp", slug: "hero-quad-convoglio", cat: "quad",
    alt: "Convoglio di quad su una pista sterrata immersa nella macchia mediterranea" },
  { src: "WhatsApp Image 2026-07-13 at 15.27.00 (1).webp", slug: "hero-ssv-guado", cat: "ssv",
    alt: "SSV che attraversa un torrente sollevando spruzzi d'acqua" },
  { src: "WhatsApp Image 2026-07-13 at 14.54.47 (4).webp", slug: "hero-4x4-costa", cat: "4x4",
    alt: "Fuoristrada 4x4 su una pista in quota con il mare della Sardegna sullo sfondo" },

  // ---- Card categorie ----
  { src: "06dd726c-e61d-4709-b7e9-791be0da9eba.webp", slug: "cat-maxienduro", cat: "maxienduro",
    alt: "Gruppo di maxienduro da viaggio parcheggiate in una pineta sarda" },
  { src: "5dfd4b0a-fd1e-4dbf-87cd-0e43c7ce7374.webp", slug: "cat-enduro", cat: "enduro",
    alt: "Rider in sosta con le moto da enduro su un crinale panoramico" },
  { src: "WhatsApp Image 2026-07-13 at 15.26.52.webp", slug: "cat-quad", cat: "quad",
    alt: "Quad in marcia su una pista sterrata accanto a pale eoliche" },
  { src: "WhatsApp Image 2026-07-13 at 15.26.51 (1).webp", slug: "cat-ssv", cat: "ssv",
    alt: "SSV su una pista sterrata tra campi dorati" },
  { src: "WhatsApp Image 2026-07-13 at 15.27.02 (1).webp", slug: "cat-4x4", cat: "4x4",
    alt: "Fuoristrada 4x4 impegnato in una salita ripida fuori strada" },

  // ---- Tour / esperienza ----
  { src: "20260327_121307.webp", slug: "maxienduro-tenere", cat: "maxienduro",
    alt: "Maxienduro da viaggio parcheggiata su uno sterrato sotto il cielo sardo" },
  { src: "957d1997-3b5e-4668-afd7-603bafb88d6b.webp", slug: "maxienduro-sosta-bosco", cat: "maxienduro",
    alt: "Rider in sosta con le maxienduro lungo un sentiero nel bosco" },
  { src: "PHOTO-2024-05-01-19-53-23.webp", slug: "gruppo-altopiano", cat: "generale",
    alt: "Gruppo di rider in sosta con le moto su un altopiano verde della Sardegna" },
  { src: "PHOTO-2023-10-05-14-38-00.webp", slug: "enduro-sentiero", cat: "enduro",
    alt: "Rider su moto da enduro lungo un sentiero sterrato tra le montagne" },
  { src: "PHOTO-2024-05-01-16-24-40.webp", slug: "enduro-vetta", cat: "enduro",
    alt: "Rider esulta accanto alla moto da enduro in cima a un percorso panoramico" },
  { src: "WhatsApp Image 2026-07-13 at 15.26.54 (1).webp", slug: "quad-pietraia", cat: "quad",
    alt: "Quad affronta un tratto roccioso in salita in un bosco" },
  { src: "WhatsApp Image 2026-07-13 at 15.26.55.webp", slug: "ssv-roccia", cat: "ssv",
    alt: "SSV in azione su un tratto roccioso impegnativo" },
  { src: "WhatsApp Image 2026-07-13 at 15.26.57.webp", slug: "ssv-bandiera", cat: "ssv",
    alt: "SSV con la bandiera dei quattro mori su un altopiano panoramico" },
  { src: "WhatsApp Image 2026-07-13 at 14.54.49 (1).webp", slug: "4x4-guado", cat: "4x4",
    alt: "Fuoristrada 4x4 durante il guado di un fiume in Sardegna" },
  { src: "WhatsApp Image 2026-07-13 at 14.54.52 (2).webp", slug: "4x4-crinale", cat: "4x4",
    alt: "Fuoristrada 4x4 attrezzato su una pista di crinale tra le montagne sarde" },
  { src: "WhatsApp Image 2026-07-13 at 14.54.48 (2).webp", slug: "4x4-borgo-pietra", cat: "4x4",
    alt: "Fuoristrada 4x4 in sosta accanto a una costruzione in pietra dell'entroterra" },

  // ---- Territorio, persone, momenti ----
  { src: "a1b2fc53-8095-46a5-88bd-185ba5884971.webp", slug: "pinnetta-sosta", cat: "generale",
    alt: "Sosta del gruppo accanto alle pinnette, le capanne tradizionali dei pastori sardi" },
  { src: "IMG_5662.webp", slug: "pranzo-tavolata", cat: "generale",
    alt: "Tavolata con prodotti tipici sardi durante la sosta pranzo del tour" },
  { src: "6ccc8821-4d64-4b5b-9770-c8528fe37108.webp", slug: "pranzo-agriturismo", cat: "generale",
    alt: "Il gruppo a tavola in un agriturismo dell'entroterra sardo" },
  { src: "PHOTO-2024-05-07-16-20-01.webp", slug: "guida-sentiero", cat: "generale",
    alt: "Guida di Sardegna Trail Avventura lungo un sentiero roccioso" },
  { src: "WhatsApp Image 2026-07-13 at 15.27.03 (1).webp", slug: "grotta-mineraria", cat: "generale",
    alt: "Ingresso di una vecchia cava scavata nella roccia lungo il percorso" },
  { src: "WhatsApp Image 2026-07-13 at 15.27.05 (2).webp", slug: "moto-costa", cat: "generale",
    alt: "Rider in sosta con la moto lungo un tratto costiero sterrato" },
  { src: "hero-trail-nuova.webp", slug: "ssv-spiaggia-flotta", cat: "ssv",
    alt: "Flotta di SSV schierata su una spiaggia sarda al termine di un tour" },
  { src: "chi-siamo-gruppo-spiaggia.webp", slug: "chi-siamo-gruppo", cat: "enduro",
    alt: "Gruppo di rider enduro schierati con le moto lungo la costa sarda, mani alzate al saluto" },
];

async function main() {
  const available = new Set(await readdir(SOURCE_DIR));
  const missing = PHOTOS.filter((p) => !available.has(p.src));
  if (missing.length) {
    console.error("Originali non trovate:\n" + missing.map((m) => "  - " + m.src).join("\n"));
    process.exitCode = 1;
    return;
  }

  await mkdir(OUT_DIR, { recursive: true });
  const manifest = [];

  for (const photo of PHOTOS) {
    const input = path.join(SOURCE_DIR, photo.src);
    const image = sharp(input);
    const { width, height } = await image.metadata();

    const variants = [];
    for (const w of WIDTHS) {
      if (w > width) continue; // mai ingrandire oltre l'originale
      // Per i ritratti evitiamo file enormi limitando anche il lato lungo.
      const h = Math.round(w / (width / height));
      if (h > 1800) continue;
      const file = `${photo.slug}-${w}.webp`;
      await sharp(input)
        .resize({ width: w, withoutEnlargement: true })
        .webp({ quality: w >= 1200 ? 66 : 72, effort: 5 })
        .toFile(path.join(OUT_DIR, file));
      variants.push({ w, file });
    }
    // Garantisce almeno una variante anche per gli originali molto piccoli.
    if (!variants.length) {
      const file = `${photo.slug}-${width}.webp`;
      await sharp(input).webp({ quality: 72, effort: 5 }).toFile(path.join(OUT_DIR, file));
      variants.push({ w: width, file });
    }

    manifest.push({
      slug: photo.slug,
      cat: photo.cat,
      alt: photo.alt,
      aspect: +(width / height).toFixed(4),
      widths: variants.map((v) => v.w),
      source: photo.src,
    });
    console.log(`${photo.slug.padEnd(26)} ${width}x${height} -> ${variants.map((v) => v.w).join(", ")}`);
  }

  const header =
    "// GENERATO da scripts/build-media.mjs — non modificare a mano.\n" +
    "// Fonte: fotografie reali originali (fuori dal repo), mai alterate.\n\n";
  await writeFile(
    path.resolve("src/data/foto.js"),
    header + "export const FOTO = " + JSON.stringify(manifest, null, 2) + ";\n",
  );
  console.log(`\n${manifest.length} foto generate in public/media/reali/`);
}

main();
