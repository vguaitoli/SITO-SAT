import { beforeEach, describe, expect, it, vi } from "vitest";
import { etichettaExport, fileDelPacchetto, PACCHETTO, QUANTE_GRAFICHE } from "./pacchetto";
import { SCHERMATE } from "../design/eventi-story";
import { SLIDE_CAROSELLO } from "../template/rubriche/eventi/CaroselloEvento";
import { FORMATI } from "../design/formati";
import { contenutoVuoto } from "../fondamenta/schema";

/**
 * Il pacchetto evento, per come lo esporta davvero l'editor.
 *
 * Il collegamento è il punto: `EditorEvento` importa `PACCHETTO` da qui, e da
 * qui lo leggono anche questi test. Un elenco ricopiato nel test dimostrerebbe
 * che la copia è corretta, non che il pacchetto lo è — e il resoconto che
 * parlava di dieci grafiche quando erano quindici è nato esattamente così.
 */

/* ------------------------------------------------------------------ *
 * La sequenza
 * ------------------------------------------------------------------ */

describe("composizione del pacchetto", () => {
  it("è un Post, sei Story e otto slide: quindici grafiche", () => {
    expect(PACCHETTO.filter((p) => p.id === "post")).toHaveLength(1);
    expect(PACCHETTO.filter((p) => p.formato === "story")).toHaveLength(6);
    expect(SLIDE_CAROSELLO).toHaveLength(8);
    expect(QUANTE_GRAFICHE).toBe(15);
    expect(PACCHETTO).toHaveLength(15);
  });

  it("con la caption sono sedici file", () => {
    expect(fileDelPacchetto()).toHaveLength(16);
    expect(fileDelPacchetto()).toContain("caption.txt");
    expect(fileDelPacchetto({ conCaption: false })).toHaveLength(15);
  });

  it("le sei Story stanno nell'ordine canonico, col nome della schermata", () => {
    const story = PACCHETTO.filter((p) => p.formato === "story");
    expect(story.map((p) => p.nome)).toEqual([
      "story/01-cover.png",
      "story/02-numeri.png",
      "story/03-mappa.png",
      "story/04-tappe.png",
      "story/05-incluso.png",
      "story/06-prenota.png",
    ]);
    // L'ordine non è alfabetico per caso: è la sequenza dichiarata.
    expect(story.map((p) => p.id)).toEqual(SCHERMATE.map((s) => `story-${s.id}`));
  });

  it("l'ordine del pacchetto è quello in cui si pubblica", () => {
    expect(PACCHETTO.map((p) => p.formato)).toEqual([
      "post",
      ...Array(6).fill("story"),
      ...Array(8).fill("post"),
    ]);
    expect(PACCHETTO[0].nome).toBe("post-1080x1350.png");
    expect(PACCHETTO.at(-1).nome).toBe(`carosello/${SLIDE_CAROSELLO.at(-1).file}`);
  });

  it("ogni nome è unico e ogni id è unico", () => {
    expect(new Set(PACCHETTO.map((p) => p.nome)).size).toBe(15);
    expect(new Set(PACCHETTO.map((p) => p.id)).size).toBe(15);
  });

  it("le Story si catturano a 1080×1920, il resto a 1080×1350", () => {
    // È `cattura` a rifiutare un canvas di misura diversa: qui si verifica che
    // il formato dichiarato da ogni elemento sia quello giusto.
    expect(FORMATI.story).toMatchObject({ larghezza: 1080, altezza: 1920 });
    expect(FORMATI.post).toMatchObject({ larghezza: 1080, altezza: 1350 });
    for (const p of PACCHETTO) {
      expect(FORMATI[p.formato], p.nome).toBeDefined();
    }
    const story = PACCHETTO.filter((p) => p.nome.startsWith("story/"));
    expect(story.every((p) => p.formato === "story")).toBe(true);
  });

  it("nessun GPX e nessun asset del progetto Claude Design", () => {
    const tutto = JSON.stringify(PACCHETTO).toLowerCase();
    for (const vietato of [".gpx", "gpx", "logo-512", "hero-realistico", ".dc.html", "dc-runtime", "uploads/"]) {
      expect(tutto, vietato).not.toContain(vietato);
    }
    expect(PACCHETTO.every((p) => p.nome.endsWith(".png"))).toBe(true);
  });
});

describe("etichetta del pulsante", () => {
  it("sulla vista Story dice quante schermate esporta", () => {
    expect(etichettaExport("story")).toBe("Esporta 6 Story");
    expect(etichettaExport("story")).toBe(`Esporta ${SCHERMATE.length} Story`);
  });

  it("anche il carosello dice quante slide sono", () => {
    expect(etichettaExport("carosello")).toBe("Esporta 8 slide");
  });

  it("il Post è uno e si vede", () => {
    expect(etichettaExport("post")).toBe("Esporta il Post");
  });
});

/* ------------------------------------------------------------------ *
 * L'esportazione vera
 * ------------------------------------------------------------------ */

