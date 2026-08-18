import { describe, expect, it } from "vitest";
import { contenutoVuoto } from "../../fondamenta/schema";
import { costruisciRichiesta, indiciBloccati, rigeneraCaption } from "./rigenera";
import { creaProviderManuale } from "./provider";

/**
 * Rigenerazione della caption — test d'integrazione.
 *
 * Non si verifica `ricomponi` da solo (quello è già coperto): si verifica il
 * giro completo, dal contenuto al provider e ritorno. Sono le due garanzie che
 * contano davvero e che a occhio non si vedono: cosa parte verso il provider, e
 * che un paragrafo bloccato resti al suo posto anche se il provider lo ignora.
 */

const CONTENUTO = () => {
  const c = contenutoVuoto({ categoria: "eventi", formato: "post" });
  return {
    ...c,
    titolo: "La Via dei Giganti",
    fonte: {
      tipo: "evento",
      slug: "la-via-dei-giganti-2026",
      // Un'istantanea rumorosa: non deve finire nella richiesta.
      istantanea: { prezzo: "580 €", tappe: ["Olbia – Tempio"] },
      importatoIl: new Date().toISOString(),
    },
    fattuali: {
      ...c.fattuali,
      nome: "La Via dei Giganti",
      prezzo: "580 €",
      km: "550 km",
      sterrato: "85%",
      durata: "4 Giorni",
    },
    editoriale: {
      ...c.editoriale,
      titoloBreve: "La Via dei Giganti",
      claim: "Quattro giorni di sterrato, granito e mare",
      descrizione: "Il nord dell'isola in fuoristrada.",
      cta: "Scrivici per prenotare",
      highlight: [{ id: "h1", titolo: "Granito", descrizione: "Le rocce del Limbara." }],
      caption: {
        testo: "Primo paragrafo, scritto a mano.\n\nSecondo, generato.\n\nTerzo, scritto a mano.",
        lunghezza: "standard",
        paragrafiBloccati: [0, 2],
      },
    },
    media: {
      cover: { idBlob: "img-segreta", zoom: 1.4, x: 0.3, y: 0.7 },
      esperienza: [],
      sfondi: {},
    },
    mappa: {
      ...c.mappa,
      gpx: { idBlob: "gpx-segreto", nome: "via-dei-giganti.gpx", byte: 4_000_000 },
      localita: [{ id: "w-0", nome: "Punta Contratta", lon: 9.1, lat: 40.8 }],
    },
  };
};

/** Provider che riscrive tutto e ignora deliberatamente i blocchi. */
const provider = (testo) => ({
  ricevute: [],
  async genera(richiesta) {
    this.ricevute.push(richiesta);
    return { testo, origine: "prova" };
  },
});

describe("costruisciRichiesta", () => {
  it("manda al provider i fatti congelati", () => {
    const r = costruisciRichiesta(CONTENUTO());
    expect(Object.isFrozen(r.fattuali)).toBe(true);
    expect(r.fattuali.prezzo).toBe("580 €");
    expect(() => { r.fattuali.prezzo = "1 €"; }).toThrow();
  });

  it("manda i dati editoriali, e solo quelli previsti", () => {
    const r = costruisciRichiesta(CONTENUTO());
    expect(r.editoriale.titolo).toBe("La Via dei Giganti");
    expect(r.editoriale.claim).toMatch(/granito/);
    expect(r.editoriale.note).toMatch(/Granito: Le rocce del Limbara/);
    expect(r.editoriale.note).toMatch(/Scrivici per prenotare/);
    // La forma è quella che api/caption.js accetta con uno schema `.strict()`.
    expect(Object.keys(r).sort()).toEqual(
      ["editoriale", "fattuali", "lunghezza", "paragrafiBloccati", "rubrica"],
    );
    expect(Object.keys(r.editoriale).sort()).toEqual(["claim", "note", "titolo"]);
  });

  it("manda i paragrafi bloccati come testo", () => {
    const r = costruisciRichiesta(CONTENUTO());
    expect(r.paragrafiBloccati).toEqual([
      "Primo paragrafo, scritto a mano.",
      "Terzo, scritto a mano.",
    ]);
  });

  it("NON manda fotografie, ritagli, GPX né l'istantanea della fonte", () => {
    const serializzata = JSON.stringify(costruisciRichiesta(CONTENUTO()));
    for (const traccia of ["img-segreta", "gpx-segreto", ".gpx", "idBlob", "Punta Contratta", "zoom"]) {
      expect(serializzata).not.toContain(traccia);
    }
  });

  it("ignora indici bloccati che non corrispondono a un paragrafo", () => {
    const c = CONTENUTO();
    c.editoriale.caption.paragrafiBloccati = [0, 0, 2, 9, -1, 1.5];
    expect(indiciBloccati(c)).toEqual([0, 2]);
  });
});

describe("rigeneraCaption", () => {
  it("conserva i paragrafi bloccati anche se il provider li riscrive", async () => {
    const p = provider("Nuovo primo.\n\nNuovo secondo.\n\nNuovo terzo.");
    const esito = await rigeneraCaption({ provider: p, contenuto: CONTENUTO() });

    expect(esito.testo.split("\n\n")).toEqual([
      "Primo paragrafo, scritto a mano.",
      "Nuovo secondo.",
      "Terzo, scritto a mano.",
    ]);
    expect(esito.bloccatiConservati).toEqual([0, 2]);
    expect(esito.origine).toBe("prova");
  });

  it("conserva il paragrafo bloccato anche se il testo nuovo è più corto", async () => {
    // Il provider restituisce un solo paragrafo: il terzo, bloccato, non ha
    // un posto dove tornare. Deve tornarci comunque.
    const p = provider("Un unico paragrafo nuovo.");
    const esito = await rigeneraCaption({ provider: p, contenuto: CONTENUTO() });
    const parti = esito.testo.split("\n\n");

    expect(parti[0]).toBe("Primo paragrafo, scritto a mano.");
    expect(parti[2]).toBe("Terzo, scritto a mano.");
  });

  it("riscrive tutto quando non c'è nulla di bloccato", async () => {
    const c = CONTENUTO();
    c.editoriale.caption.paragrafiBloccati = [];
    const p = provider("Tutto nuovo.\n\nDavvero tutto.");
    const esito = await rigeneraCaption({ provider: p, contenuto: c });
    expect(esito.testo).toBe("Tutto nuovo.\n\nDavvero tutto.");
  });

  it("segnala subito un numero che non coincide coi fatti", async () => {
    const c = CONTENUTO();
    c.editoriale.caption.paragrafiBloccati = [];
    const p = provider("Quattro giorni a 480 € a persona.");
    const esito = await rigeneraCaption({ provider: p, contenuto: c });
    expect(esito.discordanze.map((d) => d.campo)).toEqual(["prezzo"]);
  });

  it("passa la richiesta al provider manuale senza errori", async () => {
    const esito = await rigeneraCaption({
      provider: creaProviderManuale(),
      contenuto: CONTENUTO(),
    });
    // La traccia manuale ha quattro voci; i due paragrafi bloccati restano.
    expect(esito.testo).toContain("Primo paragrafo, scritto a mano.");
    expect(esito.testo).toContain("Terzo, scritto a mano.");
    expect(esito.origine).toBe("manuale");
  });

  it("rifiuta un provider inesistente invece di fingere", async () => {
    await expect(rigeneraCaption({ provider: null, contenuto: CONTENUTO() }))
      .rejects.toThrow(/provider/i);
  });
});
