import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ESITI,
  FornitoreTransizione,
  useRegistraGuardia,
  useRichiediTransizione,
} from "./transizione";

/**
 * Il contratto fra guscio ed editor.
 *
 * Qui si prova il meccanismo su una guardia finta: chi ha lavoro non salvato lo
 * dice, chi vuole cambiare qualcosa chiede invece di fare, e le tre uscite del
 * dialogo si comportano come promettono. La protezione dentro l'editor vero è
 * provata altrove, montandolo.
 */

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let contenitore;
let radice;

beforeEach(() => {
  contenitore = document.createElement("div");
  document.body.appendChild(contenitore);
  radice = createRoot(contenitore);
});

afterEach(() => {
  act(() => radice.unmount());
  contenitore.remove();
});

/** Una guardia pilotabile dal test, con il conto delle chiamate. */
const creaGuardia = ({ sporco = false, salvaRiesce = true, ritardo = 0 } = {}) => {
  const stato = { sporco, salvate: 0, salvaRiesce, ritardo };
  return {
    stato,
    guardia: {
      etichetta: "L'azione",
      sporco: () => stato.sporco,
      salva: async () => {
        stato.salvate += 1;
        if (stato.ritardo) await new Promise((r) => setTimeout(r, stato.ritardo));
        if (!stato.salvaRiesce) return false;
        stato.sporco = false;
        return true;
      },
    },
  };
};

/** Monta fornitore, guardia (se data) e un aggancio per richiedere. */
function monta({ guardia, conGuardia = true } = {}) {
  const canale = { richiedi: null };

  function Editore() {
    useRegistraGuardia(guardia);
    return null;
  }
  function Guscio() {
    canale.richiedi = useRichiediTransizione();
    return null;
  }

  act(() => {
    radice.render(
      <FornitoreTransizione>
        {conGuardia && <Editore />}
        <Guscio />
      </FornitoreTransizione>,
    );
  });
  return canale;
}

const dialogo = () => contenitore.querySelector('[data-transizione="dialogo"]');
const bottone = (testo) =>
  [...contenitore.querySelectorAll("button")].find((b) => (b.textContent || "").trim() === testo);

