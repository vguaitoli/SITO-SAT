import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import Ritaglio from "./Ritaglio";

/**
 * L'editor di ritaglio, da solo.
 *
 * Due cose si verificano qui e non altrove. La prima è che `bloccato` fermi
 * **tutte** le vie di scrittura, compresa quella che nessun attributo `disabled`
 * copre: una trascinata già cominciata tiene il proprio gestore, e continuerebbe
 * a chiamare `onCambia` mentre l'interfaccia dichiara che non si può scrivere.
 *
 * La seconda è più importante, e riguarda chi non ha chiesto niente:
 * `Ritaglio` è condiviso con EVENTI, che lo monta senza la nuova prop. Il
 * comportamento predefinito deve restare quello di prima, gesto per gesto e
 * valore per valore.
 */

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

/** Un ritaglio con qualche campo in più: il reset non deve portarseli via. */
const VALORE = Object.freeze({
  idBlob: "img-1",
  zoom: 1.8,
  x: 0.2,
  y: 0.8,
  specchiata: true,
});

const ZONE = [
  { id: "post", nome: "Post", larghezza: 1080, altezza: 1350 },
  { id: "story", nome: "Story", larghezza: 1080, altezza: 1920 },
];

let contenitore;
let radice;
let scritture;
let rettangoloVero;

beforeEach(() => {
  /*
   * jsdom non implementa la cattura del puntatore né restituisce un rettangolo:
   * senza la prima il gestore di `pointerdown` solleva, senza il secondo la
   * conversione da pixel a punto focale è una divisione per zero e il valore
   * risultante non direbbe niente. Il riquadro qui è 200×250.
   */
  if (!Element.prototype.setPointerCapture) {
    Element.prototype.setPointerCapture = function nonFaNiente() {};
    Element.prototype.releasePointerCapture = function nonFaNiente() {};
  }
  rettangoloVero = Element.prototype.getBoundingClientRect;
  Element.prototype.getBoundingClientRect = function rettangolo() {
    return this.hasAttribute?.("data-riquadro-ritaglio")
      ? { left: 0, top: 0, width: 200, height: 250, right: 200, bottom: 250, x: 0, y: 0 }
      : { left: 0, top: 0, width: 0, height: 0, right: 0, bottom: 0, x: 0, y: 0 };
  };

  scritture = [];
  contenitore = document.createElement("div");
  document.body.appendChild(contenitore);
  radice = createRoot(contenitore);
});

afterEach(() => {
  act(() => radice.unmount());
  contenitore.remove();
  Element.prototype.getBoundingClientRect = rettangoloVero;
});

const q = (sel) => contenitore.querySelector(sel);
const riquadro = () => q("[data-riquadro-ritaglio]");
const slider = () => q('input[aria-label="Zoom"]');
const reset = () => q('button[title="Ripristina inquadratura"]');

/** Monta con le prop di un chiamante esistente, salvo quelle indicate. */
function monta(prop = {}) {
  act(() => {
    radice.render(
      <Ritaglio
        sorgente="blob:finta"
        valore={VALORE}
        onCambia={(v) => scritture.push(v)}
        zone={ZONE}
        {...prop}
      />,
    );
  });
}

const premiGiu = (x = 10, y = 10) =>
  act(() => {
    riquadro().dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, clientX: x, clientY: y }));
  });

const muovi = (x, y) =>
  act(() => {
    riquadro().dispatchEvent(new MouseEvent("pointermove", { bubbles: true, clientX: x, clientY: y }));
  });

const muoviSlider = (v) =>
  act(() => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    setter.call(slider(), String(v));
    slider().dispatchEvent(new Event("change", { bubbles: true }));
  });

const premiReset = () =>
  act(() => {
    reset().dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });

/* ================================================================== *
 * Il comportamento predefinito: EVENTI non cambia
 * ================================================================== */

