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
    expect(el.textContent).toContain("Da implementare");
    /*
     * «Disponibile» non è più una parola scritta: è un pulsante, e su EVENTI —
     * la rubrica già aperta — è «Aperta» e disabilitato. Le sette non
     * implementate non hanno nulla da premere.
     */
    const apri = el.querySelector('[data-rubrica="eventi"] button');
    expect(apri).toBeTruthy();
    expect(apri.textContent.trim()).toBe("Aperta");
    expect(apri.disabled).toBe(true);
    for (const card of el.querySelectorAll('[data-stato="da-implementare"]')) {
      expect(card.querySelector("button")).toBeNull();
    }
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

/* ------------------------------------------------------------------ *
 * Cambio rubrica: registri simulati, produzione intatta
 * ------------------------------------------------------------------ */

describe("cambio rubrica protetto", () => {
  /*
   * Qui si simula un secondo editor. I registri **produttivi** restano com'è:
   * si isola `registro-editor` e si rilegge `Studio` sopra la versione
   * isolata, così il percorso di transizione si prova oggi senza dichiarare
   * TOUR disponibile in produzione.
   *
   * `Studio` e `useRegistraGuardia` si prendono dallo **stesso** grafo di
   * moduli: dopo `resetModules` un import statico punterebbe a un'altra
   * istanza di `transizione`, con un altro Context — la guardia si
   * registrerebbe da una parte e il fornitore guarderebbe dall'altra.
   */
  const conRegistri = async (disponibili) => {
    const editor = {};
    vi.doMock("./registro-editor", () => ({
      editorPerRubrica: (id) => (disponibili.includes(id) ? editor[id] || null : null),
      editorDisponibile: (id) => disponibili.includes(id),
      statoRubrica: (id) => (disponibili.includes(id) ? "disponibile" : "pianificata"),
    }));
    vi.resetModules();
    const { default: Studio } = await import("./Studio");
    const { useRegistraGuardia } = await import("./transizione");

    /** Un editor finto che dichiara lavoro non salvato quando glielo si dice. */
    const creaEditor = (nome, { sporco = false } = {}) => {
      const stato = { sporco, salvate: 0, salvaRiesce: true };
      const Componente = function EditorFinto() {
        useRegistraGuardia({
          sporco: () => stato.sporco,
          salva: async () => {
            stato.salvate += 1;
            if (!stato.salvaRiesce) return false;
            stato.sporco = false;
            return true;
          },
        });
        return <div data-editor={nome}>{nome}</div>;
      };
      return { stato, Componente };
    };

    const monta = (mappa) => {
      Object.assign(editor, mappa);
      act(() => radice.render(<Studio />));
      return contenitore;
    };

    return { creaEditor, monta };
  };

  afterEach(() => {
    vi.doUnmock("./registro-editor");
    vi.resetModules();
  });

  const apri = (el, id) => el.querySelector(`[data-rubrica="${id}"] button`);
  const premi = async (el, testo) => {
    const b = [...el.querySelectorAll("button")].find((x) => x.textContent.trim() === testo);
    expect(b).toBeTruthy();
    await act(async () => { b.click(); });
  };
  const dialogo = (el) => el.querySelector('[data-transizione="dialogo"]');

  it("una destinazione non disponibile non smonta l'editor e non chiede niente", async () => {
    const { creaEditor, monta } = await conRegistri(["eventi"]);
    const e = creaEditor("eventi", { sporco: true });
    const el = monta({ eventi: e.Componente });

    // TOUR è pianificata: nulla da premere, e l'editor resta al suo posto.
    expect(apri(el, "tour")).toBeNull();
    expect(el.querySelector('[data-rubrica="tour"]').dataset.stato).toBe("da-implementare");
    expect(el.querySelector('[data-editor="eventi"]')).toBeTruthy();
    expect(dialogo(el)).toBeNull();
  });

  it("con l'editor pulito il cambio avviene senza chiedere", async () => {
    const { creaEditor, monta } = await conRegistri(["eventi", "tour"]);
    const a = creaEditor("uno");
    const b = creaEditor("due");
    const el = monta({ eventi: a.Componente, tour: b.Componente });
    expect(el.querySelector('[data-editor="uno"]')).toBeTruthy();

    await act(async () => { apri(el, "tour").click(); });
    expect(dialogo(el)).toBeNull();
    expect(el.querySelector('[data-editor="due"]')).toBeTruthy();
    expect(el.querySelector('[data-editor="uno"]')).toBeNull();
    expect(el.querySelector('[data-rubrica="tour"]').dataset.aperta).toBe("sì");
  });

  it("con lavoro non salvato chiede, e «Annulla» lascia tutto dov'è", async () => {
    const { creaEditor, monta } = await conRegistri(["eventi", "tour"]);
    const a = creaEditor("uno", { sporco: true });
    const b = creaEditor("due");
    const el = monta({ eventi: a.Componente, tour: b.Componente });

    await act(async () => { apri(el, "tour").click(); });
    expect(dialogo(el)).toBeTruthy();
    // L'editor non si è mosso mentre si decide.
    expect(el.querySelector('[data-editor="uno"]')).toBeTruthy();

    await premi(el, "Annulla");
    expect(el.querySelector('[data-editor="uno"]')).toBeTruthy();
    expect(el.querySelector('[data-editor="due"]')).toBeNull();
    expect(el.querySelector('[data-rubrica="eventi"]').dataset.aperta).toBe("sì");
    expect(a.stato.salvate).toBe(0);
    expect(a.stato.sporco).toBe(true);
  });

  it("«Salva e continua» salva una volta e poi cambia rubrica", async () => {
    const { creaEditor, monta } = await conRegistri(["eventi", "tour"]);
    const a = creaEditor("uno", { sporco: true });
    const b = creaEditor("due");
    const el = monta({ eventi: a.Componente, tour: b.Componente });

    await act(async () => { apri(el, "tour").click(); });
    await premi(el, "Salva e continua");

    expect(a.stato.salvate).toBe(1);
    expect(el.querySelector('[data-editor="due"]')).toBeTruthy();
    expect(dialogo(el)).toBeNull();
  });

  it("se il salvataggio fallisce la rubrica non cambia", async () => {
    const { creaEditor, monta } = await conRegistri(["eventi", "tour"]);
    const a = creaEditor("uno", { sporco: true });
    a.stato.salvaRiesce = false;
    const b = creaEditor("due");
    const el = monta({ eventi: a.Componente, tour: b.Componente });

    await act(async () => { apri(el, "tour").click(); });
    await premi(el, "Salva e continua");

    expect(a.stato.salvate).toBe(1);
    expect(el.querySelector('[data-editor="uno"]')).toBeTruthy();
    expect(el.querySelector('[data-editor="due"]')).toBeNull();
    expect(dialogo(el)).toBeTruthy();
    expect(el.textContent).toMatch(/salvataggio non è riuscito/i);
  });

  it("«Scarta modifiche» cambia rubrica senza salvare", async () => {
    const { creaEditor, monta } = await conRegistri(["eventi", "tour"]);
    const a = creaEditor("uno", { sporco: true });
    const b = creaEditor("due");
    const el = monta({ eventi: a.Componente, tour: b.Componente });

    await act(async () => { apri(el, "tour").click(); });
    await premi(el, "Scarta modifiche");

    expect(a.stato.salvate).toBe(0);
    expect(el.querySelector('[data-editor="due"]')).toBeTruthy();
  });

  it("una seconda richiesta durante il dialogo non apre un secondo dialogo", async () => {
    const { creaEditor, monta } = await conRegistri(["eventi", "tour", "info"]);
    const a = creaEditor("uno", { sporco: true });
    const b = creaEditor("due");
    const c = creaEditor("tre");
    const el = monta({ eventi: a.Componente, tour: b.Componente, info: c.Componente });

    await act(async () => { apri(el, "tour").click(); });
    await act(async () => { apri(el, "info").click(); });
    expect(el.querySelectorAll('[data-transizione="dialogo"]')).toHaveLength(1);

    // Chi vince è la prima richiesta, non l'ultima arrivata.
    await premi(el, "Scarta modifiche");
    expect(el.querySelector('[data-editor="due"]')).toBeTruthy();
    expect(el.querySelector('[data-editor="tre"]')).toBeNull();
  });

  it("la rubrica già aperta non si richiede due volte", async () => {
    const { creaEditor, monta } = await conRegistri(["eventi"]);
    const a = creaEditor("uno", { sporco: true });
    const el = monta({ eventi: a.Componente });

    const bottone = apri(el, "eventi");
    expect(bottone.disabled).toBe(true);
    expect(bottone.textContent.trim()).toBe("Aperta");
    await act(async () => { bottone.click(); });
    expect(dialogo(el)).toBeNull();
  });

  it("l'intestazione segue la rubrica aperta", async () => {
    const { creaEditor, monta } = await conRegistri(["eventi", "tour"]);
    const a = creaEditor("uno");
    const b = creaEditor("due");
    const el = monta({ eventi: a.Componente, tour: b.Componente });

    expect(el.querySelector("header").textContent).toContain("Rubrica 02 / EVENTI");
    await act(async () => { apri(el, "tour").click(); });
    expect(el.querySelector("header").textContent).toContain("Rubrica 01 / TOUR");
  });
});
