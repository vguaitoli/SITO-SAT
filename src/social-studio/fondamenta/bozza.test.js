import { describe, expect, it } from "vitest";
import { creaArchivioMemoria } from "./archivio";
import { contenutoVuoto } from "./schema";
import { registraRevisione, ripristinaRevisione } from "./versioni";
import { highlightIniziali, kickerIniziale } from "./preset-eventi";
import { analizzaGpx } from "../motori/gpx";

/**
 * Salva → chiudi → riapri.
 *
 * È la promessa su cui poggia tutto il resto dell'editor: una bozza deve
 * tornare identica, non «quasi». Il test la verifica ramo per ramo — caption con
 * i suoi paragrafi bloccati, assegnazioni fotografiche, ritagli, riferimento al
 * GPX, configurazione della mappa, stato editoriale — perché è esattamente il
 * genere di cosa che si perde un campo alla volta senza che nessuno lo noti.
 */

const GPX = `<?xml version="1.0"?>
<gpx version="1.1" xmlns="http://www.topografix.com/GPX/1/1">
  <wpt lat="40.9" lon="9.2"><name>Punta Contratta</name></wpt>
  <trk><name>Via dei Giganti</name><trkseg>
    <trkpt lat="40.900" lon="9.200"><ele>420</ele></trkpt>
    <trkpt lat="40.910" lon="9.210"><ele>512</ele></trkpt>
    <trkpt lat="40.925" lon="9.230"><ele>498</ele></trkpt>
  </trkseg></trk>
</gpx>`;

/** Una bozza compilata come lo sarebbe dopo mezz'ora di lavoro vero. */
function bozzaLavorata(idGpx) {
  const base = contenutoVuoto({ categoria: "eventi", formato: "post" });
  return {
    ...base,
    titolo: "La Via dei Giganti",
    stato: "pronto",
    dataPrevista: "2026-09-14",
    variante: "locandina",
    fonte: {
      tipo: "evento",
      slug: "la-via-dei-giganti-2026",
      istantanea: { prezzo: "580 €", km: "550 km" },
      importatoIl: "2026-08-18T09:00:00.000Z",
    },
    fattuali: {
      ...base.fattuali,
      nome: "La Via dei Giganti",
      prezzo: "580 €",
      km: "550 km",
      sterrato: "85%",
      durata: "4 Giorni",
      livello: "Medio-Avanzato",
      dataInizio: "2026-10-29",
      dataFine: "2026-11-01",
      puntiInteresse: ["Punta Contratta", "Monte Muros", "Berchidda"],
      origine: { prezzo: "sito", km: "sito" },
    },
    editoriale: {
      ...base.editoriale,
      titoloBreve: "La Via dei Giganti",
      kicker: "NORD SARDEGNA · GALLURA",
      claim: "Sterrato, granito e mare",
      cta: "Scrivici per prenotare",
      statoPosti: "ultimi",
      highlight: [
        { id: "h1", titolo: "Granito", descrizione: "Le rocce del Limbara.", origine: "preset" },
      ],
      caption: {
        testo: "Primo, scritto a mano.\n\nSecondo.\n\nTerzo, scritto a mano.",
        lunghezza: "storytelling",
        paragrafiBloccati: [0, 2],
      },
    },
    media: {
      cover: { idBlob: "img-cover", zoom: 1.35, x: 0.28, y: 0.72 },
      esperienza: [
        { idBlob: "img-1", zoom: 1, x: 0.5, y: 0.4 },
        { idBlob: "img-2", zoom: 1.2, x: 0.6, y: 0.5 },
        null,
        { idBlob: "img-4", zoom: 1.05, x: 0.45, y: 0.65 },
      ],
      sfondi: { cta: { idBlob: "img-cta", zoom: 1.5, x: 0.7, y: 0.3 } },
    },
    mappa: {
      ...base.mappa,
      gpx: { idBlob: idGpx, nome: "via-dei-giganti.gpx", byte: GPX.length },
      rotazione: 12,
      spessoreTraccia: 9,
      mostraAltimetria: true,
      localita: [{ id: "w-0", nome: "Punta Contratta", lon: 9.2, lat: 40.9 }],
    },
  };
}

