import { describe, expect, it } from "vitest";
import { contenutoVuoto, convalidaContenuto, VERSIONE_SCHEMA } from "./schema";
import { migra, migraElenco, MIGRAZIONI } from "./migrazioni";
import { creaArchivioMemoria, METODI_RICHIESTI, rispettaContratto } from "./archivio";

/**
 * Schema, migrazioni e archivio.
 *
 * Sono le parti dove un errore non si vede subito: un campo perso in una
 * migrazione o un backup che non torna indietro si scoprono mesi dopo, quando
 * il dato serve. Questi test esistono per accorgersene lo stesso giorno.
 */

describe("schema", () => {
  it("crea un contenuto nuovo già conforme", () => {
    const c = contenutoVuoto({ categoria: "eventi", formato: "post" });
    expect(c.versioneSchema).toBe(VERSIONE_SCHEMA);
    expect(c.stato).toBe("bozza");
    expect(c.fattuali.tappe).toEqual([]);
    expect(c.editoriale.caption.lunghezza).toBe("standard");
  });

  it("tiene separati i rami fattuale ed editoriale", () => {
    const c = contenutoVuoto();
    // Il prezzo è un fatto, il claim è testo: non devono stare insieme.
    expect(c.fattuali).toHaveProperty("prezzo");
    expect(c.fattuali).not.toHaveProperty("claim");
    expect(c.editoriale).toHaveProperty("claim");
    expect(c.editoriale).not.toHaveProperty("prezzo");
  });

  it("registra la provenienza di ogni dato fattuale", () => {
    const c = convalidaContenuto({
      ...contenutoVuoto(),
      fattuali: { prezzo: "580 €", km: "550 km", origine: { prezzo: "sito", km: "manuale" } },
    });
    expect(c.fattuali.origine).toEqual({ prezzo: "sito", km: "manuale" });
  });

  it("rifiuta una categoria inesistente con un messaggio leggibile", () => {
    expect(() => convalidaContenuto({ ...contenutoVuoto(), categoria: "motociclismo" }))
      .toThrow(/categoria/i);
  });

  it("rifiuta uno zoom del ritaglio fuori scala", () => {
    const c = contenutoVuoto();
    expect(() => convalidaContenuto({
      ...c,
      media: { ...c.media, cover: { idBlob: "img-1", zoom: 12, x: 0.5, y: 0.5 } },
    })).toThrow();
  });

  it("conserva l'istantanea della fonte come sola lettura", () => {
    const istantanea = { prezzo: "580 €", km: "550 km" };
    const c = convalidaContenuto({
      ...contenutoVuoto(),
      fonte: { tipo: "evento", slug: "la-via-dei-giganti-2026", istantanea, importatoIl: new Date().toISOString() },
    });
    expect(c.fonte.slug).toBe("la-via-dei-giganti-2026");
    expect(c.fonte.istantanea).toEqual(istantanea);
  });
});

