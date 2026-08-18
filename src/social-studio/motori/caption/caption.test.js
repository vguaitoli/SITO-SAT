import { describe, expect, it } from "vitest";
import { estraiFattuali, paragrafi, ricomponi, verificaFattuale } from "./fact-lock";
import { creaProviderManuale } from "./provider";

const CONTENUTO = {
  fattuali: {
    nome: "La Via dei Giganti", prezzo: "580 €", km: "550 km", sterrato: "85%",
    durata: "4 Giorni", livello: "Medio-Avanzato", partecipantiMin: "5", partecipantiMax: "10",
    dataInizio: "2026-10-29", dataFine: "2026-11-01",
  },
};

describe("estraiFattuali", () => {
  it("produce un oggetto congelato", () => {
    const f = estraiFattuali(CONTENUTO);
    expect(Object.isFrozen(f)).toBe(true);
    expect(() => { f.prezzo = "1 €"; }).toThrow();
  });

  it("non porta con sé nulla di editoriale", () => {
    const f = estraiFattuali({ ...CONTENUTO, editoriale: { claim: "testo" } });
    expect(f).not.toHaveProperty("claim");
  });
});

describe("verificaFattuale", () => {
  const f = estraiFattuali(CONTENUTO);

  it("non segnala nulla quando i numeri coincidono", () => {
    const testo = "Quattro giorni, 550 km e 85% di sterrato. 580 € a persona.";
    expect(verificaFattuale(testo, f)).toEqual([]);
  });

  it("accetta la stessa cifra scritta in altro modo", () => {
    expect(verificaFattuale("Costa 580 euro a testa.", f)).toEqual([]);
  });

  it("segnala un prezzo diverso", () => {
    const d = verificaFattuale("Solo 480 € a persona.", f);
    expect(d).toHaveLength(1);
    expect(d[0]).toMatchObject({ campo: "prezzo", atteso: "580 €" });
  });

  it("segnala chilometri e percentuale sbagliati", () => {
    const d = verificaFattuale("Sono 600 km con il 70% di sterrato.", f);
    expect(d.map((x) => x.campo).sort()).toEqual(["km", "sterrato"]);
  });

  it("non si lamenta di un numero fuori contesto", () => {
    // «5 anni» non è un dato dell'evento: nessun falso allarme.
    expect(verificaFattuale("Lo organizziamo da 5 anni.", f)).toEqual([]);
  });

  it("non segnala nulla su un testo vuoto", () => {
    expect(verificaFattuale("", f)).toEqual([]);
  });
});

describe("paragrafi bloccati", () => {
  it("tiene intatti i paragrafi bloccati durante una rigenerazione", () => {
    const precedenti = ["Primo, scritto a mano.", "Secondo.", "Terzo."];
    const nuovi = ["Nuovo primo.", "Nuovo secondo.", "Nuovo terzo."];
    const esito = ricomponi(nuovi, precedenti, [0, 2]);
    expect(esito.split("\n\n")).toEqual(["Primo, scritto a mano.", "Nuovo secondo.", "Terzo."]);
  });

  it("suddivide sui doppi ritorni a capo", () => {
    expect(paragrafi("uno\n\ndue\n\ntre")).toHaveLength(3);
  });
});

describe("ProviderManuale", () => {
  it("è sempre disponibile e non fa rete", async () => {
    const p = creaProviderManuale();
    expect(await p.disponibile()).toBe(true);
  });

  it("restituisce una traccia specifica per rubrica", async () => {
    const p = creaProviderManuale();
    const eventi = await p.genera({ rubrica: "eventi" });
    const trail = await p.genera({ rubrica: "trail" });
    expect(eventi.origine).toBe("manuale");
    expect(eventi.testo).not.toBe(trail.testo);
    expect(eventi.testo).toMatch(/dati/i);
  });
});
