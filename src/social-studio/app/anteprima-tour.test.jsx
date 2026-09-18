import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AnteprimaTour from "./AnteprimaTour";
import { templateDisponibile } from "../design/registro-template";
import { statoRubrica } from "./registro-editor";

/**
 * Il cancello di prontezza del banco visivo.
 *
 * `fotografa` chiamava `cattura` e basta. Ma la geometria della fotografia
 * dipende dalle dimensioni del file, che arrivano quando arrivano: un clic
 * nella finestra sbagliata produceva un PNG **senza fotografia**, scaricato e
 * annunciato come riuscito. Qui si chiude quella finestra, e si chiude
 * fail-closed: nel dubbio non si fotografa.
 *
 * Non è il pre-flight TOUR, che non esiste: è il cancello di uno strumento
 * diagnostico.
 */

const catture = vi.hoisted(() => ({ cattura: [], scarica: [], sospendi: false, chiudi: null, fallisci: null }));

/** Quando è acceso, il fornitore non deposita più lettore e misure. */
const registro = vi.hoisted(() => ({ muto: false }));

/** Quante volte il fornitore è stato invocato: cresce a ogni render del banco. */
const spie = vi.hoisted(() => ({ render: 0 }));

vi.mock("../template/primitivi", async (importaOriginale) => {
  const vero = await importaOriginale();
  return {
    ...vero,
    FornitoreProblemi: function FornitoreSorvegliato(props) {
      spie.render += 1;
      const passate = registro.muto
        ? { ...props, lettore: undefined, misure: undefined }
        : props;
      return React.createElement(vero.FornitoreProblemi, passate);
    },
  };
});

vi.mock("../motori/export/cattura", () => ({
  cattura: async (nodo, opzioni) => {
    catture.cattura.push(opzioni?.formato ?? null);
    /*
     * Cattura **sospendibile**: quando la prova vuole osservare che cosa
     * succede *mentre* si fotografa, accende `catture.sospendi` e la promessa
     * resta aperta finché non la chiude lei. Niente attese a tempo: la finestra
     * la apre e la chiude la prova.
     */
    if (catture.sospendi) {
      await new Promise((risolvi, rifiuta) => {
        catture.chiudi = risolvi;
        catture.fallisci = rifiuta;
      });
    }
    return { blob: new Blob(["x"]), larghezza: 1080, altezza: 1350, ms: 1 };
  },
  scarica: (blob, nome) => {
    catture.scarica.push(nome);
  },
}));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let contenitore;
let radice;
let ImmagineOriginale;
let OsservatoreOriginale;
let FontOriginali;
let pendenti;

/** Un `Image` che risponde solo quando lo decide la prova. */
function pilotaImmagini() {
  const mappa = new Map();
  globalThis.Image = class {
    constructor() {
      this.naturalWidth = 0;
      this.naturalHeight = 0;
      this.complete = false;
    }
    set src(v) {
      this._src = v;
      const istanze = mappa.get(v) || [];
      istanze.push(this);
      mappa.set(v, istanze);
    }
    get src() {
      return this._src;
    }
  };
  return {
    /*
     * Il default è una fotografia **davvero** sufficiente per i due formati.
     *
     * Non 1800×832, che è la misura del file diagnostico vero: con il controllo
     * di risoluzione corretto quella non basta né per il Post né per la Story, e
     * userebbe come sfondo di ogni prova un errore che non è quello in esame.
     * Una prova apposta, qui sotto, misura il file vero.
     */
    risolviTutte(larghezza = 2400, altezza = 2600) {
      for (const istanze of mappa.values()) {
        for (const i of istanze) {
          i.naturalWidth = larghezza;
          i.naturalHeight = altezza;
          i.complete = true;
          i.onload?.();
        }
      }
    },
    falliscilTutte() {
      for (const istanze of mappa.values()) {
        for (const i of istanze) i.onerror?.();
      }
    },
  };
}