describe("migrazioni", () => {
  it("lascia intatto un record già alla versione corrente", () => {
    const c = contenutoVuoto();
    const { record, applicate } = migra(c);
    expect(applicate).toEqual([]);
    expect(record).toEqual(c);
  });

  it("si rifiuta di degradare un record più nuovo del codice", () => {
    const futuro = { ...contenutoVuoto(), versioneSchema: VERSIONE_SCHEMA + 5 };
    expect(() => migra(futuro)).toThrow(/Aggiorna l'applicazione/);
  });

  it("segnala la catena interrotta invece di saltare un passo", () => {
    const vecchio = { ...contenutoVuoto(), versioneSchema: 1 };
    expect(() => migra(vecchio, VERSIONE_SCHEMA + 2)).toThrow(/catena interrotta/);
  });

  it("applica una catena senza perdere i campi preesistenti", () => {
    // Catena finta: verifica il meccanismo, non una migrazione reale.
    const originali = { ...MIGRAZIONI };
    try {
      MIGRAZIONI[2] = (r) => ({ ...r, aggiuntoInV2: true });
      MIGRAZIONI[3] = (r) => ({ ...r, aggiuntoInV3: true });

      const partenza = { ...contenutoVuoto(), versioneSchema: 1, titolo: "Da conservare" };
      const { record, applicate } = migra(partenza, 3);

      expect(applicate).toEqual([2, 3]);
      expect(record.versioneSchema).toBe(3);
      expect(record.aggiuntoInV2).toBe(true);
      expect(record.aggiuntoInV3).toBe(true);
      // Il punto della regola "mai distruttive".
      expect(record.titolo).toBe("Da conservare");
      expect(record.fattuali).toEqual(partenza.fattuali);
    } finally {
      for (const k of Object.keys(MIGRAZIONI)) delete MIGRAZIONI[k];
      Object.assign(MIGRAZIONI, originali);
    }
  });

  it("non muta il record di partenza", () => {
    const originali = { ...MIGRAZIONI };
    try {
      MIGRAZIONI[2] = (r) => ({ ...r, nuovo: 1 });
      const partenza = { ...contenutoVuoto(), versioneSchema: 1 };
      const copia = structuredClone(partenza);
      migra(partenza, 2);
      expect(partenza).toEqual(copia);
    } finally {
      for (const k of Object.keys(MIGRAZIONI)) delete MIGRAZIONI[k];
      Object.assign(MIGRAZIONI, originali);
    }
  });

  it("migra un elenco isolando i record difettosi", () => {
    const buono = contenutoVuoto();
    const rotto = { id: "x", versioneSchema: VERSIONE_SCHEMA + 9 };
    const { riusciti, falliti } = migraElenco([buono, rotto]);
    expect(riusciti).toHaveLength(1);
    expect(falliti).toHaveLength(1);
    expect(falliti[0].id).toBe("x");
  });
});

describe("contratto SocialStorage", () => {
  it("l'implementazione in memoria espone tutti i metodi richiesti", () => {
    expect(rispettaContratto(creaArchivioMemoria())).toEqual({ valido: true, mancanti: [] });
  });

  it("riconosce un'implementazione incompleta", () => {
    const esito = rispettaContratto({ leggi: () => {} });
    expect(esito.valido).toBe(false);
    expect(esito.mancanti).toEqual(METODI_RICHIESTI.filter((m) => m !== "leggi"));
  });
});

describe("archivio in memoria", () => {
  it("salva, rilegge ed elenca", async () => {
    const a = creaArchivioMemoria();
    const c = { ...contenutoVuoto({ categoria: "eventi" }), titolo: "La Via dei Giganti" };
    const id = await a.salva(c);

    const riletto = await a.leggi(id);
    expect(riletto.titolo).toBe("La Via dei Giganti");

    const elenco = await a.elenca();
    expect(elenco).toHaveLength(1);
    expect(elenco[0]).toMatchObject({ id, categoria: "eventi", stato: "bozza" });
    // L'elenco è un riepilogo: non trascina i contenuti interi.
    expect(elenco[0]).not.toHaveProperty("fattuali");
  });

  it("restituisce null per un id inesistente", async () => {
    expect(await creaArchivioMemoria().leggi("mai-esistito")).toBeNull();
  });

  it("non accetta un contenuto non conforme", async () => {
    const a = creaArchivioMemoria();
    await expect(a.salva({ ...contenutoVuoto(), formato: "poster" })).rejects.toThrow();
  });

  it("filtra per categoria, stato e testo", async () => {
    const a = creaArchivioMemoria();
    await a.salva({ ...contenutoVuoto({ categoria: "eventi" }), titolo: "Giganti", stato: "pronto" });
    await a.salva({ ...contenutoVuoto({ categoria: "trail" }), titolo: "Buddusò" });

    expect(await a.elenca({ categoria: "eventi" })).toHaveLength(1);
    expect(await a.elenca({ stato: "pronto" })).toHaveLength(1);
    expect(await a.elenca({ testo: "budd" })).toHaveLength(1);
    expect(await a.elenca({ categoria: "garage" })).toHaveLength(0);
  });

  it("duplica come nuova bozza, senza portarsi dietro le versioni", async () => {
    const a = creaArchivioMemoria();
    const id = await a.salva({
      ...contenutoVuoto(),
      titolo: "Originale",
      stato: "pubblicato",
      versioni: [{ n: 1, quando: new Date().toISOString(), etichetta: "prima", dati: {} }],
    });

    const copiaId = await a.duplica(id);
    const copia = await a.leggi(copiaId);

    expect(copiaId).not.toBe(id);
    expect(copia.titolo).toBe("Originale (copia)");
    expect(copia.stato).toBe("bozza");
    expect(copia.versioni).toEqual([]);
    expect((await a.leggi(id)).titolo).toBe("Originale");
  });

  it("tiene i binari fuori dai contenuti", async () => {
    const a = creaArchivioMemoria();
    const idBlob = await a.salvaBlob("immagine", new Blob(["xxx"], { type: "image/webp" }), { nome: "foto.webp" });
    const id = await a.salva({
      ...contenutoVuoto(),
      media: { cover: { idBlob, zoom: 1, x: 0.5, y: 0.5 }, esperienza: [], sfondi: {} },
    });

    const c = await a.leggi(id);
    // Nel contenuto c'è il riferimento, non i byte.
    expect(c.media.cover.idBlob).toBe(idBlob);
    expect(JSON.stringify(c)).not.toContain("xxx");
    expect(await a.leggiBlob(idBlob)).toBeInstanceOf(Blob);
  });

  it("misura lo spazio occupato dai binari", async () => {
    const a = creaArchivioMemoria();
    expect((await a.spazioUsato()).byte).toBe(0);
    await a.salvaBlob("immagine", new Blob(["0123456789"]));
    expect((await a.spazioUsato()).byte).toBe(10);
  });
});

describe("backup", () => {
  it("esporta e reimporta senza perdere nulla", async () => {
    const a = creaArchivioMemoria();
    await a.salva({ ...contenutoVuoto({ categoria: "eventi" }), titolo: "Giganti" });
    await a.salva({ ...contenutoVuoto({ categoria: "crew" }), titolo: "Cena a Buddusò" });

    const pacco = await a.esportaBackup();
    expect(pacco.formato).toBe("sta-social-studio-backup");
    expect(pacco.versioneSchema).toBe(VERSIONE_SCHEMA);
    expect(pacco.contenuti).toHaveLength(2);

    const b = creaArchivioMemoria();
    const esito = await b.importaBackup(pacco);
    expect(esito).toMatchObject({ importati: 2, falliti: [] });

    const primaTitoli = (await a.elenca()).map((c) => c.titolo).sort();
    const dopoTitoli = (await b.elenca()).map((c) => c.titolo).sort();
    expect(dopoTitoli).toEqual(primaTitoli);
  });

  it("tiene i GPX fuori dal backup se non richiesti esplicitamente", async () => {
    const a = creaArchivioMemoria();
    await a.salvaBlob("gpx", new Blob(["<gpx>segreto</gpx>"]), { nome: "giganti.gpx" });

    const senza = await a.esportaBackup();
    expect(senza.gpx).toBeUndefined();
    expect(JSON.stringify(senza)).not.toContain("segreto");

    const con = await a.esportaBackup({ includiGpx: true });
    expect(con.gpx).toHaveLength(1);
    expect(con.gpx[0].contenuto).toContain("segreto");
  });

  it("rifiuta un file che non è un backup di Social Studio", async () => {
    await expect(creaArchivioMemoria().importaBackup({ formato: "altro" }))
      .rejects.toThrow(/non è un backup/i);
  });

  it("in modo «unisci» conserva i contenuti già presenti", async () => {
    const a = creaArchivioMemoria();
    await a.salva({ ...contenutoVuoto(), titolo: "Preesistente" });

    const b = creaArchivioMemoria();
    await b.salva({ ...contenutoVuoto(), titolo: "In arrivo" });

    await a.importaBackup(await b.esportaBackup(), "unisci");
    expect((await a.elenca()).map((c) => c.titolo).sort()).toEqual(["In arrivo", "Preesistente"]);
  });

  it("in modo «sostituisci» rimpiazza il contenuto dell'archivio", async () => {
    const a = creaArchivioMemoria();
    await a.salva({ ...contenutoVuoto(), titolo: "Preesistente" });

    const b = creaArchivioMemoria();
    await b.salva({ ...contenutoVuoto(), titolo: "In arrivo" });

    await a.importaBackup(await b.esportaBackup(), "sostituisci");
    expect((await a.elenca()).map((c) => c.titolo)).toEqual(["In arrivo"]);
  });

  it("isola i record difettosi invece di far fallire l'import", async () => {
    const a = creaArchivioMemoria();
    const pacco = {
      formato: "sta-social-studio-backup",
      versioneSchema: VERSIONE_SCHEMA,
      esportatoIl: new Date().toISOString(),
      contenuti: [contenutoVuoto(), { id: "rotto", versioneSchema: VERSIONE_SCHEMA + 9 }],
    };
    const esito = await a.importaBackup(pacco);
    expect(esito.importati).toBe(1);
    expect(esito.falliti).toHaveLength(1);
  });
});