describe("richiesta di transizione", () => {
  it("senza guardia registrata l'azione parte subito", async () => {
    const canale = monta({ conGuardia: false });
    const azione = vi.fn();
    let esito;
    await act(async () => { esito = await canale.richiedi(azione); });
    expect(azione).toHaveBeenCalledTimes(1);
    expect(esito.esito).toBe(ESITI.fatto);
    expect(dialogo()).toBeNull();
  });

  it("con la guardia pulita l'azione parte senza chiedere", async () => {
    const { guardia } = creaGuardia({ sporco: false });
    const canale = monta({ guardia });
    const azione = vi.fn();
    let esito;
    await act(async () => { esito = await canale.richiedi(azione); });
    expect(azione).toHaveBeenCalledTimes(1);
    expect(esito.esito).toBe(ESITI.fatto);
    expect(dialogo()).toBeNull();
  });

  it("con lavoro non salvato chiede, e l'azione non parte da sola", async () => {
    const { guardia } = creaGuardia({ sporco: true });
    const canale = monta({ guardia });
    const azione = vi.fn();
    let promessa;
    act(() => { promessa = canale.richiedi(azione, { etichetta: "Aprire un'altra bozza" }); });
    expect(dialogo()).toBeTruthy();
    expect(azione).not.toHaveBeenCalled();
    expect(contenitore.textContent).toContain("Modifiche non salvate");
    expect(contenitore.textContent).toContain("Aprire un'altra bozza");
    // Le tre uscite ci sono tutte.
    for (const t of ["Annulla", "Salva e continua", "Scarta modifiche"]) {
      expect(bottone(t)).toBeTruthy();
    }
    // Si chiude, per non lasciare la promessa appesa a fine test.
    await act(async () => { bottone("Annulla").click(); });
    await promessa;
  });

  it("«Annulla» non esegue niente e non salva", async () => {
    const { guardia, stato } = creaGuardia({ sporco: true });
    const canale = monta({ guardia });
    const azione = vi.fn();
    let promessa;
    act(() => { promessa = canale.richiedi(azione); });
    await act(async () => { bottone("Annulla").click(); });
    const esito = await promessa;

    expect(esito.esito).toBe(ESITI.annullato);
    expect(azione).not.toHaveBeenCalled();
    expect(stato.salvate).toBe(0);
    expect(stato.sporco).toBe(true);
    expect(dialogo()).toBeNull();
  });

  it("«Scarta modifiche» esegue l'azione senza salvare", async () => {
    const { guardia, stato } = creaGuardia({ sporco: true });
    const canale = monta({ guardia });
    const azione = vi.fn();
    let promessa;
    act(() => { promessa = canale.richiedi(azione); });
    await act(async () => { bottone("Scarta modifiche").click(); });
    const esito = await promessa;

    expect(esito.esito).toBe(ESITI.fatto);
    expect(azione).toHaveBeenCalledTimes(1);
    // Scartare non scrive: è il punto.
    expect(stato.salvate).toBe(0);
    expect(dialogo()).toBeNull();
  });

  it("«Salva e continua» salva una volta, poi esegue", async () => {
    const { guardia, stato } = creaGuardia({ sporco: true });
    const canale = monta({ guardia });
    const ordine = [];
    const azione = vi.fn(() => ordine.push("azione"));
    let promessa;
    act(() => { promessa = canale.richiedi(azione); });
    await act(async () => { bottone("Salva e continua").click(); });
    const esito = await promessa;

    expect(esito.esito).toBe(ESITI.fatto);
    expect(stato.salvate).toBe(1);
    expect(azione).toHaveBeenCalledTimes(1);
    expect(ordine).toEqual(["azione"]);
    expect(dialogo()).toBeNull();
  });

  it("se il salvataggio fallisce la transizione non avviene", async () => {
    const { guardia, stato } = creaGuardia({ sporco: true, salvaRiesce: false });
    const canale = monta({ guardia });
    const azione = vi.fn();
    let promessa;
    act(() => { promessa = canale.richiedi(azione); });
    await act(async () => { bottone("Salva e continua").click(); });

    expect(stato.salvate).toBe(1);
    expect(azione).not.toHaveBeenCalled();
    // Il dialogo resta aperto e lo dice.
    expect(dialogo()).toBeTruthy();
    expect(contenitore.textContent).toMatch(/salvataggio non è riuscito/i);
    // E da lì si può ancora annullare senza perdere niente.
    await act(async () => { bottone("Annulla").click(); });
    expect(dialogo()).toBeNull();
    expect(azione).not.toHaveBeenCalled();
    expect(stato.sporco).toBe(true);
    expect((await promessa).esito).toBe(ESITI.annullato);
  });

  it("una seconda richiesta mentre la prima è aperta è «occupato»", async () => {
    const { guardia } = creaGuardia({ sporco: true });
    const canale = monta({ guardia });
    const prima = vi.fn();
    const seconda = vi.fn();
    /*
     * La prima promessa si tiene: lasciarla pendente dentro un `act` asincrono
     * lo farebbe attendere la quiescenza per sempre. La seconda richiesta non
     * cambia stato — risponde «occupato» e basta — quindi non serve `act`.
     */
    let promessa1;
    act(() => { promessa1 = canale.richiedi(prima); });

    const esito2 = await canale.richiedi(seconda);
    expect(esito2.esito).toBe(ESITI.occupato);
    expect(seconda).not.toHaveBeenCalled();
    // Un solo dialogo, non due sovrapposti.
    expect(contenitore.querySelectorAll('[data-transizione="dialogo"]')).toHaveLength(1);

    // Chiusa la prima, il blocco è rilasciato: una nuova richiesta torna a
    // essere accolta — apre il dialogo — invece di essere respinta.
    await act(async () => { bottone("Scarta modifiche").click(); });
    expect((await promessa1).esito).toBe(ESITI.fatto);
    expect(prima).toHaveBeenCalledTimes(1);
    expect(dialogo()).toBeNull();

    let promessa3;
    act(() => { promessa3 = canale.richiedi(seconda); });
    expect(dialogo()).toBeTruthy();
    await act(async () => { bottone("Scarta modifiche").click(); });
    expect((await promessa3).esito).toBe(ESITI.fatto);
    expect(seconda).toHaveBeenCalledTimes(1);
  });

  it("un salvataggio lento non lascia passare una seconda richiesta", async () => {
    vi.useFakeTimers();
    try {
      const { guardia, stato } = creaGuardia({ sporco: true, ritardo: 50 });
      const canale = monta({ guardia });
      const prima = vi.fn();
      const seconda = vi.fn();
      let promessa1;
      act(() => { promessa1 = canale.richiedi(prima); });
      act(() => { bottone("Salva e continua").click(); });

      // Mentre il salvataggio è in volo, la seconda richiesta non passa.
      const esito2 = await canale.richiedi(seconda);
      expect(esito2.esito).toBe(ESITI.occupato);
      expect(seconda).not.toHaveBeenCalled();

      await act(async () => { await vi.advanceTimersByTimeAsync(60); });
      expect(stato.salvate).toBe(1);
      expect((await promessa1).esito).toBe(ESITI.fatto);
      expect(prima).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("il dialogo si usa da tastiera", () => {
  it("Escape annulla", async () => {
    const { guardia } = creaGuardia({ sporco: true });
    const canale = monta({ guardia });
    const azione = vi.fn();
    let promessa;
    act(() => { promessa = canale.richiedi(azione); });

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });
    const esito = await promessa;
    expect(esito.esito).toBe(ESITI.annullato);
    expect(azione).not.toHaveBeenCalled();
  });

  it("il primo pulsante prende il fuoco, ed è quello che non distrugge", async () => {
    const { guardia } = creaGuardia({ sporco: true });
    const canale = monta({ guardia });
    let promessa;
    act(() => { promessa = canale.richiedi(vi.fn()); });
    expect(document.activeElement.textContent.trim()).toBe("Annulla");
    await act(async () => { bottone("Annulla").click(); });
    await promessa;
  });

  it("è dichiarato modale e collegato al proprio titolo", async () => {
    const { guardia } = creaGuardia({ sporco: true });
    const canale = monta({ guardia });
    let promessa;
    act(() => { promessa = canale.richiedi(vi.fn()); });
    const d = dialogo();
    expect(d.getAttribute("role")).toBe("dialog");
    expect(d.getAttribute("aria-modal")).toBe("true");
    expect(document.getElementById(d.getAttribute("aria-labelledby"))).toBeTruthy();
    await act(async () => { bottone("Annulla").click(); });
    await promessa;
  });

  it("chiuso il dialogo, Escape non risponde più a nessuno", async () => {
    const { guardia } = creaGuardia({ sporco: true });
    const canale = monta({ guardia });
    let promessa;
    act(() => { promessa = canale.richiedi(vi.fn()); });
    await act(async () => { bottone("Annulla").click(); });
    await promessa;
    // Senza il cleanup, questo lancerebbe: `risolvi` non esiste più.
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });
    expect(dialogo()).toBeNull();
  });
});

/* ================================================================== *
 * Il ciclo asincrono: richiesta → decisione → salvataggio → azione
 * ================================================================== */

/** Una promessa che risolve o rigetta quando lo decide il test. */
const rinviata = () => {
  let risolvi;
  let rigetta;
  const promessa = new Promise((ris, rig) => {
    risolvi = ris;
    rigetta = rig;
  });
  // Nessuno attende ancora questa promessa: senza questo la rejection
  // risulterebbe «non gestita» per colpa del test, non del codice.
  promessa.catch(() => {});
  return { promessa, risolvi, rigetta };
};

/** Guardia il cui salvataggio finisce solo quando il test lo dice. */
const creaGuardiaPilotata = ({ sporco = true } = {}) => {
  const stato = { sporco, salvate: 0, attese: [] };
  return {
    stato,
    guardia: {
      etichetta: "L'azione",
      sporco: () => stato.sporco,
      salva: () => {
        stato.salvate += 1;
        const a = rinviata();
        stato.attese.push(a);
        return a.promessa;
      },
    },
  };
};

/** Azione che finisce solo quando il test lo dice, con il conto delle partenze. */
const azionePilotata = () => {
  const stato = { partenze: 0, attese: [] };
  const azione = () => {
    stato.partenze += 1;
    const a = rinviata();
    stato.attese.push(a);
    return a.promessa;
  };
  return { azione, stato };
};

/** Osserva una promessa senza attenderla: dice se è ancora pendente. */
const osserva = (promessa) => {
  const vista = { pendente: true, valore: null };
  promessa.then((v) => {
    vista.pendente = false;
    vista.valore = v;
  });
  return vista;
};

/** Lascia girare le microtask senza far passare tempo finto. */
const respiro = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
};

