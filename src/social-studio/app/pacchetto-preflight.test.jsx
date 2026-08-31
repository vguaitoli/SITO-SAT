import React, { useLayoutEffect } from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Il pre-flight del pacchetto vede ciò che nasce montando le grafiche.
 *
 * **Il difetto.** La richiesta di export nasce prima che le quindici grafiche
 * esistano nel DOM; le loro segnalazioni nascono montandole. L'effetto di
 * `useLavoroExport` dipende dal solo id — e deve continuare a dipenderne,
 * altrimenti torna il difetto monta → cattura — quindi tratteneva la `esegui`
 * di *prima*, con dentro l'array `problemi` di prima: vuoto. Uno sforo
 * presente soltanto in una Story nascosta non arrivava al pre-flight, e il
 * pacchetto veniva catturato lo stesso.
 *
 * Qui si monta l'editor vero. La Story è finta — in jsdom nessun testo può
 * davvero sbordare, perché ogni altezza è zero — ma è finta solo la *causa*
 * dello sforo: il registro, il coordinamento, il pre-flight, il motore di
 * esportazione e il pannello sono quelli veri.
 */

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// jsdom non ha `ResizeObserver`, che `Anteprima` usa per scalare la tela.
globalThis.ResizeObserver ||= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
globalThis.URL.createObjectURL ||= () => "blob:prova";
globalThis.URL.revokeObjectURL ||= () => {};

const SFORO = "SFORO-CHE-VIVE-SOLO-NELLA-STORY-04";

/* ------------------------------------------------------------------ *
 * Doppi
 * ------------------------------------------------------------------ */

/** Un evento nella forma che l'adapter del sito si aspetta. */
const EVENTO = {
  slug: "prova-integrazione",
  name: "Traversata di prova",
  type: "Enduro",
  prezzo: "390 €",
  date: "2026-04-12",
  endDate: "2026-04-13",
  periodo: "12–13 aprile",
  km: "120 km",
  sterrato: "70%",
  durata: "2 giorni",
  livello: "Medio",
  partenza: "Paese",
  inclusi: ["Guida", "Cena"],
  requisiti: ["Patente A"],
  tappe: [{ title: "Uno — Due", desc: "Prima" }],
};

vi.mock("@/content/TinaContentProvider", () => ({
  useSiteContent: () => ({
    events: [EVENTO],
    SITE: { url: "https://esempio.test", whatsapp: "+39 000" },
    TOUR_GROUP: {},
  }),
}));

/**
 * Come si comportano le Story finte in questa prova.
 *
 * - `subito`      segnala lo sforo appena montata;
 * - `tardiva`     tiene aperta una misura per qualche frame, poi segnala: è la
 *                 vita vera di `TestoAdattivo`, che non può misurare finché i
 *                 caratteri non sono arrivati;
 * - `senzaNodo`   non attacca mai il proprio riferimento: la grafica non esiste
 *                 nel DOM e non esisterà mai;
 * - `inquieta`    cambia segnalazione a ogni frame: il registro non si assesta.
 */
const regia = vi.hoisted(() => ({ modo: "subito", frameDiRitardo: 12 }));

/**
 * `FuoriSchermo` è ciò che registra il nodo: il riferimento sta lì, non nel
 * template. In modo `senzaNodo` non glielo si passa, e per l'editor quella
 * grafica non esisterà mai.
 */
vi.mock("./Anteprima", async (importaOriginale) => {
  const originale = await importaOriginale();
  const React2 = await import("react");
  return {
    ...originale,
    FuoriSchermo: function FuoriSchermoFinto({ riferimento, ...resto }) {
      return React2.createElement(originale.FuoriSchermo, {
        ...resto,
        riferimento: regia.modo === "senzaNodo" ? undefined : riferimento,
      });
    },
  };
});

vi.mock("../template/rubriche/eventi/StoryCanonica", async () => {
  const primitivi = await import("../template/primitivi");
  const React2 = await import("react");
  return {
    default: function StoryFinta(props) {
      return React2.createElement(
        primitivi.AmbitoProblemi,
        { nome: `story/${props.id}` },
        React2.createElement(Sforante, { ...props, primitivi }),
      );
    },
    SLOT_FOTO: {},
  };
});

