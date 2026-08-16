/**
 * Protezione di /admin/social (Vercel Edge Middleware).
 *
 * Social Studio è local-first: i contenuti vivono in IndexedDB nel browser di
 * chi lavora, quindi un estraneo che aprisse la pagina vedrebbe uno studio
 * vuoto, non dati altrui. Resta però un'interfaccia amministrativa: non ha
 * ragione di essere pubblica.
 *
 * Autenticazione HTTP Basic con credenziali da variabili d'ambiente. È il
 * meccanismo più semplice che protegga davvero lato server, senza aggiungere
 * dipendenze né un provider di identità a un progetto che oggi non ne ha.
 *
 * Chiusura di sicurezza: in produzione, se le credenziali non sono
 * configurate, l'accesso viene NEGATO. Una rotta amministrativa che si apre da
 * sola perché manca una variabile è il modo classico di lasciare una porta
 * aperta senza accorgersene.
 *
 * Variabili d'ambiente richieste (da impostare su Vercel, mai nel codice):
 *   SOCIAL_STUDIO_UTENTE    nome utente
 *   SOCIAL_STUDIO_PASSWORD  password
 *
 * In sviluppo locale il middleware non gira: `vite` non lo esegue.
 */

export const config = {
  // Solo lo studio. Il resto del sito, compreso l'admin di TinaCMS, non passa di qui.
  matcher: ["/admin/social", "/admin/social/:path*"],
};

/** Confronto a tempo costante: non rivela la password un carattere per volta. */
function ugualiATempoCostante(a, b) {
  const ba = new TextEncoder().encode(a);
  const bb = new TextEncoder().encode(b);
  // Lunghezze diverse: si confronta comunque, per non trapelare la lunghezza.
  let diverso = ba.length ^ bb.length;
  const massimo = Math.max(ba.length, bb.length);
  for (let i = 0; i < massimo; i += 1) {
    diverso |= (ba[i] ?? 0) ^ (bb[i] ?? 0);
  }
  return diverso === 0;
}

function chiediCredenziali(motivo) {
  return new Response(motivo, {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="STA Social Studio", charset="UTF-8"',
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
    },
  });
}

export default function middleware(request) {
  const utenteAtteso = process.env.SOCIAL_STUDIO_UTENTE;
  const passwordAttesa = process.env.SOCIAL_STUDIO_PASSWORD;

  if (!utenteAtteso || !passwordAttesa) {
    return new Response(
      "Social Studio non è configurato: mancano SOCIAL_STUDIO_UTENTE e SOCIAL_STUDIO_PASSWORD.",
      { status: 503, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" } },
    );
  }

  const intestazione = request.headers.get("authorization") || "";
  if (!intestazione.toLowerCase().startsWith("basic ")) {
    return chiediCredenziali("Accesso riservato.");
  }

  let utente = "";
  let password = "";
  try {
    const decodificato = atob(intestazione.slice(6).trim());
    const separatore = decodificato.indexOf(":");
    utente = decodificato.slice(0, separatore);
    password = decodificato.slice(separatore + 1);
  } catch {
    return chiediCredenziali("Credenziali illeggibili.");
  }

  // Entrambi i confronti vengono sempre eseguiti: nessuna scorciatoia che
  // riveli quale dei due campi è sbagliato.
  const utenteOk = ugualiATempoCostante(utente, utenteAtteso);
  const passwordOk = ugualiATempoCostante(password, passwordAttesa);
  if (!utenteOk || !passwordOk) return chiediCredenziali("Credenziali non valide.");

  return undefined; // autenticato: la richiesta prosegue
}
