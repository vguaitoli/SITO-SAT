/**
 * Autenticazione condivisa fra middleware e funzioni serverless riservate.
 *
 * Le credenziali arrivano esclusivamente dalle variabili d'ambiente già usate
 * dal Social Studio. Il frontend non incorpora né salva alcun segreto.
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
  return {
    utente: env.SOCIAL_STUDIO_UTENTE || "",
    password: env.SOCIAL_STUDIO_PASSWORD || "",
  };
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
 * @returns {{esito: "ok"|"non-configurato"|"mancante"|"illeggibile"|"errate"}}
 */
export function verifica(intestazioneAuth, env = process.env) {
  const attese = credenzialiAttese(env);
  if (!attese.utente || !attese.password) return { esito: "non-configurato" };
  if (!intestazioneAuth) return { esito: "mancante" };

  const fornite = leggiBasic(intestazioneAuth);
  if (!fornite) return { esito: "illeggibile" };

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
      "WWW-Authenticate": 'Basic realm="STA area riservata", charset="UTF-8"',
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}

/** Risposta per ambiente non configurato. */
export function rispostaNonConfigurato() {
  return new Response(
    "Area riservata non configurata: mancano SOCIAL_STUDIO_UTENTE e SOCIAL_STUDIO_PASSWORD.",
    {
      status: 503,
      headers: {
        ...INTESTAZIONI_COMUNI,
        "Content-Type": "text/plain; charset=utf-8",
      },
    },
  );
}
