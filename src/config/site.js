/**
 * Configurazione unica del sito: contatti, canali e dati dell'attività.
 *
 * ⚠️  I VALORI QUI SOTTO SONO SEGNAPOSTO — DA SOSTITUIRE con quelli reali.
 * Tutto il sito (navigazione, hero, form, footer, CTA mobile, dati strutturati)
 * legge da questo file: aggiornare qui una sola volta aggiorna ovunque.
 */

// Numero di telefono in formato internazionale, solo cifre, per i link tel:/wa.me.
const PHONE_E164 = "393490000000"; // DA SOSTITUIRE
// Come mostrarlo a schermo.
const PHONE_DISPLAY = "+39 349 000 0000"; // DA SOSTITUIRE

const WHATSAPP_MESSAGE =
  "Ciao! Vorrei verificare la disponibilità per un tour off-road in Sardegna.";

export const SITE = {
  nome: "Sardegna Trail Avventura",
  tagline: "Tour off-road guidati in Sardegna",
  email: "info@sardegnatrailavventura.it", // DA SOSTITUIRE
  telefono: {
    e164: PHONE_E164,
    display: PHONE_DISPLAY,
    href: `tel:+${PHONE_E164}`,
  },
  whatsapp: {
    numero: PHONE_E164,
    href: `https://wa.me/${PHONE_E164}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`,
  },
  social: {
    instagram: "https://instagram.com/sardegnatrailavventura", // DA SOSTITUIRE
    facebook: "https://facebook.com/sardegnatrailavventura", // DA SOSTITUIRE
  },
  luogo: {
    regione: "Sardegna, Italia",
    mapsHref: "https://maps.google.com/?q=Sardegna",
  },
  // true quando i contatti reali sono stati inseriti: nasconde l'avviso di redazione.
  contattiVerificati: false,
};

/** Costruisce un link WhatsApp con un messaggio precompilato specifico. */
export function whatsappLink(message) {
  return `https://wa.me/${SITE.whatsapp.numero}?text=${encodeURIComponent(message)}`;
}
