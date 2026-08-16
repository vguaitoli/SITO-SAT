import { convalidaContenuto, VERSIONE_SCHEMA } from "./schema";
import { migra } from "./migrazioni";

/**
 * SocialStorage — il contratto dell'archivio.
 *
 * I componenti dell'interfaccia parlano solo con questi metodi e ricevono
 * l'archivio da un contesto React. Non importano mai un'implementazione:
 * IndexedDB oggi, qualcos'altro domani, senza toccare la UI.
 *
 * Regole del contratto:
 *
 * - tutti i metodi sono asincroni, anche quando l'implementazione è sincrona;
 * - i binari (fotografie, GPX) stanno separati dai metadati e si citano per
 *   `idBlob`: un contenuto non porta mai dentro di sé i byte di un'immagine;
 * - `leggi()` migra il record allo schema corrente prima di restituirlo;
 * - `salva()` convalida: un record non conforme non entra nell'archivio.
 *
 * IndexedDB è una libreria di lavoro, non un archivio fotografico permanente:
 * il browser può liberarlo. Il backup esportabile non è un accessorio.
 */

/**
 * @typedef {object} SocialStorage
 * @property {(filtro?: object) => Promise<object[]>} elenca
 * @property {(id: string) => Promise<object|null>} leggi
 * @property {(contenuto: object) => Promise<string>} salva
 * @property {(id: string) => Promise<void>} elimina
 * @property {(id: string) => Promise<string>} duplica
 * @property {(tipo: "immagine"|"gpx", blob: Blob, meta?: object) => Promise<string>} salvaBlob
 * @property {(idBlob: string) => Promise<Blob|null>} leggiBlob
 * @property {(idBlob: string) => Promise<string|null>} urlTemporaneo
 * @property {(idBlob: string) => Promise<void>} eliminaBlob
 * @property {(opzioni?: object) => Promise<object>} esportaBackup
 * @property {(dati: object, modo?: "unisci"|"sostituisci") => Promise<object>} importaBackup
 * @property {() => Promise<{byte: number, quota: number|null, persistente: boolean}>} spazioUsato
 */

/** I metodi che ogni implementazione deve fornire. Usato dai test. */
export const METODI_RICHIESTI = [
  "elenca", "leggi", "salva", "elimina", "duplica",
  "salvaBlob", "leggiBlob", "urlTemporaneo", "eliminaBlob",
  "esportaBackup", "importaBackup", "spazioUsato",
];

/** Verifica che un oggetto rispetti la forma del contratto. */
export function rispettaContratto(archivio) {
  const mancanti = METODI_RICHIESTI.filter((m) => typeof archivio?.[m] !== "function");
  return { valido: mancanti.length === 0, mancanti };
}