describe("una bozza sopravvive alla chiusura dello studio", () => {
  it("torna identica in ogni ramo", async () => {
    const archivio = creaArchivioMemoria();
    const idGpx = await archivio.salvaBlob("gpx", new Blob([GPX]), { nome: "via-dei-giganti.gpx" });
    const originale = bozzaLavorata(idGpx);

    const id = await archivio.salva(originale);

    // Un archivio nuovo non c'entra: la persistenza è la stessa istanza, ma la
    // lettura passa da convalida e migrazione, che è dove i campi si perdono.
    const riletto = await archivio.leggi(id);

    expect(riletto.editoriale.caption).toEqual(originale.editoriale.caption);
    expect(riletto.editoriale.highlight).toEqual(originale.editoriale.highlight);
    expect(riletto.editoriale.statoPosti).toBe("ultimi");
    expect(riletto.editoriale.kicker).toBe("NORD SARDEGNA · GALLURA");
    // `specchiata` è stato aggiunto dopo: la convalida lo mette a `false` sui
    // ritagli che non lo dichiarano, ed è esattamente ciò che deve fare con le
    // bozze salvate prima. L'atteso si normalizza allo stesso modo.
    const conSpecchiata = (r) => (r ? { specchiata: false, ...r } : r);
    expect(riletto.media).toEqual({
      cover: conSpecchiata(originale.media.cover),
      esperienza: originale.media.esperienza.map(conSpecchiata),
      sfondi: { cta: conSpecchiata(originale.media.sfondi.cta) },
    });
    expect(riletto.mappa).toEqual(originale.mappa);
    expect(riletto.fattuali).toEqual(originale.fattuali);
    expect(riletto.fonte.istantanea).toEqual(originale.fonte.istantanea);
    expect(riletto.stato).toBe("pronto");
    expect(riletto.variante).toBe("locandina");
    expect(riletto.dataPrevista).toBe("2026-09-14");
  });

  it("conserva lo zoom e il punto focale di ogni singolo ritaglio", async () => {
    const archivio = creaArchivioMemoria();
    const id = await archivio.salva(bozzaLavorata("gpx-x"));
    const riletto = await archivio.leggi(id);

    expect(riletto.media.cover).toEqual({
      idBlob: "img-cover", zoom: 1.35, x: 0.28, y: 0.72, specchiata: false,
    });
    expect(riletto.media.esperienza[2]).toBeNull();
    expect(riletto.media.esperienza[3].zoom).toBeCloseTo(1.05);
    expect(riletto.media.sfondi.cta.x).toBeCloseTo(0.7);
  });

  it("una bozza salvata prima del ribaltamento resta identica alla vista", async () => {
    const archivio = creaArchivioMemoria();
    // Il ritaglio non dichiara `specchiata`: è la forma che hanno su disco le
    // bozze salvate prima di questo capitolo.
    const id = await archivio.salva(bozzaLavorata("gpx-x"));
    const riletto = await archivio.leggi(id);

    // Arriva spenta, quindi la fotografia si disegna come prima: nessuna
    // migrazione, nessun cambio di resa su ciò che era già stato approvato.
    expect(riletto.media.cover.specchiata).toBe(false);
    expect(riletto.media.sfondi.cta.specchiata).toBe(false);
    expect(riletto.media.esperienza.filter(Boolean).every((r) => r.specchiata === false)).toBe(true);
    // E gli altri numeri del ritaglio non si sono spostati.
    expect(riletto.media.cover.zoom).toBeCloseTo(1.35);
    expect(riletto.media.cover.x).toBeCloseTo(0.28);
  });

  it("conserva il ribaltamento quando lo si accende", async () => {
    const archivio = creaArchivioMemoria();
    const base = bozzaLavorata("gpx-x");
    const id = await archivio.salva({
      ...base,
      media: { ...base.media, cover: { ...base.media.cover, specchiata: true } },
    });
    expect((await archivio.leggi(id)).media.cover.specchiata).toBe(true);
  });

  it("ricostruisce la traccia dal blob, senza un nuovo caricamento", async () => {
    const archivio = creaArchivioMemoria();
    const idGpx = await archivio.salvaBlob("gpx", new Blob([GPX]), { nome: "via-dei-giganti.gpx" });
    const id = await archivio.salva(bozzaLavorata(idGpx));

    // Ciò che fa l'editor riaprendo una bozza: legge il riferimento, prende il
    // blob, lo rianalizza. Nessun file dall'utente.
    const riletto = await archivio.leggi(id);
    const blob = await archivio.leggiBlob(riletto.mappa.gpx.idBlob);
    expect(blob).not.toBeNull();

    const traccia = analizzaGpx(await blob.text(), riletto.mappa.gpx.nome);
    expect(traccia.segmenti).toHaveLength(1);
    expect(traccia.metriche.punti).toBe(3);
    expect(traccia.metriche.distanzaKm).toBeGreaterThan(0);
    expect(traccia.waypoint.map((w) => w.nome)).toEqual(["Punta Contratta"]);
  });

  it("dice che il GPX manca invece di mostrare una mappa vuota", async () => {
    const archivio = creaArchivioMemoria();
    const id = await archivio.salva(bozzaLavorata("gpx-mai-esistito"));
    const riletto = await archivio.leggi(id);
    expect(await archivio.leggiBlob(riletto.mappa.gpx.idBlob)).toBeNull();
  });

  it("il GPX non entra nel backup se non lo si chiede", async () => {
    const archivio = creaArchivioMemoria();
    const idGpx = await archivio.salvaBlob("gpx", new Blob([GPX]), { nome: "via-dei-giganti.gpx" });
    await archivio.salva(bozzaLavorata(idGpx));

    const normale = await archivio.esportaBackup();
    expect(normale.gpx).toBeUndefined();
    expect(JSON.stringify(normale)).not.toContain("trkpt");

    const conGpx = await archivio.esportaBackup({ includiGpx: true });
    expect(conGpx.gpx).toHaveLength(1);
  });

  it("un ripristino aggiunge UNA sola revisione, con la sua etichetta", async () => {
    const archivio = creaArchivioMemoria();
    const id = await archivio.salva(bozzaLavorata("gpx-x"));
    const primo = await archivio.leggi(id);

    // Una modifica salvata: una revisione.
    await archivio.salva(registraRevisione(
      { ...primo, editoriale: { ...primo.editoriale, claim: "Secondo claim" } },
      primo,
    ));
    const conUna = await archivio.leggi(id);
    expect(conUna.versioni).toHaveLength(1);

    /*
     * Il ripristino è UN gesto: deve valere UNA voce. `ripristinaRevisione`
     * registra già lo stato attuale, quindi chi salva non deve registrarne
     * un'altra — è il difetto che questo test blocca.
     */
    const ripristinato = ripristinaRevisione(conUna, 1);
    await archivio.salva(ripristinato);
    const dopo = await archivio.leggi(id);

    expect(dopo.versioni).toHaveLength(conUna.versioni.length + 1);
    expect(dopo.versioni.at(-1).etichetta).toBe("stato prima del ripristino della v1");
    expect(dopo.versioni.at(-1).n).toBe(2);
    // Il claim è tornato quello di prima…
    expect(dopo.editoriale.claim).toBe(primo.editoriale.claim);
    // …e il ripristino si può annullare: lo stato scartato è in cronologia.
    expect(dopo.versioni.at(-1).dati.editoriale.claim).toBe("Secondo claim");
  });

  it("ripristina una revisione e la ritrova dopo il salvataggio", async () => {
    const archivio = creaArchivioMemoria();
    const primaVersione = bozzaLavorata("gpx-x");
    const id = await archivio.salva(primaVersione);
    const salvato = await archivio.leggi(id);

    // Si cambia la caption e si salva registrando la revisione.
    const modificato = {
      ...salvato,
      editoriale: {
        ...salvato.editoriale,
        caption: { ...salvato.editoriale.caption, testo: "Tutto riscritto." },
      },
    };
    await archivio.salva(registraRevisione(modificato, salvato));
    expect((await archivio.leggi(id)).editoriale.caption.testo).toBe("Tutto riscritto.");

    // Ripristino: torna il testo di prima, e il ripristino è a sua volta salvato.
    const conStoria = await archivio.leggi(id);
    await archivio.salva(ripristinaRevisione(conStoria, conStoria.versioni.at(-1).n));

    const finale = await archivio.leggi(id);
    expect(finale.editoriale.caption.testo).toBe(primaVersione.editoriale.caption.testo);
    expect(finale.editoriale.caption.paragrafiBloccati).toEqual([0, 2]);
    // Esattamente una revisione in più, non «più di una»: la verifica generica
    // passava anche quando il ripristino ne registrava due.
    expect(finale.versioni).toHaveLength(conStoria.versioni.length + 1);
  });
});

