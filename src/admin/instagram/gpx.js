/**
 * Lettura dei file GPX e calcolo delle metriche del percorso.
 *
 * Parser scritto in casa: il formato che ci serve è piccolo e ben definito, e
 * DOMParser è già nel browser. Nessuna dipendenza aggiuntiva.
 *
 * Regola non negoziabile: la geometria restituita è quella dei punti presenti
 * nel file. Non si ricostruisce, non si interpola, non si "raddrizza" nulla.
 * La semplificazione esiste solo per il disegno ed è sempre derivata, mai
 * sostitutiva: i punti originali restano in `segmenti`.
 */

const NS = "http://www.topografix.com/GPX/1/1";

/** Legge i figli con un dato nome locale, indipendentemente dal namespace. */
function figli(nodo, nome) {
  const conNs = nodo.getElementsByTagNameNS(NS, nome);
  if (conNs.length) return Array.from(conNs);
  return Array.from(nodo.getElementsByTagName(nome));
}

function leggiPunto(el) {
  const lat = Number.parseFloat(el.getAttribute("lat"));
  const lon = Number.parseFloat(el.getAttribute("lon"));
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const ele = figli(el, "ele")[0];
  const quota = ele ? Number.parseFloat(ele.textContent) : null;
  const time = figli(el, "time")[0];
  return {
    lon,
    lat,
    quota: Number.isFinite(quota) ? quota : null,
    tempo: time ? time.textContent.trim() : null,
  };
}

/**
 * Analizza un file GPX.
 *
 * @param {string} testo   contenuto del file
 * @param {string} [nome]  nome del file, usato come etichetta di ripiego
 * @returns {{
 *   nome: string,
 *   segmenti: {lon:number,lat:number,quota:number|null}[][],
 *   waypoint: {lon:number,lat:number,nome:string}[],
 *   origine: "traccia"|"rotta"|"nessuna",
 *   metriche: object
 * }}
 */
export function analizzaGpx(testo, nome = "percorso.gpx") {
  const doc = new DOMParser().parseFromString(testo, "application/xml");
  const errore = doc.querySelector("parsererror");
  if (errore) throw new Error("Il file non è un GPX valido (XML malformato).");
  if (!doc.documentElement || doc.documentElement.nodeName.toLowerCase() !== "gpx") {
    throw new Error("Il file non è un GPX: manca l'elemento radice <gpx>.");
  }

  const segmenti = [];
  let origine = "nessuna";

  // 1) Percorso principale: trk > trkseg > trkpt. I segmenti restano distinti.
  for (const trk of figli(doc.documentElement, "trk")) {
    for (const seg of figli(trk, "trkseg")) {
      const punti = figli(seg, "trkpt").map(leggiPunto).filter(Boolean);
      if (punti.length > 1) segmenti.push(punti);
    }
  }
  if (segmenti.length) origine = "traccia";

  // 2) Solo se non ci sono tracce si ripiega sulle rotte (rte > rtept).
  if (!segmenti.length) {
    for (const rte of figli(doc.documentElement, "rte")) {
      const punti = figli(rte, "rtept").map(leggiPunto).filter(Boolean);
      if (punti.length > 1) segmenti.push(punti);
    }
    if (segmenti.length) origine = "rotta";
  }

  // 3) I waypoint non entrano mai nella geometria: sono solo etichette.
  const waypoint = figli(doc.documentElement, "wpt")
    .map((el) => {
      const p = leggiPunto(el);
      if (!p) return null;
      const n = figli(el, "name")[0];
      return { lon: p.lon, lat: p.lat, nome: n ? n.textContent.trim() : "" };
    })
    .filter(Boolean);

  const nomeTraccia =
    figli(doc.documentElement, "trk")[0] &&
    figli(figli(doc.documentElement, "trk")[0], "name")[0]?.textContent?.trim();

  return {
    nome: nomeTraccia || nome.replace(/\.gpx$/i, ""),
    segmenti,
    waypoint,
    origine,
    metriche: calcolaMetriche(segmenti),
  };
}

