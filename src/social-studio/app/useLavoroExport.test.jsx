import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useLavoroExport } from "./useLavoroExport";
import PannelloEsito from "./PannelloEsito";
import EsitoExport from "./EsitoExport";

/**
 * Ciclo di vita dell'esportazione.
 *
 * Il difetto che questi test bloccano non stava nel motore: il PNG si scaricava
 * correttamente. Stava nel coordinamento — l'editor restava occupato per
 * sempre, coi pulsanti spenti e i nodi fuori schermo montati. Un test sul
 * motore non lo avrebbe mai visto, ed è per questo che 255 test verdi non lo
 * hanno preso.
 *
 * Si verifica quindi la macchina a stati, con la cattura finta: quello che
 * conta è che lo stato si liberi sempre.
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

/** Attesa immediata invece dei frame del browser: i test non disegnano. */
const subito = () => Promise.resolve();

/** Monta l'hook e ne espone lo stato e i comandi. */
function monta(esegui, attendiDisegno = subito) {
  const spia = { stato: null, chiamate: [], segnali: [] };
  function Sonda() {
    const lavoro = useLavoroExport({
      esegui: async (ctx) => {
        spia.chiamate.push({ cosa: ctx.cosa, ignoraAvvisi: ctx.ignoraAvvisi });
        spia.segnali.push(ctx.lavoro);
        return esegui(ctx, spia);
      },
      attendiDisegno,
    });
    spia.stato = lavoro;
    return null;
  }
  act(() => radice.render(<Sonda />));
  return spia;
}

/**
 * Attesa di disegno apribile a mano: serve ad annullare *fra* i due frame.
 * `apri()` sblocca la prossima attesa in sospeso.
 */
function cancello() {
  const inAttesa = [];
  return {
    attendi: () => new Promise((r) => inAttesa.push(r)),
    quanteInAttesa: () => inAttesa.length,
    apri() {
      const r = inAttesa.shift();
      if (r) r();
    },
    /**
     * Apre le attese finché ne compaiono, cedendo il controllo fra una e
     * l'altra: la seconda attesa nasce solo dopo che la prima si è risolta,
     * quindi aprirle in sequenza sincrona non funzionerebbe.
     */
    async apriTutte(giri = 6) {
      for (let i = 0; i < giri; i += 1) {
        this.apri();
        await new Promise((r) => setTimeout(r, 0));
      }
    },
  };
}

/** Lascia girare le promesse e i re-render che ne derivano. */
const assesta = async () => {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));
  });
};

const fatto = async () => ({ esito: "fatto" });

