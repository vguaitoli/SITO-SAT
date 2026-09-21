import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { Link, RouterProvider, createMemoryRouter, useNavigate } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import SentinellaNavigazione from "./SentinellaNavigazione";
import { useRegistraGuardia, quanteGuardieVive } from "./transizione";

/**
 * La protezione del lavoro non salvato durante la navigazione.
 *
 * Il sistema di transizioni copre i gesti dell'interfaccia; questa copre
 * l'uscita dalla pagina, che è l'altra metà. Le prove girano su un router di
 * **memoria**: stessa macchina del router vero, cronologia sotto controllo e
 * nessun `pushState` sintetico da fingere.
 *
 * Le guardie sono finte ma hanno la forma vera — `sporco()` e `salva()` che
 * dice se è riuscito — perché è esattamente quel contratto che la sentinella
 * usa, e sostituirlo con qualcosa di più comodo proverebbe un'altra cosa.
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

const respiro = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
};

const testo = () => contenitore.textContent || "";
const qa = (sel) => [...contenitore.querySelectorAll(sel)];
const dialogo = () => contenitore.querySelector('[data-transizione="dialogo"]');

const premi = async (nome) => {
  const b = qa("button, a").find((x) => (x.textContent || "").trim() === nome);
  if (!b) throw new Error(`Nessun «${nome}». C'è: ${qa("button, a").map((x) => x.textContent.trim()).join(" | ")}`);
  await act(async () => {
    b.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 }));
  });
  await respiro();
};

/** Una promessa che si chiude quando lo decide la prova. Niente timeout. */
const rinviata = () => {
  let risolvi;
  let rigetta;
  const promessa = new Promise((ris, rig) => {
    risolvi = ris;
    rigetta = rig;
  });
  promessa.catch(() => {});
  return { promessa, risolvi, rigetta };
};

/**
 * Un editor finto che registra una guardia vera.
 *
 * `sporco` e l'esito del salvataggio si pilotano dall'esterno, e `salva` conta
 * le proprie chiamate: così si può dire non solo «ha salvato», ma «ha salvato
 * una volta sola». Con `sospensione` la scrittura resta aperta finché la prova
 * non la chiude: è la finestra in cui succede tutto ciò che questo file misura.
 */
function creaEditor(nome, { sporco = false, riesce = true, lancia = false } = {}) {
  const stato = { sporco, riesce, lancia, salvate: 0, sospensione: null, durante: null };
  function Editor() {
    useRegistraGuardia({
      etichetta: nome,
      sporco: () => stato.sporco,
      salva: async () => {
        stato.salvate += 1;
        if (stato.sospensione) await stato.sospensione.promessa;
        if (stato.durante) stato.durante();
        if (stato.lancia) throw new Error(`${nome} è esploso`);
        if (!stato.riesce) return false;
        stato.sporco = false;
        return true;
      },
    });
    return <div data-editor={nome}>{nome}</div>;
  }
  return { stato, Editor };
}

/** Preme un tasto sulla finestra, come farebbe chi guarda il dialogo. */
const tasto = async (key) => {
  await act(async () => {
    window.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
  });
  await respiro();
};

/** Chiude una sospensione e lascia assestare le continuazioni. */
const sblocca = async (sospensione) => {
  await act(async () => {
    sospensione.risolvi();
    await sospensione.promessa;
  });
  await respiro();
};

/** La pagina protetta: la sentinella, gli editor e i modi per andarsene. */
function Studio({ editori }) {
  const naviga = useNavigate();
  return (
    <div>
      <SentinellaNavigazione />
      {editori.map(({ Editor }, i) => <Editor key={i} />)}
      <Link to="/altrove">Link interno</Link>
      <button type="button" onClick={() => naviga("/altrove")}>
        naviga()
      </button>
      <button type="button" onClick={() => naviga(-1)}>
        Indietro
      </button>
      <button type="button" onClick={() => naviga(1)}>
        Avanti
      </button>
      <button type="button" onClick={() => naviga("/studio?vista=due")}>
        Solo query
      </button>
    </div>
  );
}