/** Attende `n` frame reali, come fa il codice di cattura. */
function dopoFrame(n, fai) {
  let restanti = n;
  let annullato = false;
  const giro = () => {
    if (annullato) return;
    if (restanti <= 0) { fai(); return; }
    restanti -= 1;
    requestAnimationFrame(giro);
  };
  requestAnimationFrame(giro);
  return () => { annullato = true; };
}

function Sforante({ id, riferimento, primitivi }) {
  const { useSegnalazione, useSegnalaMisura, useSegnalaProblema, useChiaveProblema } = primitivi;
  const chiaveSforo = useChiaveProblema("sforo");
  const chiaveMisura = useChiaveProblema("misura-finta");
  const chiaveInquieta = useChiaveProblema("inquieta");
  const segnalaMisura = useSegnalaMisura();
  const segnala = useSegnalaProblema();
  const questaSfora = id === "tappe";

  /*
   * Perché queste finte scrivono nel registro senza passare da uno stato React.
   *
   * Sotto `act()` un `setState` innescato dentro un `requestAnimationFrame`
   * resta in coda e non produce il render intermedio: il registro non si
   * muoverebbe durante la finestra che stiamo misurando, e la prova non
   * proverebbe niente. `segnala` scrive nella mappa in modo sincrono — che è
   * poi quello che fa `TestoAdattivo` dal proprio effetto di layout.
   */

  // Modo normale: la segnalazione c'è dal montaggio.
  useSegnalazione(
    "sforo",
    questaSfora && regia.modo !== "tardiva" ? { livello: "avviso", messaggio: SFORO } : null,
  );

  /**
   * Misura che arriva tardi.
   *
   * Tiene aperta una voce fra le misure in sospeso, e la chiude **dopo** aver
   * segnalato: è l'ordine del `TestoAdattivo` vero, che dentro lo stesso
   * effetto di layout prima segnala e poi si toglie dalle pendenze. Chiudere
   * prima lascerebbe una finestra in cui il registro sembra assestato e non lo è.
   */
  useLayoutEffect(() => {
    if (regia.modo !== "tardiva") return undefined;
    segnalaMisura(chiaveMisura, true);
    const ferma = dopoFrame(regia.frameDiRitardo, () => {
      if (questaSfora) segnala(chiaveSforo, { livello: "avviso", messaggio: SFORO });
      segnalaMisura(chiaveMisura, false);
    });
    return () => {
      ferma();
      segnalaMisura(chiaveMisura, false);
      if (questaSfora) segnala(chiaveSforo, null);
    };
  }, [segnalaMisura, segnala, chiaveMisura, chiaveSforo, questaSfora]);

  /** Registro che non si assesta: una voce diversa a ogni frame. */
  useLayoutEffect(() => {
    if (regia.modo !== "inquieta" || !questaSfora) return undefined;
    let vivo = true;
    let n = 0;
    const giro = () => {
      if (!vivo) return;
      n += 1;
      segnala(chiaveInquieta, { livello: "avviso", messaggio: `${SFORO} ${n}` });
      requestAnimationFrame(giro);
    };
    requestAnimationFrame(giro);
    return () => { vivo = false; segnala(chiaveInquieta, null); };
  }, [questaSfora, segnala, chiaveInquieta]);

  // `senzaNodo` agisce su `FuoriSchermo`, che è dove il nodo viene registrato.
  return <div ref={riferimento} data-story={id} />;
}

/** Il motore di cattura: registra se qualcuno ha fotografato o scaricato. */
const traccia = { catture: 0, download: [] };
vi.mock("../motori/export/cattura", async (importaOriginale) => {
  const originale = await importaOriginale();
  return {
    ...originale,
    catturaSequenza: async (elementi) => {
      traccia.catture += 1;
      return {
        file: elementi.map((e) => ({
          nome: e.nome, blob: new Blob([new Uint8Array([1])], { type: "image/png" }), ms: 1,
        })),
        msTotale: 1,
        memoria: null,
      };
    },
    scarica: (_blob, nome) => traccia.download.push(nome),
  };
});

let EditorEvento;
let FornitoreArchivio;
let creaArchivioMemoria;

/* ------------------------------------------------------------------ *
 * Montaggio
 * ------------------------------------------------------------------ */

let contenitore;
let radice;

beforeEach(async () => {
  regia.modo = "subito";
  regia.frameDiRitardo = 12;
  traccia.catture = 0;
  traccia.download = [];
  ({ default: EditorEvento } = await import("./EditorEvento"));
  ({ FornitoreArchivio } = await import("./ContestoArchivio"));
  ({ creaArchivioMemoria } = await import("../fondamenta/archivio"));
  contenitore = document.createElement("div");
  document.body.appendChild(contenitore);
  radice = createRoot(contenitore);
});

