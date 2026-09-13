/**
 * Gli slot fotografici di una scheda, letti e scritti in un posto solo.
 *
 * Prima questa logica esisteva in tre copie — `ritaglioAttivo`,
 * `riferimentoSlot` e `conRitaglio` dentro l'editor — e tutte e tre finivano
 * con lo stesso ripiego: qualunque slot non fosse `cover` o `cta` veniva
 * trattato come `esperienza-N`. Per i tre slot della Story quel ripiego
 * calcolava `Number("storyNumeri".split("-")[1])`, cioè `NaN`: l'assegnazione
 * scriveva in `esperienza[NaN]`, la lettura tornava `undefined`, e l'editor
 * mostrava lo slot vuoto subito dopo averci messo una fotografia. Nessun
 * errore, nessun messaggio: la fotografia semplicemente non arrivava.
 *
 * Una sola tabella, quindi, e nessun ripiego per esclusione: uno slot che non
 * è dichiarato qui non esiste, e leggerlo o scriverlo non fa danni silenziosi.
 *
 * Da 6.3H la tabella è **per rubrica**. Rubriche diverse hanno esigenze
 * diverse, e un registro solo costringerebbe TOUR a portarsi dietro i nove
 * slot di EVENTI o — peggio — a ripiegare su quelli quando non trova i propri:
 * lo stesso tipo di ripiego per esclusione che questo file esiste per
 * eliminare. Una rubrica che non è dichiarata qui non ha slot, e non ne eredita.
 */

/** Le uniche destinazioni che un descrittore può nominare. */
const DOVE_AMMESSI = ["cover", "esperienza", "sfondi"];

const testoNonVuoto = (v) => typeof v === "string" && v.trim() !== "";

/**
 * Costruisce il registro di una rubrica, rifiutando quel che non torna.
 *
 * Ogni configurazione sbagliata deve fermarsi **qui**, alla costruzione, e non
 * farsi scoprire durante l'uso: un descrittore con una destinazione ignota
 * cadrebbe nel ramo `esperienza` e scriverebbe in un indice inventato, ed è
 * esattamente il difetto — silenzioso, senza errori, con la fotografia che
 * sparisce — che questo file esiste per eliminare.
 *
 * Si rifiutano anche due id che puntano alla **stessa destinazione**: sarebbero
 * due comandi diversi che modificano lo stesso dato, e chi li usa non avrebbe
 * modo di capire perché l'uno cancella l'altro.
 *
 * La tabella di ricerca **resta nella chiusura**. Esporla come `Map` rendeva
 * «congelato» un valore che non lo era: `Object.freeze` non tocca il contenuto
 * di una Map, e un `registro.perId.set("intruso", …)` faceva divergere le due
 * viste dello stesso registro — lo slot compariva alla ricerca e mancava
 * dall'elenco. Fuori esce solo `descrizione(id)`, che legge e basta.
 *
 * @param {Array<object>} descrittori
 * @returns {{elenco: ReadonlyArray<object>, descrizione: (id: string) => object|null}}
 */
export function costruisciRegistroSlot(descrittori) {
  if (!Array.isArray(descrittori)) throw new Error("Registro slot: serve un array.");

  const perId = new Map();
  const indiciUsati = new Set();
  const chiaviUsate = new Set();
  let coverGiaPresa = false;

  for (const d of descrittori) {
    if (!d || typeof d !== "object") throw new Error("Registro slot: descrittore non valido.");
    if (!testoNonVuoto(d.id)) throw new Error("Registro slot: `id` mancante o vuoto.");
    if (perId.has(d.id)) throw new Error(`Registro slot: id duplicato «${d.id}».`);
    if (!testoNonVuoto(d.nome)) throw new Error(`Slot ${d.id}: «nome» mancante o vuoto.`);
    if (!DOVE_AMMESSI.includes(d.dove)) {
      throw new Error(`Slot ${d.id}: destinazione «${d.dove}» sconosciuta.`);
    }

    if (d.dove === "cover") {
      if (coverGiaPresa) throw new Error(`Slot ${d.id}: la cover è già occupata.`);
      coverGiaPresa = true;
    } else if (d.dove === "esperienza") {
      if (!Number.isInteger(d.indice) || d.indice < 0) {
        throw new Error(`Slot ${d.id}: indice non intero non negativo.`);
      }
      if (indiciUsati.has(d.indice)) {
        throw new Error(`Slot ${d.id}: indice ${d.indice} già occupato.`);
      }
      indiciUsati.add(d.indice);
    } else {
      if (!testoNonVuoto(d.chiave)) throw new Error(`Slot ${d.id}: «chiave» mancante o vuota.`);
      if (chiaviUsate.has(d.chiave)) {
        throw new Error(`Slot ${d.id}: chiave «${d.chiave}» già occupata.`);
      }
      chiaviUsate.add(d.chiave);
    }

    perId.set(d.id, Object.freeze({ ...d }));
  }

  const elenco = Object.freeze([...perId.values()]);
  // Una funzione non ha `set`, `delete` né `clear`, e la mappa che consulta non
  // è raggiungibile da nessun chiamante: non c'è modo di far comparire alla
  // ricerca uno slot che l'elenco non contiene.
  const descrizione = (id) => perId.get(id) || null;

  return Object.freeze({ elenco, descrizione });
}

/**
 * I registri, uno per rubrica.
 *
 * TOUR ha due soli slot, e sono **due ritagli distinti**: il Post è 4:5, la
 * Story 9:16, e la stessa fotografia vuole inquadrature diverse. Condividerne
 * uno solo obbligherebbe a scegliere quale dei due formati sacrificare.
 */