describe("useLavoroExport", () => {
  it("un export singolo completato libera lo stato", async () => {
    const spia = monta(fatto);
    await act(async () => spia.stato.chiedi("vista"));
    await assesta();

    expect(spia.chiamate).toEqual([{ cosa: "vista", ignoraAvvisi: false }]);
    expect(spia.stato.richiesta).toBeNull();
    expect(spia.stato.occupato).toBe(false);
  });

  it("un pacchetto completato libera lo stato", async () => {
    const spia = monta(async () => ({
      esito: "fatto", archivio: { nome: "pacco.zip", byte: 10, quanti: 11 }, msTotale: 1234,
    }));
    await act(async () => spia.stato.chiedi("pacchetto"));
    await assesta();

    expect(spia.chiamate[0].cosa).toBe("pacchetto");
    expect(spia.stato.richiesta).toBeNull();
    // L'esito resta visibile, ma non tiene occupata l'interfaccia.
    expect(spia.stato.avanzamento.pacchetto.nome).toBe("pacco.zip");
    expect(spia.stato.occupato).toBe(false);
  });

  it("bloccato dal pre-flight: stato libero e conferma visibile", async () => {
    const spia = monta(async () => ({
      esito: "bloccato", soloAvvisi: true, controllo: { avvisi: [{ id: "a", messaggio: "x" }], errori: [] },
    }));
    await act(async () => spia.stato.chiedi("vista"));
    await assesta();

    expect(spia.stato.richiesta).toBeNull();
    expect(spia.stato.occupato).toBe(false);
    expect(spia.stato.daConfermare).toMatchObject({ tipo: "vista", soloAvvisi: true });
  });

  it("«Esporta comunque» completa e libera lo stato", async () => {
    let primo = true;
    const spia = monta(async () => {
      if (primo) { primo = false; return { esito: "bloccato", soloAvvisi: true, controllo: { avvisi: [{ id: "a" }], errori: [] } }; }
      return { esito: "fatto" };
    });
    await act(async () => spia.stato.chiedi("vista"));
    await assesta();
    expect(spia.stato.daConfermare).toBeTruthy();

    // È la seconda richiesta, con gli avvisi accettati di proposito.
    await act(async () => spia.stato.chiedi("vista", true));
    await assesta();

    expect(spia.chiamate[1]).toEqual({ cosa: "vista", ignoraAvvisi: true });
    expect(spia.stato.richiesta).toBeNull();
    expect(spia.stato.daConfermare).toBeNull();
    expect(spia.stato.occupato).toBe(false);
  });

  it("un errore durante la cattura libera lo stato e si vede", async () => {
    const spia = monta(async () => { throw new Error("html2canvas è caduto"); });
    await act(async () => spia.stato.chiedi("vista"));
    await assesta();

    expect(spia.stato.richiesta).toBeNull();
    expect(spia.stato.occupato).toBe(false);
    expect(spia.stato.daConfermare).toMatchObject({ esito: "errore", messaggio: "html2canvas è caduto" });
  });

  it("due export consecutivi partono entrambi", async () => {
    const spia = monta(fatto);
    await act(async () => spia.stato.chiedi("vista"));
    await assesta();
    expect(spia.stato.occupato).toBe(false);

    await act(async () => spia.stato.chiedi("vista"));
    await assesta();

    expect(spia.chiamate).toHaveLength(2);
    expect(spia.stato.richiesta).toBeNull();
    expect(spia.stato.occupato).toBe(false);
  });

  it("il passaggio monta → cattura non è un annullamento", async () => {
    /*
     * È il difetto, preso di petto. Prima l'effetto dipendeva dall'intero
     * oggetto della richiesta: cambiare fase lo ripuliva, il lavoro si marcava
     * annullato e il rilascio dello stato non avveniva più. La firma era
     * esattamente questa — cattura eseguita, `richiesta` mai tornata a `null`.
     */
    const fasi = [];
    const spia = monta(async (_ctx, s) => {
      // Si aspetta che React abbia committato il cambio di fase, altrimenti si
      // leggerebbe lo stato del render precedente e il test misurerebbe il
      // proprio ritardo invece del comportamento dell'hook.
      await new Promise((r) => setTimeout(r, 0));
      fasi.push(s.stato.richiesta?.fase);
      return { esito: "fatto" };
    });
    await act(async () => spia.stato.chiedi("vista"));
    await assesta();

    // La cattura è avvenuta con la fase già passata a «cattura»…
    expect(fasi).toEqual(["cattura"]);
    // …e nonostante quel cambio lo stato si è liberato.
    expect(spia.stato.richiesta).toBeNull();
    expect(spia.stato.occupato).toBe(false);
  });

  it("annullando durante il primo frame, la cattura non parte", async () => {
    const g = cancello();
    const spia = monta(fatto, g.attendi);
    await act(async () => spia.stato.chiedi("vista"));
    await assesta();

    // Siamo fermi sulla prima attesa: l'utente annulla adesso.
    await act(async () => spia.stato.annulla());
    await act(async () => { g.apri(); g.apri(); });
    await assesta();

    expect(spia.chiamate).toHaveLength(0);
    expect(spia.stato.richiesta).toBeNull();
    expect(spia.stato.occupato).toBe(false);
  });

  it("annullando durante il secondo frame, la cattura non parte", async () => {
    const g = cancello();
    const spia = monta(fatto, g.attendi);
    await act(async () => spia.stato.chiedi("vista"));
    await assesta();
    // Primo frame passato, siamo in attesa del secondo.
    await act(async () => { g.apri(); });
    await assesta();

    await act(async () => spia.stato.annulla());
    await act(async () => { g.apri(); });
    await assesta();

    expect(spia.chiamate).toHaveLength(0);
    expect(spia.stato.richiesta).toBeNull();
    expect(spia.stato.occupato).toBe(false);
  });

  it("annullando durante la cattura, il segnale viene abortito", async () => {
    /*
     * L'ordine qui va imposto, non sperato: la prima versione annullava «dopo
     * un po'» e leggeva il segnale «dopo un po'», quindi passava o falliva a
     * seconda di quale dei due arrivava prima. Un test che misura il proprio
     * tempismo non misura il prodotto.
     */
    let partita;
    const inizio = new Promise((r) => { partita = r; });
    let sblocca;
    const lenta = new Promise((r) => { sblocca = r; });
    let visto = null;

    const spia = monta(async (ctx) => {
      partita();
      await lenta;                                 // la cattura è in corso
      visto = ctx.lavoro.segnale.aborted;          // e ora guarda il segnale
      return { esito: "annullato" };
    });

    await act(async () => spia.stato.chiedi("vista"));
    await act(async () => { await inizio; });       // cattura iniziata per certo
    await act(async () => spia.stato.annulla());    // annullamento
    await act(async () => { sblocca(); });          // la cattura se ne accorge
    await assesta();

    expect(spia.chiamate).toHaveLength(1);
    expect(visto).toBe(true);
    expect(spia.stato.richiesta).toBeNull();
    expect(spia.stato.occupato).toBe(false);
    // Nessun avanzamento residuo: i nodi fuori schermo si smontano perché
    // `richiesta` è nulla, ed è `richiesta` a deciderne il montaggio.
    expect(spia.stato.avanzamento).toBeNull();
  });

  it("dopo un annullamento un nuovo export parte", async () => {
    const g = cancello();
    const spia = monta(fatto, g.attendi);
    await act(async () => spia.stato.chiedi("vista"));
    await assesta();
    await act(async () => spia.stato.annulla());
    await act(async () => { g.apri(); g.apri(); });
    await assesta();
    expect(spia.chiamate).toHaveLength(0);

    await act(async () => spia.stato.chiedi("pacchetto"));
    await act(async () => g.apriTutte());
    await assesta();

    expect(spia.chiamate).toEqual([{ cosa: "pacchetto", ignoraAvvisi: false }]);
    expect(spia.stato.richiesta).toBeNull();
  });

  it("annullare una richiesta nuova non tocca il controller precedente", async () => {
    const g = cancello();
    const spia = monta(fatto, g.attendi);
    await act(async () => spia.stato.chiedi("vista"));
    await assesta();
    // Sostituzione: la seconda richiesta prende il posto della prima.
    await act(async () => spia.stato.chiedi("pacchetto"));
    await assesta();

    await act(async () => spia.stato.annulla());
    await act(async () => g.apriTutte());
    await assesta();

    // L'annullamento ha colpito la richiesta viva: nessuna cattura è partita.
    expect(spia.chiamate).toHaveLength(0);
    expect(spia.stato.richiesta).toBeNull();
  });

  it("smontare durante la cattura abortisce il lavoro", async () => {
    // Nota: abortire non interrompe `html2canvas`, che non accetta un segnale.
    // Ferma ciò che viene dopo: conversione, archivio, download.
    let segnale = null;
    let sblocca;
    const lenta = new Promise((r) => { sblocca = r; });
    const spia = monta(async (ctx) => {
      segnale = ctx.lavoro.segnale;
      await lenta;
      return { esito: "annullato" };
    });
    await act(async () => spia.stato.chiedi("vista"));
    await assesta();
    expect(segnale.aborted).toBe(false);

    // L'editor si chiude a metà lavoro.
    await act(async () => radice.unmount());
    expect(segnale.aborted).toBe(true);

    await act(async () => { sblocca(); });
    // Ricostruisco la radice per il cleanup di afterEach.
    radice = createRoot(contenitore);
  });

  it("un valore lanciato che non è un Error diventa comunque un messaggio", async () => {
    // eslint-disable-next-line prefer-promise-reject-errors
    const spia = monta(async () => { throw "quota del disco esaurita"; });
    await act(async () => spia.stato.chiedi("vista"));
    await assesta();

    expect(spia.stato.daConfermare).toMatchObject({
      esito: "errore", messaggio: "quota del disco esaurita",
    });
    expect(spia.stato.richiesta).toBeNull();
  });

  it("una richiesta vecchia non spegne quella più recente", async () => {
    let sblocca;
    const lenta = new Promise((r) => { sblocca = r; });
    let prima = true;
    const spia = monta(async () => {
      if (prima) { prima = false; await lenta; return { esito: "fatto" }; }
      return { esito: "fatto" };
    });

    await act(async () => spia.stato.chiedi("vista"));
    await assesta();
    // La prima è ancora in cattura: ne parte una seconda che la sostituisce.
    await act(async () => spia.stato.chiedi("pacchetto"));
    await assesta();
    const idRecente = spia.stato.richiesta?.id ?? null;

    // Ora la prima finisce: non deve azzerare lo stato della seconda.
    await act(async () => { sblocca(); });
    await assesta();

    if (idRecente !== null) expect(spia.stato.richiesta?.id).toBe(idRecente);
    expect(spia.chiamate.map((c) => c.cosa)).toEqual(["vista", "pacchetto"]);
  });
});


