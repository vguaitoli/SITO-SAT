import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useLavoroExport } from "./useLavoroExport";
import { fileDelPacchetto } from "./pacchetto";
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

/**
 * Attende che la fase diventi quella attesa, cedendo il controllo fra un
 * tentativo e l'altro.
 *
 * Prima qui c'era un `setTimeout(0)` singolo, nella speranza che React avesse
 * già committato il cambio di fase. Non è una garanzia: una volta su venti
 * circa la lettura arrivava prima del commit e il test falliva dicendo
 * `expected ['monta'] to deeply equal ['cattura']`. Era il test a misurare il
 * proprio ritardo, non l'hook a sbagliare.
 *
 * I denti restano: se la fase non arriva mai, si restituisce quella che c'è e
 * l'asserzione fallisce come deve.
 */
async function attendiFase(spia, attesa, giri = 60) {
  for (let i = 0; i < giri; i += 1) {
    if (spia.stato.richiesta?.fase === attesa) return attesa;
    await new Promise((r) => setTimeout(r, 0));
  }
  return spia.stato.richiesta?.fase ?? null;
}

/**
 * Monta l'hook e ne espone lo stato e i comandi.
 *
 * `esegui` è ricreata a ogni render, come nell'editor vero: è quella
 * riscrittura continua che rende impossibile metterla fra le dipendenze
 * dell'effetto, ed è il motivo per cui l'hook la legge da un riferimento.
 */