afterEach(() => {
  act(() => radice.unmount());
  contenitore.remove();
});

/** Lascia girare frame, microtask e il raggruppamento del registro. */
const assesta = async (ms = 400) => {
  await act(async () => { await new Promise((r) => setTimeout(r, ms)); });
};

/**
 * Il pannello di conferma dell'esportazione.
 *
 * Non la pagina intera: il pannello sempre acceso del pre-flight mostra gli
 * stessi problemi, e cercarli «da qualche parte nel documento» renderebbe il
 * test cieco proprio al difetto — passerebbe anche con la chiusura obsoleta.
 */
const pannello = () => contenitore.querySelector("[data-esito]");

const bottone = (testo) =>
  [...contenitore.querySelectorAll("button")].find((b) => b.textContent.trim().toLowerCase().includes(testo));

const premi = async (testo) => {
  const b = bottone(testo);
  if (!b) throw new Error(`Nessun pulsante «${testo}». Presenti: ${[...contenitore.querySelectorAll("button")].map((x) => x.textContent.trim()).join(" | ")}`);
  await act(async () => { b.click(); });
};

/** Una traccia minima: senza GPX il pacchetto è bloccato da errori, non da avvisi. */
const GPX = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="prova" xmlns="http://www.topografix.com/GPX/1/1"><trk><trkseg>
${Array.from({ length: 40 }, (_, i) => `<trkpt lat="${(40.7 + i * 0.01).toFixed(5)}" lon="${(9.2 + i * 0.008).toFixed(5)}"><ele>${100 + i}</ele></trkpt>`).join("")}
</trkseg></trk></gpx>`;

async function caricaGpx() {
  const input = contenitore.querySelector('input[type="file"][accept=".gpx"]');
  const file = new File([GPX], "prova.gpx", { type: "application/gpx+xml" });
  Object.defineProperty(input, "files", { value: [file], configurable: true });
  await act(async () => {
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await assesta();
}

async function apriBozza() {
  await act(async () => {
    radice.render(
      <FornitoreArchivio archivio={creaArchivioMemoria()}>
        <EditorEvento />
      </FornitoreArchivio>,
    );
  });
  await assesta();
  await premi("traversata di prova");
  await assesta();
  await caricaGpx();
}

/* ------------------------------------------------------------------ *
 * Il caso
 * ------------------------------------------------------------------ */

describe("pre-flight del pacchetto", () => {
  it("vede lo sforo di una Story montata solo fuori schermo", async () => {
    await apriBozza();

    // Vista Post: la Story non è a schermo, e il suo sforo non esiste ancora.
    expect(contenitore.textContent).toContain("Esporta il Post");
    expect(contenitore.textContent).not.toContain(SFORO);

    await premi("esporta pacchetto");
    await assesta(1200);

    // Il problema nato montando le grafiche è arrivato **al pre-flight
    // dell'esportazione**, non solo al pannello informativo.
    expect(pannello()).toBeTruthy();
    expect(pannello().dataset.esito).toBe("avvisi");
    expect(pannello().textContent).toContain(SFORO);
    // …e prima della conferma non è stato fotografato né scaricato niente.
    expect(traccia.catture).toBe(0);
    expect(traccia.download).toEqual([]);
    // L'unica strada avanti è dichiarata.
    expect(bottone("esporta comunque")).toBeTruthy();
  });

  it("dopo «Esporta comunque» il pacchetto esce davvero", async () => {
    await apriBozza();
    await premi("esporta pacchetto");
    await assesta(1200);
    expect(traccia.catture).toBe(0);
    expect(pannello().textContent).toContain(SFORO);

    await premi("esporta comunque");
    await assesta(1200);

    expect(traccia.catture).toBe(1);
    expect(traccia.download).toHaveLength(1);
    expect(traccia.download[0]).toMatch(/-pacchetto\.zip$/);
  });

  it("«Torna a correggere» non esporta niente", async () => {
    await apriBozza();
    await premi("esporta pacchetto");
    await assesta(1200);

    await premi("torna a correggere");
    await assesta();

    expect(traccia.catture).toBe(0);
    expect(traccia.download).toEqual([]);
    expect(contenitore.textContent).not.toContain(SFORO);
  });
});

/* ------------------------------------------------------------------ *
 * Quando la prontezza non si raggiunge
 * ------------------------------------------------------------------ */

describe("prontezza non dimostrabile", () => {
  /*
   * `attendiPronto` ha un limite di frame. Prima, alla scadenza, usciva in
   * silenzio: `useLavoroExport` leggeva quella risoluzione come un via libera e
   * chiamava `esegui` lo stesso. Si producevano quindici PNG senza sapere se il
   * pre-flight avesse davanti lo stato completo — che è il difetto di partenza,
   * solo spostato di qualche riga.
   *
   * Adesso la scadenza è un esito dichiarato, e un esito dichiarato si può
   * verificare.
   */

  it("con una grafica che non si monta mai non esporta niente", { timeout: 30000 }, async () => {
    regia.modo = "senzaNodo";
    await apriBozza();
    await premi("esporta pacchetto");
    await assesta(3000);

    expect(traccia.catture).toBe(0);
    expect(traccia.download).toEqual([]);
    expect(pannello()).toBeTruthy();
    expect(pannello().dataset.esito).toBe("nonPronto");
    expect(pannello().textContent).toContain("non erano pronte");
    // Dice quali: sono le sei Story, che non attaccano mai il riferimento.
    expect(pannello().textContent).toMatch(/story-\w+/);
  });

  it("con un registro che non si assesta non esporta niente", { timeout: 30000 }, async () => {
    regia.modo = "inquieta";
    await apriBozza();
    await premi("esporta pacchetto");
    await assesta(3000);

    expect(traccia.catture).toBe(0);
    expect(traccia.download).toEqual([]);
    expect(pannello().dataset.esito).toBe("nonPronto");
  });

  it("il pannello offre di riprovare, e riprovare rilancia davvero", { timeout: 30000 }, async () => {
    regia.modo = "senzaNodo";
    await apriBozza();
    await premi("esporta pacchetto");
    await assesta(3000);
    expect(pannello().dataset.esito).toBe("nonPronto");

    // Nel frattempo la causa sparisce: le grafiche tornano a montarsi.
    regia.modo = "subito";
    await premi("riprova");
    await assesta(2000);

    // Ora il pre-flight vede lo sforo, e chiede conferma come deve.
    expect(pannello().dataset.esito).toBe("avvisi");
    expect(pannello().textContent).toContain(SFORO);
    expect(traccia.catture).toBe(0);
  });

  it("annullando durante l'attesa non resta né un file né lo stato occupato", { timeout: 30000 }, async () => {
    regia.modo = "senzaNodo";
    await apriBozza();
    await premi("esporta pacchetto");
    // Si annulla mentre `attendiPronto` sta ancora girando.
    await act(async () => { await new Promise((r) => setTimeout(r, 120)); });
    await premi("annulla");
    await assesta(3000);

    expect(traccia.catture).toBe(0);
    expect(traccia.download).toEqual([]);
    // Nessun pannello: annullare è una scelta, non un guasto da spiegare.
    expect(pannello()).toBeNull();
    // E l'editor è di nuovo utilizzabile.
    expect(bottone("esporta pacchetto")).toBeTruthy();
    expect(bottone("annulla")).toBeFalsy();
  });
});

describe("misura tipografica che arriva tardi", () => {
  /*
   * Il caso che due letture vuote consecutive non sanno distinguere. La Story
   * tiene aperta una misura per cinque frame — più dei due che servivano prima
   * a dichiarare «assestato» — e solo dopo segnala lo sforo. Senza il conteggio
   * delle misure in sospeso, l'esportazione partirebbe al secondo frame con il
   * registro ancora vuoto, e lo sforo non lo vedrebbe nessuno.
   */
  it("lo sforo entra nel pre-flight anche se la misura tarda", { timeout: 30000 }, async () => {
    regia.modo = "tardiva";
    // Ben oltre i frame che le altre quattordici grafiche impiegano ad
    // assestarsi: così l'unica cosa che trattiene l'esportazione è la misura.
    regia.frameDiRitardo = 12;
    await apriBozza();
    await premi("esporta pacchetto");
    await assesta(2500);

    expect(pannello()).toBeTruthy();
    expect(pannello().dataset.esito).toBe("avvisi");
    expect(pannello().textContent).toContain(SFORO);
    expect(traccia.catture).toBe(0);
    expect(traccia.download).toEqual([]);
  });
});
