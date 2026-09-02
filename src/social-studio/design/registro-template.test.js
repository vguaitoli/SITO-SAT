import { describe, expect, it } from "vitest";
import {
  COMBINAZIONI_IMPLEMENTATE,
  costruisciIndice,
  formatiImplementati,
  richiediTemplate,
  rubricaImplementata,
  templateDisponibile,
  variantiImplementate,
} from "./registro-template";
import { CATEGORIE, ELENCO_CATEGORIE, formatoValido, varianteValida } from "./categorie";

/**
 * Il registro delle grafiche che esistono davvero.
 *
 * La distinzione che questi test difendono è una sola: `categorie.js` dichiara
 * ventidue varianti su otto rubriche — il piano editoriale — e di template
 * costruiti ce ne sono tre. Confondere le due cose significa lasciar partire
 * un'esportazione per cui nessuno ha scritto un renderer.
 */

describe("registro dei template", () => {
  it("contiene esattamente le tre combinazioni EVENTI reali", () => {
    expect(COMBINAZIONI_IMPLEMENTATE).toEqual([
      { categoria: "eventi", formato: "post", variante: "standard" },
      { categoria: "eventi", formato: "story", variante: "standard" },
      { categoria: "eventi", formato: "carosello", variante: "standard" },
    ]);
    for (const c of COMBINAZIONI_IMPLEMENTATE) {
      expect(templateDisponibile(c.categoria, c.formato, c.variante)).toBe(true);
    }
  });

  it("nessuna delle altre sette rubriche risulta implementata", () => {
    const altre = ELENCO_CATEGORIE.filter((c) => c.id !== "eventi");
    expect(altre).toHaveLength(7);
    for (const c of altre) {
      expect(rubricaImplementata(c.id)).toBe(false);
      expect(formatiImplementati(c.id)).toEqual([]);
      // Nemmeno una delle combinazioni che il piano prevede per loro.
      for (const formato of CATEGORIE[c.id].formati) {
        expect(variantiImplementate(c.id, formato)).toEqual([]);
        for (const variante of CATEGORIE[c.id].varianti) {
          expect(templateDisponibile(c.id, formato, variante)).toBe(false);
        }
      }
    }
  });

  it("una variante prevista non diventa disponibile da sé", () => {
    /*
     * `locandina` e `minimale` sono approvate per EVENTI e compaiono in
     * `categorie.js`, ma oggi non esiste un dispatch verso renderer distinti:
     * il template è uno solo. Dichiararle disponibili sarebbe dichiarare
     * qualcosa che non c'è.
     */
    expect(CATEGORIE.eventi.varianti).toContain("locandina");
    expect(CATEGORIE.eventi.varianti).toContain("minimale");
    for (const variante of ["locandina", "minimale"]) {
      for (const formato of CATEGORIE.eventi.formati) {
        expect(templateDisponibile("eventi", formato, variante)).toBe(false);
      }
    }
    expect(variantiImplementate("eventi", "post")).toEqual(["standard"]);
  });

  it("una combinazione sconosciuta non ripiega su niente", () => {
    // Rubrica inesistente, formato inesistente, variante inesistente: tre
    // modi di sbagliare, tre `false`. Nessuno restituisce EVENTI o standard.
    expect(templateDisponibile("inesistente", "post", "standard")).toBe(false);
    expect(templateDisponibile("eventi", "reel", "standard")).toBe(false);
    expect(templateDisponibile("eventi", "post", "inventata")).toBe(false);
    expect(templateDisponibile(undefined, undefined, undefined)).toBe(false);
    expect(formatiImplementati("inesistente")).toEqual([]);
    expect(variantiImplementate("inesistente", "post")).toEqual([]);
    expect(rubricaImplementata("inesistente")).toBe(false);
  });

  it("richiediTemplate fallisce con un messaggio che si legge", () => {
    expect(() => richiediTemplate("tour", "post", "standard")).toThrow(
      /Nessun template implementato per «tour\/post\/standard»/,
    );
    // Il messaggio dice anche quali esistono: «non trovato» da solo non aiuta.
    expect(() => richiediTemplate("tour", "post", "standard")).toThrow(
      /eventi\/post\/standard/,
    );
    expect(() => richiediTemplate("eventi", "post", "locandina")).toThrow(/locandina/);
    // E quelle vere non lanciano.
    expect(richiediTemplate("eventi", "carosello", "standard")).toBe("eventi/carosello/standard");
  });

  it("una combinazione dichiarata due volte viene rifiutata", () => {
    /*
     * Senza la guardia il `Set` assorbirebbe il doppione in silenzio, e
     * l'elenco pubblico direbbe quattro combinazioni dove ce ne sono tre.
     */
    expect(() =>
      costruisciIndice([
        { categoria: "eventi", formato: "post", variante: "standard" },
        { categoria: "eventi", formato: "post", variante: "standard" },
      ]),
    ).toThrow(/dichiarata due volte/);
    expect(() =>
      costruisciIndice([
        { categoria: "eventi", formato: "post", variante: "standard" },
        { categoria: "eventi", formato: "post", variante: "standard" },
      ]),
    ).toThrow(/eventi\/post\/standard/);
  });

  it("costruisciIndice rifiuta anche rubrica, formato e variante non approvati", () => {
    expect(() => costruisciIndice([{ categoria: "inesistente", formato: "post", variante: "standard" }]))
      .toThrow(/rubrica «inesistente» inesistente/);
    expect(() => costruisciIndice([{ categoria: "tour", formato: "carosello", variante: "standard" }]))
      .toThrow(/formato «carosello» non è previsto/);
    expect(() => costruisciIndice([{ categoria: "eventi", formato: "post", variante: "inventata" }]))
      .toThrow(/variante «inventata» non è approvata/);
    // Un elenco valido e distinto passa, e non tocca il registro reale.
    expect(costruisciIndice([{ categoria: "eventi", formato: "post", variante: "locandina" }]).size).toBe(1);
    expect(templateDisponibile("eventi", "post", "locandina")).toBe(false);
  });

  it("ogni voce registrata è approvata in categorie.js", () => {
    /*
     * Il registro si convalida da sé all'import: una voce con una rubrica, un
     * formato o una variante non approvati fa fallire il caricamento del
     * modulo. Qui si verifica la stessa proprietà dall'esterno, così se un
     * domani il controllo interno venisse rimosso il test resterebbe.
     */
    for (const { categoria, formato, variante } of COMBINAZIONI_IMPLEMENTATE) {
      expect(CATEGORIE[categoria]).toBeTruthy();
      expect(formatoValido(categoria, formato)).toBe(true);
      expect(varianteValida(categoria, variante)).toBe(true);
    }
  });

  it("l'elenco esposto è congelato, array e descrittori", () => {
    expect(Object.isFrozen(COMBINAZIONI_IMPLEMENTATE)).toBe(true);
    for (const c of COMBINAZIONI_IMPLEMENTATE) expect(Object.isFrozen(c)).toBe(true);
  });

  it("nessun consumer può cambiare categoria, formato o variante", () => {
    /*
     * I moduli ESM girano in strict mode: scrivere su una proprietà congelata
     * lancia invece di essere ignorato in silenzio. Si verificano entrambe le
     * cose — che lanci e che il valore non si muova — perché la seconda è
     * quella che conta e la prima è come lo si scopre.
     *
     * Nessun ripristino a mano: qui non si manomette nulla, quindi non c'è
     * niente da rimettere a posto, e i test dopo non ereditano un registro
     * avvelenato.
     */
    const primo = COMBINAZIONI_IMPLEMENTATE[0];
    for (const campo of ["categoria", "formato", "variante"]) {
      const prima = primo[campo];
      expect(() => { primo[campo] = "manomesso"; }).toThrow(TypeError);
      expect(primo[campo]).toBe(prima);
    }
    expect(templateDisponibile("eventi", "post", "standard")).toBe(true);
    expect(templateDisponibile("manomesso", "post", "standard")).toBe(false);
  });

  it("nessuno può allungare o accorciare l'elenco", () => {
    const quanti = COMBINAZIONI_IMPLEMENTATE.length;
    expect(() => COMBINAZIONI_IMPLEMENTATE.push({ categoria: "tour", formato: "post", variante: "standard" })).toThrow(TypeError);
    expect(() => COMBINAZIONI_IMPLEMENTATE.splice(0, 1)).toThrow(TypeError);
    expect(() => { COMBINAZIONI_IMPLEMENTATE[0] = { categoria: "tour" }; }).toThrow(TypeError);
    expect(() => { COMBINAZIONI_IMPLEMENTATE.length = 0; }).toThrow(TypeError);
    expect(COMBINAZIONI_IMPLEMENTATE).toHaveLength(quanti);
    // E il comportamento non si è mosso di un millimetro.
    expect(templateDisponibile("tour", "post", "standard")).toBe(false);
    expect(templateDisponibile("eventi", "post", "standard")).toBe(true);
    expect(formatiImplementati("tour")).toEqual([]);
  });

  it("l'elenco pubblico è lo stesso oggetto che il registro usa", () => {
    // Non una copia: una copia potrebbe divergere, e allora l'elenco e il
    // comportamento racconterebbero due storie.
    for (const c of COMBINAZIONI_IMPLEMENTATE) {
      expect(templateDisponibile(c.categoria, c.formato, c.variante)).toBe(true);
    }
    expect(COMBINAZIONI_IMPLEMENTATE).toHaveLength(3);
  });
});
