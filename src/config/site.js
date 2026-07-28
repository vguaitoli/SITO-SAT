/**
 * Compatibilità per i moduli che leggono i dati fuori da React (SEO e policy).
 * La fonte è il documento JSON gestito da TinaCMS; i componenti visuali usano
 * invece useSiteContent per aggiornarsi in tempo reale dentro /admin.
 */
import settingsContent from "../../content/settings/index.json";
import { normalizeSettings } from "@/content/normalize";

const normalized = normalizeSettings(settingsContent);

export const { CTA_LABELS, TOUR_GROUP, SITE } = normalized;

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
