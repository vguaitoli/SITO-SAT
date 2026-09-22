import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import BancoTour, { AccessoEditorTour, dimenticaArchivioDiagnostico } from "./BancoTour";
import { statoRubrica, editorPerRubrica } from "./registro-editor";
import { FornitoreTransizione, useRegistraGuardia, useRichiediTransizione } from "./transizione";
import { accendiAmbienteGrafico, spegniAmbienteGrafico } from "./ambiente-di-prova";

/**
 * Il guscio diagnostico dell'editor TOUR.
 *
 * Quello che conta qui non è la grafica: è che l'editor giri **fuori** dallo
 * Studio — archivio proprio, fornitore delle transizioni proprio — e che ci si
 * arrivi solo con un gesto esplicito.
 */

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const TOURS = [
  { slug: "uno", name: "Tour Uno", type: "Enduro", prezzo: "100 €", durata: "1 Giorno", km: "50 km" },
];

/*
 * Il catalogo arriva dal contesto del sito, che qui non c'è: si sostituisce il
 * modulo invece di montare `TinaContentProvider`, che parlerebbe con Tina.
 */
vi.mock("../../content/TinaContentProvider", () => ({
  useSiteContent: () => ({ tours: TOURS }),
}));

let contenitore;
let radice;

beforeEach(() => {
  // L'editor monta l'anteprima vera: jsdom non ha `ResizeObserver` né
  // `document.fonts`, e senza questo il montaggio solleva.
  accendiAmbienteGrafico();
  // Ogni prova parte da un archivio diagnostico vuoto: adesso vive quanto la
  // scheda, quindi senza questo si porterebbe dietro le bozze della prova prima.
  dimenticaArchivioDiagnostico();
  contenitore = document.createElement("div");
  document.body.appendChild(contenitore);
  radice = createRoot(contenitore);
});

afterEach(() => {
  act(() => radice.unmount());
  contenitore.remove();
  spegniAmbienteGrafico();
});

const respiro = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
};

const testo = () => contenitore.textContent || "";
const qa = (sel) => [...contenitore.querySelectorAll(sel)];
const bottone = (nome) =>
  qa("button").find((b) => (b.textContent || "").trim().toLowerCase().includes(nome.toLowerCase()));

