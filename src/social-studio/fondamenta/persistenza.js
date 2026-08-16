/**
 * Persistenza e spazio dell'archivio locale.
 *
 * Senza permesso di persistenza il browser può liberare IndexedDB quando lo
 * spazio scarseggia, e i contenuti spariscono senza preavviso. Il permesso si
 * chiede una volta, al momento giusto — non all'apertura della pagina, quando
 * l'utente non ha ancora capito che cosa sta autorizzando, ma alla prima
 * scrittura vera.
 */

const CHIAVE_RICHIESTA = "sta-social-studio:persistenza-richiesta";

/** Stato attuale, senza chiedere nulla. */
export async function statoPersistenza() {
  const supportata = Boolean(navigator.storage?.persist && navigator.storage?.persisted);
  if (!supportata) return { supportata: false, persistente: false, giaChiesta: false };
  return {
    supportata: true,
    persistente: await navigator.storage.persisted(),
    giaChiesta: localStorage.getItem(CHIAVE_RICHIESTA) === "1",
  };
}

/**
 * Chiede la persistenza, una volta sola.
 *
 * Alcuni browser la concedono in silenzio in base all'uso del sito, altri
 * mostrano una richiesta, altri la negano sempre: in tutti i casi la risposta
 * va trattata come un'informazione, non come una garanzia.
 *
 * @returns {Promise<{concessa: boolean, motivo: string}>}
 */
export async function chiediPersistenza() {
  if (!navigator.storage?.persist) {
    return { concessa: false, motivo: "Questo browser non offre lo storage persistente." };
  }
  if (await navigator.storage.persisted()) {
    return { concessa: true, motivo: "Persistenza già attiva." };
  }

  const concessa = await navigator.storage.persist();
  localStorage.setItem(CHIAVE_RICHIESTA, "1");

  return {
    concessa,
    motivo: concessa
      ? "Il browser conserverà i dati anche sotto pressione di spazio."
      : "Il browser ha negato la persistenza: i dati possono essere liberati. Esporta un backup con regolarità.",
  };
}

/** Byte in forma leggibile. */
export function formattaByte(byte) {
  if (!Number.isFinite(byte) || byte <= 0) return "0 B";
  const unita = ["B", "KB", "MB", "GB"];
  const i = Math.min(unita.length - 1, Math.floor(Math.log(byte) / Math.log(1024)));
  const valore = byte / 1024 ** i;
  return `${valore.toFixed(valore < 10 && i > 0 ? 1 : 0)} ${unita[i]}`;
}

/**
 * Valuta lo stato dello spazio e dice se e quanto preoccuparsi.
 * Le soglie sono deliberatamente prudenti: il costo di un avviso inutile è
 * nullo, quello di perdere le bozze no.
 */
export function valutaSpazio({ byte, quota, persistente }) {
  const percentuale = quota ? (byte / quota) * 100 : null;

  if (percentuale !== null && percentuale >= 80) {
    return {
      livello: "errore",
      messaggio: `Spazio quasi esaurito (${percentuale.toFixed(0)}% della quota). Esporta un backup e libera contenuti archiviati.`,
    };
  }
  if (percentuale !== null && percentuale >= 60) {
    return {
      livello: "avviso",
      messaggio: `Spazio in esaurimento (${percentuale.toFixed(0)}% della quota).`,
    };
  }
  if (!persistente) {
    return {
      livello: "avviso",
      messaggio: "Persistenza non attiva: il browser può liberare l'archivio. Esporta un backup con regolarità.",
    };
  }
  return { livello: "ok", messaggio: "Archivio persistente." };
}
