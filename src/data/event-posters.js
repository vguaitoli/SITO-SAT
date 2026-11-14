/**
 * Locandina ufficiale di un evento, per slug.
 *
 * La pagina dell'evento la mostra intera, senza ritagli, accanto ai recapiti.
 * Il file sta in public/media/locandine/ in formato WebP. L'apertura della
 * pagina resta una foto (src/data/hero-images.js), perché la locandina ha già
 * il proprio testo e sotto le sfumature dell'apertura si leggerebbe male.
 *
 * Non è un campo di TinaCMS per la stessa ragione spiegata in
 * src/data/hero-images.js.
 */
export const EVENT_POSTERS = {
  "capodanno-in-quad-nord-sardegna-2026": {
    src: "/media/locandine/capodanno-in-quad-nord-sardegna-2026.webp",
    width: 1080,
    height: 1350,
    alt: "Locandina «Capodanno in quad – Nord Sardegna» con un quad sportivo infangato ripreso frontalmente. Dal 30 dicembre al 3 gennaio, circa 108 km al giorno, 85% off-road, livello facile–medio, massimo 10 partecipanti.",
  },
};
