/**
 * Controlli sulla forma della richiesta, prima di guardarne il contenuto.
 *
 * Funzioni pure, isolate qui perché siano verificabili senza rete: il prefisso
 * `_` le esclude dal routing di Vercel.
 */

/**
 * Byte effettivi di una stringa in UTF-8.
 *
 * `string.length` conta unità UTF-16, non byte: una stringa di 30.000 caratteri
 * accentati o con emoji pesa molto più di 30.000 byte, e un tetto misurato sui
 * caratteri si aggira banalmente. Qui si misura ciò che viaggia davvero.
 */
export function byteUtf8(testo) {
  return new TextEncoder().encode(String(testo ?? "")).length;
}

/**
 * Accetta solo `application/json`.
 *
 * Il parametro `charset` è tollerato — è legittimo — mentre qualsiasi altro
 * tipo viene rifiutato: `text/plain` e `multipart/form-data` sono i vettori
 * classici per aggirare i controlli di origine, perché il browser li considera
 * richieste "semplici" e non chiede il preflight CORS.
 */
export function contentTypeAmmesso(intestazione) {
  if (typeof intestazione !== "string") return false;
  const tipo = intestazione.split(";")[0].trim().toLowerCase();
  return tipo === "application/json";
}

/**
 * Verifica che la richiesta arrivi dalla stessa origine.
 *
 * Tre segnali, in ordine di affidabilità:
 *
 * 1. `Sec-Fetch-Site`: lo manda il browser e non è falsificabile da JavaScript.
 *    `same-origin` passa, `cross-site` e `same-site` no.
 * 2. `Origin`: presente su tutte le richieste POST dai browser moderni. Deve
 *    coincidere con l'host servito.
 * 3. Se mancano entrambi la richiesta non viene da un browser — è un curl o un
 *    client server-side. Passa: l'autenticazione l'ha già superata, e
 *    bloccarla renderebbe l'endpoint inutilizzabile dagli strumenti.
 *
 * Lo scopo non è l'autorizzazione, che sta nelle credenziali, ma impedire che
 * una pagina di terzi faccia partire richieste dal browser di chi è già
 * autenticato.
 */
export function stessaOrigine({ origin, host, secFetchSite, proto = "https" }) {
  if (secFetchSite) {
    if (secFetchSite === "same-origin" || secFetchSite === "none") return { ok: true, motivo: secFetchSite };
    return { ok: false, motivo: `Sec-Fetch-Site: ${secFetchSite}` };
  }

  if (origin) {
    if (!host) return { ok: false, motivo: "host assente" };
    let atteso;
    try {
      atteso = new URL(origin).host;
    } catch {
      return { ok: false, motivo: "Origin illeggibile" };
    }
    return atteso === host
      ? { ok: true, motivo: "Origin coincidente" }
      : { ok: false, motivo: `Origin ${atteso} diverso da ${host}` };
  }

  // Nessun segnale del browser: non è una richiesta cross-site da pagina web.
  void proto;
  return { ok: true, motivo: "nessun segnale di origine" };
}