const RAGGIO_TERRA = 6371008.8;
const rad = (g) => (g * Math.PI) / 180;

/** Distanza in metri fra due punti geografici (haversine). */
export function distanzaFra(a, b) {
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const s =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * RAGGIO_TERRA * Math.asin(Math.sqrt(s));
}

/**
 * Metriche del percorso.
 *
 * Il dislivello usa una soglia di 3 m fra un punto e il successivo: senza,
 * il rumore del GPS gonfia il totale anche di parecchie centinaia di metri.
 */
export function calcolaMetriche(segmenti, sogliaQuota = 3) {
  let metri = 0;
  let salita = 0;
  let discesa = 0;
  let quotaMin = Infinity;
  let quotaMax = -Infinity;
  let punti = 0;
  let conQuota = 0;

  for (const seg of segmenti) {
    let riferimento = null;
    for (let i = 0; i < seg.length; i += 1) {
      const p = seg[i];
      punti += 1;
      if (i > 0) metri += distanzaFra(seg[i - 1], p);
      if (p.quota === null) continue;
      conQuota += 1;
      if (p.quota < quotaMin) quotaMin = p.quota;
      if (p.quota > quotaMax) quotaMax = p.quota;
      if (riferimento === null) {
        riferimento = p.quota;
        continue;
      }
      const delta = p.quota - riferimento;
      if (Math.abs(delta) >= sogliaQuota) {
        if (delta > 0) salita += delta;
        else discesa -= delta;
        riferimento = p.quota;
      }
    }
  }

  return {
    punti,
    segmenti: segmenti.length,
    distanzaKm: metri / 1000,
    dislivelloPositivo: conQuota ? Math.round(salita) : null,
    dislivelloNegativo: conQuota ? Math.round(discesa) : null,
    quotaMin: Number.isFinite(quotaMin) ? Math.round(quotaMin) : null,
    quotaMax: Number.isFinite(quotaMax) ? Math.round(quotaMax) : null,
    conQuota: conQuota > 0,
  };
}

/** Riquadro geografico che contiene tutti i segmenti. */
export function riquadro(segmenti) {
  let minLon = Infinity;
  let maxLon = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;
  for (const seg of segmenti) {
    for (const p of seg) {
      if (p.lon < minLon) minLon = p.lon;
      if (p.lon > maxLon) maxLon = p.lon;
      if (p.lat < minLat) minLat = p.lat;
      if (p.lat > maxLat) maxLat = p.lat;
    }
  }
  if (!Number.isFinite(minLon)) return null;
  return { minLon, maxLon, minLat, maxLat };
}

/**
 * Semplificazione Douglas-Peucker per il solo disegno.
 *
 * @param {object[]} punti      punti originali
 * @param {number} tolleranza   in gradi (0.0001° ≈ 11 m)
 */
export function semplificaPerDisegno(punti, tolleranza) {
  if (punti.length < 3 || tolleranza <= 0) return punti;
  const fattore = Math.cos(rad(punti[0].lat));
  const dist = (p, a, b) => {
    const px = p.lon * fattore;
    const py = p.lat;
    const ax = a.lon * fattore;
    const ay = a.lat;
    const bx = b.lon * fattore;
    const by = b.lat;
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    if (len2 === 0) return Math.hypot(px - ax, py - ay);
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
    return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
  };

  // Iterativo: una traccia GPX può avere decine di migliaia di punti e la
  // versione ricorsiva manderebbe in overflow lo stack.
  const tieni = new Uint8Array(punti.length);
  tieni[0] = 1;
  tieni[punti.length - 1] = 1;
  const pila = [[0, punti.length - 1]];
  while (pila.length) {
    const [inizio, fine] = pila.pop();
    let max = 0;
    let indice = -1;
    for (let i = inizio + 1; i < fine; i += 1) {
      const d = dist(punti[i], punti[inizio], punti[fine]);
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
