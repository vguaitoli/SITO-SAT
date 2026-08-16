/**
 * Prepara la base cartografica per la mappa del carosello Instagram.
 *
 * Produce src/data/mappa-sardegna.json con:
 *   - il profilo costiero reale dell'isola (confine OSM, semplificato);
 *   - le isole minori principali;
 *   - le curve di livello del rilievo stilizzato.
 *
 * Il calcolo è deterministico e costoso (~1 s), quindi si fa qui una volta
 * sola invece che nel browser a ogni apertura dell'editor.
 *
 * Uso:  node --stack-size=8000 scripts/build-mappa-instagram.mjs
 */
import fs from "node:fs/promises";
import path from "node:path";
import { curveDiLivello, SOGLIE } from "../src/lib/rilievo-sardegna.js";

const root = process.cwd();
const geojsonPath = path.join(root, "public/media/maps/sardegna-osm.geojson");
const outPath = path.join(root, "src/data/mappa-sardegna.json");

const geojson = JSON.parse(await fs.readFile(geojsonPath, "utf8"));
const feature = geojson.features?.[0];
if (feature?.geometry?.type !== "MultiPolygon") {
  throw new Error("Il GeoJSON OSM non contiene il MultiPolygon atteso per la Sardegna.");
}

const FATTORE_LON = Math.cos((40.05 * Math.PI) / 180);

const area = (anello) => {
  let a = 0;
  for (let i = 0; i < anello.length - 1; i += 1) {
    const [xa, ya] = anello[i];
    const [xb, yb] = anello[i + 1];
    a += xa * FATTORE_LON * yb - xb * FATTORE_LON * ya;
  }
  return Math.abs(a / 2);
};

/** Douglas-Peucker su coordinate geografiche. */
function distanza(p, a, b) {
  const px = p[0] * FATTORE_LON;
  const py = p[1];
  const ax = a[0] * FATTORE_LON;
  const ay = a[1];
  const bx = b[0] * FATTORE_LON;
  const by = b[1];
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(px - ax, py - ay);
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function semplifica(punti, tolleranza) {
  if (punti.length < 3) return punti;
  let max = 0;
  let indice = 0;
  for (let i = 1; i < punti.length - 1; i += 1) {
    const d = distanza(punti[i], punti[0], punti.at(-1));
    if (d > max) {
      max = d;
      indice = i;
    }
  }
  if (max <= tolleranza) return [punti[0], punti.at(-1)];
  return [
    ...semplifica(punti.slice(0, indice + 1), tolleranza).slice(0, -1),
    ...semplifica(punti.slice(indice), tolleranza),
  ];
}

const arrotonda = (anello) => anello.map(([lon, lat]) => [+lon.toFixed(4), +lat.toFixed(4)]);

// Poligoni ordinati per area: il primo è l'isola madre, gli altri sono isole
// minori (Asinara, Sant'Antioco, San Pietro, La Maddalena, Caprera...).
const poligoni = feature.geometry.coordinates
  .map((p) => ({ anello: p[0], area: area(p[0]) }))
  .sort((a, b) => b.area - a.area);

// ~0.0016° ≈ 180 m: il profilo resta riconoscibile anche zoomando su una tappa.
const TOLLERANZA_COSTA = 0.0016;
const costa = arrotonda(semplifica(poligoni[0].anello, TOLLERANZA_COSTA));

const AREA_MINIMA = 0.0006; // gradi², scarta scogli e isolotti
const isolette = poligoni
  .slice(1)
  .filter((p) => p.area >= AREA_MINIMA)
  .map((p) => arrotonda(semplifica(p.anello, TOLLERANZA_COSTA * 1.5)));

console.log(
  `costa: ${poligoni[0].anello.length} → ${costa.length} punti · ` +
    `isole minori: ${isolette.length}`,
);

const t0 = Date.now();
const curve = curveDiLivello(costa).map((l) => ({
  soglia: l.soglia,
  anelli: l.anelli.map(arrotonda),
}));

const dati = {
  _nota:
    "Generato da scripts/build-mappa-instagram.mjs. Profilo costiero reale (OSM); " +
    "curve di livello da rilievo stilizzato, non da un modello altimetrico.",
  licenza: geojson.licence || "Data © OpenStreetMap contributors, ODbL 1.0",
  soglie: SOGLIE,
  costa,
  isolette,
  curve,
};

await fs.mkdir(path.dirname(outPath), { recursive: true });
await fs.writeFile(outPath, `${JSON.stringify(dati)}\n`);

const anelli = curve.reduce((s, c) => s + c.anelli.length, 0);
const punti = curve.reduce((s, c) => s + c.anelli.reduce((a, b) => a + b.length, 0), 0);
console.log(
  `curve: ${curve.length} livelli, ${anelli} anelli, ${punti} punti · ${Date.now() - t0} ms`,
);
console.log(`scritto ${path.relative(root, outPath)} · ${(JSON.stringify(dati).length / 1024).toFixed(1)} KB`);
