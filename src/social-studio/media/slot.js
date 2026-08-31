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
 */

/** Gli slot della rubrica EVENTI, nell'ordine in cui l'editor li mostra. */
export const SLOT_MEDIA = [
  { id: "cover", nome: "Cover", dove: "cover" },
  { id: "esperienza-0", nome: "Vivrai 1", dove: "esperienza", indice: 0 },
  { id: "esperienza-1", nome: "Vivrai 2", dove: "esperienza", indice: 1 },
  { id: "esperienza-2", nome: "Vivrai 3", dove: "esperienza", indice: 2 },
  { id: "esperienza-3", nome: "Vivrai 4", dove: "esperienza", indice: 3 },
  { id: "cta", nome: "Sfondo CTA", dove: "sfondi", chiave: "cta" },
  { id: "storyNumeri", nome: "Story 02", dove: "sfondi", chiave: "storyNumeri" },
  { id: "storyIncluso", nome: "Story 05", dove: "sfondi", chiave: "storyIncluso" },
  { id: "storyPrenota", nome: "Story 06", dove: "sfondi", chiave: "storyPrenota" },
];

const PER_ID = new Map(SLOT_MEDIA.map((s) => [s.id, s]));

/** La descrizione di uno slot, o `null` se quello slot non esiste. */
export function descrizioneSlot(slot) {
  return PER_ID.get(slot) || null;
}

/** Gli slot che vivono in `media.sfondi`. */
export const SLOT_SFONDO = SLOT_MEDIA.filter((s) => s.dove === "sfondi").map((s) => s.id);

/**
 * Il riferimento fotografico di uno slot.
 *
 * @param {object} media  il ramo `media` della scheda
 * @param {string} slot   un id dichiarato in `SLOT_MEDIA`
 * @returns {object|null} il riferimento con il suo ritaglio, o `null`
 */
export function leggiSlot(media, slot) {
  const s = PER_ID.get(slot);
  if (!s || !media) return null;
  if (s.dove === "cover") return media.cover || null;
  if (s.dove === "sfondi") return media.sfondi?.[s.chiave] || null;
  return media.esperienza?.[s.indice] || null;
}

/**
 * Una copia di `media` con il riferimento di uno slot sostituito.
 *
 * Non muta l'originale, e uno slot sconosciuto non cambia nulla: meglio un
 * comando che non ha effetto di una scrittura in un posto inventato.
 */
export function scriviSlot(media, slot, nuovo) {
  const s = PER_ID.get(slot);
  if (!s) return media;
  const copia = { ...media };
  if (s.dove === "cover") {
    copia.cover = nuovo;
  } else if (s.dove === "sfondi") {
    copia.sfondi = { ...copia.sfondi, [s.chiave]: nuovo };
  } else {
    const esperienza = [...(copia.esperienza || [])];
    esperienza[s.indice] = nuovo;
    copia.esperienza = esperienza;
  }
  return copia;
}

/** Se lo slot ha davvero una fotografia, non solo un ritaglio senza blob. */
export function slotPieno(media, slot) {
  return Boolean(leggiSlot(media, slot)?.idBlob);
}

/**
 * Il riferimento da disegnare per uno slot, con il ripiego sulla cover.
 *
 * Il ripiego vale **solo** in mancanza di una fotografia dedicata: una Story
 * senza foto propria mostra la cover invece di un rettangolo vuoto, ma appena
 * se ne assegna una è quella a comandare.
 */
export function conRipiegoCover(media, slot) {
  if (slotPieno(media, slot)) return leggiSlot(media, slot);
  return media?.cover?.idBlob ? media.cover : null;
}
