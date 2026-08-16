import { VERSIONE_SCHEMA } from "./schema";

/**
 * Migrazioni dello schema dei contenuti.
 *
 * Regole, in ordine di importanza:
 *
 * 1. **Mai distruttive.** Una migrazione aggiunge o trasforma, non cancella.
 *    Se un campo va in disuso resta dov'è: occupa pochi byte e permette di
 *    tornare indietro.
 * 2. **Pure.** Ricevono un oggetto e ne restituiscono uno nuovo, senza toccare
 *    l'originale. Così sono verificabili senza database.
 * 3. **In catena.** Un record a versione 1 attraversa tutte le migrazioni fino
 *    alla versione corrente, una per volta.
 *
 * Aggiungere una migrazione significa: incrementare VERSIONE_SCHEMA in
 * schema.js, aggiungere qui la voce con la stessa chiave numerica di arrivo, e
 * scrivere il test che dimostra che nessun campo preesistente si perde.
 */

/**
 * Ogni voce trasforma un record DALLA versione precedente ALLA chiave indicata.
 * @type {Record<number, (record: object) => object>}
 */
export const MIGRAZIONI = {
  // 2: (record) => ({ ...record, nuovoCampo: valorePredefinito }),
};

/** La versione più alta raggiungibile con le migrazioni disponibili. */
export function versionePiuAlta() {
  const chiavi = Object.keys(MIGRAZIONI).map(Number);
  return chiavi.length ? Math.max(VERSIONE_SCHEMA, ...chiavi) : VERSIONE_SCHEMA;
}

/**
 * Porta un record alla versione corrente.
 *
 * @param {object} record
 * @param {number} [bersaglio]
 * @returns {{record: object, applicate: number[]}}
 */
export function migra(record, bersaglio = VERSIONE_SCHEMA) {
  if (!record || typeof record !== "object") {
    throw new Error("Migrazione: record non valido.");
  }

  const partenza = Number(record.versioneSchema ?? 1);
  if (!Number.isFinite(partenza) || partenza < 1) {
    throw new Error(`Migrazione: versione di partenza non valida (${record.versioneSchema}).`);
  }
  if (partenza > bersaglio) {
    // Un record più nuovo del codice che lo legge: fermarsi è l'unica scelta
    // sicura. Aggiornare l'applicazione, non degradare il dato.
    throw new Error(
      `Il contenuto usa lo schema v${partenza}, questa versione di Social Studio arriva alla v${bersaglio}. ` +
        "Aggiorna l'applicazione: il dato non va toccato.",
    );
  }

  let corrente = record;
  const applicate = [];
  for (let v = partenza + 1; v <= bersaglio; v += 1) {
    const passo = MIGRAZIONI[v];
    if (!passo) {
      throw new Error(`Manca la migrazione verso lo schema v${v}: catena interrotta.`);
    }
    corrente = passo(corrente);
    corrente = { ...corrente, versioneSchema: v };
    applicate.push(v);
  }

  return { record: corrente, applicate };
}

/** Migra un elenco, riportando gli errori senza fermare gli altri record. */
export function migraElenco(record, bersaglio = VERSIONE_SCHEMA) {
  const riusciti = [];
  const falliti = [];
  for (const r of record) {
    try {
      riusciti.push(migra(r, bersaglio).record);
    } catch (errore) {
      falliti.push({ id: r?.id ?? "(senza id)", motivo: errore.message });
    }
  }
  return { riusciti, falliti };
}
