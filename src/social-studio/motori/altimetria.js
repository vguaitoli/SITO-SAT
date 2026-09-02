import { distanzaFra } from "./gpx";

/**
 * Profilo altimetrico derivato dal GPX.
 *
 * Il mestiere di questo modulo è uno solo: trasformare i punti della traccia in
 * una spezzata (distanza, quota) senza aggiungere niente che nel file non ci
 * fosse. Nessuna interpolazione, nessun punto inventato, nessuno smussamento.
 * Se il GPS non ha registrato una quota, lì il grafico **si interrompe**: una
 * riga tirata sopra il buco sarebbe una misura inventata che sembra un dato.
 *
 * Due regole di lettura che tornano ovunque nel file:
 *
 * - `0` è una quota valida. Il livello del mare esiste, e un percorso costiero
 *   ne tocca parecchio. Il controllo è sempre `=== null`, mai la verità del
 *   valore: `if (!quota)` cancellerebbe silenziosamente ogni punto a zero.
 * - le quote negative sono valide (Sardegna no, ma il modulo non lo sa e non
 *   deve saperlo: una depressione è un dato come un altro).
 */

/** Un punto è utilizzabile per il profilo solo se ha davvero una quota. */
const conQuota = (p) => p != null && p.quota !== null && Number.isFinite(p.quota);

/**
 * Deriva il profilo da segmenti GPX già analizzati.
 *
 * La distanza è cumulativa lungo il percorso e avanza su **tutti** i punti del
 * segmento, anche quelli senza quota: il terreno sotto le ruote esiste comunque,
 * e saltarlo accorcerebbe l'asse. Fra la fine di un segmento e l'inizio del
 * successivo, invece, non si aggiunge nulla — quel tratto non è stato percorso,
 * o almeno non è stato registrato, e misurarlo in linea d'aria sarebbe
 * un'invenzione.
 *
 * @param {{lon:number, lat:number, quota:number|null}[][]} segmenti
 * @returns {{
 *   tratti: {distanza:number, quota:number}[][],
 *   distanzaTotale: number,
 *   quotaMin: number|null,
 *   quotaMax: number|null,
 *   puntiConQuota: number,
 *   puntiSenzaQuota: number,
 *   segmenti: number,
 *   utilizzabile: boolean,
 *   interrotto: boolean,
 *   parziale: boolean,
 * }}
 */
export function profiloAltimetrico(segmenti) {
  const elenco = Array.isArray(segmenti) ? segmenti : [];
  const tratti = [];
  let corrente = [];
  let distanza = 0;
  let quotaMin = null;
  let quotaMax = null;
  let puntiConQuota = 0;
  let puntiSenzaQuota = 0;

  /** Un tratto vale solo se disegna qualcosa: un punto isolato non è una linea. */
  const chiudi = () => {
    if (corrente.length > 1) tratti.push(corrente);
    corrente = [];
  };

  for (const seg of elenco) {
    const punti = Array.isArray(seg) ? seg : [];
    // Ogni segmento riparte con la penna alzata: due segmenti distinti non si
    // uniscono mai, nemmeno quando entrambi hanno quote.
    chiudi();
    for (let i = 0; i < punti.length; i += 1) {
      const p = punti[i];
      if (i > 0) {
        const passo = distanzaFra(punti[i - 1], p);
        if (Number.isFinite(passo)) distanza += passo;
      }
      if (!conQuota(p)) {
        puntiSenzaQuota += 1;
        chiudi();
        continue;
      }
      puntiConQuota += 1;
      if (quotaMin === null || p.quota < quotaMin) quotaMin = p.quota;
      if (quotaMax === null || p.quota > quotaMax) quotaMax = p.quota;
      corrente.push({ distanza, quota: p.quota });
    }
  }
  chiudi();

  return {
    tratti,
    distanzaTotale: distanza,
    quotaMin,
    quotaMax,
    puntiConQuota,
    puntiSenzaQuota,
    segmenti: elenco.length,
    utilizzabile: tratti.length > 0,
    interrotto: tratti.length > 1,
    parziale: puntiSenzaQuota > 0,
  };
}

/**
 * Porta il profilo in pixel dentro un riquadro.
 *
 * L'asse orizzontale è la distanza percorsa, quello verticale la quota, con lo
 * zero in basso. Nessun margine implicito: chi chiama passa il riquadro
 * **interno** già scontato dei suoi spazi, così la misura non è scritta in due
 * posti.
 *
 * I due casi degeneri non vanno lasciati al caso, perché entrambi producono una
 * divisione per zero e quindi `NaN` dentro un attributo `d` — che il browser
 * scarta in silenzio, lasciando una grafica vuota senza dire perché:
 *
 * - **profilo piatto** (quota unica): la linea va a metà altezza. Non a zero e
 *   non in cima, perché non è né il minimo né il massimo di niente: è l'unica
 *   quota che esiste.
 * - **distanza nulla** (punti tutti sovrapposti): tutto collassa a sinistra.
 *
 * @param {ReturnType<typeof profiloAltimetrico>} profilo
 * @param {{larghezza:number, altezza:number}} riquadro
 * @returns {{tratti: [number, number][][], quotaMin:number|null, quotaMax:number|null}}
 */
export function proiettaProfilo(profilo, { larghezza, altezza }) {
  const { quotaMin, quotaMax, distanzaTotale } = profilo;
  if (!profilo.utilizzabile || quotaMin === null || quotaMax === null) {
    return { tratti: [], quotaMin, quotaMax };
  }
  const dislivello = quotaMax - quotaMin;
  const perX = distanzaTotale > 0 ? larghezza / distanzaTotale : 0;

  const y = (quota) =>
    dislivello > 0 ? altezza - ((quota - quotaMin) / dislivello) * altezza : altezza / 2;

  return {
    tratti: profilo.tratti.map((tratto) => tratto.map((p) => [p.distanza * perX, y(p.quota)])),
    quotaMin,
    quotaMax,
  };
}
