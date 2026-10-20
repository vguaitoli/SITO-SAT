/**
 * Partner con cui un evento è organizzato, per slug.
 *
 * La pagina dell'evento mostra «In collaborazione con» e il logo del partner,
 * che porta alla pagina dell'evento sul suo sito. Il logo è la versione
 * bianca, perché sta sull'apertura scura della pagina.
 *
 * Non è un campo di TinaCMS per la stessa ragione spiegata in
 * src/data/hero-images.js: aggiungere un campo allo schema blocca le build
 * finché Tina Cloud non reindicizza il branch.
 */
export const EVENT_PARTNERS = {
  "tour-immacolata-ineos-grenadier-2026": {
    name: "Ineos Club Italia",
    logo: "/media/partner/ineos-club-italia-bianco.svg",
    href: "https://ineosclubitalia.it/eventi/9d98da12-785d-4dbf-b4aa-99bc3a4f235f",
  },
};
