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

/**
 * Semplifica una polilinea **già proiettata**, con tolleranza in pixel.
 *
 * Douglas–Peucker sui punti dello schermo, non su latitudine e longitudine. La
 * differenza non è di comodità: è l'unica forma in cui la garanzia si possa
 * enunciare e verificare. «Errore massimo mezzo pixel sul canvas» è una frase
 * che ha senso solo in pixel — in gradi dipenderebbe dalla latitudine, dalla
 * non linearità di Mercatore in y, dalla scala, dallo zoom, dalla rotazione e
 * dalla misura della tela, e cambierebbe a ogni formato.
 *
 * Il difetto che questo sostituisce era proprio lì. Convertire mezzo pixel in
 * una distanza geografica divideva per 360 una seconda volta: `mercatore`
 * normalizza già la longitudine con `(lon + 180) / 360`, quindi `scala` è in
 * pixel per unità di mondo e `0.5 / scala` **è già** mezzo pixel. La tolleranza
 * risultava 360 volte più piccola del dovuto e non toglieva quasi nulla: non
 * era una semplificazione, era un arrotondamento, e la cattura si trovava a
 * ridisegnare una polilinea con tutti i vertici della traccia per ogni grafica
 * con la mappa.
 *
 * Iterativo, non ricorsivo: una traccia GPX può avere decine di migliaia di
 * punti e la versione ricorsiva manderebbe in overflow lo stack.
 *
 * @param {[number, number][]} punti  punti proiettati, in pixel
 * @param {number} tolleranza         errore massimo ammesso, in pixel
 * @returns {[number, number][]}  sottoinsieme dei punti dati, nell'ordine
 */
export function semplificaProiettato(punti, tolleranza) {
  if (punti.length < 3 || !(tolleranza > 0)) return punti;

  const distanza = (p, a, b) => {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len2 = dx * dx + dy * dy;
    if (len2 === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
    const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2));
    return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
  };

  // Primo e ultimo punto non si toccano mai: un anello chiuso resta chiuso.
  const tieni = new Uint8Array(punti.length);
  tieni[0] = 1;
  tieni[punti.length - 1] = 1;
  const pila = [[0, punti.length - 1]];
  while (pila.length) {
    const [inizio, fine] = pila.pop();
    let max = 0;
    let indice = -1;
    for (let i = inizio + 1; i < fine; i += 1) {
      const d = distanza(punti[i], punti[inizio], punti[fine]);
      if (d > max) {
        max = d;
        indice = i;
      }
    }
    if (indice !== -1 && max > tolleranza) {
      tieni[indice] = 1;
      pila.push([inizio, indice], [indice, fine]);
    }
  }
  return punti.filter((_, i) => tieni[i]);
}

/**
 * Costruisce l'attributo `d` di un path SVG da punti già proiettati.
 *
 * Le coordinate si scrivono per intero. Sembra formattazione e invece è parte
 * della garanzia: quantizzarle a un decimale spostava ogni vertice fino a
 * 0,05 px per asse, e quello spostamento si sommava all'errore della
 * semplificazione senza essere compreso nella tolleranza. Il limite valeva sui
 * punti calcolati ma non sul path realmente disegnato, che lo superava.
 *
 * `String(numero)` produce la rappresentazione decimale più corta che, riletta,
 * restituisce lo stesso valore: fedeltà esatta e nessuna cifra di troppo. Così
 * il limite di {@link semplificaProiettato} è anche il limite del disegno, senza
 * margini nascosti. Il costo è qualche carattere in più nell'attributo `d`, su
 * una polilinea che la semplificazione ha già ridotto di oltre il 90%.
 */
export function tracciaPath(puntiProiettati) {
  if (!puntiProiettati.length) return "";
  return puntiProiettati.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x} ${y}`).join(" ");
}