const REGISTRI = Object.freeze({
  eventi: costruisciRegistroSlot([
    { id: "cover", nome: "Cover", dove: "cover" },
    { id: "esperienza-0", nome: "Vivrai 1", dove: "esperienza", indice: 0 },
    { id: "esperienza-1", nome: "Vivrai 2", dove: "esperienza", indice: 1 },
    { id: "esperienza-2", nome: "Vivrai 3", dove: "esperienza", indice: 2 },
    { id: "esperienza-3", nome: "Vivrai 4", dove: "esperienza", indice: 3 },
    { id: "cta", nome: "Sfondo CTA", dove: "sfondi", chiave: "cta" },
    { id: "storyNumeri", nome: "Story 02", dove: "sfondi", chiave: "storyNumeri" },
    { id: "storyIncluso", nome: "Story 05", dove: "sfondi", chiave: "storyIncluso" },
    { id: "storyPrenota", nome: "Story 06", dove: "sfondi", chiave: "storyPrenota" },
  ]),
  tour: costruisciRegistroSlot([
    { id: "cover", nome: "Cover", dove: "cover" },
    { id: "story", nome: "Story", dove: "sfondi", chiave: "tourStory" },
  ]),
});

/** Una rubrica sconosciuta non ha slot, e non ne eredita da nessuno. */
const VUOTO = Object.freeze([]);
const registro = (rubrica) => REGISTRI[rubrica] || null;

/* ================================================================== *
 * Per rubrica
 * ================================================================== */

/** Gli slot dichiarati da una rubrica, nell'ordine in cui vanno mostrati. */
export function slotDellaRubrica(rubrica) {
  return registro(rubrica)?.elenco || VUOTO;
}

/** La descrizione di uno slot in quella rubrica, o `null` se non esiste. */
export function descrizioneSlotDellaRubrica(rubrica, slot) {
  return registro(rubrica)?.descrizione(slot) || null;
}

/**
 * Il riferimento fotografico di uno slot.
 *
 * @returns {object|null} il riferimento con il suo ritaglio, o `null`
 */
export function leggiSlotDellaRubrica(rubrica, media, slot) {
  const s = descrizioneSlotDellaRubrica(rubrica, slot);
  if (!s || !media) return null;
  if (s.dove === "cover") return media.cover || null;
  if (s.dove === "sfondi") return media.sfondi?.[s.chiave] || null;
  if (s.dove === "esperienza") return media.esperienza?.[s.indice] || null;
  return null;
}

/**
 * Una copia di `media` con il riferimento di uno slot sostituito.
 *
 * Non muta l'originale, e uno slot o una rubrica sconosciuti non cambiano
 * nulla: meglio un comando che non ha effetto di una scrittura in un posto
 * inventato.
 */
export function scriviSlotDellaRubrica(rubrica, media, slot, nuovo) {
  const s = descrizioneSlotDellaRubrica(rubrica, slot);
  if (!s) return media;
  const copia = { ...media };
  if (s.dove === "cover") {
    copia.cover = nuovo;
  } else if (s.dove === "sfondi") {
    copia.sfondi = { ...copia.sfondi, [s.chiave]: nuovo };
  } else if (s.dove === "esperienza") {
    const esperienza = [...(copia.esperienza || [])];
    esperienza[s.indice] = nuovo;
    copia.esperienza = esperienza;
  } else {
    // Irraggiungibile finché il registro convalida: nessuna scrittura al buio.
    return media;
  }
  return copia;
}

/** Se lo slot ha davvero una fotografia, non solo un ritaglio senza blob. */
export function slotDellaRubricaPieno(rubrica, media, slot) {
  return Boolean(leggiSlotDellaRubrica(rubrica, media, slot)?.idBlob);
}

/**
 * Il riferimento da disegnare per uno slot, con il ripiego sulla cover.
 *
 * Il ripiego vale **solo** in mancanza di una fotografia dedicata: una Story
 * senza foto propria mostra la cover invece di un rettangolo vuoto, ma appena
 * se ne assegna una è quella a comandare. E resta un fatto di rendering:
 * `slotDellaRubricaPieno` continua a dire che lo slot è vuoto, perché lo è.
 */
export function conRipiegoCoverDellaRubrica(rubrica, media, slot) {
  if (!descrizioneSlotDellaRubrica(rubrica, slot)) return null;
  if (slotDellaRubricaPieno(rubrica, media, slot)) {
    return leggiSlotDellaRubrica(rubrica, media, slot);
  }
  return media?.cover?.idBlob ? media.cover : null;
}

/* ================================================================== *
 * EVENTI: i nomi storici, che delegano
 * ================================================================== */

/** Gli slot della rubrica EVENTI, nell'ordine in cui l'editor li mostra. */
export const SLOT_MEDIA = slotDellaRubrica("eventi");

/** Gli slot EVENTI che vivono in `media.sfondi`. */
export const SLOT_SFONDO = Object.freeze(
  SLOT_MEDIA.filter((s) => s.dove === "sfondi").map((s) => s.id),
);

export const descrizioneSlot = (slot) => descrizioneSlotDellaRubrica("eventi", slot);
export const leggiSlot = (media, slot) => leggiSlotDellaRubrica("eventi", media, slot);
export const scriviSlot = (media, slot, nuovo) =>
  scriviSlotDellaRubrica("eventi", media, slot, nuovo);
export const slotPieno = (media, slot) => slotDellaRubricaPieno("eventi", media, slot);
export const conRipiegoCover = (media, slot) =>
  conRipiegoCoverDellaRubrica("eventi", media, slot);
