/**
 * Rilievo stilizzato della Sardegna, in curve di livello.
 *
 * Serve alla mappa del carosello Instagram: dà una base topografica leggibile
 * senza dipendere da un fornitore di tile esterno (niente chiavi API, niente
 * estetica Google Maps, colori nostri).
 *
 * Il campo di quote è costruito a mano: regioni collinari larghe e basse che
 * danno il corpo del terreno, massicci che si alzano sopra di esse, pianure
 * sottratte, più un rumore a creste che incide valli e crinali. Posizione e
 * quota dei rilievi sono quelle reali; la forma della singola montagna è
 * stilizzata. NON è un modello altimetrico del terreno e non va presentato
 * come tale: è una base cartografica d'autore.
 *
 * Il profilo costiero, invece, è reale: viene dal confine OSM della Sardegna.
 *
 * Le curve escono in coordinate geografiche [lon, lat], così la mappa può
 * proiettarle a qualsiasi zoom insieme alla traccia GPX.
 */

/** Quote delle curve, in metri. */
export const SOGLIE = [150, 300, 450, 620, 800, 1000, 1220, 1450, 1700];

/** Regioni collinari: il corpo del terreno. `quota` in metri, `raggio` in gradi. */
export const REGIONI = [
  { nome: "Gallura", lat: 40.90, lon: 9.20, quota: 330, raggio: 0.42, raggioMinore: 0.3, angolo: 20 },
  { nome: "Anglona-Logudoro", lat: 40.70, lon: 8.80, quota: 280, raggio: 0.36, raggioMinore: 0.25 },
  { nome: "Meilogu", lat: 40.45, lon: 8.70, quota: 300, raggio: 0.27, raggioMinore: 0.22 },
  { nome: "Montiferru-Planargia", lat: 40.20, lon: 8.65, quota: 320, raggio: 0.22, raggioMinore: 0.2 },
  { nome: "Barbagia-Mandrolisai", lat: 40.05, lon: 9.25, quota: 620, raggio: 0.46, raggioMinore: 0.38, angolo: 70 },
  { nome: "Ogliastra", lat: 39.90, lon: 9.55, quota: 420, raggio: 0.27, raggioMinore: 0.21, angolo: 80 },
  { nome: "Sarcidano-Trexenta", lat: 39.70, lon: 9.10, quota: 340, raggio: 0.29, raggioMinore: 0.22, angolo: 50 },
  { nome: "Sarrabus", lat: 39.35, lon: 9.40, quota: 400, raggio: 0.25, raggioMinore: 0.19, angolo: 30 },
  { nome: "Iglesiente", lat: 39.40, lon: 8.60, quota: 420, raggio: 0.25, raggioMinore: 0.2, angolo: 85 },
  { nome: "Sulcis", lat: 39.10, lon: 8.75, quota: 360, raggio: 0.22, raggioMinore: 0.19, angolo: 50 },
];

/** Massicci: quanto si alzano SOPRA la collina che li circonda. */
export const MASSICCI = [
  { nome: "Gennargentu", lat: 39.9928, lon: 9.3117, quota: 1150, raggio: 0.2, raggioMinore: 0.15, angolo: 75 },
  { nome: "Bruncu Spina", lat: 40.0250, lon: 9.3300, quota: 1000, raggio: 0.12, raggioMinore: 0.09, angolo: 65 },
  { nome: "Supramonte", lat: 40.1500, lon: 9.5000, quota: 800, raggio: 0.17, raggioMinore: 0.11, angolo: 80 },
  { nome: "Monte Corrasi", lat: 40.2600, lon: 9.4000, quota: 780, raggio: 0.09, raggioMinore: 0.06, angolo: 55 },
  { nome: "Altopiano del Golgo", lat: 40.1136, lon: 9.6822, quota: 420, raggio: 0.1, raggioMinore: 0.065, angolo: 80 },
  { nome: "Limbara", lat: 40.8503, lon: 9.1669, quota: 1000, raggio: 0.12, raggioMinore: 0.085, angolo: 10 },
  { nome: "Monte Albo", lat: 40.5167, lon: 9.5667, quota: 900, raggio: 0.14, raggioMinore: 0.045, angolo: 60 },
  { nome: "Marghine", lat: 40.3200, lon: 8.9000, quota: 800, raggio: 0.19, raggioMinore: 0.065, angolo: 40 },
  { nome: "Goceano", lat: 40.4500, lon: 9.0700, quota: 850, raggio: 0.16, raggioMinore: 0.06, angolo: 50 },
  { nome: "Monte Ferru", lat: 40.1500, lon: 8.6200, quota: 720, raggio: 0.1, raggioMinore: 0.09 },
  { nome: "Linas", lat: 39.4500, lon: 8.6300, quota: 820, raggio: 0.13, raggioMinore: 0.09, angolo: 85 },
  { nome: "Marganai", lat: 39.3400, lon: 8.5400, quota: 550, raggio: 0.1, raggioMinore: 0.07, angolo: 70 },
  { nome: "Monte Arcosu", lat: 39.1800, lon: 8.9500, quota: 580, raggio: 0.09, raggioMinore: 0.07, angolo: 30 },
  { nome: "Sette Fratelli", lat: 39.3000, lon: 9.4200, quota: 620, raggio: 0.13, raggioMinore: 0.065, angolo: 20 },
];