/** Raccoglie le rejection non gestite prodotte dal corpo. */
async function rejectionNonGestite(corpo) {
  const viste = [];
  const cattura = (e) => viste.push(e);
  process.on("unhandledRejection", cattura);
  try {
    await corpo();
    await new Promise((r) => setImmediate(r));
  } finally {
    process.off("unhandledRejection", cattura);
  }
  return viste;
}

describe("annullare mentre il salvataggio è in volo", () => {
  it("«Annulla» impedisce che l'azione parta dopo", async () => {
    const { guardia, stato } = creaGuardiaPilotata();
    const canale = monta({ guardia });
    const azione = vi.fn();

    let promessa;
    act(() => {
      promessa = canale.richiedi(azione);
    });
    act(() => bottone("Salva e continua").click());
    expect(stato.salvate).toBe(1);

    // Si annulla mentre la scrittura è ancora in volo.
    act(() => bottone("Annulla").click());
    // La scrittura, già partita, finisce comunque — e bene.
    await act(async () => {
      stato.attese[0].risolvi(true);
      await stato.attese[0].promessa;
    });
    await respiro();

    expect(azione).not.toHaveBeenCalled();
    expect((await promessa).esito).toBe(ESITI.annullato);
    expect(dialogo()).toBeNull();
  });

  it("Escape durante la scrittura annulla allo stesso modo", async () => {
    const { guardia, stato } = creaGuardiaPilotata();
    const canale = monta({ guardia });
    const azione = vi.fn();

    let promessa;
    act(() => {
      promessa = canale.richiedi(azione);
    });
    act(() => bottone("Salva e continua").click());
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });
    await act(async () => {
      stato.attese[0].risolvi(true);
      await stato.attese[0].promessa;
    });
    await respiro();

    expect(azione).not.toHaveBeenCalled();
    expect((await promessa).esito).toBe(ESITI.annullato);
  });

  it("il blocco resta finché la scrittura annullata non è finita", async () => {
    const { guardia, stato } = creaGuardiaPilotata();
    const canale = monta({ guardia });
    const azione = vi.fn();
    const altra = vi.fn();

    let promessa;
    act(() => {
      promessa = canale.richiedi(azione);
    });
    act(() => bottone("Salva e continua").click());
    act(() => bottone("Annulla").click());

    // La scrittura è ancora in volo: nessun altro può entrare.
    expect((await canale.richiedi(altra)).esito).toBe(ESITI.occupato);
    expect(altra).not.toHaveBeenCalled();

    await act(async () => {
      stato.attese[0].risolvi(true);
      await stato.attese[0].promessa;
    });
    await respiro();
    await promessa;

    // Finita la scrittura, il blocco si rilascia.
    stato.sporco = false;
    expect((await canale.richiedi(altra)).esito).toBe(ESITI.fatto);
    expect(altra).toHaveBeenCalledTimes(1);
  });
});

