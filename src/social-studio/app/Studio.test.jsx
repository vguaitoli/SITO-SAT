import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ELENCO_CATEGORIE } from "../design/categorie";

/**
 * Il guscio dello Studio.
 *
 * Qui non si prova l'editor: si prova il **cablaggio**. Che le otto rubriche
 * siano tutte visibili, che una sola sia apribile, che le altre sette lo
 * dichiarino, e che l'editor venga risolto dal registro invece che importato a
 * mano — perché era l'import diretto a rendere lo Studio una cosa sola con
 * EVENTI.
 *
 * `EditorEvento` e `StressTest` sono sostituiti da segnaposto: pesano e non
 * c'entrano, e con un segnaposto si possono anche **contare** le istanze.
 */

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const conteggio = vi.hoisted(() => ({ editor: 0, stress: 0 }));

vi.mock("./EditorEvento", () => ({
  default: function EditorEventoFinto() {
    conteggio.editor += 1;
    return <div data-editor="eventi">editor eventi</div>;
  },
}));

vi.mock("./StressTest", () => ({
  default: function StressTestFinto() {
    conteggio.stress += 1;
    return <div data-stress="1">banco di prova</div>;
  },
}));

vi.mock("./StatoArchivio", () => ({
  default: function StatoArchivioFinto() {
    return <div data-archivio="1">archivio</div>;
  },
}));

let contenitore;
let radice;

beforeEach(() => {
  conteggio.editor = 0;
  conteggio.stress = 0;
  contenitore = document.createElement("div");
  document.body.appendChild(contenitore);
  radice = createRoot(contenitore);
});

afterEach(() => {
  act(() => radice.unmount());
  contenitore.remove();
});

async function monta() {
  const { default: Studio } = await import("./Studio");
  act(() => radice.render(<Studio />));
  return contenitore;
}

describe("Studio", () => {
  it("mostra tutte e otto le rubriche", async () => {
    const el = await monta();
    const card = el.querySelectorAll("[data-rubrica]");
    expect(card).toHaveLength(8);
    expect([...card].map((c) => c.dataset.rubrica).sort()).toEqual(
      ELENCO_CATEGORIE.map((c) => c.id).sort(),
    );
  });

  it("una rubrica disponibile e sette da implementare", async () => {
    const el = await monta();
    const stati = [...el.querySelectorAll("[data-rubrica]")].map((c) => c.dataset.stato);
    expect(stati.filter((s) => s === "disponibile")).toHaveLength(1);
    expect(stati.filter((s) => s === "da-implementare")).toHaveLength(7);
    expect(el.querySelector('[data-rubrica="eventi"]').dataset.stato).toBe("disponibile");
    expect(el.textContent).toContain("Disponibile");
    expect(el.textContent).toContain("Da implementare");
  });

  it("le sette non implementate sono disabilitate", async () => {
    const el = await monta();
    for (const card of el.querySelectorAll('[data-stato="da-implementare"]')) {
      expect(card.getAttribute("aria-disabled")).toBe("true");
    }
    expect(
      el.querySelector('[data-rubrica="eventi"]').getAttribute("aria-disabled"),
    ).toBe("false");
  });

  it("le varianti sono presentate come previste, non come disponibili", async () => {
    const el = await monta();
    // Ventidue varianti dichiarate, tre template: il testo non deve promettere
    // ciò che il registro non ha.
    expect(el.textContent).toContain("varianti previste");
    expect(el.textContent).not.toMatch(/varianti disponibili/i);
  });

  it("monta una sola istanza dell'editor EVENTI, presa dal registro", async () => {
    const el = await monta();
    expect(el.querySelectorAll("[data-editor]")).toHaveLength(1);
    expect(el.querySelector("[data-editor]").dataset.editor).toBe("eventi");
    expect(conteggio.editor).toBe(1);
  });

  it("non monta editor di ripiego per le rubriche senza editor", async () => {
    const el = await monta();
    // Un editor per rubrica disponibile, non uno per rubrica dichiarata.
    expect(el.querySelectorAll("[data-editor]")).toHaveLength(1);
    expect(el.textContent).not.toMatch(/Nessun editor per la rubrica/);
  });

  it("il banco di prova resta al suo posto", async () => {
    const el = await monta();
    expect(el.querySelectorAll("[data-stress]")).toHaveLength(1);
    expect(conteggio.stress).toBe(1);
  });

  it("«Fase 5.1» non compare più: al suo posto la rubrica aperta", async () => {
    const el = await monta();
    expect(el.textContent).not.toContain("Fase 5.1");
    expect(el.textContent).toContain("Rubrica 02 / EVENTI");
  });
});