/** Pianure vere, sottratte al corpo collinare. */
export const DEPRESSIONI = [
  { nome: "Campidano", lat: 39.60, lon: 8.90, quota: 420, raggio: 0.55, raggioMinore: 0.15, angolo: 55 },
  { nome: "Nurra", lat: 40.68, lon: 8.30, quota: 260, raggio: 0.25, raggioMinore: 0.2 },
  { nome: "Piana di Oristano", lat: 39.90, lon: 8.60, quota: 300, raggio: 0.22, raggioMinore: 0.15, angolo: 70 },
  { nome: "Valle del Tirso", lat: 40.25, lon: 8.90, quota: 220, raggio: 0.22, raggioMinore: 0.08, angolo: 25 },
  { nome: "Piana di Chilivani", lat: 40.60, lon: 8.95, quota: 200, raggio: 0.16, raggioMinore: 0.1, angolo: 40 },
];

const LAT_MEDIA = 40.05;
const FATTORE_LON = Math.cos((LAT_MEDIA * Math.PI) / 180);

/** Rumore di valore 2D deterministico. */
function casuale(i, j) {
  const s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function rumore(x, y) {
  const i = Math.floor(x);
  const j = Math.floor(y);
  const fx = x - i;
  const fy = y - j;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  return (
    casuale(i, j) * (1 - ux) * (1 - uy) +
    casuale(i + 1, j) * ux * (1 - uy) +
    casuale(i, j + 1) * (1 - ux) * uy +
    casuale(i + 1, j + 1) * ux * uy
  );
}

function rumoreFrattale(x, y) {
  return (
    rumore(x, y) * 0.55 + rumore(x * 2.3 + 11, y * 2.3 - 7) * 0.28 + rumore(x * 4.7 - 5, y * 4.7 + 3) * 0.17
  );
}

/**
 * Rumore "a creste": ripiegando il rumore attorno a metà scala si ottengono
 * linee di displuvio e valli invece di gobbe tonde. È ciò che distingue un
 * terreno da una collezione di coni.
 */
function rumoreCreste(x, y) {
  let somma = 0;
  let ampiezza = 1;
  let frequenza = 1;
  let totale = 0;
  for (let o = 0; o < 4; o += 1) {
    const n = 1 - Math.abs(rumore(x * frequenza, y * frequenza) * 2 - 1);
    somma += n * n * ampiezza;
    totale += ampiezza;
    ampiezza *= 0.5;
    frequenza *= 2.07;
  }
  return somma / totale;
}

function preparaCampane(elenco) {
  return elenco.map((m) => {
    const rad = ((m.angolo || 0) * Math.PI) / 180;
    return {
      ...m,
      raggioMinore: m.raggioMinore || m.raggio,
      cos: Math.cos(rad),
      sin: Math.sin(rad),
    };
  });
}

/** Campana ellittica orientata, in gradi corretti per la longitudine. */
function campana(lon, lat, m) {
  const dx = (lon - m.lon) * FATTORE_LON;
  const dy = lat - m.lat;
  const u = (dx * m.cos + dy * m.sin) / m.raggio;
  const v = (-dx * m.sin + dy * m.cos) / m.raggioMinore;
  return m.quota * Math.exp(-(u * u + v * v) / 2);
}

/** Quota stilizzata, in metri, nel punto geografico. */
function quotaIn(lon, lat, terreno) {
  let base = 0;
  for (const r of terreno.regioni) base += campana(lon, lat, r);
  let cime = 0;
  for (const m of terreno.massicci) cime += campana(lon, lat, m);
  let scavo = 0;
  for (const d of terreno.depressioni) scavo += campana(lon, lat, d);

  let q = base + cime - Math.min(scavo, base * 0.92 + cime * 0.25);
  if (q <= 0) return 0;

  const morbido = rumoreFrattale(lon * 14 + 40, lat * 14 + 40) - 0.5;
  const creste = rumoreCreste(lon * 10 + 13, lat * 10 - 21) - 0.5;
  const forza = Math.min(1, q / 450);

  q *= 1 + morbido * 0.42 * forza;
  q += creste * 260 * forza;
  return Math.max(0, q);
}

/** Punto dentro il poligono (ray casting), in [lon, lat]. */
function dentro(lon, lat, anello) {
  let acceso = false;
  for (let i = 0, j = anello.length - 1; i < anello.length; j = i++) {
    const [xi, yi] = anello[i];
    const [xj, yj] = anello[j];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) acceso = !acceso;
  }
  return acceso;
}