describe("risposte ripetute non si moltiplicano", () => {
  /*
   * I clic ripetuti vanno mandati **nello stesso giro**, prima che React
   * ridisegni.
   *
   * Era il difetto di queste due prove: disabilitavano il pulsante, poi
   * rimettevano `disabled = false` sul nodo del DOM e cliccavano, convinte di
   * esercitare la guardia di fase. Ma React filtra i click sui pulsanti che
   * considera disabilitati guardando le **proprie props**, non l'attributo del
   * DOM: quel clic non arrivava mai al gestore, e la prova passava senza aver
   * provato niente. Prima del ridisegno il pulsante è ancora abilitato anche
   * per React, e il secondo clic entra davvero — che è poi il doppio clic vero.
   */
  it("due «Salva e continua» ravvicinati scrivono una volta sola", async () => {
    const { guardia, stato } = creaGuardiaPilotata();
    const canale = monta({ guardia });
    const { azione, stato: statoAzione } = azionePilotata();

    let promessa;
    act(() => {
      promessa = canale.richiedi(azione);
    });

    const salva = bottone("Salva e continua");
    act(() => {
      salva.click();
      salva.click();
    });
    // Una scrittura sola…
    expect(stato.salvate).toBe(1);
    // …e nessuna azione anticipata: la scrittura è ancora in volo.
    expect(statoAzione.partenze).toBe(0);

    // Dopo il ridisegno il pulsante è anche disabilitato, per chi guarda.
    await respiro();
    expect(bottone("Salva e continua").disabled).toBe(true);

    await act(async () => {
      stato.attese[0].risolvi(true);
      await stato.attese[0].promessa;
    });
    await respiro();
    // Una azione sola, al completamento.
    expect(statoAzione.partenze).toBe(1);
    expect(stato.salvate).toBe(1);

    await act(async () => {
      statoAzione.attese[0].risolvi();
      await statoAzione.attese[0].promessa;
    });
    await respiro();
    expect((await promessa).esito).toBe(ESITI.fatto);
  });

  it("«Salva e continua» seguito subito da «Scarta modifiche» non fa due cose", async () => {
    const { guardia, stato } = creaGuardiaPilotata();
    const canale = monta({ guardia });
    const { azione, stato: statoAzione } = azionePilotata();

    act(() => {
      canale.richiedi(azione);
    });

    const salva = bottone("Salva e continua");
    const scarta = bottone("Scarta modifiche");
    act(() => {
      salva.click();
      scarta.click();
    });
    // Lo scarto arrivato a scrittura avviata non avvia niente.
    expect(stato.salvate).toBe(1);
    expect(statoAzione.partenze).toBe(0);

    await respiro();
    expect(bottone("Scarta modifiche").disabled).toBe(true);

    await act(async () => {
      stato.attese[0].risolvi(true);
      await stato.attese[0].promessa;
    });
    await respiro();
    // Una azione sola, e viene dal salvataggio.
    expect(statoAzione.partenze).toBe(1);
    expect(stato.salvate).toBe(1);
  });
});

