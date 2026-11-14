/**
 * Partner con cui un evento è organizzato, per slug.
 *
 * La pagina dell'evento mostra «In collaborazione con» e il logo del partner,
 * che porta alla pagina dell'evento sul suo sito. Il logo è la versione
 * bianca, perché sta sull'apertura scura della pagina.
 *
 * Con `role: "organizer"` il partner è l'organizzatore dell'evento e STA
 * collabora: la pagina scrive «Organizzato da» e il nome, anche senza logo.
 * `contacts` elenca i recapiti per informazioni e adesioni, mostrati come
 * link di chiamata nella sezione «Info e prenotazioni».
 *
 * Non è un campo di TinaCMS per la stessa ragione spiegata in
 * src/data/hero-images.js: aggiungere un campo allo schema blocca le build
 * finché Tina Cloud non reindicizza il branch.
 */
export const EVENT_PARTNERS = {
  "capodanno-in-quad-nord-sardegna-2026": {
    name: "Excursion Academy",
    role: "organizer",
    contacts: [
      { name: "Excursion Academy", person: "Luca Atzori", phone: "+39 340 422 1666" },
      { name: "Sardegna Trail Avventura", phone: "+39 348 798 1591" },
    ],
  },
  "tour-immacolata-ineos-grenadier-2026": {
    name: "Ineos Club Italia",
    logo: "/media/partner/ineos-club-italia-bianco.svg",
    href: "https://ineosclubitalia.it/eventi/9d98da12-785d-4dbf-b4aa-99bc3a4f235f",
  },
};
