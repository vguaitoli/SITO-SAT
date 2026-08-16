/**
 * Proiezione cartografica della slide mappa.
 *
 * Web Mercator, la stessa proiezione delle mappe web: così la traccia GPX, il
 * profilo costiero e le etichette delle località cadono tutti nel posto giusto
 * gli uni rispetto agli altri.
 *
 * La vista si costruisce dal riquadro geografico del percorso: si calcola la
 * scala che lo fa entrare nel formato con un margine, poi si applicano zoom,
 * spostamento del centro e rotazione decisi dall'utente.
 */

const GRADI = Math.PI / 180;

/** Coordinate Web Mercator normalizzate: x, y in 0..1, y crescente verso sud. */
export function mercatore(lon, lat) {
  const limite = 85.05112878;
  const l = Math.max(-limite, Math.min(limite, lat));
  const sin = Math.sin(l * GRADI);
  return {
    x: (lon + 180) / 360,
    y: 0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI),
  };
}

/** Inversa di {@link mercatore}. */
export function daMercatore(x, y) {
  const lon = x * 360 - 180;
  const n = Math.PI * (1 - 2 * y);
  const lat = (Math.atan(Math.sinh(n)) * 180) / Math.PI;
  return { lon, lat };
}

/**
 * Costruisce la funzione di proiezione per una slide.
 *
 * @param {object} opzioni
 * @param {{minLon,maxLon,minLat,maxLat}} opzioni.riquadro  area da inquadrare
 * @param {number} opzioni.larghezza   larghezza del disegno in px
 * @param {number} opzioni.altezza     altezza del disegno in px
 * @param {number} [opzioni.margine]   frazione di bordo libero (0.12 = 12%)
 * @param {number} [opzioni.zoom]      moltiplicatore, 1 = adatta al riquadro
 * @param {{x:number,y:number}} [opzioni.spostamento]  in frazioni di larghezza
 * @param {number} [opzioni.rotazione] gradi, orario
 */
export function creaVista({
  riquadro,
  larghezza,
  altezza,
  margine = 0.12,
  zoom = 1,
  spostamento = { x: 0, y: 0 },
  rotazione = 0,
}) {
  const a = mercatore(riquadro.minLon, riquadro.maxLat);
  const b = mercatore(riquadro.maxLon, riquadro.minLat);
  const larghezzaMondo = Math.max(b.x - a.x, 1e-9);
  const altezzaMondo = Math.max(b.y - a.y, 1e-9);

  // La rotazione allarga l'ingombro: si tiene conto del riquadro ruotato,
  // altrimenti ruotando la traccia uscirebbe dai bordi.
  const r = Math.abs(rotazione % 180) * GRADI;
  const cos = Math.abs(Math.cos(r));
  const sin = Math.abs(Math.sin(r));
  const ingombroX = larghezzaMondo * cos + altezzaMondo * sin;
  const ingombroY = larghezzaMondo * sin + altezzaMondo * cos;

  const utileX = larghezza * (1 - margine * 2);
  const utileY = altezza * (1 - margine * 2);
  const scala = Math.min(utileX / ingombroX, utileY / ingombroY) * zoom;

  const centroMondo = {
    x: (a.x + b.x) / 2 + spostamento.x * (larghezza / scala),
    y: (a.y + b.y) / 2 + spostamento.y * (altezza / scala),
  };

  const cx = larghezza / 2;
  const cy = altezza / 2;
  const rot = rotazione * GRADI;
  const cosR = Math.cos(rot);
  const sinR = Math.sin(rot);

  const proietta = (lon, lat) => {
    const m = mercatore(lon, lat);
    const dx = (m.x - centroMondo.x) * scala;
    const dy = (m.y - centroMondo.y) * scala;
    return [cx + dx * cosR - dy * sinR, cy + dx * sinR + dy * cosR];
  };

  /** Metri per pixel al centro della vista: serve per la barra di scala. */
  const metriPerPixel = () => {
    const { lat } = daMercatore(centroMondo.x, centroMondo.y);
    const circonferenza = 40075016.686 * Math.cos(lat * GRADI);
    return circonferenza / (scala * 1);
  };

  return { proietta, scala, centroMondo, metriPerPixel, larghezza, altezza };
}

/** Unisce più riquadri in uno solo. */
export function unisciRiquadri(elenco) {
  const validi = elenco.filter(Boolean);
  if (!validi.length) return null;
  return validi.reduce((acc, r) => ({
    minLon: Math.min(acc.minLon, r.minLon),
    maxLon: Math.max(acc.maxLon, r.maxLon),
    minLat: Math.min(acc.minLat, r.minLat),
    maxLat: Math.max(acc.maxLat, r.maxLat),
  }));
}

/** Allarga un riquadro degenere (percorso cortissimo o punto singolo). */
export function riquadroMinimo(r, gradiMinimi = 0.05) {
  if (!r) return null;
  const dLon = r.maxLon - r.minLon;
  const dLat = r.maxLat - r.minLat;
  const cx = (r.minLon + r.maxLon) / 2;
  const cy = (r.minLat + r.maxLat) / 2;
  const w = Math.max(dLon, gradiMinimi) / 2;
  const h = Math.max(dLat, gradiMinimi) / 2;
  return { minLon: cx - w, maxLon: cx + w, minLat: cy - h, maxLat: cy + h };
}

/** Costruisce l'attributo `d` di un path SVG da punti già proiettati. */
export function tracciaPath(puntiProiettati) {
  if (!puntiProiettati.length) return "";
  return puntiProiettati
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(" ");
}