beforeEach(() => {
  catture.cattura = [];
  catture.scarica = [];
  catture.sospendi = false;
  catture.chiudi = null;
  catture.fallisci = null;
  registro.muto = false;
  spie.render = 0;
  ImmagineOriginale = globalThis.Image;
  OsservatoreOriginale = globalThis.ResizeObserver;
  /*
   * jsdom non implementa `document.fonts`, e il controllo comune dei font
   * restituirebbe un avviso in ogni prova — coprendo con un dettaglio
   * dell'ambiente proprio le conferme che qui si vogliono misurare. Lo si
   * dichiara pronto: quel controllo ha le sue prove altrove, sul vero.
   */
  FontOriginali = Object.getOwnPropertyDescriptor(document, "fonts");
  Object.defineProperty(document, "fonts", {
    configurable: true,
    value: { check: () => true, load: () => Promise.resolve([]), ready: Promise.resolve() },
  });
  // `Anteprima` osserva la larghezza disponibile: in jsdom non esiste.
  globalThis.ResizeObserver = class {
    observe() {}
    disconnect() {}
  };
  pendenti = pilotaImmagini();
  contenitore = document.createElement("div");
  document.body.appendChild(contenitore);
  radice = createRoot(contenitore);
});

afterEach(() => {
  act(() => radice.unmount());
  contenitore.remove();
  globalThis.Image = ImmagineOriginale;
  globalThis.ResizeObserver = OsservatoreOriginale;
  if (FontOriginali) Object.defineProperty(document, "fonts", FontOriginali);
  else delete document.fonts;
});

const assesta = async () => {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 140));
  });
};

async function monta() {
  await act(async () => {
    radice.render(<AnteprimaTour />);
  });
  await assesta();
}

const bottone = (nome) =>
  [...contenitore.querySelectorAll("button")].find((b) => (b.textContent || "").includes(nome));

