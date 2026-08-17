/**
 * Autenticazione condivisa fra il middleware e le funzioni serverless.
 *
 * Una sola implementazione, importata da entrambi: se ce ne fossero due
 * finirebbero per divergere, ed è esattamente su quella divergenza che si
 * aprono i buchi.
 *
 * Il prefisso `_` esclude questo file dal routing di Vercel: non è un endpoint.
 *
 * Credenziali: HTTP Basic da variabili d'ambiente, le stesse per lo studio e
 * per le sue API. Il browser, dopo aver autenticato /admin/social, rimanda le
 * credenziali da solo alle risorse sotto lo stesso prefisso — ed è per questo
 * che l'endpoint delle caption è raggiunto come /admin/social/api/caption.
 * Il frontend non custodisce, non incorpora e non trasmette alcun segreto.
 */

/** Confronto a tempo costante: non rivela il segreto un carattere per volta. */
export function ugualiATempoCostante(a, b) {
  const ba = new TextEncoder().encode(String(a));
  const bb = new TextEncoder().encode(String(b));
  let diverso = ba.length ^ bb.length;
  const massimo = Math.max(ba.length, bb.length);
  for (let i = 0; i < massimo; i += 1) diverso |= (ba[i] ?? 0) ^ (bb[i] ?? 0);
  return diverso === 0;
}

/** Legge le credenziali attese dall'ambiente. */
export function credenzialiAttese(env = process.env) {
  return { utente: env.SOCIAL_STUDIO_UTENTE || "", password: env.SOCIAL_STUDIO_PASSWORD || "" };
}

/**
 * Decodifica un'intestazione `Authorization: Basic …`.
 * @returns {{utente: string, password: string} | null}
 */
export function leggiBasic(intestazione) {
  if (typeof intestazione !== "string") return null;
  if (!intestazione.toLowerCase().startsWith("basic ")) return null;
  try {
    const decodificato = atob(intestazione.slice(6).trim());
    const separatore = decodificato.indexOf(":");
    if (separatore < 0) return null;
    return {
      utente: decodificato.slice(0, separatore),
      password: decodificato.slice(separatore + 1),
    };
  } catch {
    return null;
  }
}

/**
 * Verifica una richiesta.
 *
 * @returns {{esito: "ok"|"non-configurato"|"mancante"|"illeggibile"|"errate"}}
 */
export function verifica(intestazioneAuth, env = process.env) {
  const attese = credenzialiAttese(env);

  // Chiusura di sicurezza: senza credenziali configurate non si entra. Una
  // rotta amministrativa che si apre perché manca una variabile d'ambiente è
  // il modo classico di lasciare una porta aperta senza accorgersene.
  if (!attese.utente || !attese.password) return { esito: "non-configurato" };

  if (!intestazioneAuth) return { esito: "mancante" };

  const fornite = leggiBasic(intestazioneAuth);
  if (!fornite) return { esito: "illeggibile" };

  // Entrambi i confronti vengono sempre eseguiti: nessuna scorciatoia che
  // riveli quale dei due campi è sbagliato.
  const utenteOk = ugualiATempoCostante(fornite.utente, attese.utente);
  const passwordOk = ugualiATempoCostante(fornite.password, attese.password);
  return { esito: utenteOk && passwordOk ? "ok" : "errate" };
}

const INTESTAZIONI_COMUNI = {
  "Cache-Control": "no-store",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
};

/** Risposta che chiede le credenziali al browser. */
export function rispostaChiediCredenziali(messaggio = "Accesso riservato.") {
  return new Response(messaggio, {
    status: 401,
    headers: {
      ...INTESTAZIONI_COMUNI,
      "WWW-Authenticate": 'Basic realm="STA Social Studio", charset="UTF-8"',
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}

/** Risposta per ambiente non configurato. */
export function rispostaNonConfigurato() {
  return new Response(
    "Social Studio non è configurato: mancano SOCIAL_STUDIO_UTENTE e SOCIAL_STUDIO_PASSWORD.",
    { status: 503, headers: { ...INTESTAZIONI_COMUNI, "Content-Type": "text/plain; charset=utf-8" } },
  );
}