/** I nomi dei file dentro uno ZIP, letti dalle intestazioni locali. */
async function nomiNelloZip(blob) {
  const byte = new Uint8Array(await blob.arrayBuffer());
  const vista = new DataView(byte.buffer);
  const nomi = [];
  let i = 0;
  while (i + 30 <= byte.length && vista.getUint32(i, true) === 0x04034b50) {
    const lunghezzaNome = vista.getUint16(i + 26, true);
    const lunghezzaExtra = vista.getUint16(i + 28, true);
    const dimensione = vista.getUint32(i + 18, true);
    nomi.push(new TextDecoder().decode(byte.subarray(i + 30, i + 30 + lunghezzaNome)));
    i += 30 + lunghezzaNome + lunghezzaExtra + dimensione;
  }
  return nomi;
}

const scaricati = [];

vi.mock("../motori/export/cattura", async (importaOriginale) => {
  const originale = await importaOriginale();
  return {
    ...originale,
    // Un PNG finto: qui si verifica il pacchetto, non html2canvas.
    catturaSequenza: async (elementi) => ({
      file: elementi.map((e) => ({
        nome: e.nome,
        blob: new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], { type: "image/png" }),
        ms: 1,
      })),
      msTotale: elementi.length,
      memoria: null,
    }),
    scarica: (blob, nome) => scaricati.push({ blob, nome }),
  };
});

const CAPTION =
  "Due giorni di sterrato in Sardegna, con guida e cena inclusa. " +
  "Scrivici in privato per prenotare il tuo posto sulla partenza di aprile.";

/** Una scheda esportabile: il pre-flight non deve fermare il pacchetto. */
function schedaPronta() {
  const base = contenutoVuoto({ categoria: "eventi", formato: "story" });
  return {
    ...base,
    titolo: "Traversata di prova",
    fattuali: {
      ...base.fattuali,
      nome: "Traversata di prova",
      prezzo: "390 €",
      periodo: "12–13 aprile",
      km: "120 km",
      inclusi: ["Guida", "Cena"],
      requisiti: ["Patente A"],
      tappe: [{ id: "t1", partenza: "Uno", arrivo: "Due", descrizione: "" }],
    },
    editoriale: {
      ...base.editoriale,
      cta: "Scrivici per prenotare",
      caption: { ...base.editoriale.caption, testo: CAPTION },
    },
    media: { cover: { idBlob: "b1", zoom: 1, x: 0.5, y: 0.5, specchiata: false }, esperienza: [], sfondi: {} },
    mappa: { ...base.mappa, gpx: { idBlob: "g1", nome: "traccia.gpx", byte: 10 } },
  };
}

const VOCI_MEDIA = [
  { id: "b1", idBlob: "b1", nome: "cover.jpg", larghezza: 3000, altezza: 2000, byte: 100, tipoMime: "image/jpeg" },
];

describe("esportazione del pacchetto", () => {
  beforeEach(() => {
    scaricati.length = 0;
  });

  const conNodi = () => PACCHETTO.map((p) => ({ ...p, nodo: { id: p.id } }));

  const esegui = async (elementi, extra = {}) => {
    const { esportaPacchetto, creaLavoroExport } = await import("../motori/export/esporta");
    return esportaPacchetto({
      elementi,
      contenuto: schedaPronta(),
      vociMedia: VOCI_MEDIA,
      problemi: [],
      ignoraAvvisi: true,
      caption: CAPTION,
      lavoro: creaLavoroExport(),
      ...extra,
    });
  };

  it("scrive sedici file: quindici PNG e la caption", async () => {
    const esito = await esegui(conNodi());
    expect(esito.esito).toBe("fatto");
    expect(esito.archivio.quanti).toBe(16);

    const nomi = await nomiNelloZip(scaricati[0].blob);
    expect(nomi).toHaveLength(16);
    expect(nomi.filter((n) => n.endsWith(".png"))).toHaveLength(15);
    expect(nomi).toContain("caption.txt");
  });

  it("le sei Story sono nello ZIP con i nomi canonici", async () => {
    await esegui(conNodi());
    const nomi = await nomiNelloZip(scaricati[0].blob);
    expect(nomi.filter((n) => n.startsWith("story/"))).toEqual([
      "story/01-cover.png",
      "story/02-numeri.png",
      "story/03-mappa.png",
      "story/04-tappe.png",
      "story/05-incluso.png",
      "story/06-prenota.png",
    ]);
  });

  it("nello ZIP non entra il GPX, che pure sta nella scheda", async () => {
    // La scheda ha un GPX assegnato: è il motore che non lo fa passare.
    await esegui(conNodi());
    const nomi = await nomiNelloZip(scaricati[0].blob);
    expect(nomi.some((n) => n.toLowerCase().includes("gpx"))).toBe(false);
    expect(nomi.some((n) => n.toLowerCase().endsWith(".gpx"))).toBe(false);
    for (const n of nomi) expect(n === "caption.txt" || n.endsWith(".png")).toBe(true);
  });

  it("senza i sei nodi della Story montati il pacchetto non parte", async () => {
    const elementi = conNodi().map((p) => (p.formato === "story" ? { ...p, nodo: null } : p));
    const esito = await esegui(elementi);
    expect(esito.esito).toBe("incompleto");
    expect(esito.mancanti).toEqual(SCHERMATE.map((s) => `story-${s.id}`));
    expect(scaricati).toHaveLength(0);
  });

  it("basta una schermata non montata perché si fermi", async () => {
    const elementi = conNodi().map((p) => (p.id === "story-mappa" ? { ...p, nodo: null } : p));
    const esito = await esegui(elementi);
    expect(esito.esito).toBe("incompleto");
    expect(esito.mancanti).toEqual(["story-mappa"]);
  });
});
