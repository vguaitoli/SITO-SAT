/**
 * Preset editoriali per singolo evento.
 *
 * Gli highlight della slide 05 sono materiale editoriale: qualcuno li ha
 * scritti guardando quel percorso. Tenerli come valore predefinito globale era
 * un errore preciso — ogni evento nuovo nasceva con «Granito, Mare, Borghi,
 * Altopiani», che descrivono la Via dei Giganti e nessun altro tour. Un testo
 * plausibile ma sbagliato è peggio di un campo vuoto, perché non si nota.
 *
 * Ora ci sono due strade, e nessuna delle due inventa niente:
 *
 * 1. un preset scritto a mano, valido **solo** per lo slug a cui appartiene;
 * 2. in mancanza di preset, i punti di interesse che il sito dichiara per
 *    quell'evento — dato reale, non invenzione — come titoli da cui partire,
 *    con le descrizioni da scrivere.
 */

/**
 * Kicker per slug, dal riferimento canonico.
 *
 * Solo per l'evento a cui appartiene: per gli altri resta vuoto, e il
 * pre-flight lo segnala invece di far inventare una geografia.
 */
export const PRESET_KICKER = {
  "la-via-dei-giganti-2026": "NORD SARDEGNA · GALLURA",
};

/** Il kicker dell'evento, o stringa vuota. Mai un testo composto. */
export function kickerIniziale(slug) {
  return (slug && PRESET_KICKER[slug]) || "";
}

/** Preset per slug. Ogni voce vale per quell'evento e per nessun altro. */
export const PRESET_HIGHLIGHT = {
  "la-via-dei-giganti-2026": [
    { id: "h1", titolo: "Granito", descrizione: "Le rocce della Gallura e del Limbara." },
    { id: "h2", titolo: "Mare", descrizione: "Coste e spiagge fra una pista e l'altra." },
    { id: "h3", titolo: "Borghi", descrizione: "Tempio, Buddusò, Pattada." },
    { id: "h4", titolo: "Altopiani", descrizione: "Sterrati aperti e panorami larghi." },
  ],
};

/** Quante voci entrano nella griglia della slide 05. */
const MASSIMI = 4;

/**
 * Gli highlight con cui un evento comincia.
 *
 * @param {object} fattuali  i dati importati dal sito
 * @param {string|null} slug
 * @returns {{id: string, titolo: string, descrizione: string, origine: string}[]}
 */
export function highlightIniziali(fattuali = {}, slug = null) {
  const preset = slug ? PRESET_HIGHLIGHT[slug] : null;
  if (preset) return preset.map((h) => ({ ...h, origine: "preset" }));

  // I punti di interesse vengono dal campo `interest` del sito: sono reali.
  // Diventano titoli; le descrizioni restano da scrivere, perché il sito non
  // le contiene e non è il caso di riempirle con qualcosa che suoni bene.
  return (fattuali.puntiInteresse || [])
    .slice(0, MASSIMI)
    .map((nome, i) => ({
      id: `poi-${i + 1}`,
      titolo: String(nome).trim(),
      descrizione: "",
      origine: "punti-interesse",
    }))
    .filter((h) => h.titolo);
}

/** Vero se l'evento ha un preset scritto a mano. */
export function haPreset(slug) {
  return Boolean(slug && PRESET_HIGHLIGHT[slug]);
}