describe("«fatto» significa azione compiuta", () => {
  it("da editor pulito il blocco copre tutta l'azione", async () => {
    const { guardia } = creaGuardiaPilotata({ sporco: false });
    const canale = monta({ guardia });
    const { azione, stato: statoAzione } = azionePilotata();
    const altra = vi.fn();

    let promessa;
    act(() => {
      promessa = canale.richiedi(azione);
    });
    await respiro();
    const vista = osserva(promessa);
    await respiro();

    expect(statoAzione.partenze).toBe(1);
    expect(vista.pendente).toBe(true);
    expect((await canale.richiedi(altra)).esito).toBe(ESITI.occupato);
    expect(altra).not.toHaveBeenCalled();

    await act(async () => {
      statoAzione.attese[0].risolvi();
      await statoAzione.attese[0].promessa;
    });
    await respiro();
    expect((await promessa).esito).toBe(ESITI.fatto);
  });

  it("dopo la conferma l'esito arriva solo a azione compiuta", async () => {
    const { guardia, stato } = creaGuardiaPilotata();
    const canale = monta({ guardia });
    const { azione, stato: statoAzione } = azionePilotata();

    let promessa;
    act(() => {
      promessa = canale.richiedi(azione);
    });
    const vista = osserva(promessa);
    act(() => bottone("Salva e continua").click());
    await act(async () => {
      stato.attese[0].risolvi(true);
      await stato.attese[0].promessa;
    });
    await respiro();

    // L'azione è partita ma non è finita: nessun «fatto» anticipato.
    expect(statoAzione.partenze).toBe(1);
    expect(vista.pendente).toBe(true);

    await act(async () => {
      statoAzione.attese[0].risolvi();
      await statoAzione.attese[0].promessa;
    });
    await respiro();
    expect(vista.pendente).toBe(false);
    expect(vista.valore.esito).toBe(ESITI.fatto);
  });

  it("un'azione che lancia dà «fallito», non «fatto»", async () => {
    const { guardia } = creaGuardiaPilotata({ sporco: false });
    const canale = monta({ guardia });
    let esito;

    const nonGestite = await rejectionNonGestite(async () => {
      await act(async () => {
        esito = await canale.richiedi(async () => {
          throw new Error("l'apertura è fallita");
        });
      });
    });

    expect(esito.esito).toBe(ESITI.fallito);
    expect(String(esito.errore?.message ?? esito.errore)).toMatch(/apertura è fallita/);
    expect(nonGestite).toHaveLength(0);
  });

  it("fallita l'azione, il blocco si rilascia", async () => {
    const { guardia } = creaGuardiaPilotata({ sporco: false });
    const canale = monta({ guardia });
    const dopo = vi.fn();

    await act(async () => {
      await canale.richiedi(() => Promise.reject(new Error("no")));
    });
    expect((await canale.richiedi(dopo)).esito).toBe(ESITI.fatto);
    expect(dopo).toHaveBeenCalledTimes(1);
  });

  it("un salvataggio che rigetta lascia decidere di nuovo", async () => {
    const { guardia, stato } = creaGuardiaPilotata();
    const canale = monta({ guardia });
    const azione = vi.fn();

    let promessa;
    const nonGestite = await rejectionNonGestite(async () => {
      act(() => {
        promessa = canale.richiedi(azione);
      });
      act(() => bottone("Salva e continua").click());
      await act(async () => {
        stato.attese[0].rigetta(new Error("disco pieno"));
        await stato.attese[0].promessa.catch(() => {});
      });
      await respiro();
    });

    expect(nonGestite).toHaveLength(0);
    // Il dialogo è ancora lì e l'azione non è partita.
    expect(dialogo()).toBeTruthy();
    expect(azione).not.toHaveBeenCalled();
    // E si può ancora decidere: scartare funziona.
    act(() => bottone("Scarta modifiche").click());
    await respiro();
    expect(azione).toHaveBeenCalledTimes(1);
    expect((await promessa).esito).toBe(ESITI.fatto);
  });
});

describe("smontare il fornitore mentre si attende", () => {
  it("non lascia azioni tardive né promesse appese", async () => {
    const { guardia, stato } = creaGuardiaPilotata();
    const canale = monta({ guardia });
    const azione = vi.fn();

    let promessa;
    act(() => {
      promessa = canale.richiedi(azione);
    });
    act(() => bottone("Salva e continua").click());

    act(() => radice.unmount());
    await act(async () => {
      stato.attese[0].risolvi(true);
      await stato.attese[0].promessa;
    });

    expect(azione).not.toHaveBeenCalled();
    expect((await promessa).esito).toBe(ESITI.annullato);
    // Rimontare per l'`afterEach`, che smonta di nuovo.
    radice = createRoot(contenitore);
  });
});
