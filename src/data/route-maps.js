/**
 * Mappe del percorso mostrate sul retro della scheda tour, indicizzate per slug.
 * I tour che non compaiono qui mantengono il tracciato decorativo generico.
 *
 * Non è un campo di TinaCMS di proposito: aggiungere un campo allo schema blocca
 * le build finché Tina Cloud non reindicizza il branch (stessa ragione spiegata
 * in src/content/normalize.js). Per aggiungere una mappa bastano il file in
 * public/media/mappe/ e una riga qui.
 */
export const ROUTE_MAPS = {
  "la-via-dei-giganti-2026": {
    src: "/media/mappe/la-via-dei-giganti-2026.webp",
    alt: "Mappa dell'anello della Via dei Giganti: da Olbia a Tempio Pausania, Buddusò e Siniscola, con rientro a Olbia",
  },
};
