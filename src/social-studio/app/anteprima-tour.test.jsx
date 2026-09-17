import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AnteprimaTour from "./AnteprimaTour";

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

const catture = vi.hoisted(() => ({ cattura: [], scarica: [] }));

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
    risolviTutte(larghezza = 1800, altezza = 832) {
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
  registro.muto = false;
  spie.render = 0;
  ImmagineOriginale = globalThis.Image;
  OsservatoreOriginale = globalThis.ResizeObserver;
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
    // Nessun falso successo: il messaggio dice che si sta ancora aspettando.
    expect(messaggio()).toMatch(/non è ancora pronta/i);
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
    expect(messaggio()).toMatch(/non risponde/i);
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