/* ================================================================== *
 * Rendering dell'esito
 * ================================================================== */

describe("PannelloEsito", () => {
  const rendi = (daConfermare, comandi = {}) => {
    act(() => radice.render(
      <PannelloEsito
        daConfermare={daConfermare}
        onRiprova={comandi.onRiprova || (() => {})}
        onEsportaComunque={comandi.onEsportaComunque || (() => {})}
        onChiudi={comandi.onChiudi || (() => {})}
      />,
    ));
    return contenitore;
  };

  it("mostra il guasto della cattura senza toccare `controllo`", () => {
    /*
     * L'oggetto di errore **non ha** `controllo`. Prima cadeva nel ramo del
     * pre-flight, che leggeva `controllo.errori.length`: un errore React proprio
     * mentre doveva mostrare un errore. Che non lanci è metà del test; l'altra
     * metà è che il messaggio si legga.
     */
    const el = rendi({ tipo: "vista", esito: "errore", messaggio: "html2canvas è caduto" });
    expect(el.textContent).toContain("html2canvas è caduto");
    expect(el.textContent).toMatch(/non è riuscita/i);
    expect(el.textContent).toMatch(/nessun file/i);
    expect(el.querySelectorAll("button")).toHaveLength(2);
  });

  it("regge un errore senza messaggio", () => {
    const el = rendi({ tipo: "vista", esito: "errore" });
    expect(el.textContent).toMatch(/non specificato/i);
  });

  it("il pulsante di chiusura chiama chi lo ascolta", () => {
    let chiuso = 0;
    const el = rendi(
      { tipo: "vista", esito: "errore", messaggio: "x" },
      { onChiudi: () => { chiuso += 1; } },
    );
    const chiudi = [...el.querySelectorAll("button")].find((b) => /chiudi/i.test(b.textContent));
    act(() => chiudi.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(chiuso).toBe(1);
  });

  it("dopo la chiusura si può riprovare", () => {
    let riprovato = 0;
    const el = rendi(
      { tipo: "vista", esito: "errore", messaggio: "x" },
      // «Riprova» passa da `onRiprova`, non da `onEsportaComunque`: sono due
      // gesti diversi e questo test cade se tornano a essere lo stesso.
      { onRiprova: () => { riprovato += 1; } },
    );
    const riprova = [...el.querySelectorAll("button")].find((b) => /riprova/i.test(b.textContent));
    act(() => riprova.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(riprovato).toBe(1);

    // Chiuso il messaggio, il pannello scompare e l'editor resta usabile.
    rendi(null);
    expect(contenitore.textContent).toBe("");
  });

  it("gli avvisi restano un ramo diverso, con «Esporta comunque»", () => {
    const el = rendi({
      tipo: "vista", soloAvvisi: true,
      controllo: { avvisi: [{ id: "a", messaggio: "La caption è vuota." }], errori: [] },
    });
    expect(el.textContent).toContain("La caption è vuota.");
    expect(el.textContent).toMatch(/Esporta comunque/i);
  });

  it("gli errori di pre-flight non si confondono col guasto di cattura", () => {
    const el = rendi({
      tipo: "vista",
      controllo: { errori: [{ id: "prezzo", messaggio: "Manca il prezzo." }], avvisi: [] },
    });
    expect(el.textContent).toContain("Manca il prezzo.");
    expect(el.textContent).not.toMatch(/non è riuscita/i);
  });
});


/* ================================================================== *
 * Riprova e «Esporta comunque» sono due gesti diversi
 * ================================================================== */

describe("EsitoExport — collegamento fra pannello ed esportazione", () => {
  /**
   * Questi test cadono se le due azioni tornano a condividere un callback.
   *
   * È il difetto che c'era: un solo `onEsportaComunque` per tutti e tre i rami,
   * quindi «Riprova» dopo un guasto ripartiva con gli avvisi già ignorati. Se
   * nel frattempo il pre-flight aveva trovato qualcosa di nuovo, lo saltava
   * senza che nessuno l'avesse accettato.
   */
  const rendi = (daConfermare) => {
    const chiamate = [];
    act(() => radice.render(
      <EsitoExport
        daConfermare={daConfermare}
        chiedi={(cosa, ignoraAvvisi) => chiamate.push({ cosa, ignoraAvvisi })}
        onChiudi={() => {}}
      />,
    ));
    return chiamate;
  };

  const premi = (etichetta) => {
    const b = [...contenitore.querySelectorAll("button")]
      .find((x) => new RegExp(etichetta, "i").test(x.textContent));
    expect(b, `pulsante «${etichetta}» non trovato`).toBeTruthy();
    act(() => b.dispatchEvent(new MouseEvent("click", { bubbles: true })));
  };

  it("dopo un errore, «Riprova» NON ignora gli avvisi", () => {
    const chiamate = rendi({ tipo: "vista", esito: "errore", messaggio: "caduta" });
    premi("riprova");
    expect(chiamate).toEqual([{ cosa: "vista", ignoraAvvisi: false }]);
  });

  it("dopo un risultato incompleto, «Riprova» NON ignora gli avvisi", () => {
    const chiamate = rendi({ tipo: "pacchetto", esito: "incompleto", mancanti: ["story"] });
    premi("riprova");
    expect(chiamate).toEqual([{ cosa: "pacchetto", ignoraAvvisi: false }]);
  });

  it("con soli avvisi, «Esporta comunque» li ignora di proposito", () => {
    const chiamate = rendi({
      tipo: "vista", soloAvvisi: true,
      controllo: { avvisi: [{ id: "a", messaggio: "La caption è vuota." }], errori: [] },
    });
    premi("esporta comunque");
    expect(chiamate).toEqual([{ cosa: "vista", ignoraAvvisi: true }]);
  });

  it("il ramo degli avvisi non offre un «Riprova» che ignori gli avvisi", () => {
    rendi({
      tipo: "vista", soloAvvisi: true,
      controllo: { avvisi: [{ id: "a", messaggio: "x" }], errori: [] },
    });
    const etichette = [...contenitore.querySelectorAll("button")].map((b) => b.textContent.trim());
    // Un solo percorso supera gli avvisi, e si chiama col suo nome.
    expect(etichette.some((t) => /Esporta comunque/i.test(t))).toBe(true);
    expect(etichette.some((t) => /^Riprova$/i.test(t))).toBe(false);
  });

  it("i rami di guasto non offrono «Esporta comunque»", () => {
    for (const caso of [
      { tipo: "vista", esito: "errore", messaggio: "x" },
      { tipo: "vista", esito: "incompleto", mancanti: ["post"] },
    ]) {
      rendi(caso);
      const etichette = [...contenitore.querySelectorAll("button")].map((b) => b.textContent.trim());
      expect(etichette.some((t) => /Esporta comunque/i.test(t)), JSON.stringify(caso)).toBe(false);
      expect(etichette.some((t) => /Riprova/i.test(t))).toBe(true);
    }
  });

  it("il pacchetto conserva il proprio tipo in entrambe le azioni", () => {
    const a = rendi({ tipo: "pacchetto", esito: "errore", messaggio: "x" });
    premi("riprova");
    expect(a[0]).toEqual({ cosa: "pacchetto", ignoraAvvisi: false });

    const b = rendi({
      tipo: "pacchetto", soloAvvisi: true,
      controllo: { avvisi: [{ id: "a", messaggio: "x" }], errori: [] },
    });
    premi("esporta comunque");
    expect(b[0]).toEqual({ cosa: "pacchetto", ignoraAvvisi: true });
  });
});

describe("una retry che incontra avvisi nuovi torna a chiedere", () => {
  it("non cattura e non scarica: mostra la conferma", async () => {
    /*
     * Il caso che il difetto rendeva invisibile. Primo tentativo: guasto.
     * «Riprova» riparte con `ignoraAvvisi` falso, il pre-flight trova un avviso
     * comparso nel frattempo, e si torna al pannello di conferma — invece di
     * esportare di nascosto.
     */
    const visti = [];
    let giro = 0;
    const spia = monta(async (ctx) => {
      visti.push(ctx.ignoraAvvisi);
      giro += 1;
      if (giro === 1) throw new Error("caduta della cattura");
      return {
        esito: "bloccato", soloAvvisi: true,
        controllo: { avvisi: [{ id: "nuovo", messaggio: "Avviso comparso dopo." }], errori: [] },
      };
    });

    await act(async () => spia.stato.chiedi("vista"));
    await assesta();
    expect(spia.stato.daConfermare).toMatchObject({ esito: "errore" });

    // «Riprova»: come lo collega EsitoExport, senza ignorare gli avvisi.
    await act(async () => spia.stato.chiedi("vista", false));
    await assesta();

    expect(visti).toEqual([false, false]);
    expect(spia.stato.daConfermare).toMatchObject({ soloAvvisi: true });
    expect(spia.stato.richiesta).toBeNull();
    expect(spia.stato.occupato).toBe(false);

    // Solo ora, premendo il pulsante che lo dice, gli avvisi si superano.
    await act(async () => spia.stato.chiedi("vista", true));
    await assesta();
    expect(visti).toEqual([false, false, true]);
  });
});
