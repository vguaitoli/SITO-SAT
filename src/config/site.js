/**
 * Configurazione unica del sito: contatti, canali e dati dell'attività.
 *
 * ⚠️  I VALORI QUI SOTTO SONO SEGNAPOSTO — DA SOSTITUIRE con quelli reali.
 * Tutto il sito (navigazione, hero, form, footer, CTA mobile, dati strutturati)
 * legge da questo file: aggiornare qui una sola volta aggiorna ovunque.
 */

// Numero di telefono in formato internazionale, solo cifre, per i link tel:/wa.me.
const PHONE_E164 = "393487981591";
// Come mostrarlo a schermo.
const PHONE_DISPLAY = "+39 348 79 81 591";

const WHATSAPP_MESSAGE =
  "Ciao! Vorrei verificare la disponibilità per un tour off-road in Sardegna.";

export const SITE = {
  nome: "Sardegna Trail Avventura",
  tagline: "Tour off-road guidati in Sardegna",
  email: "sardegnatrailavventura@gmail.com",
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
    // Stesso handle su entrambe le piattaforme.
    handle: "@sardegnatrailavventura",
    instagram: "https://instagram.com/sardegnatrailavventura",
    facebook: "https://facebook.com/sardegnatrailavventura",
  },
  luogo: {
    regione: "Sardegna, Italia",
    mapsHref: "https://maps.google.com/?q=Sardegna",
  },
  // Dati fiscali del Titolare del trattamento (ditta individuale).
  // Usati nel footer, nell'informativa privacy e nella cookie policy.
  legale: {
    ragioneSociale: "Sardegna Trail Avventura",
    formaGiuridica: "Ditta individuale",
    partitaIva: "03063400901",
    sede: "Strada Vicinale Zinziodda Li Buttagari, 111 — 07100 Sassari (SS)",
  },
  // true quando i contatti reali sono stati inseriti: nasconde l'avviso di redazione.
  contattiVerificati: true,
};

/** Costruisce un link WhatsApp con un messaggio precompilato specifico. */
export function whatsappLink(message) {
  return `https://wa.me/${SITE.whatsapp.numero}?text=${encodeURIComponent(message)}`;
}

// Web3Forms (web3forms.com) consegna via email le richieste del form contatti
// senza bisogno di un backend proprio. DA CONFIGURARE: crea una chiave
// gratuita su web3forms.com (basta un'email, nessuna password) e impostala
// come variabile d'ambiente VITE_WEB3FORMS_ACCESS_KEY su Vercel
// (Project Settings → Environment Variables), poi fai un redeploy.
export const WEB3FORMS_ACCESS_KEY = import.meta.env.VITE_WEB3FORMS_ACCESS_KEY || "";
