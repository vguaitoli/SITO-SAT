/**
 * CaptionProvider — interfaccia agnostica rispetto al fornitore.
 *
 * Social Studio non conosce alcun fornitore per nome. Ne conosce solo questa
 * forma, e riceve l'implementazione da fuori.
 *
 * @typedef {object} CaptionProvider
 * @property {string} nome                      etichetta mostrata nell'interfaccia
 * @property {() => Promise<boolean>} disponibile
 * @property {(richiesta: RichiestaCaption) => Promise<RispostaCaption>} genera
 *
 * @typedef {object} RichiestaCaption
 * @property {string} rubrica
 * @property {"breve"|"standard"|"storytelling"} lunghezza
 * @property {Record<string, string|number|boolean>} fattuali  contesto in sola lettura
 * @property {{titolo: string, claim: string, note: string}} editoriale
 * @property {string[]} paragrafiBloccati
 *
 * @typedef {object} RispostaCaption
 * @property {string} testo
 * @property {string} origine
 */

/** L'endpoint sta sotto il prefisso protetto: vedi api/caption.js. */
const ENDPOINT = "/admin/social/api/caption";

/**
 * Provider manuale: nessuna AI, nessuna rete.
 *
 * È il predefinito. Restituisce una traccia da compilare, costruita sulla
 * rubrica: struttura e promemoria, non testo finto da correggere.
 */
export function creaProviderManuale() {
  const tracce = {
    tour: ["Che esperienza è", "Il territorio che attraversa", "Per chi è adatta", "Che cosa la distingue", "Invito all'azione"],
    eventi: ["L'attacco: perché questo evento", "I dati che contano", "Che cosa si vive", "Come si partecipa"],
    trail: ["Dove siamo", "Com'è il fondo", "La difficoltà reale", "Nota tecnica per chi ci va"],
    sardegna: ["Il luogo", "Che cosa lo rende diverso", "Un dettaglio concreto", "Come si arriva o quando andarci"],
    guide: ["Chi è", "Che cosa sa fare", "Un episodio", "Perché ci si affida a lui"],
    garage: ["Il problema", "La soluzione", "Come si fa", "Errore da evitare"],
    crew: ["Il momento", "Chi c'era", "Perché vale la pena raccontarlo"],
    info: ["La domanda", "La risposta breve", "I dettagli", "Dove approfondire"],
  };

  return {
    nome: "Manuale",
    async disponibile() {
      return true;
    },
    async genera({ rubrica }) {
      const traccia = tracce[rubrica] || tracce.info;
      return {
        testo: traccia.map((p) => `${p}:\n`).join("\n"),
        origine: "manuale",
      };
    },
  };
}

/**
 * Provider remoto: delega a /admin/social/api/caption.
 *
 * **Non custodisce, non incorpora e non trasmette alcun segreto.** La
 * richiesta viaggia con `credentials: "same-origin"`: l'autenticazione è
 * quella con cui il browser ha già aperto lo studio, rimandata dal browser
 * stesso perché l'endpoint sta sotto lo stesso prefisso protetto. Nel bundle
 * non esiste alcun token, e non ce n'è nessuno in localStorage.
 */
export function creaProviderRemoto() {
  return {
    nome: "Remoto",

    async disponibile() {
      try {
        // Una GET su un endpoint che accetta solo POST: 405 significa che
        // c'è ed è raggiungibile, 401 che la sessione non è più valida.
        const risposta = await fetch(ENDPOINT, { method: "GET", credentials: "same-origin" });
        return risposta.status === 405;
      } catch {
        return false;
      }
    },

    async genera(richiesta) {
      const risposta = await fetch(ENDPOINT, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(richiesta),
      });

      if (risposta.status === 401) {
        throw new Error("Sessione scaduta: ricarica la pagina e reinserisci le credenziali.");
      }
      if (risposta.status === 429) {
        throw new Error("Troppe richieste: riprova fra qualche minuto.");
      }
      if (!risposta.ok) {
        const corpo = await risposta.json().catch(() => ({}));
        throw new Error(corpo.errore || `Errore del servizio (${risposta.status}).`);
      }

      const corpo = await risposta.json();
      return { testo: corpo.testo || "", origine: "remoto" };
    },
  };
}