describe("kicker", () => {
  it("sopravvive al salvataggio e alla riapertura", async () => {
    const archivio = creaArchivioMemoria();
    const id = await archivio.salva(bozzaLavorata("gpx-x"));
    expect((await archivio.leggi(id)).editoriale.kicker).toBe("NORD SARDEGNA · GALLURA");
  });

  it("entra nella cronologia insieme al resto dei testi", async () => {
    const archivio = creaArchivioMemoria();
    const id = await archivio.salva(bozzaLavorata("gpx-x"));
    const primo = await archivio.leggi(id);

    await archivio.salva(registraRevisione(
      { ...primo, editoriale: { ...primo.editoriale, kicker: "GALLURA · LIMBARA" } },
      primo,
    ));
    const conStoria = await archivio.leggi(id);
    expect(conStoria.editoriale.kicker).toBe("GALLURA · LIMBARA");
    // Il kicker vecchio è recuperabile: `editoriale` è un ramo sorvegliato.
    expect(conStoria.versioni.at(-1).dati.editoriale.kicker).toBe("NORD SARDEGNA · GALLURA");

    const tornato = ripristinaRevisione(conStoria, conStoria.versioni.at(-1).n);
    expect(tornato.editoriale.kicker).toBe("NORD SARDEGNA · GALLURA");
  });

  it("una bozza salvata prima che il campo esistesse resta valida e vuota", async () => {
    const archivio = creaArchivioMemoria();
    const base = bozzaLavorata("gpx-x");
    // La forma su disco delle bozze precedenti: nessun `kicker`.
    const senza = { ...base, editoriale: { ...base.editoriale } };
    delete senza.editoriale.kicker;

    const id = await archivio.salva(senza);
    const riletto = await archivio.leggi(id);
    // Vuoto, non inventato. Il template non disegnerà il blocco.
    expect(riletto.editoriale.kicker).toBe("");
    // E nulla d'altro si è mosso.
    expect(riletto.editoriale.claim).toBe(base.editoriale.claim);
  });

  it("legge un record estraneo completandolo con i campi nuovi", async () => {
    /*
     * Il caso vero, che il test sopra non copriva: un record **scritto da una
     * versione precedente**, che non passa dalla convalida in scrittura di
     * questa. Arrivava con `kicker: undefined` — non `""` — e l'editor si
     * ritrovava un campo inesistente: input non controllato, blocco non
     * disegnato, nessun errore. `leggi()` deve restituire un record conforme
     * allo schema corrente, non solo migrato.
     */
    const archivio = creaArchivioMemoria();
    const base = bozzaLavorata("gpx-x");
    const legacy = { ...base, editoriale: { ...base.editoriale } };
    delete legacy.editoriale.kicker;
    delete legacy.editoriale.highlight;

    await archivio.importaBackup({
      formato: "sta-social-studio-backup",
      versioneSchema: 1,
      esportatoIl: new Date().toISOString(),
      contenuti: [legacy],
    });

    const riletto = await archivio.leggi(legacy.id);
    expect(riletto.editoriale.kicker).toBe("");
    expect(riletto.editoriale.kicker).not.toBeUndefined();
    expect(riletto.editoriale.highlight).toEqual([]);
    // I ritagli, aggiunti anch'essi dopo, ricevono lo stesso trattamento.
    expect(riletto.media.cover.specchiata).toBe(false);
  });

  it("il preset esiste solo per l'evento del riferimento", () => {
    expect(kickerIniziale("la-via-dei-giganti-2026")).toBe("NORD SARDEGNA · GALLURA");
    // Per gli altri resta vuoto: una geografia non si deduce.
    expect(kickerIniziale("honda-xr-tour-2026")).toBe("");
    expect(kickerIniziale(null)).toBe("");
  });
});

