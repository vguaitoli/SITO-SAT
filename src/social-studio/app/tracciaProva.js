/**
 * Traccia per lo stress test dell'esportazione.
 *
 * ⚠️ NON è una registrazione GPS reale. È una traccia **sintetica** costruita
 * sui waypoint veri dell'anello della Via dei Giganti (Olbia · Tempio ·
 * Buddusò · Siniscola · Olbia), interpolata con un andamento irregolare per
 * arrivare alla densità di punti di un file vero — qualche migliaio, non una
 * decina.
 *
 * Serve a misurare il costo del rendering e dell'esportazione con una
 * geometria di dimensioni realistiche. **Non sostituisce la prova con un GPX
 * registrato**: quella resta da fare, e il banco di prova accetta un file
 * trascinato per eseguirla.
 *
 * La regola del progetto — la geometria viene solo dal GPX — non è in
 * discussione: questa traccia esiste esclusivamente per il banco di prova e non
 * entra in nessun contenuto pubblicabile.
 */

/** I capisaldi reali dell'anello, in ordine di percorrenza. */
const CAPISALDI = [
  { nome: "Olbia", lon: 9.4964, lat: 40.9236, quota: 15 },
  { nome: "Monte Muros", lon: 9.3400, lat: 40.8600, quota: 480 },
  { nome: "Tempio Pausania", lon: 9.1069, lat: 40.9006, quota: 566 },
  { nome: "Monte Limbara", lon: 9.1669, lat: 40.8503, quota: 1130 },
  { nome: "Berchidda", lon: 9.1633, lat: 40.7853, quota: 296 },
  { nome: "Lago del Coghinas", lon: 9.0500, lat: 40.7500, quota: 170 },
  { nome: "Pattada", lon: 9.1108, lat: 40.5822, quota: 745 },
  { nome: "Buddusò", lon: 9.2650, lat: 40.5786, quota: 700 },
  { nome: "Monte Albo", lon: 9.5667, lat: 40.5167, quota: 940 },
  { nome: "Siniscola", lon: 9.6931, lat: 40.5750, quota: 12 },
  { nome: "Punta Contratta", lon: 9.6600, lat: 40.7400, quota: 320 },
  { nome: "Olbia", lon: 9.4964, lat: 40.9236, quota: 15 },
];

/** Rumore deterministico: la traccia deve essere identica a ogni esecuzione. */
function rumore(i, semina) {
  const s = Math.sin(i * 12.9898 + semina * 78.233) * 43758.5453;
  return (s - Math.floor(s)) * 2 - 1;
}

/**
 * Costruisce la traccia.
 *
 * @param {number} [perTratta]  punti per ogni tratta fra due capisaldi
 * @returns {{segmenti: object[][], localita: object[], punti: number}}
 */
export function tracciaDiProva(perTratta = 320) {
  const segmenti = [];

  for (let t = 0; t < CAPISALDI.length - 1; t += 1) {
    const a = CAPISALDI[t];
    const b = CAPISALDI[t + 1];
    const punti = [];

    for (let i = 0; i <= perTratta; i += 1) {
      const p = i / perTratta;
      // Serpeggiamento laterale: una pista non è un segmento di retta.
      const deviazione = Math.sin(p * Math.PI) * 0.035;
      const lon = a.lon + (b.lon - a.lon) * p + deviazione * rumore(i, t) * 0.6;
      const lat = a.lat + (b.lat - a.lat) * p + deviazione * rumore(i, t + 100) * 0.6;
      // Quota interpolata più microrilievo: serve al profilo altimetrico.
      const quota =
        a.quota + (b.quota - a.quota) * p + rumore(i, t + 200) * 18 + Math.sin(p * 14) * 25;
      punti.push({ lon, lat, quota: Math.max(0, Math.round(quota)), tempo: null });
    }

    // Ogni tratta è un segmento a sé: è così che si comporta un GPX vero
    // registrato in giornate diverse.
    segmenti.push(punti);
  }

  const localita = CAPISALDI.slice(0, -1).map((c, i) => ({
    id: `loc-${i}`,
    nome: c.nome,
    lon: c.lon,
    lat: c.lat,
  }));

  return {
    segmenti,
    localita,
    punti: segmenti.reduce((s, seg) => s + seg.length, 0),
  };
}
