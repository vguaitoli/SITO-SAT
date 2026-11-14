/**
 * Dicitura sul gruppo diversa da quella generale, per singolo evento, per slug.
 *
 * Il sito mostra ovunque la riga presa dalle impostazioni ("Da 5 a 10
 * partecipanti"). Un evento organizzato con un partner può dover ripetere la
 * formula concordata con lui: qui la si sostituisce, con la stessa forma di
 * TOUR_GROUP (etichetta breve e frase completa).
 *
 * Non è un campo di TinaCMS per la stessa ragione spiegata in
 * src/data/hero-images.js: aggiungere un campo allo schema blocca le build
 * finché Tina Cloud non reindicizza il branch.
 */
export const GROUP_OVERRIDES = {
  "capodanno-in-quad-nord-sardegna-2026": {
    label: "Massimo 10 partecipanti",
    sentence: "Il gruppo è di massimo 10 partecipanti.",
  },
  "tour-immacolata-ineos-grenadier-2026": {
    label: "Gruppo contenuto di veicoli",
    sentence: "Il tour è pensato per un gruppo contenuto di veicoli.",
  },
};

export function groupFor(slug, fallback) {
  return GROUP_OVERRIDES[slug] || fallback;
}