/**
 * Tabella marching squares.
 * Angoli: 0 alto-sx, 1 alto-dx, 2 basso-dx, 3 basso-sx (bit 8,4,2,1).
 * Lati:   0 alto, 1 destro, 2 basso, 3 sinistro.
 * I segmenti sono orientati con l'area sopra soglia a sinistra, così si
 * concatenano testa-coda e gli anelli risultano coerenti.
 */
const LATI = [
  [], [[2, 3]], [[1, 2]], [[1, 3]],
  [[0, 1]], [[0, 1], [2, 3]], [[0, 2]], [[0, 3]],
  [[3, 0]], [[2, 0]], [[3, 0], [1, 2]], [[1, 0]],
  [[3, 1]], [[2, 1]], [[3, 2]], [],
];

function cuciSegmenti(segmenti, passo) {
  const chiave = (p) => `${Math.round(p[0] * 1e6)},${Math.round(p[1] * 1e6)}`;
  const perInizio = new Map();
  for (const s of segmenti) {
    const k = chiave(s[0]);
    if (!perInizio.has(k)) perInizio.set(k, []);
    perInizio.get(k).push(s);
  }
  const anelli = [];
  const usati = new Set();
  for (const seg of segmenti) {
    if (usati.has(seg)) continue;
    const anello = [seg[0]];
    let corrente = seg;
    while (corrente && !usati.has(corrente)) {
      usati.add(corrente);
      anello.push(corrente[1]);
      corrente = (perInizio.get(chiave(corrente[1])) || []).find((s) => !usati.has(s));
    }
    if (anello.length > 6) {
      const d = Math.hypot(anello[0][0] - anello.at(-1)[0], anello[0][1] - anello.at(-1)[1]);
      if (d < passo * 0.5) anelli.push(anello);
    }
  }
  return anelli;
}

/**
 * Calcola le curve di livello dentro il profilo dell'isola.
 *
 * @param {number[][]} costa   anello [lon, lat] del profilo costiero
 * @param {object} [opzioni]
 * @returns {{soglia: number, anelli: number[][][]}[]}
 */
export function curveDiLivello(costa, { soglie = SOGLIE, risoluzione = 0.012 } = {}) {
  const terreno = {
    regioni: preparaCampane(REGIONI),
    massicci: preparaCampane(MASSICCI),
    depressioni: preparaCampane(DEPRESSIONI),
  };

  const lons = costa.map(([lon]) => lon);
  const lats = costa.map(([, lat]) => lat);
  const minLon = Math.min(...lons) - risoluzione;
  const maxLon = Math.max(...lons) + risoluzione;
  const minLat = Math.min(...lats) - risoluzione;
  const maxLat = Math.max(...lats) + risoluzione;

  const nx = Math.ceil((maxLon - minLon) / risoluzione) + 1;
  const ny = Math.ceil((maxLat - minLat) / risoluzione) + 1;

  // Fuori dall'isola il campo resta negativo: nessuna curva scavalca la costa.
  const campo = new Float32Array(nx * ny);
  for (let j = 0; j < ny; j += 1) {
    const lat = minLat + j * risoluzione;
    for (let i = 0; i < nx; i += 1) {
      const lon = minLon + i * risoluzione;
      campo[j * nx + i] = dentro(lon, lat, costa) ? quotaIn(lon, lat, terreno) : -1;
    }
  }

  const interp = (xa, ya, va, xb, yb, vb, s) => {
    const t = (s - va) / (vb - va);
    return [xa + (xb - xa) * t, ya + (yb - ya) * t];
  };

  return soglie.map((soglia) => {
    const segmenti = [];
    for (let j = 0; j < ny - 1; j += 1) {
      for (let i = 0; i < nx - 1; i += 1) {
        const x0 = minLon + i * risoluzione;
        const y0 = minLat + j * risoluzione;
        const x1 = x0 + risoluzione;
        const y1 = y0 + risoluzione;
        // angoli in coordinate schermo: alto = lat maggiore
        const v0 = campo[(j + 1) * nx + i];
        const v1 = campo[(j + 1) * nx + i + 1];
        const v2 = campo[j * nx + i + 1];
        const v3 = campo[j * nx + i];
        const codice =
          (v0 > soglia ? 8 : 0) | (v1 > soglia ? 4 : 0) | (v2 > soglia ? 2 : 0) | (v3 > soglia ? 1 : 0);
        const coppie = LATI[codice];
        if (!coppie.length) continue;

        const puntoLato = (lato) => {
          if (lato === 0) return interp(x0, y1, v0, x1, y1, v1, soglia);
          if (lato === 1) return interp(x1, y1, v1, x1, y0, v2, soglia);
          if (lato === 2) return interp(x1, y0, v2, x0, y0, v3, soglia);
          return interp(x0, y0, v3, x0, y1, v0, soglia);
        };
        for (const [da, a] of coppie) segmenti.push([puntoLato(da), puntoLato(a)]);
      }
    }
    return { soglia, anelli: cuciSegmenti(segmenti, risoluzione) };
  });
}