describe("highlight iniziali", () => {
  it("usa il preset per l'evento che ne ha uno", () => {
    const h = highlightIniziali({ puntiInteresse: ["Berchidda"] }, "la-via-dei-giganti-2026");
    expect(h.map((x) => x.titolo)).toEqual(["Granito", "Mare", "Borghi", "Altopiani"]);
    expect(h[0].origine).toBe("preset");
  });

  it("per gli altri eventi parte dai punti di interesse reali, non dal preset", () => {
    const h = highlightIniziali(
      { puntiInteresse: ["Gola di Gorroppu", "Su Gologone", "Tiscali"] },
      "sardinia-into-the-wild-2026",
    );
    expect(h.map((x) => x.titolo)).toEqual(["Gola di Gorroppu", "Su Gologone", "Tiscali"]);
    // Le descrizioni restano da scrivere: il sito non le contiene.
    expect(h.every((x) => x.descrizione === "")).toBe(true);
    expect(h.map((x) => x.titolo)).not.toContain("Granito");
  });

  it("resta vuoto quando non c'è niente di reale da cui partire", () => {
    expect(highlightIniziali({}, "honda-xr-tour-2026")).toEqual([]);
    expect(highlightIniziali({ puntiInteresse: [] }, null)).toEqual([]);
  });

  it("non supera le quattro voci della griglia", () => {
    const h = highlightIniziali({ puntiInteresse: ["a", "b", "c", "d", "e", "f"] }, "x");
    expect(h).toHaveLength(4);
  });
});