const premi = async (nome) => {
  await act(async () => {
    bottone(nome).dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  await assesta();
};

const messaggio = () => contenitore.textContent || "";

/**
 * Preme il bottone e, se compare la conferma, la conferma.
 *
 * Gli avvisi non si superano per sbaglio: il banco chiede «Esporta comunque»
 * prima di fotografare. Dove non ci sono avvisi il bottone non compare e questa
 * funzione si comporta come un clic solo.
 */
const premiEConferma = async (nome) => {
  await premi(nome);
  if (bottone("Esporta comunque")) await premi("Esporta comunque");
};

/**
 * Una segnalazione che resta non deve far girare il mulino.
 *
 * `onProblemi` cambiava a ogni render — `raccogli("post")` costruiva una
 * funzione nuova ogni volta — e con essa cambiava `segnala` dentro il
 * fornitore. Ogni effetto di segnalazione si ritirava e si riscriveva, il
 * raggruppamento da 80 ms notificava, il genitore aggiornava lo stato, e si
 * ricominciava: un errore persistente teneva in moto notifiche e render senza
 * fine.
 */
describe("le segnalazioni stabili non fanno girare il banco a vuoto", () => {
  it("un errore persistente si mostra e poi tutto si ferma", async () => {
    vi.useFakeTimers();
    try {
      await act(async () => {
        radice.render(<AnteprimaTour />);
      });
      // Le fotografie falliscono: resta una segnalazione stabile in registro.
      await act(async () => {
        pendenti.falliscilTutte();
      });
      await act(async () => {
        vi.advanceTimersByTime(1000);
      });

      // L'errore c'è ed è visibile.
      expect(messaggio()).toMatch(/non si è potuta caricare/i);

      const renderPrima = spie.render;
      await act(async () => {
        vi.advanceTimersByTime(5000);
      });

      // Cinque secondi dopo, con l'errore ancora lì, nessun render in più.
      expect(spie.render).toBe(renderPrima);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("il banco non fotografa una grafica non pronta", () => {
  it("con le fotografie ancora in caricamento non cattura e non scarica", async () => {
    await monta();

    await premi("tour-prova-post.png");

    expect(catture.cattura).toEqual([]);
    expect(catture.scarica).toEqual([]);
    // Nessun falso successo: il messaggio dice che cosa si sta aspettando.
    expect(messaggio()).toMatch(/misure ancora in sospeso|sta ancora caricando/i);
    expect(messaggio()).not.toMatch(/tour-prova-post\.png · 1080/);
  });

  it("caricate le fotografie, il ritentativo produce un download solo", async () => {
    await monta();
    await premi("tour-prova-post.png");
    expect(catture.scarica).toEqual([]);

    await act(async () => {
      pendenti.risolviTutte();
    });
    await assesta();

    await premi("tour-prova-post.png");

    expect(catture.cattura).toEqual(["post"]);
    expect(catture.scarica).toEqual(["tour-prova-post.png"]);
    expect(messaggio()).toContain("tour-prova-post.png · 1080×1350");
  });

  it("un registro che non risponde è motivo sufficiente per non scattare", async () => {
    // Fail-closed: senza una risposta non si decide, e non si fotografa.
    registro.muto = true;
    await monta();
    await act(async () => {
      pendenti.risolviTutte();
    });
    await assesta();

    await premi("tour-prova-post.png");

    expect(catture.cattura).toEqual([]);
    expect(catture.scarica).toEqual([]);
    // Fail-closed: senza una lettura del registro l'evidenza non esiste, e
    // un'evidenza che non esiste non autorizza.
    expect(messaggio()).toMatch(/nessuna evidenza dal renderer/i);
  });

  it("i due formati hanno cancelli distinti e scaricano il proprio file", async () => {
    await monta();
    await act(async () => {
      pendenti.risolviTutte();
    });
    await assesta();

    await premi("tour-prova-story.png");
    expect(catture.cattura).toEqual(["story"]);
    expect(catture.scarica).toEqual(["tour-prova-story.png"]);

    await premi("tour-prova-post.png");
    expect(catture.cattura).toEqual(["story", "post"]);
    expect(catture.scarica).toEqual(["tour-prova-story.png", "tour-prova-post.png"]);
  });
});

/* ================================================================== *
 * Le due correzioni del banco
 * ================================================================== */

const casella = () => contenitore.querySelector('input[type="checkbox"]');

/** Un clic vero: su un controllo disabilitato non succede niente, come in pagina. */
const spunta = async () => {
  await act(async () => {
    casella().click();
  });
  await assesta();
};

/** Il titolo della Story dichiara il ripiego: è lo stato, non il DOM della casella. */
const storyInRipiego = () => /ripiego cover/i.test(messaggio());

/**
 * Difetto B: la configurazione cambiava **mentre** la si fotografava.
 *
 * I due bottoni erano disabilitati durante la cattura, la casella del ripiego
 * no. html2canvas legge il DOM mentre il PNG si forma: spuntarla a metà strada
 * sostituiva la fotografia della Story sotto la macchina fotografica, e il file
 * usciva con una grafica che non è né quella di prima né quella di dopo —
 * nessun errore, nessun avviso, e il difetto visibile solo aprendo il PNG.
 */
describe("durante la cattura la configurazione non si muove", () => {
  it("la casella del ripiego non cambia stato finché la cattura non è finita", async () => {
    await monta();
    await act(async () => pendenti.risolviTutte());
    await assesta();
    expect(casella().checked).toBe(false);

    catture.sospendi = true;
    // La cattura parte e resta aperta: siamo dentro la finestra.
    await premiEConferma("tour-prova-story.png");
    expect(catture.cattura).toEqual(["story"]);

    expect(casella().disabled).toBe(true);
    await spunta();
    // Né la casella né lo stato si sono mossi: la grafica fotografata è
    // ancora quella su cui il controllo è passato.
    expect(casella().checked).toBe(false);
    expect(storyInRipiego()).toBe(false);

    // E nemmeno forzando l'evento a mano: la guardia non sta solo in `disabled`.
    await act(async () => {
      casella().dispatchEvent(new Event("change", { bubbles: true }));
    });
    await assesta();
    expect(storyInRipiego()).toBe(false);

    await act(async () => catture.chiudi());
    await assesta();

    // Finita la cattura, la casella torna a rispondere.
    expect(casella().disabled).toBe(false);
    await spunta();
    expect(casella().checked).toBe(true);
    expect(storyInRipiego()).toBe(true);
  });

  it("anche una cattura fallita restituisce la casella", async () => {
    // Il blocco si libera nel `finally` di chi l'ha preso: un errore non deve
    // lasciare il banco congelato per sempre.
    await monta();
    await act(async () => pendenti.risolviTutte());
    await assesta();

    catture.sospendi = true;
    await premiEConferma("tour-prova-story.png");
    expect(casella().disabled).toBe(true);

    await act(async () => {
      catture.fallisci(new Error("canvas esaurito"));
    });
    await assesta();

    expect(messaggio()).toMatch(/canvas esaurito/);
    expect(casella().disabled).toBe(false);
  });
});

/**
 * Difetto C: due registri, una chiave sola.
 *
 * Il pannello concatenava i problemi dei due formati e usava `p.chiave` come
 * key di React. Ma i due registri sono **separati per formato** e le chiavi
 * nascono uguali: la fotografia del Post è `vista/foto` e quella della Story è
 * `vista/foto`. Due voci diverse con la stessa key — React protesta, e la
 * lista può riusare la riga sbagliata quando l'elenco cambia.
 */
describe("il pannello distingue i due formati", () => {
  it("l'errore foto compare due volte, con il formato, e senza avvisi di React", async () => {
    const errori = [];
    const spia = vi.spyOn(console, "error").mockImplementation((...a) => errori.push(a.join(" ")));
    try {
      await monta();
      // Entrambe le fotografie falliscono: stessa chiave nei due registri.
      await act(async () => pendenti.falliscilTutte());
      await assesta();

      const righe = [...contenitore.querySelectorAll("li")].map((l) => l.textContent || "");
      const dellaFoto = righe.filter((r) => /non si è potuta caricare/i.test(r));
      expect(dellaFoto).toHaveLength(2);
      // Ogni riga dice a quale formato appartiene.
      expect(dellaFoto.some((r) => /post/i.test(r))).toBe(true);
      expect(dellaFoto.some((r) => /story/i.test(r))).toBe(true);

      expect(errori.filter((e) => /same key|unique "key"/i.test(e))).toEqual([]);
    } finally {
      spia.mockRestore();
    }
  });
});

/* ================================================================== *
 * Il pre-flight come cancello
 * ================================================================== */

const pronte = async () => {
  await monta();
  await act(async () => pendenti.risolviTutte());
  await assesta();
};

/**
 * Gli avvisi non si superano per sbaglio.
 *
 * Nessun errore non è autorizzazione: la Story che ripiega sulla cover è una
 * scelta legittima e resta un avviso, ma va **detta**. Il primo clic non
 * fotografa: mostra che cosa si sta per accettare.
 */
describe("gli avvisi chiedono una conferma esplicita", () => {
  it("il primo clic non cattura: mostra l'avviso e aspetta", async () => {
    await pronte();
    await spunta(); // la Story ripiega sulla cover
    expect(storyInRipiego()).toBe(true);

    await premi("tour-prova-story.png");

    expect(catture.cattura).toEqual([]);
    expect(catture.scarica).toEqual([]);
    expect(messaggio()).toMatch(/inquadratura è pensata per il 4:5/i);
    expect(bottone("Esporta comunque")).toBeTruthy();
  });

  it("«Esporta comunque» fotografa, una volta sola", async () => {
    await pronte();
    await spunta();
    await premi("tour-prova-story.png");
    await premi("Esporta comunque");

    expect(catture.cattura).toEqual(["story"]);
    expect(catture.scarica).toEqual(["tour-prova-story.png"]);
    // La conferma si consuma: sparisce insieme al pannello che la offriva.
    expect(bottone("Esporta comunque")).toBeFalsy();
  });

  it("«Riprova» rifà i controlli e torna a chiedere: nessun bypass", async () => {
    await pronte();
    await spunta();
    await premi("tour-prova-story.png");

    await premi("Riprova");

    // L'avviso c'è ancora, quindi si richiede di nuovo: non si è catturato.
    expect(catture.cattura).toEqual([]);
    expect(bottone("Esporta comunque")).toBeTruthy();
  });

  it("cambiare configurazione annulla la conferma in attesa", async () => {
    await pronte();
    await spunta();
    await premi("tour-prova-story.png");
    expect(bottone("Esporta comunque")).toBeTruthy();

    // Si torna alla Story con la propria fotografia: l'avviso non c'è più, e
    // nemmeno la conferma che lo riguardava.
    await spunta();
    expect(bottone("Esporta comunque")).toBeFalsy();

    await premi("tour-prova-story.png");
    expect(catture.cattura).toEqual(["story"]);
  });

  it("il Post senza avvisi non chiede niente", async () => {
    await pronte();
    await premi("tour-prova-post.png");
    expect(bottone("Esporta comunque")).toBeFalsy();
    expect(catture.scarica).toEqual(["tour-prova-post.png"]);
  });
});

describe("gli errori non si confermano", () => {
  it("una fotografia fallita blocca, e non offre nessuna scorciatoia", async () => {
    await monta();
    await act(async () => pendenti.falliscilTutte());
    await assesta();

    await premi("tour-prova-post.png");

    expect(catture.cattura).toEqual([]);
    expect(catture.scarica).toEqual([]);
    expect(bottone("Esporta comunque")).toBeFalsy();
    expect(messaggio()).toMatch(/controll(o|i) non passat/i);
  });
});

describe("il banco non abilita TOUR", () => {
  it("il pannello riporta il pre-flight specifico, e i registri restano vuoti", async () => {
    await pronte();
    expect(messaggio()).toMatch(/pre-flight tour: \d+ controlli passati/i);
    expect(templateDisponibile("tour", "post", "standard")).toBe(false);
    expect(templateDisponibile("tour", "story", "standard")).toBe(false);
    expect(statoRubrica("tour")).toBe("pianificata");
  });
});

/**
 * La fotografia diagnostica del repository, misurata sul serio.
 *
 * `4x4-guado-1800.webp` è 1800×832 — 2,16:1 — e le due tele sono 4:5 e 9:16:
 * per coprirle va ingrandita 1,79× e 3,12×, cioè nella larghezza visibile ne
 * restano 605 e 347 px su 1080. Con il controllo corretto il banco **non
 * fotografa**. È un fatto sul file, e sceglierne un altro è una decisione
 * editoriale che non spetta a questo capitolo.
 */
describe("la fotografia diagnostica vera non basta per i prototipi", () => {
  it.each([["post"], ["story"]])("%s: la risoluzione disegnata blocca la cattura", async (quale) => {
    await monta();
    await act(async () => pendenti.risolviTutte(1800, 832));
    await assesta();

    await premi(`tour-prova-${quale}.png`);

    expect(catture.cattura).toEqual([]);
    expect(catture.scarica).toEqual([]);
    // Un errore, quindi nessuna conferma possibile.
    expect(bottone("Esporta comunque")).toBeFalsy();
    expect(messaggio()).toMatch(/1800×832/);
    expect(messaggio()).toMatch(/su 1080/);
  });
});