function monta(esegui, attendiDisegno = subito, attendiPronto) {
  const spia = { stato: null, chiamate: [], segnali: [], ordine: [], marcheViste: [] };
  function Sonda() {
    /*
     * Sta al posto di ciò che l'editor ha davvero dentro `esegui`: l'array dei
     * problemi. Cambia con un render, e ogni render crea una `esegui` nuova che
     * si porta dietro il valore di quel momento. Vedere qui il valore vecchio
     * significa aver chiamato la chiusura vecchia.
     */
    const [marca, setMarca] = useState("prima-del-montaggio");
    spia.cambiaMarca = setMarca;
    const lavoro = useLavoroExport({
      esegui: async (ctx) => {
        spia.ordine.push("esegui");
        spia.marcheViste.push(marca);
        spia.chiamate.push({ cosa: ctx.cosa, ignoraAvvisi: ctx.ignoraAvvisi });
        spia.segnali.push(ctx.lavoro);
        return esegui(ctx, spia);
      },
      attendiDisegno,
      attendiPronto: attendiPronto
        ? async () => {
            spia.ordine.push("pronto");
            return attendiPronto(spia);
          }
        : undefined,
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

/**
 * Un cancello che, aprendosi, **dichiara** la prontezza.
 *
 * Prima questi test usavano `() => g.attendi()`, che si risolve con
 * `undefined`: passavano perché l'hook trattava il silenzio come un via libera.
 * Ora il silenzio è un no, e un test che vuole verificare il percorso positivo
 * deve dire di sì come lo direbbe l'editor.
 */
const prontoQuandoApre = (g) => async () => {
  await g.attendi();
  return { pronto: true };
};

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
      // Il conteggio viene dal pacchetto vero: scritto a mano invecchiava, e
      // ha invecchiato — diceva 11 quando i file erano già sedici.
      esito: "fatto", archivio: { nome: "pacco.zip", byte: 10, quanti: fileDelPacchetto().length }, msTotale: 1234,
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
      fasi.push(await attendiFase(s, "cattura"));
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

  /* ---- singolare e plurale ---- */

  /*
   * «Esportazione bloccata: 1 errori.» Un dettaglio, ma è la prima riga che si
   * legge quando qualcosa non va, ed è scritta male proprio nel momento in cui
   * si guarda con più attenzione. Il conteggio a uno non è nemmeno un caso
   * raro: dopo la 5.4.2 è diventato il caso normale, perché il doppione della
   * copia fuori schermo non c'è più.
   */
  const errori = (quanti) =>
    Array.from({ length: quanti }, (_, i) => ({ id: `e${i}`, livello: "errore", messaggio: `Errore numero ${i + 1}.` }));
  const avvisi = (quanti) =>
    Array.from({ length: quanti }, (_, i) => ({ id: `a${i}`, livello: "avviso", messaggio: `Avviso numero ${i + 1}.` }));

  it("un errore si dice al singolare", () => {
    const el = rendi({ tipo: "vista", esito: "bloccato", controllo: { errori: errori(1), avvisi: [] } });
    expect(el.textContent).toContain("Esportazione bloccata: 1 errore.");
    expect(el.textContent).not.toContain("1 errori");
  });

  it("due errori si dicono al plurale", () => {
    const el = rendi({ tipo: "vista", esito: "bloccato", controllo: { errori: errori(2), avvisi: [] } });
    expect(el.textContent).toContain("Esportazione bloccata: 2 errori.");
  });

  it("un avviso si dice al singolare, per tutta la frase", () => {
    const el = rendi({ tipo: "vista", esito: "bloccato", soloAvvisi: true, controllo: { errori: [], avvisi: avvisi(1) } });
    // La frase intera, non il solo primo periodo: «1 avviso. Non bloccano»
    // era corretto a metà, che è il modo più facile di sbagliare.
    expect(el.textContent).toContain(
      "Il pre-flight segnala 1 avviso. Non blocca l'esportazione, ma va superato consapevolmente.",
    );
    expect(el.textContent).not.toContain("1 avvisi");
    expect(el.textContent).not.toContain("Non bloccano");
    expect(el.textContent).not.toContain("vanno superati");
  });

  it("due avvisi si dicono al plurale, per tutta la frase", () => {
    const el = rendi({ tipo: "vista", esito: "bloccato", soloAvvisi: true, controllo: { errori: [], avvisi: avvisi(2) } });
    expect(el.textContent).toContain(
      "Il pre-flight segnala 2 avvisi. Non bloccano l'esportazione, ma vanno superati consapevolmente.",
    );
  });

  it("una grafica non montata si dice al singolare", () => {
    const el = rendi({ tipo: "pacchetto", esito: "nonPronto", mancanti: ["story-tappe"], misureInSospeso: 0, frame: 30 });
    expect(el.textContent).toContain("Grafica non ancora montata: story-tappe.");
    expect(el.textContent).not.toContain("Grafiche non ancora montate");
  });

  it("due grafiche non montate si dicono al plurale", () => {
    const el = rendi({ tipo: "pacchetto", esito: "nonPronto", mancanti: ["story-tappe", "story-incluso"], misureInSospeso: 0, frame: 30 });
    expect(el.textContent).toContain("Grafiche non ancora montate: story-tappe, story-incluso.");
  });

  it("una grafica incompleta si dice al singolare", () => {
    const el = rendi({ tipo: "pacchetto", esito: "incompleto", mancanti: ["story"] });
    expect(el.textContent).toContain("Una grafica non era pronta (story): riprova.");
    expect(el.textContent).not.toContain("Alcune grafiche");
  });

  it("due grafiche incomplete si dicono al plurale", () => {
    const el = rendi({ tipo: "pacchetto", esito: "incompleto", mancanti: ["story", "post"] });
    expect(el.textContent).toContain("Alcune grafiche non erano pronte (story, post): riprova.");
  });

  it("una misura in sospeso si dice al singolare", () => {
    const el = rendi({ tipo: "pacchetto", esito: "nonPronto", misureInSospeso: 1, mancanti: [], frame: 30 });
    expect(el.textContent).toContain("1 misura di testo non ancora eseguita");
    expect(el.textContent).not.toContain("1 misure");
  });

  it("due misure in sospeso si dicono al plurale", () => {
    const el = rendi({ tipo: "pacchetto", esito: "nonPronto", misureInSospeso: 2, mancanti: [], frame: 30 });
    expect(el.textContent).toContain("2 misure di testo non ancora eseguite");
  });

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

  it("spiega perché non era pronto e offre di riprovare", () => {
    let riprovato = 0;
    const el = rendi(
      {
        tipo: "pacchetto",
        esito: "nonPronto",
        mancanti: ["story-tappe", "story-incluso"],
        misureInSospeso: 4,
        registroInMovimento: true,
        frame: 30,
      },
      { onRiprova: () => { riprovato += 1; } },
    );

    expect(el.querySelector("[data-esito]").dataset.esito).toBe("nonPronto");
    expect(el.textContent).toMatch(/non erano pronte/i);
    expect(el.textContent).toMatch(/nessun file/i);
    // Dice cosa mancava: senza, «riprova» sarebbe un invito a indovinare.
    expect(el.textContent).toContain("story-tappe");
    expect(el.textContent).toContain("4 misure");
    expect(el.textContent).toContain("30 frame");

    const riprova = [...el.querySelectorAll("button")].find((b) => /riprova/i.test(b.textContent));
    expect(riprova).toBeTruthy();
    act(() => riprova.click());
    expect(riprovato).toBe(1);
  });

  it("dice quando il controllo di prontezza non ha risposto", () => {
    const el = rendi({
      tipo: "pacchetto",
      esito: "nonPronto",
      malformato: "undefined",
      messaggio: "Il controllo di prontezza non ha dichiarato l'esito: senza un sì esplicito l'esportazione non parte.",
    });
    expect(el.querySelector("[data-esito]").dataset.esito).toBe("nonPronto");
    expect(el.textContent).toMatch(/non ha dichiarato l'esito/i);
    expect(el.textContent).toContain("undefined");
    expect(el.textContent).toMatch(/difetto del programma/i);
    expect([...el.querySelectorAll("button")].some((b) => /riprova/i.test(b.textContent))).toBe(true);
  });

  it("non elenca ciò che non è mancato", () => {
    const el = rendi({ tipo: "pacchetto", esito: "nonPronto", mancanti: [], misureInSospeso: 0, registroInMovimento: true, frame: 30 });
    expect(el.textContent).not.toMatch(/misure di testo/i);
    expect(el.textContent).not.toMatch(/non ancora montate/i);
    expect(el.textContent).toMatch(/stavano ancora cambiando/i);
  });

  it("elenca due errori con lo stesso id senza chiavi duplicate", () => {
    /*
     * Il pacchetto esegue il pre-flight una volta per formato e somma gli
     * esiti: senza GPX arrivano due voci con id `gpx` e messaggi diversi, una
     * per il carosello e una per la Story. Con `key={e.id}` React ne trovava
     * due uguali — lo diceva in console, e con chiavi duplicate può omettere o
     * duplicare figli: un errore nascosto proprio nel pannello degli errori.
     */
    const avvisi = [];
    const errOrig = console.error;
    console.error = (...a) => avvisi.push(a.map(String).join(" "));
    try {
      const el = rendi({
        tipo: "pacchetto",
        esito: "bloccato",
        controllo: {
          errori: [
            { livello: "errore", id: "gpx", messaggio: "Il carosello evento contiene la slide del percorso: serve il file GPX." },
            { livello: "errore", id: "gpx", messaggio: "La Story contiene la schermata del tracciato: serve il file GPX." },
          ],
          avvisi: [],
        },
      });
      // Entrambi i messaggi si vedono: non se ne perde nessuno.
      expect(el.textContent).toContain("Il carosello evento contiene");
      expect(el.textContent).toContain("La Story contiene");
      expect(el.querySelectorAll("li")).toHaveLength(2);
    } finally {
      console.error = errOrig;
    }
    expect(avvisi.filter((m) => /same key/i.test(m))).toEqual([]);
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

/* ================================================================== *
 * Prontezza delle grafiche
 * ================================================================== */

describe("attesa di prontezza", () => {
  /*
   * Il secondo difetto del ciclo: la richiesta nasce prima che le grafiche
   * fuori schermo esistano, e le loro segnalazioni nascono montandole. Se
   * l'hook chiamasse `esegui` appena finiti i due frame, il pre-flight
   * deciderebbe su un registro non ancora popolato — e uno sforo presente solo
   * in una Story nascosta non fermerebbe niente.
   */

  it("aspetta la prontezza prima di eseguire, non dopo", async () => {
    const spia = monta(fatto, subito, () => ({ pronto: true }));
    await act(async () => spia.stato.chiedi("pacchetto"));
    await assesta();

    expect(spia.ordine).toEqual(["pronto", "esegui"]);
  });

  it("non esegue finché la prontezza non è arrivata", async () => {
    const g = cancello();
    const spia = monta(fatto, subito, prontoQuandoApre(g));
    await act(async () => spia.stato.chiedi("pacchetto"));
    await assesta();

    // Fermi sull'attesa: niente cattura, e l'editor è ancora occupato.
    expect(spia.chiamate).toHaveLength(0);
    expect(spia.stato.occupato).toBe(true);

    await act(async () => { g.apri(); });
    await assesta();
    expect(spia.chiamate).toHaveLength(1);
    expect(spia.stato.richiesta).toBeNull();
  });

  it("annullando durante l'attesa, la cattura non parte", async () => {
    const g = cancello();
    const spia = monta(fatto, subito, prontoQuandoApre(g));
    await act(async () => spia.stato.chiedi("pacchetto"));
    await assesta();

    await act(async () => spia.stato.annulla());
    await act(async () => { g.apri(); });
    await assesta();

    expect(spia.chiamate).toHaveLength(0);
    expect(spia.stato.richiesta).toBeNull();
    expect(spia.stato.occupato).toBe(false);
  });

  it("la fase resta «monta» finché si aspetta", async () => {
    const g = cancello();
    const spia = monta(fatto, subito, prontoQuandoApre(g));
    await act(async () => spia.stato.chiedi("pacchetto"));
    await assesta();

    expect(spia.stato.richiesta?.fase).toBe("monta");
    await act(async () => { g.apri(); });
    await assesta();
  });

  /* ---------------------------------------------------------------- *
   * Quando la prontezza fallisce
   * ---------------------------------------------------------------- */

  it("un esito «non pronto» ferma tutto prima della cattura", async () => {
    const spia = monta(fatto, subito, () => ({
      pronto: false, mancanti: ["story-tappe"], misureInSospeso: 3, registroInMovimento: false, frame: 30,
    }));
    await act(async () => spia.stato.chiedi("pacchetto"));
    await assesta();

    /*
     * Prima la scadenza dell'attesa era una risoluzione silenziosa, e l'hook la
     * leggeva come un via libera: si esportava senza poter dimostrare che il
     * pre-flight avesse davanti lo stato completo.
     */
    expect(spia.chiamate).toHaveLength(0);
    expect(spia.ordine).toEqual(["pronto"]);
    expect(spia.stato.daConfermare).toMatchObject({
      tipo: "pacchetto", esito: "nonPronto", mancanti: ["story-tappe"], misureInSospeso: 3,
    });
  });

  it("dopo un «non pronto» lo stato è libero e si può riprovare", async () => {
    let pronto = false;
    const spia = monta(fatto, subito, () => ({ pronto, mancanti: pronto ? [] : ["post"] }));
    await act(async () => spia.stato.chiedi("pacchetto"));
    await assesta();

    expect(spia.stato.richiesta).toBeNull();
    expect(spia.stato.occupato).toBe(false);
    expect(spia.stato.avanzamento).toBeNull();

    // La causa sparisce, e «Riprova» riparte come la prima volta.
    pronto = true;
    await act(async () => spia.stato.chiedi("pacchetto", false));
    await assesta();

    expect(spia.chiamate).toEqual([{ cosa: "pacchetto", ignoraAvvisi: false }]);
    expect(spia.stato.daConfermare).toBeNull();
  });

  it("`pronto: true` non è un caso speciale: si esporta e basta", async () => {
    const spia = monta(fatto, subito, () => ({ pronto: true }));
    await act(async () => spia.stato.chiedi("pacchetto"));
    await assesta();
    expect(spia.chiamate).toHaveLength(1);
    expect(spia.stato.daConfermare).toBeNull();
  });

  /* ---------------------------------------------------------------- *
   * Il contratto: solo un sì esplicito autorizza
   * ---------------------------------------------------------------- */

  describe("solo `{ pronto: true }` apre il varco", () => {
    /*
     * Guardare `pronto === false` non basta: tratta il silenzio come consenso.
     * Un esito assente e un «tutto bene» diventano indistinguibili, ed è
     * esattamente così che una funzione caduta in fondo senza `return`
     * autorizzava quindici PNG che nessuno aveva verificato.
     *
     * Chi non risponde non acconsente. Qui si prova una forma sbagliata per
     * volta, perché è una per volta che si presentano.
     */
    const rifiutati = [
      ["undefined", () => undefined],
      ["null", () => null],
      ["un oggetto vuoto", () => ({})],
      ["`pronto: false`", () => ({ pronto: false, mancanti: ["post"] })],
      ["`pronto` non booleano", () => ({ pronto: "sì" })],
      ["`pronto: true` di stringa", () => ({ pronto: "true" })],
      ["una stringa", () => "pronto"],
      ["un numero", () => 1],
      ["un booleano nudo", () => true],
    ];

    it.each(rifiutati)("con %s non esporta", async (_nome, prontezza) => {
      const spia = monta(fatto, subito, prontezza);
      await act(async () => spia.stato.chiedi("pacchetto"));
      await assesta();

      // Niente `esegui`, quindi niente html2canvas, niente ZIP, niente download.
      expect(spia.chiamate).toHaveLength(0);
      expect(spia.ordine).toEqual(["pronto"]);
      expect(spia.stato.daConfermare).toMatchObject({ tipo: "pacchetto", esito: "nonPronto" });
    });

    it.each(rifiutati)("dopo %s lo stato resta libero e riprovabile", async (_nome, prontezza) => {
      let risposta = prontezza;
      const spia = monta(fatto, subito, () => risposta());
      await act(async () => spia.stato.chiedi("pacchetto"));
      await assesta();

      expect(spia.stato.richiesta).toBeNull();
      expect(spia.stato.occupato).toBe(false);
      expect(spia.stato.avanzamento).toBeNull();

      // «Riprova» riparte come la prima volta: gli avvisi non si saltano.
      risposta = () => ({ pronto: true });
      await act(async () => spia.stato.chiedi("pacchetto", false));
      await assesta();

      expect(spia.chiamate).toEqual([{ cosa: "pacchetto", ignoraAvvisi: false }]);
      expect(spia.stato.daConfermare).toBeNull();
    });

    it("con `{ pronto: true }` esporta, e basta quello", async () => {
      const spia = monta(fatto, subito, () => ({ pronto: true }));
      await act(async () => spia.stato.chiedi("pacchetto"));
      await assesta();

      expect(spia.chiamate).toEqual([{ cosa: "pacchetto", ignoraAvvisi: false }]);
      expect(spia.stato.daConfermare).toBeNull();
      expect(spia.stato.occupato).toBe(false);
    });

    it("una forma malformata si distingue da un rifiuto motivato", async () => {
      const spia = monta(fatto, subito, () => undefined);
      await act(async () => spia.stato.chiedi("pacchetto"));
      await assesta();

      // Non ha motivi da mostrare: si dice che non ha risposto, e si può riprovare.
      expect(spia.stato.daConfermare.malformato).toBe("undefined");
      expect(spia.stato.daConfermare.messaggio).toMatch(/non ha dichiarato l'esito/i);
    });

    it("un rifiuto motivato conserva i propri motivi", async () => {
      const spia = monta(fatto, subito, () => ({
        pronto: false, mancanti: ["story-tappe"], misureInSospeso: 2, frame: 30,
      }));
      await act(async () => spia.stato.chiedi("pacchetto"));
      await assesta();

      expect(spia.stato.daConfermare).toMatchObject({
        esito: "nonPronto", mancanti: ["story-tappe"], misureInSospeso: 2, frame: 30,
      });
      expect(spia.stato.daConfermare.malformato).toBeUndefined();
    });

    it("un esito non può riscrivere i propri discriminanti", async () => {
      /*
       * L'esito arriva da fuori. Se potesse portarsi dietro `esito: "fatto"`,
       * il pannello mostrerebbe un'esportazione riuscita che non è avvenuta —
       * e «Riprova» sparirebbe insieme al motivo. I discriminanti si scrivono
       * dopo i dettagli, e vincono.
       */
      const spia = monta(fatto, subito, () => ({
        pronto: false, tipo: "altro", esito: "fatto", mancanti: ["post"],
      }));
      await act(async () => spia.stato.chiedi("pacchetto"));
      await assesta();

      expect(spia.stato.daConfermare.esito).toBe("nonPronto");
      expect(spia.stato.daConfermare.tipo).toBe("pacchetto");
      // I dettagli veri restano: è solo l'identità del risultato a non essere
      // negoziabile.
      expect(spia.stato.daConfermare.mancanti).toEqual(["post"]);
      // E soprattutto: l'export resta fermo.
      expect(spia.chiamate).toHaveLength(0);
      expect(spia.stato.richiesta).toBeNull();
      expect(spia.stato.occupato).toBe(false);
    });

    it("una prontezza che esplode non diventa un via libera", async () => {
      const spia = monta(fatto, subito, () => { throw new Error("il controllo è caduto"); });
      await act(async () => spia.stato.chiedi("pacchetto"));
      await assesta();

      expect(spia.chiamate).toHaveLength(0);
      expect(spia.stato.daConfermare).toMatchObject({ esito: "errore", messaggio: "il controllo è caduto" });
      expect(spia.stato.occupato).toBe(false);
    });
  });

  it("senza `attendiPronto` il ciclo resta quello di prima", async () => {
    const spia = monta(fatto);
    await act(async () => spia.stato.chiedi("vista"));
    await assesta();
    expect(spia.chiamate).toHaveLength(1);
    expect(spia.stato.richiesta).toBeNull();
  });
});

describe("`esegui` letta al momento dell'uso", () => {
  /*
   * L'effetto dipende dal solo id — e deve continuare a dipenderne, altrimenti
   * torna il difetto monta → cattura. Ma allora tratterrebbe la `esegui` del
   * render in cui l'id è cambiato: quella creata **prima** che le grafiche
   * esistessero. Si legge da un riferimento, aggiornato a ogni render.
   */
  it("chiama l'ultima, non quella del render in cui è nata la richiesta", async () => {
    const g = cancello();
    const spia = monta(fatto, subito, prontoQuandoApre(g));
    await act(async () => spia.stato.chiedi("pacchetto"));
    await assesta();

    // Mentre si aspetta la prontezza, l'editor ridisegna: è esattamente ciò
    // che succede quando i template appena montati registrano i loro problemi.
    await act(async () => spia.cambiaMarca("dopo-il-montaggio"));

    await act(async () => { g.apri(); });
    await assesta();

    // Trattenendo la chiusura vecchia si leggerebbe «prima-del-montaggio»,
    // cioè il registro di quando le grafiche non esistevano ancora.
    expect(spia.marcheViste).toEqual(["dopo-il-montaggio"]);
    expect(spia.stato.richiesta).toBeNull();
    expect(spia.stato.occupato).toBe(false);
  });
});
