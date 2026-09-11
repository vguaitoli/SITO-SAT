import {
  rispostaChiediCredenziali,
  rispostaNonConfigurato,
  verifica,
} from "./api/_autenticazione.js";

/**
 * Protezione delle aree amministrative e delle relative funzioni serverless.
 * Il filtro resta nel codice perché questo è un progetto Vite e il matcher di
 * Vercel non gestisce in modo affidabile questi percorsi nel middleware.
 */
const PROTETTE = [
  "/admin/social",
  "/admin/feedback",
  "/api/caption",
  "/api/feedback",
];

/** Vero se il percorso appartiene a un prefisso amministrativo protetto. */
export function eProtetta(percorso) {
  return PROTETTE.some((prefisso) =>
    percorso === prefisso || percorso.startsWith(`${prefisso}/`),
  );
}

export default function middleware(request) {
  let percorso;
  try {
    percorso = new URL(request.url).pathname;
  } catch {
    return undefined;
  }

  if (!eProtetta(percorso)) return undefined;

  try {
    const { esito } = verifica(request.headers.get("authorization"));
    if (esito === "non-configurato") return rispostaNonConfigurato();
    if (esito === "ok") return undefined;

    const messaggi = {
      mancante: "Accesso riservato.",
      illeggibile: "Credenziali illeggibili.",
      errate: "Credenziali non valide.",
    };
    return rispostaChiediCredenziali(messaggi[esito] || messaggi.mancante);
  } catch {
    return new Response("Errore nel controllo di accesso.", {
      status: 503,
      headers: {
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex, nofollow, noarchive",
      },
    });
  }
}