function Altrove() {
  return <div data-pagina="altrove">Altrove</div>;
}

/** Monta il router di memoria con la cronologia richiesta. */
async function monta(editori = [], { partenza = ["/studio"], indice } = {}) {
  const router = createMemoryRouter(
    [
      { path: "/studio", element: <Studio editori={editori} /> },
      { path: "/altrove", element: <Altrove /> },
      { path: "*", element: <div data-pagina="altro">altro</div> },
    ],
    { initialEntries: partenza, initialIndex: indice },
  );
  await act(async () => {
    radice.render(<RouterProvider router={router} />);
  });
  await respiro();
  return router;
}

const dove = (router) => router.state.location.pathname;
const suStudio = () => Boolean(contenitore.querySelector("[data-editor]"));
const suAltrove = () => Boolean(contenitore.querySelector('[data-pagina="altrove"]'));

/* ================================================================== *
 * Quando si blocca, e quando no
 * ================================================================== */

describe("si blocca solo se c'è davvero lavoro da perdere", () => {
  it("con tutto pulito la navigazione è libera", async () => {
    const a = creaEditor("EVENTI");
    const b = creaEditor("TOUR");
    const router = await monta([a, b]);

    await premi("Link interno");

    expect(dialogo()).toBeFalsy();
    expect(dove(router)).toBe("/altrove");
    expect(suAltrove()).toBe(true);
  });

  it("senza nessun editor montato non c'è niente da chiedere", async () => {
    const router = await monta([]);
    await premi("naviga()");
    expect(dialogo()).toBeFalsy();
    expect(dove(router)).toBe("/altrove");
  });

  it("TOUR sporco ed EVENTI pulito: chiede", async () => {
    const a = creaEditor("EVENTI");
    const b = creaEditor("TOUR", { sporco: true });
    const router = await monta([a, b]);

    await premi("Link interno");

    expect(dialogo()).toBeTruthy();
    expect(dove(router)).toBe("/studio");
    expect(suStudio()).toBe(true);
  });

  it("EVENTI sporco e TOUR pulito: chiede lo stesso", async () => {
    const a = creaEditor("EVENTI", { sporco: true });
    const b = creaEditor("TOUR");
    const router = await monta([a, b]);

    await premi("Link interno");

    expect(dialogo()).toBeTruthy();
    expect(dove(router)).toBe("/studio");
  });

  /**
   * Nessuna guardia può sparire perché è registrata «dall'altra parte».
   *
   * I due editor stanno sotto fornitori di transizione diversi — il banco TOUR
   * ne ha uno suo perché il fornitore ne tiene una guardia sola — e la
   * navigazione li riguarda entrambi.
   */
  it("con due editor sporchi si salvano entrambi, e nessuno viene ignorato", async () => {
    const a = creaEditor("EVENTI", { sporco: true });
    const b = creaEditor("TOUR", { sporco: true });
    const router = await monta([a, b]);

    await premi("Link interno");
    /*
     * Si conta, non si nomina: l'`etichetta` di una guardia è il nome
     * dell'azione del fornitore — «Questa azione» per entrambi gli editor veri —
     * e usarla qui produceva «Questa azione, Questa azione».
     */
    expect(dialogo().textContent).toMatch(/2 lavori non ancora nell'archivio/);

    await premi("Salva e continua");

    expect(a.stato.salvate).toBe(1);
    expect(b.stato.salvate).toBe(1);
    expect(dove(router)).toBe("/altrove");
  });

  it("un cambio di sola query non smonta niente e non chiede", async () => {
    const a = creaEditor("EVENTI", { sporco: true });
    const router = await monta([a]);

    await premi("Solo query");

    expect(dialogo()).toBeFalsy();
    expect(router.state.location.search).toBe("?vista=due");
    expect(suStudio()).toBe(true);
  });
});

/* ================================================================== *
 * Le tre uscite
 * ================================================================== */

describe("le tre uscite del dialogo", () => {
  it("Annulla non cambia URL e non tocca il lavoro", async () => {
    const a = creaEditor("EVENTI", { sporco: true });
    const router = await monta([a]);

    await premi("Link interno");
    await premi("Annulla");

    expect(dialogo()).toBeFalsy();
    expect(dove(router)).toBe("/studio");
    expect(suStudio()).toBe(true);
    expect(a.stato.sporco).toBe(true);
    expect(a.stato.salvate).toBe(0);
  });

  it("Scarta modifiche naviga senza scrivere niente", async () => {
    const a = creaEditor("EVENTI", { sporco: true });
    const router = await monta([a]);

    await premi("Link interno");
    await premi("Scarta modifiche");

    expect(dove(router)).toBe("/altrove");
    expect(a.stato.salvate).toBe(0);
  });

  it("Salva e continua scrive, poi naviga una volta sola", async () => {
    const a = creaEditor("EVENTI", { sporco: true });
    const router = await monta([a]);

    await premi("Link interno");
    await premi("Salva e continua");

    expect(a.stato.salvate).toBe(1);
    expect(dove(router)).toBe("/altrove");
    // Una sola voce in più nella cronologia: nessun doppio passo.
    expect(router.state.historyAction).toBe("PUSH");
    expect(router.state.location.pathname).toBe("/altrove");
  });

  it("un salvataggio fallito non fa navigare e conserva il lavoro", async () => {
    const a = creaEditor("EVENTI", { sporco: true, riesce: false });
    const router = await monta([a]);

    await premi("Link interno");
    await premi("Salva e continua");

    expect(dove(router)).toBe("/studio");
    expect(suStudio()).toBe(true);
    expect(a.stato.sporco).toBe(true);
    expect(dialogo()).toBeTruthy();
    expect(dialogo().textContent).toMatch(/non è riuscito/i);

    // Si può ancora scegliere, compreso lo scarto.
    await premi("Scarta modifiche");
    expect(dove(router)).toBe("/altrove");
  });

  it("una guardia che solleva è un fallimento, non un via libera", async () => {
    const a = creaEditor("EVENTI", { sporco: true, lancia: true });
    const router = await monta([a]);

    await premi("Link interno");
    await premi("Salva e continua");

    expect(dove(router)).toBe("/studio");
    expect(dialogo().textContent).toMatch(/è esploso/);
  });

  it("con due editor, se il secondo fallisce non si naviga", async () => {
    const a = creaEditor("EVENTI", { sporco: true });
    const b = creaEditor("TOUR", { sporco: true, riesce: false });
    const router = await monta([a, b]);

    await premi("Link interno");
    await premi("Salva e continua");

    expect(a.stato.salvate).toBe(1);
    expect(b.stato.salvate).toBe(1);
    expect(dove(router)).toBe("/studio");
    expect(dialogo().textContent).toMatch(/non è riuscito/i);
  });
});

/* ================================================================== *
 * I tre modi di navigare
 * ================================================================== */

describe("link interno, navigate() e i tasti del browser", () => {
  it.each([
    ["link interno", "Link interno"],
    ["navigazione programmatica", "naviga()"],
  ])("%s: blocca, e dopo la conferma va", async (_nome, pulsante) => {
    const a = creaEditor("EVENTI", { sporco: true });
    const router = await monta([a]);

    await premi(pulsante);
    expect(dialogo()).toBeTruthy();
    expect(dove(router)).toBe("/studio");

    await premi("Scarta modifiche");
    expect(dove(router)).toBe("/altrove");
  });

  it("Indietro: blocca, e annullando resta dov'era con l'URL giusto", async () => {
    const a = creaEditor("EVENTI", { sporco: true });
    // Cronologia: si arriva su /studio venendo da /altrove.
    const router = await monta([a], { partenza: ["/altrove", "/studio"], indice: 1 });

    await premi("Indietro");
    expect(dialogo()).toBeTruthy();

    await premi("Annulla");
    // L'indirizzo è tornato quello vero: senza `reset` resterebbe /altrove
    // mentre a schermo c'è ancora lo Studio.
    expect(dove(router)).toBe("/studio");
    expect(suStudio()).toBe(true);
  });

  it("Indietro confermato torna indietro di un passo solo", async () => {
    const a = creaEditor("EVENTI", { sporco: true });
    const router = await monta([a], { partenza: ["/altrove", "/studio"], indice: 1 });

    await premi("Indietro");
    await premi("Scarta modifiche");

    expect(dove(router)).toBe("/altrove");
    expect(suAltrove()).toBe(true);
  });

  it("Avanti: blocca come gli altri", async () => {
    const a = creaEditor("EVENTI", { sporco: true });
    // Si parte in mezzo alla cronologia, con una voce davanti.
    const router = await monta([a], { partenza: ["/studio", "/altrove"], indice: 0 });

    await premi("Avanti");
    expect(dialogo()).toBeTruthy();
    expect(dove(router)).toBe("/studio");

    await premi("Scarta modifiche");
    expect(dove(router)).toBe("/altrove");
  });
});

/* ================================================================== *
 * Il registro delle guardie
 * ================================================================== */

describe("le guardie vanno e vengono con i loro editor", () => {
  it("si cancella solo quando il suo editor si smonta", async () => {
    const a = creaEditor("EVENTI", { sporco: true });
    const b = creaEditor("TOUR", { sporco: true });
    const partenza = quanteGuardieVive();

    const router = await monta([a, b]);
    expect(quanteGuardieVive()).toBe(partenza + 2);

    // Si va via scartando: gli editor si smontano e le guardie spariscono.
    await premi("Link interno");
    await premi("Scarta modifiche");
    await respiro();

    expect(dove(router)).toBe("/altrove");
    expect(quanteGuardieVive()).toBe(partenza);
  });

  it("dopo una navigazione riuscita la sentinella riparte pulita", async () => {
    const a = creaEditor("EVENTI", { sporco: true });
    const router = await monta([a]);

    await premi("Link interno");
    await premi("Scarta modifiche");
    expect(dove(router)).toBe("/altrove");
    // Nessun dialogo rimasto appeso, e niente che blocchi la prossima volta.
    expect(dialogo()).toBeFalsy();
    expect(testo()).toContain("Altrove");
  });
});

/* ================================================================== *
 * Il ciclo asincrono: quel che succede mentre si salva
 * ================================================================== */

describe("annullare mentre la scrittura è in volo", () => {
  /**
   * Il difetto che questa prova chiude.
   *
   * `rispondi` usciva subito quando il salvataggio era in corso — prima ancora
   * di guardare quale risposta fosse arrivata — mentre il dialogo lasciava
   * «Annulla» premibile. Chi annullava non annullava niente: la scrittura
   * finiva e la sentinella navigava lo stesso, portandosi via la pagina di
   * qualcuno che aveva appena detto di no.
   */
  it("Annulla durante il salvataggio impedisce la navigazione tardiva", async () => {
    const a = creaEditor("A", { sporco: true });
    a.stato.sospensione = rinviata();
    const router = await monta([a]);

    await premi("Link interno");
    await premi("Salva e continua");
    expect(a.stato.salvate).toBe(1);

    await premi("Annulla");
    // Lo stato di annullamento si vede mentre si aspetta.
    expect(dialogo()).toBeTruthy();
    expect(dialogo().dataset.fase).toBe("annulla");
    expect(dialogo().textContent).toMatch(/il salvataggio già partito sta finendo/i);

    await sblocca(a.stato.sospensione);

    expect(dove(router)).toBe("/studio");
    expect(suStudio()).toBe(true);
    expect(dialogo()).toBeFalsy();
  });

  it("Escape durante il salvataggio fa lo stesso", async () => {
    const a = creaEditor("A", { sporco: true });
    a.stato.sospensione = rinviata();
    const router = await monta([a]);

    await premi("Link interno");
    await premi("Salva e continua");
    await tasto("Escape");

    expect(dialogo().dataset.fase).toBe("annulla");
    await sblocca(a.stato.sospensione);

    expect(dove(router)).toBe("/studio");
  });

  it("annullando mentre si salva A, B non viene salvato affatto", async () => {
    const a = creaEditor("A", { sporco: true });
    const b = creaEditor("B", { sporco: true });
    a.stato.sospensione = rinviata();
    const router = await monta([a, b]);

    await premi("Link interno");
    await premi("Salva e continua");
    expect(a.stato.salvate).toBe(1);
    expect(b.stato.salvate).toBe(0);

    await premi("Annulla");
    await sblocca(a.stato.sospensione);

    // La scrittura partita è finita; quella successiva non è mai cominciata.
    expect(a.stato.salvate).toBe(1);
    expect(b.stato.salvate).toBe(0);
    expect(b.stato.sporco).toBe(true);
    expect(dove(router)).toBe("/studio");
  });

  it("dopo un annullamento si può ritentare, e stavolta si naviga", async () => {
    const a = creaEditor("A", { sporco: true });
    a.stato.sospensione = rinviata();
    const router = await monta([a]);

    await premi("Link interno");
    await premi("Salva e continua");
    await premi("Annulla");
    await sblocca(a.stato.sospensione);
    expect(dove(router)).toBe("/studio");

    /*
     * La scrittura partita era arrivata a destinazione — annullare ferma la
     * transizione, non la scrittura — quindi l'editor è pulito. Si torna a
     * lavorarci, come farebbe chiunque abbia appena detto «no, resto qui».
     */
    expect(a.stato.sporco).toBe(false);
    a.stato.sporco = true;
    a.stato.sospensione = null;
    await premi("Link interno");
    expect(dialogo().dataset.fase).toBe("chiede");
    await premi("Salva e continua");

    expect(a.stato.salvate).toBe(2);
    expect(dove(router)).toBe("/altrove");
  });
});

describe("il controllo finale sulle guardie, rilette adesso", () => {
  /**
   * L'elenco di partenza è una fotografia, e fra la prima scrittura e l'ultima
   * passa tempo vero. Navigare su quella fotografia porterebbe via lavoro nato
   * mentre si salvava — nato nella finestra che il dialogo esiste per coprire.
   */
  it("A torna sporco mentre si salva B: non si naviga", async () => {
    const a = creaEditor("A", { sporco: true });
    const b = creaEditor("B", { sporco: true });
    b.stato.sospensione = rinviata();
    const router = await monta([a, b]);

    await premi("Link interno");
    await premi("Salva e continua");
    expect(a.stato.salvate).toBe(1);
    expect(b.stato.salvate).toBe(1);

    a.stato.sporco = true;
    await sblocca(b.stato.sospensione);

    expect(dove(router)).toBe("/studio");
    expect(dialogo()).toBeTruthy();
    expect(dialogo().textContent).toMatch(/sono sopraggiunte modifiche/i);
    // Nessun risalvataggio automatico: si è fermata e ha chiesto.
    expect(a.stato.salvate).toBe(1);
  });

  it("una guardia prima pulita che si sporca durante l'attesa ferma la navigazione", async () => {
    const a = creaEditor("A", { sporco: true });
    const pulita = creaEditor("PULITA");
    a.stato.sospensione = rinviata();
    const router = await monta([a, pulita]);

    await premi("Link interno");
    await premi("Salva e continua");
    // Non era sporca all'inizio: non è nemmeno nell'elenco di partenza.
    expect(pulita.stato.salvate).toBe(0);

    pulita.stato.sporco = true;
    await sblocca(a.stato.sospensione);

    expect(dove(router)).toBe("/studio");
    expect(dialogo().textContent).toMatch(/sono sopraggiunte modifiche/i);
  });

  it("dopo le modifiche sopraggiunte si può riprovare, annullare o scartare", async () => {
    const a = creaEditor("A", { sporco: true });
    const b = creaEditor("B", { sporco: true });
    b.stato.sospensione = rinviata();
    const router = await monta([a, b]);

    await premi("Link interno");
    await premi("Salva e continua");
    a.stato.sporco = true;
    await sblocca(b.stato.sospensione);
    expect(dialogo().textContent).toMatch(/sono sopraggiunte modifiche/i);

    // Riprovare: adesso si salva quel che è rimasto e si esce.
    b.stato.sospensione = null;
    await premi("Salva e continua");
    expect(a.stato.salvate).toBe(2);
    expect(dove(router)).toBe("/altrove");
  });

  it("dalle modifiche sopraggiunte si può anche scartare, ed è l'unica uscita esplicita", async () => {
    const a = creaEditor("A", { sporco: true });
    const b = creaEditor("B", { sporco: true });
    b.stato.sospensione = rinviata();
    const router = await monta([a, b]);

    await premi("Link interno");
    await premi("Salva e continua");
    a.stato.sporco = true;
    await sblocca(b.stato.sospensione);

    await premi("Scarta modifiche");
    expect(dove(router)).toBe("/altrove");
    expect(a.stato.salvate).toBe(1);
  });
});

describe("due risposte ravvicinate, e continuazioni superate", () => {
  it("due «Salva e continua» nello stesso giro avviano un ciclo solo", async () => {
    const a = creaEditor("A", { sporco: true });
    a.stato.sospensione = rinviata();
    const router = await monta([a]);

    await premi("Link interno");
    // Due clic prima di qualunque ridisegno: la difesa non può stare in
    // `disabled`, perché nessun render è ancora avvenuto fra i due.
    const b = qa("button").find((x) => x.textContent.trim() === "Salva e continua");
    await act(async () => {
      b.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 }));
      b.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 }));
    });
    await respiro();

    expect(a.stato.salvate).toBe(1);

    await sblocca(a.stato.sospensione);
    expect(a.stato.salvate).toBe(1);
    expect(dove(router)).toBe("/altrove");
  });

  it("una continuazione che torna dopo lo smontaggio non tocca il router", async () => {
    const a = creaEditor("A", { sporco: true });
    a.stato.sospensione = rinviata();
    const router = await monta([a]);

    await premi("Link interno");
    await premi("Salva e continua");
    const dovePrima = dove(router);

    // Si smonta tutto mentre la scrittura è ancora in volo.
    await act(async () => radice.unmount());
    radice = createRoot(contenitore);

    await act(async () => {
      a.stato.sospensione.risolvi();
      await a.stato.sospensione.promessa;
    });
    await respiro();

    // Nessun `proceed` tardivo: il router è rimasto dov'era.
    expect(dove(router)).toBe(dovePrima);
    expect(router.state.blockers.get("1")?.state ?? "unblocked").not.toBe("proceeding");
  });

  it("una continuazione superata non interferisce con la richiesta successiva", async () => {
    const a = creaEditor("A", { sporco: true });
    a.stato.sospensione = rinviata();
    const router = await monta([a]);

    // Prima richiesta: si salva, si annulla, e la si lascia aperta in volo.
    await premi("Link interno");
    await premi("Salva e continua");
    await premi("Annulla");
    await sblocca(a.stato.sospensione);
    expect(dove(router)).toBe("/studio");

    // Seconda richiesta, con una nuova sospensione.
    a.stato.sporco = true;
    const secondaSospensione = rinviata();
    a.stato.sospensione = secondaSospensione;
    await premi("Link interno");
    await premi("Salva e continua");
    expect(dialogo().dataset.fase).toBe("salva");

    // La prima continuazione è già finita: la seconda non ne eredita nulla,
    // e in particolare non eredita l'annullamento.
    await sblocca(secondaSospensione);
    expect(dove(router)).toBe("/altrove");
  });

  it("dopo un fallimento si può ritentare, e il secondo tentativo naviga", async () => {
    const a = creaEditor("A", { sporco: true, riesce: false });
    const router = await monta([a]);

    await premi("Link interno");
    await premi("Salva e continua");
    expect(dove(router)).toBe("/studio");
    expect(dialogo().textContent).toMatch(/non è riuscito/i);

    a.stato.riesce = true;
    await premi("Salva e continua");
    expect(a.stato.salvate).toBe(2);
    expect(dove(router)).toBe("/altrove");
  });
});
