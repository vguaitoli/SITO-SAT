import { rispostaChiediCredenziali, rispostaNonConfigurato, verifica } from "./api/_autenticazione.js";

/**
 * Protezione delle rotte amministrative (Vercel Edge Middleware).
 *
 * Social Studio è local-first: i contenuti vivono in IndexedDB nel browser di
 * chi lavora, quindi un estraneo che aprisse la pagina vedrebbe uno studio
 * vuoto. Resta però un'interfaccia amministrativa, e le sue API non hanno
 * ragione di essere pubbliche.
 *
 * Lo studio e le sue API condividono la stessa autenticazione, dalla stessa
 * implementazione (api/_autenticazione.js). Il frontend non custodisce alcun
 * segreto: dopo che il browser ha autenticato /admin/social, rimanda da solo
 * le credenziali alle risorse sotto lo stesso prefisso, ed è per questo che
 * l'endpoint delle caption si raggiunge come /admin/social/api/caption.
 *
 * ── Perché il filtro sta nel codice e non in `config.matcher` ──
 *
 * Questo è un progetto Vite, non Next.js. Con `config.matcher` la CLI di
 * Vercel fallisce nel parsing dei percorsi con parametri e il middleware va in
 * errore su OGNI richiesta: provato, e il risultato è l'intero sito pubblico a
 * 500. Il filtro esplicito qui sotto è più verboso ma non dipende dal
 * dialetto di path-to-regexp del momento, ed è verificabile con un test.
 *
 * Variabili d'ambiente (su Vercel, mai nel codice):
 *   SOCIAL_STUDIO_UTENTE
 *   SOCIAL_STUDIO_PASSWORD
 */

/** Prefissi protetti. Tutto il resto è sito pubblico e non viene toccato. */
const PROTETTE = ["/admin/social", "/api/caption"];

/**
 * Vero se il percorso appartiene all'area amministrativa.
 *
 * Il confronto è sul segmento intero: `/admin/social-qualcosa` NON è
 * `/admin/social`, e non deve essere protetto per sbaglio — né, soprattutto,
 * lasciato scoperto credendolo protetto.
 */
export function eProtetta(percorso) {
  return PROTETTE.some((p) => percorso === p || percorso.startsWith(`${p}/`));
}

export default function middleware(request) {
  let percorso;
  try {
    percorso = new URL(request.url).pathname;
  } catch {
    // URL illeggibile: non è una richiesta all'area riservata. Si prosegue,
    // perché rompere il sito pubblico sarebbe il danno maggiore.
    return undefined;
  }

  if (!eProtetta(percorso)) return undefined;

  try {
    const { esito } = verifica(request.headers.get("authorization"));

    if (esito === "non-configurato") return rispostaNonConfigurato();
    if (esito === "ok") return undefined; // autenticato: la richiesta prosegue

    const messaggi = {
      mancante: "Accesso riservato.",
      illeggibile: "Credenziali illeggibili.",
      errate: "Credenziali non valide.",
    };
    return rispostaChiediCredenziali(messaggi[esito] || messaggi.mancante);
  } catch {
    // Errore imprevisto su una rotta riservata: si chiude. Qui, al contrario
    // del caso precedente, il danno maggiore sarebbe lasciare entrare.
    return new Response("Errore nel controllo di accesso.", {
      status: 503,
      headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" },
    });
  }
}
