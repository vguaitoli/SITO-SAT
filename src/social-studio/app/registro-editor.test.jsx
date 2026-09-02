import { afterEach, describe, expect, it, vi } from "vitest";
import EditorEvento from "./EditorEvento";
import { editorDisponibile, editorPerRubrica, statoRubrica } from "./registro-editor";
import { ELENCO_CATEGORIE } from "../design/categorie";
import { rubricaImplementata } from "../design/registro-template";

/**
 * Quale editor apre una rubrica.
 *
 * Il registro dice `null` per le sette rubriche non ancora costruite, e `null`
 * è la risposta giusta: aprire l'editor EVENTI su TOUR produrrebbe una bozza
 * con la categoria sbagliata e trenta campi che non le appartengono.
 *
 * Disponibile vuol dire **entrambe** le cose: un editor e almeno un template.
 * I due registri possono divergere, e i due stati intermedi promettono un
 * flusso che si interrompe a metà — si apre una schermata che poi non esporta,
 * oppure esiste una grafica che nessuno può riempire.
 */

describe("registro degli editor", () => {
  it("espone soltanto EditorEvento, e per la sola rubrica eventi", () => {
    expect(editorPerRubrica("eventi")).toBe(EditorEvento);
    expect(editorDisponibile("eventi")).toBe(true);
    const altre = ELENCO_CATEGORIE.filter((c) => c.id !== "eventi");
    expect(altre).toHaveLength(7);
    for (const c of altre) {
      expect(editorPerRubrica(c.id)).toBeNull();
      expect(editorDisponibile(c.id)).toBe(false);
    }
  });

  it("non usa EditorEvento come ripiego", () => {
    for (const id of ["tour", "trail", "sardegna", "guide", "garage", "crew", "info", "inesistente"]) {
      expect(editorPerRubrica(id)).not.toBe(EditorEvento);
    }
  });

  it("distingue una rubrica pianificata da un id sconosciuto", () => {
    expect(statoRubrica("eventi")).toBe("disponibile");
    // Prevista in categorie.js, editor non ancora scritto: è lavoro in coda.
    expect(statoRubrica("tour")).toBe("pianificata");
    expect(statoRubrica("info")).toBe("pianificata");
    // Non esiste affatto: è un errore di chiamata, e va detto diversamente.
    expect(statoRubrica("inesistente")).toBe("sconosciuta");
    expect(statoRubrica(undefined)).toBe("sconosciuta");
  });

  it("una sola rubrica disponibile, sette pianificate", () => {
    const stati = ELENCO_CATEGORIE.map((c) => statoRubrica(c.id));
    expect(stati.filter((s) => s === "disponibile")).toHaveLength(1);
    expect(stati.filter((s) => s === "pianificata")).toHaveLength(7);
    expect(stati.filter((s) => s === "sconosciuta")).toHaveLength(0);
  });

  it("EVENTI è disponibile perché ha tutti e due i lati", () => {
    expect(editorDisponibile("eventi")).toBe(true);
    expect(rubricaImplementata("eventi")).toBe(true);
    expect(editorPerRubrica("eventi")).toBe(EditorEvento);
  });
});

/* ------------------------------------------------------------------ *
 * Quando i due registri divergono
 * ------------------------------------------------------------------ */

describe("editor e template devono esserci entrambi", () => {
  /*
   * I due stati intermedi non si possono produrre col registro vero, e
   * aggiungere un mutatore di produzione per fabbricarli sarebbe peggio del
   * difetto: si isola il solo registro dei template e si rilegge quello degli
   * editor sopra la versione isolata. La produzione resta senza ganci.
   */
  afterEach(() => {
    vi.doUnmock("../design/registro-template");
    vi.resetModules();
  });

  const conTemplateFinti = async (implementate) => {
    vi.doMock("../design/registro-template", () => ({
      rubricaImplementata: (categoria) => implementate.includes(categoria),
      templateDisponibile: () => false,
      formatiImplementati: () => [],
      variantiImplementate: () => [],
      richiediTemplate: () => { throw new Error("non implementato"); },
      COMBINAZIONI_IMPLEMENTATE: Object.freeze([]),
      costruisciIndice: () => new Set(),
    }));
    vi.resetModules();
    return import("./registro-editor");
  };

  it("editor presente ma nessun template: non disponibile, e null", async () => {
    // EVENTI ha l'editor; nella versione isolata non ha template. Aprirlo
    // significherebbe far scrivere una bozza che il pre-flight poi blocca.
    const reg = await conTemplateFinti([]);
    expect(reg.editorDisponibile("eventi")).toBe(false);
    expect(reg.editorPerRubrica("eventi")).toBeNull();
    expect(reg.statoRubrica("eventi")).toBe("pianificata");
  });

  it("template presente ma nessun editor: non disponibile", async () => {
    // TOUR ha il template, non l'editor: una grafica che nessuno può riempire.
    const reg = await conTemplateFinti(["tour"]);
    expect(reg.editorDisponibile("tour")).toBe(false);
    expect(reg.editorPerRubrica("tour")).toBeNull();
    expect(reg.statoRubrica("tour")).toBe("pianificata");
  });

  it("con entrambi i lati la rubrica è disponibile", async () => {
    const reg = await conTemplateFinti(["eventi"]);
    expect(reg.editorDisponibile("eventi")).toBe(true);
    expect(reg.editorPerRubrica("eventi")).toBeTruthy();
    expect(reg.statoRubrica("eventi")).toBe("disponibile");
  });

  it("nemmeno divergendo si ripiega su EditorEvento", async () => {
    const reg = await conTemplateFinti(["tour", "trail", "info"]);
    for (const id of ["tour", "trail", "info"]) {
      expect(reg.editorPerRubrica(id)).toBeNull();
    }
  });

  it("un id sconosciuto resta sconosciuto, non pianificato", async () => {
    const reg = await conTemplateFinti(["inesistente"]);
    expect(reg.statoRubrica("inesistente")).toBe("sconosciuta");
    expect(reg.editorPerRubrica("inesistente")).toBeNull();
  });
});