const adesso = () => new Date().toISOString();
const nuovoId = (p) => `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

/** Riepilogo leggero per gli elenchi: non si caricano i contenuti interi. */
function riepilogo(c) {
  return {
    id: c.id,
    titolo: c.titolo || c.fattuali?.nome || "(senza titolo)",
    categoria: c.categoria,
    formato: c.formato,
    stato: c.stato,
    modificato: c.modificato,
    dataPrevista: c.dataPrevista,
  };
}

function applicaFiltro(elenco, filtro = {}) {
  return elenco.filter((c) => {
    if (filtro.categoria && c.categoria !== filtro.categoria) return false;
    if (filtro.stato && c.stato !== filtro.stato) return false;
    if (filtro.formato && c.formato !== filtro.formato) return false;
    if (filtro.testo) {
      const ago = filtro.testo.toLowerCase();
      const fieno = `${c.titolo} ${c.fattuali?.nome ?? ""}`.toLowerCase();
      if (!fieno.includes(ago)) return false;
    }
    return true;
  });
}

/**
 * Implementazione in memoria.
 *
 * Serve ai test — che così non dipendono da IndexedDB — e come riferimento del
 * comportamento atteso: se le due implementazioni divergono, questa ha ragione.
 */
export function creaArchivioMemoria() {
  const contenuti = new Map();
  const blob = new Map();
  const media = new Map();
  const url = new Map();

  return {
    async elenca(filtro) {
      const tutti = [...contenuti.values()].map(riepilogo);
      return applicaFiltro(tutti, filtro).sort((a, b) => b.modificato.localeCompare(a.modificato));
    },

    async leggi(id) {
      const grezzo = contenuti.get(id);
      if (!grezzo) return null;
      return migra(structuredClone(grezzo)).record;
    },

    async salva(c) {
      const convalidato = convalidaContenuto({ ...c, modificato: adesso() });
      contenuti.set(convalidato.id, structuredClone(convalidato));
      return convalidato.id;
    },

    async elimina(id) {
      contenuti.delete(id);
    },

    async duplica(id) {
      const originale = contenuti.get(id);
      if (!originale) throw new Error(`Contenuto ${id} inesistente.`);
      const copia = convalidaContenuto({
        ...structuredClone(originale),
        id: nuovoId("cnt"),
        titolo: `${originale.titolo || originale.fattuali?.nome || "Contenuto"} (copia)`,
        stato: "bozza",
        versioni: [],
        creato: adesso(),
        modificato: adesso(),
      });
      contenuti.set(copia.id, copia);
      return copia.id;
    },

    async salvaBlob(tipo, dati, meta = {}) {
      const id = nuovoId(tipo === "gpx" ? "gpx" : "img");
      blob.set(id, dati);
      media.set(id, { id, tipo, ...meta, byte: dati.size ?? 0, aggiunto: adesso() });
      return id;
    },

    async leggiBlob(idBlob) {
      return blob.get(idBlob) ?? null;
    },

    async urlTemporaneo(idBlob) {
      const b = blob.get(idBlob);
      if (!b) return null;
      if (!url.has(idBlob)) url.set(idBlob, URL.createObjectURL(b));
      return url.get(idBlob);
    },

    async eliminaBlob(idBlob) {
      const u = url.get(idBlob);
      if (u) {
        URL.revokeObjectURL(u);
        url.delete(idBlob);
      }
      blob.delete(idBlob);
      media.delete(idBlob);
    },

    async esportaBackup({ includiGpx = false } = {}) {
      const pacco = {
        formato: "sta-social-studio-backup",
        versioneSchema: VERSIONE_SCHEMA,
        esportatoIl: adesso(),
        contenuti: [...contenuti.values()].map((c) => structuredClone(c)),
        media: [...media.values()].filter((m) => m.tipo !== "gpx"),
        planner: [],
        impostazioni: {},
      };
      // I GPX escono solo su richiesta esplicita: sono un asset dell'attività.
      if (includiGpx) {
        pacco.gpx = [];
        for (const [id, meta] of media) {
          if (meta.tipo !== "gpx") continue;
          const b = blob.get(id);
          pacco.gpx.push({ idBlob: id, nome: meta.nome ?? "", contenuto: b ? await b.text() : "" });
        }
      }
      return pacco;
    },

    async importaBackup(dati, modo = "unisci") {
      if (dati?.formato !== "sta-social-studio-backup") {
        throw new Error("Il file non è un backup di Social Studio.");
      }
      if (modo === "sostituisci") {
        contenuti.clear();
        media.clear();
        blob.clear();
      }
      let importati = 0;
      const falliti = [];
      for (const grezzo of dati.contenuti ?? []) {
        try {
          const migrato = migra(grezzo).record;
          contenuti.set(migrato.id, convalidaContenuto(migrato));
          importati += 1;
        } catch (errore) {
          falliti.push({ id: grezzo?.id ?? "(senza id)", motivo: errore.message });
        }
      }
      return { importati, falliti };
    },

    async spazioUsato() {
      let byte = 0;
      for (const b of blob.values()) byte += b.size ?? 0;
      return { byte, quota: null, persistente: false };
    },
  };
}