const premi = async (nome) => {
  await act(async () => {
    bottone(nome).dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  await respiro();
};

async function monta(nodo) {
  await act(async () => {
    radice.render(nodo);
  });
  await respiro();
}

describe("all'editor TOUR ci si arriva solo con un gesto esplicito", () => {
  it("chiuso non monta niente, e lo dichiara", async () => {
    await monta(<AccessoEditorTour />);
    expect(testo()).toMatch(/apri l'editor tour/i);
    expect(contenitore.querySelector('[data-editor="tour"]')).toBeFalsy();
    // Nessuna registrazione: la rubrica resta pianificata.
    expect(statoRubrica("tour")).toBe("pianificata");
    expect(editorPerRubrica("tour")).toBeNull();
  });

  it("aperto monta l'editor con i tour del sito", async () => {
    await monta(<AccessoEditorTour />);
    await premi("Apri l'editor TOUR");

    expect(contenitore.querySelector('[data-editor="tour"]')).toBeTruthy();
    const opzioni = qa("select option").map((o) => o.textContent);
    expect(opzioni).toContain("Tour Uno");
  });

  /**
   * L'unico pulsante di chiusura sta **dentro** l'editor.
   *
   * Se lo smontaggio lo comandasse il guscio, il lavoro non salvato se ne
   * andrebbe senza che nessuno lo chieda: la protezione delle transizioni è
   * registrata dall'hook, e vale solo per chi le passa attraverso.
   */
  it("il guscio non offre nessuna scorciatoia per chiudere", async () => {
    await monta(<AccessoEditorTour />);
    await premi("Apri l'editor TOUR");

    const editor = contenitore.querySelector('[data-editor="tour"]');
    const chiudi = qa("button").filter((b) => /chiudi/i.test(b.textContent || ""));
    expect(chiudi).toHaveLength(1);
    expect(editor.contains(chiudi[0])).toBe(true);
  });
});

describe("l'archivio del banco è suo e non esce di lì", () => {
  it("dichiara di essere in memoria e separato dallo Studio", async () => {
    await monta(<BancoTour tours={TOURS} />);
    expect(testo()).toMatch(/in memoria/i);
    expect(testo()).toMatch(/separato da quello dello Studio/i);
  });

  /**
   * L'archivio dura quanto la **scheda**, non quanto il componente.
   *
   * Prima moriva con il guscio, e da 6.3L.2 non va più bene: quando si lascia
   * la pagina con lavoro non salvato la sentinella offre «Salva e continua», e
   * scrivere in un registro che sta per essere distrutto sarebbe una promessa
   * falsa. Chiudere e riaprire il banco ritrova le bozze; a sparire è la
   * scheda, non il componente.
   */
  it("le bozze sopravvivono a un rimontaggio del banco, non alla scheda", async () => {
    await monta(<BancoTour tours={TOURS} />);

    const select = contenitore.querySelector("select");
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set;
      setter.call(select, "uno");
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await respiro();
    await premi("Crea bozza dal tour");
    await premi("Salva");
    expect(testo()).toMatch(/bozze tour salvate \(1\)/i);

    // Rimontaggio del guscio: la bozza è ancora lì.
    await act(async () => radice.unmount());
    radice = createRoot(contenitore);
    await monta(<BancoTour tours={TOURS} />);
    expect(testo()).toMatch(/bozze tour salvate \(1\)/i);

    // Quel che la cancella è la fine della scheda, non il componente.
    dimenticaArchivioDiagnostico();
    await act(async () => radice.unmount());
    radice = createRoot(contenitore);
    await monta(<BancoTour tours={TOURS} />);
    expect(testo()).toMatch(/bozze tour salvate \(0\)/i);
  });

  it("il contratto del salvataggio diagnostico è dichiarato all'utente", async () => {
    await monta(<BancoTour tours={TOURS} />);
    const t = testo();
    expect(t).toMatch(/diagnostico/i);
    expect(t).toMatch(/dura quanto questa scheda/i);
    expect(t).toMatch(/ricaricando la pagina o chiudendo la scheda spariscono/i);
  });

  it("senza tour non si crea niente", async () => {
    await monta(<BancoTour tours={[]} />);
    expect(bottone("Crea bozza dal tour").disabled).toBe(true);
    expect(testo()).toMatch(/tour dal sito \(0\)/i);
  });
});

/**
 * La guardia di EVENTI non deve essere sostituita da quella di TOUR.
 *
 * Il fornitore delle transizioni ne tiene **una sola** (§18.6): montare
 * `useBozzaTour` sotto lo stesso fornitore di `EditorEvento` farebbe registrare
 * la seconda guardia al posto della prima, e il lavoro non salvato di EVENTI
 * smetterebbe di essere protetto per il solo fatto di aver aperto questo banco.
 * È il motivo per cui il guscio ha un fornitore proprio, e questa prova è ciò
 * che tiene ferma quella decisione.
 */
describe("il banco non ruba la guardia a chi c'era prima", () => {
  function GuardiaEsterna({ salvato }) {
    useRegistraGuardia({
      sporco: () => true,
      salva: async () => {
        salvato.n += 1;
        return true;
      },
      etichetta: "Il lavoro di EVENTI",
    });
    return null;
  }

  function AzioneEsterna({ fatte }) {
    const richiedi = useRichiediTransizione();
    return (
      <button type="button" onClick={() => richiedi(() => { fatte.n += 1; })}>
        Transizione esterna
      </button>
    );
  }

  it("con l'editor TOUR pulito, il lavoro sporco di fuori è ancora protetto", async () => {
    const salvato = { n: 0 };
    const fatte = { n: 0 };

    await monta(
      <FornitoreTransizione>
        <GuardiaEsterna salvato={salvato} />
        {/* Il banco monta il proprio fornitore: la sua guardia resta dentro. */}
        <BancoTour tours={TOURS} />
        <AzioneEsterna fatte={fatte} />
      </FornitoreTransizione>,
    );

    // L'editor TOUR è pulito: nessuna bozza aperta.
    expect(contenitore.querySelector("[data-stato-lavoro]").getAttribute("data-stato-lavoro"))
      .toBe("salvato");

    await premi("Transizione esterna");

    // Se la guardia fosse stata sostituita, la transizione sarebbe avvenuta
    // subito e in silenzio. Invece si chiede.
    expect(contenitore.querySelector('[role="dialog"]')).toBeTruthy();
    expect(testo()).toMatch(/il lavoro di eventi/i);
    expect(fatte.n).toBe(0);

    await premi("Salva e continua");
    expect(salvato.n).toBe(1);
    expect(fatte.n).toBe(1);
  });
});
