import { convalidaContenuto, VERSIONE_SCHEMA } from "./schema";
import { migra } from "./migrazioni";

/**
 * SocialStorage su IndexedDB.
 *
 * IndexedDB è l'unica API del browser che regge centinaia di MB di fotografie
 * ed è asincrona e transazionale. localStorage è escluso: cinque megabyte e
 * sincrono.
 *
 * **È una libreria di lavoro, non un archivio permanente.** Il browser può
 * liberarla quando lo spazio scarseggia, e cancellare i dati del sito la
 * svuota. Per questo l'esportazione del backup non è un accessorio ma parte
 * del flusso normale, e l'interfaccia mostra sempre stato e spazio.
 *
 * Il wrapper è scritto a mano: una dipendenza come `idb` non si giustifica per
 * le poche operazioni che servono qui.
 */

const NOME_DB = "sta-social-studio";
const VERSIONE_DB = 1;

const DEPOSITI = {
  contenuti: "contenuti",
  blob: "blob",
  media: "media",
  impostazioni: "impostazioni",
};

const adesso = () => new Date().toISOString();
const nuovoId = (p) => `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

/** Apre il database, creando i depositi alla prima esecuzione. */
function apri() {
  return new Promise((risolvi, rifiuta) => {
    const richiesta = indexedDB.open(NOME_DB, VERSIONE_DB);

    richiesta.onupgradeneeded = (evento) => {
      const db = evento.target.result;
      // Le migrazioni dello SCHEMA dei record stanno in migrazioni.js e girano
      // in lettura. Qui si tocca solo la struttura del database.
      if (!db.objectStoreNames.contains(DEPOSITI.contenuti)) {
        const s = db.createObjectStore(DEPOSITI.contenuti, { keyPath: "id" });
        s.createIndex("categoria", "categoria");
        s.createIndex("stato", "stato");
        s.createIndex("modificato", "modificato");
      }
      if (!db.objectStoreNames.contains(DEPOSITI.blob)) {
        db.createObjectStore(DEPOSITI.blob, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(DEPOSITI.media)) {
        const s = db.createObjectStore(DEPOSITI.media, { keyPath: "id" });
        s.createIndex("tipo", "tipo");
      }
      if (!db.objectStoreNames.contains(DEPOSITI.impostazioni)) {
        db.createObjectStore(DEPOSITI.impostazioni, { keyPath: "chiave" });
      }
    };

    richiesta.onsuccess = () => risolvi(richiesta.result);
    richiesta.onerror = () => rifiuta(richiesta.error);
    richiesta.onblocked = () =>
      rifiuta(new Error("Un'altra scheda tiene aperto l'archivio: chiudila e riprova."));
  });
}

/** Esegue una transazione e ne restituisce il risultato. */
async function transazione(depositi, modo, lavoro) {
  const db = await apri();
  try {
    return await new Promise((risolvi, rifiuta) => {
      const tx = db.transaction(depositi, modo);
      let esito;
      tx.oncomplete = () => risolvi(esito);
      tx.onerror = () => rifiuta(tx.error);
      tx.onabort = () => rifiuta(tx.error || new Error("Transazione annullata."));
      Promise.resolve(lavoro(tx)).then((v) => { esito = v; }).catch(rifiuta);
    });
  } finally {
    db.close();
  }
}

const attendi = (richiesta) =>
  new Promise((risolvi, rifiuta) => {
    richiesta.onsuccess = () => risolvi(richiesta.result);
    richiesta.onerror = () => rifiuta(richiesta.error);
  });

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
      if (!`${c.titolo} ${c.fattuali?.nome ?? ""}`.toLowerCase().includes(ago)) return false;
    }
    return true;
  });
}

/** Vero se il browser corrente offre IndexedDB. */
export function archivioDisponibile() {
  return typeof indexedDB !== "undefined";
}

export function creaArchivioLocale() {
  const urlVivi = new Map();

  return {
    async elenca(filtro) {
      const tutti = await transazione([DEPOSITI.contenuti], "readonly", (tx) =>
        attendi(tx.objectStore(DEPOSITI.contenuti).getAll()),
      );
      return applicaFiltro(tutti.map(riepilogo), filtro)
        .sort((a, b) => String(b.modificato).localeCompare(String(a.modificato)));
    },

    async leggi(id) {
      const grezzo = await transazione([DEPOSITI.contenuti], "readonly", (tx) =>
        attendi(tx.objectStore(DEPOSITI.contenuti).get(id)),
      );
      if (!grezzo) return null;
      // La migrazione avviene in lettura: il dato su disco resta com'è finché
      // non viene risalvato, così un errore non lo rovina.
      return migra(grezzo).record;
    },

    async salva(contenuto) {
      const convalidato = convalidaContenuto({ ...contenuto, modificato: adesso() });
      await transazione([DEPOSITI.contenuti], "readwrite", (tx) =>
        attendi(tx.objectStore(DEPOSITI.contenuti).put(convalidato)),
      );
      return convalidato.id;
    },

    async elimina(id) {
      await transazione([DEPOSITI.contenuti], "readwrite", (tx) =>
        attendi(tx.objectStore(DEPOSITI.contenuti).delete(id)),
      );
    },

    async duplica(id) {
      const originale = await this.leggi(id);
      if (!originale) throw new Error(`Contenuto ${id} inesistente.`);
      const copia = convalidaContenuto({
        ...originale,
        id: nuovoId("cnt"),
        titolo: `${originale.titolo || originale.fattuali?.nome || "Contenuto"} (copia)`,
        stato: "bozza",
        versioni: [],
        creato: adesso(),
        modificato: adesso(),
      });
      await transazione([DEPOSITI.contenuti], "readwrite", (tx) =>
        attendi(tx.objectStore(DEPOSITI.contenuti).put(copia)),
      );
      return copia.id;
    },

    async salvaBlob(tipo, blob, meta = {}) {
      const id = nuovoId(tipo === "gpx" ? "gpx" : "img");
      await transazione([DEPOSITI.blob, DEPOSITI.media], "readwrite", async (tx) => {
        await attendi(tx.objectStore(DEPOSITI.blob).put({ id, blob }));
        await attendi(tx.objectStore(DEPOSITI.media).put({
          id, tipo, ...meta, byte: blob.size ?? 0, aggiunto: adesso(),
        }));
      });
      return id;
    },

    async leggiBlob(idBlob) {
      const voce = await transazione([DEPOSITI.blob], "readonly", (tx) =>
        attendi(tx.objectStore(DEPOSITI.blob).get(idBlob)),
      );
      return voce?.blob ?? null;
    },

    async urlTemporaneo(idBlob) {
      if (urlVivi.has(idBlob)) return urlVivi.get(idBlob);
      const blob = await this.leggiBlob(idBlob);
      if (!blob) return null;
      const url = URL.createObjectURL(blob);
      urlVivi.set(idBlob, url);
      return url;
    },

    async eliminaBlob(idBlob) {
      const url = urlVivi.get(idBlob);
      if (url) {
        URL.revokeObjectURL(url);
        urlVivi.delete(idBlob);
      }
      await transazione([DEPOSITI.blob, DEPOSITI.media], "readwrite", async (tx) => {
        await attendi(tx.objectStore(DEPOSITI.blob).delete(idBlob));
        await attendi(tx.objectStore(DEPOSITI.media).delete(idBlob));
      });
    },

    /** Revoca gli object URL creati. Da chiamare quando lo studio si chiude. */
    liberaUrl() {
      for (const url of urlVivi.values()) URL.revokeObjectURL(url);
      urlVivi.clear();
    },

    async esportaBackup({ includiGpx = false } = {}) {
      const { contenuti, media, impostazioni } = await transazione(
        [DEPOSITI.contenuti, DEPOSITI.media, DEPOSITI.impostazioni], "readonly",
        async (tx) => ({
          contenuti: await attendi(tx.objectStore(DEPOSITI.contenuti).getAll()),
          media: await attendi(tx.objectStore(DEPOSITI.media).getAll()),
          impostazioni: await attendi(tx.objectStore(DEPOSITI.impostazioni).getAll()),
        }),
      );

      const pacco = {
        formato: "sta-social-studio-backup",
        versioneSchema: VERSIONE_SCHEMA,
        esportatoIl: adesso(),
        contenuti,
        media: media.filter((m) => m.tipo !== "gpx"),
        planner: [],
        impostazioni: Object.fromEntries(impostazioni.map((i) => [i.chiave, i.valore])),
      };

      // I GPX sono un asset dell'attività: escono solo su richiesta esplicita.
      if (includiGpx) {
        pacco.gpx = [];
        for (const m of media.filter((x) => x.tipo === "gpx")) {
          const blob = await this.leggiBlob(m.id);
          pacco.gpx.push({ idBlob: m.id, nome: m.nome ?? "", contenuto: blob ? await blob.text() : "" });
        }
      }
      return pacco;
    },

    async importaBackup(dati, modo = "unisci") {
      if (dati?.formato !== "sta-social-studio-backup") {
        throw new Error("Il file non è un backup di Social Studio.");
      }
      let importati = 0;
      const falliti = [];

      await transazione([DEPOSITI.contenuti], "readwrite", async (tx) => {
        const deposito = tx.objectStore(DEPOSITI.contenuti);
        if (modo === "sostituisci") await attendi(deposito.clear());
        for (const grezzo of dati.contenuti ?? []) {
          try {
            await attendi(deposito.put(convalidaContenuto(migra(grezzo).record)));
            importati += 1;
          } catch (errore) {
            falliti.push({ id: grezzo?.id ?? "(senza id)", motivo: errore.message });
          }
        }
      });

      return { importati, falliti };
    },

    async spazioUsato() {
      let byte = 0;
      let quota = null;
      let persistente = false;

      if (navigator.storage?.estimate) {
        const stima = await navigator.storage.estimate();
        byte = stima.usage ?? 0;
        quota = stima.quota ?? null;
      }
      if (navigator.storage?.persisted) {
        persistente = await navigator.storage.persisted();
      }
      return { byte, quota, persistente };
    },
  };
}