describe("senza la prop di blocco tutto resta com'era", () => {
  it("il riquadro non si dichiara bloccato e i controlli sono attivi", () => {
    monta();
    expect(riquadro().dataset.bloccato).toBe("no");
    expect(slider().disabled).toBe(false);
    expect(reset().disabled).toBe(false);
  });

  it("premere e trascinare spostano il punto focale", () => {
    monta();
    premiGiu(10, 25);
    expect(scritture).toHaveLength(1);
    expect(scritture[0]).toEqual({ ...VALORE, x: 0.05, y: 0.1 });

    muovi(100, 125);
    expect(scritture).toHaveLength(2);
    expect(scritture[1]).toEqual({ ...VALORE, x: 0.5, y: 0.5 });
  });

  it("lo slider scrive lo zoom e non tocca il resto", () => {
    monta();
    muoviSlider(2.1);
    expect(scritture).toEqual([{ ...VALORE, zoom: 2.1 }]);
  });

  /**
   * Il reset passa adesso da `aggiorna` invece che da `onCambia` diretto, per
   * avere un punto solo capace di rifiutare. Il valore che produce dev'essere
   * **identico** a quello di prima: `{ ...valore, zoom: 1, x: 0.5, y: 0.5 }`.
   */
  it("il reset produce esattamente il valore di prima, campi estranei compresi", () => {
    monta();
    premiReset();
    expect(scritture).toEqual([{ ...VALORE, zoom: 1, x: 0.5, y: 0.5 }]);
    expect(scritture[0].idBlob).toBe("img-1");
    expect(scritture[0].specchiata).toBe(true);
  });

  it("senza sorgente non disegna il riquadro, come prima", () => {
    monta({ sorgente: undefined });
    expect(riquadro()).toBeNull();
    expect(contenitore.textContent).toMatch(/nessuna immagine selezionata/i);
  });

  it("le zone secondarie restano quelle passate", () => {
    monta();
    expect(contenitore.textContent).toContain("Post · 1080×1350");
    expect(contenitore.textContent).toContain("Story");
  });
});

/* ================================================================== *
 * Bloccato: nessuna via di scrittura
 * ================================================================== */

describe("bloccato, nessun gesto scrive", () => {
  it("lo dichiara, e disabilita davvero slider e reset", () => {
    monta({ bloccato: true });
    expect(riquadro().dataset.bloccato).toBe("si");
    expect(slider().disabled).toBe(true);
    expect(reset().disabled).toBe(true);
  });

  it("premere, trascinare, muovere lo slider e resettare non producono niente", () => {
    monta({ bloccato: true });
    premiGiu(10, 25);
    muovi(180, 240);
    muoviSlider(2.4);
    premiReset();
    expect(scritture).toEqual([]);
  });

  /**
   * Il caso che gli attributi non coprono: il dito era già giù quando il blocco
   * si è acceso. Il gestore è quello di prima, e senza il controllo dentro
   * `aggiorna` continuerebbe a scrivere per tutta la durata della scrittura.
   */
  it("una trascinata cominciata prima del blocco si ferma quando il blocco arriva", () => {
    monta();
    premiGiu(10, 25);
    expect(scritture).toHaveLength(1);

    monta({ bloccato: true });
    muovi(180, 240);
    muovi(20, 30);

    expect(scritture).toHaveLength(1);
  });

  /** E togliendo il blocco non riprende da sola: serve un gesto nuovo. */
  it("tolto il blocco, il movimento non riprende senza un nuovo premere", () => {
    monta();
    premiGiu(10, 25);
    monta({ bloccato: true });
    muovi(180, 240);
    monta({ bloccato: false });

    muovi(60, 75);
    expect(scritture).toHaveLength(1);

    premiGiu(60, 75);
    expect(scritture).toHaveLength(2);
    expect(scritture[1]).toEqual({ ...VALORE, x: 0.3, y: 0.3 });
  });
});
