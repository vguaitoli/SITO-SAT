import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import Telaio from "./Telaio";
import { FORMATI } from "../design/formati";

/**
 * La cornice comune, e la prop che TOUR ha dovuto aggiungere.
 *
 * `conIntestazione` esiste perché il marcatore comune sta **fuori** dall'area di
 * sicurezza — a `margine.alto − 12` nel Post, `− 90` nella Story — e TOUR lo
 * vuole dentro. La condizione per aggiungerla era una sola: chi il telaio lo usa
 * già non deve vedere cambiare un pixel. Queste prove tengono quella condizione.
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

async function monta(elemento) {
  await act(async () => {
    radice.render(elemento);
  });
}

const q = (sel) => contenitore.querySelector(sel);
const intestazione = () => q('[data-parte="intestazione-telaio"]');
const logo = () => q("img[src='/media/logo-sardegna-trail-avventura.png']");
/** Il contenitore posizionato che il telaio mette attorno al marchio. */
const cornice = () => logo().parentElement.parentElement;

describe("il telaio non cambia per chi lo usa già", () => {
  it.each(["post", "carosello"])(
    "%s: intestazione e logo restano dove stavano, senza passare nulla",
    async (formato) => {
      await monta(<Telaio categoria="eventi" formato={formato} etichetta="Prova" />);

      const f = FORMATI[formato];
      expect(intestazione()).not.toBeNull();
      expect(intestazione().style.top).toBe(`${f.margine.alto - 12}px`);
      expect(intestazione().style.left).toBe(`${f.margine.sinistro}px`);
      expect(contenitore.textContent).toContain("02 / EVENTI");

      expect(logo()).not.toBeNull();
      expect(cornice().style.bottom).toBe(`${f.margine.basso - 16}px`);
      expect(cornice().style.left).toBe(`${f.margine.sinistro}px`);
    },
  );

  it("story: gli offset del ramo story restano quelli di prima", async () => {
    await monta(<Telaio categoria="eventi" formato="story" />);
    const f = FORMATI.story;
    expect(intestazione().style.top).toBe(`${f.margine.alto - 90}px`);
    expect(cornice().style.bottom).toBe(`${f.margine.basso - 110}px`);
    // Scala 1.1: l'immagine è alta 59,4 px, non 54.
    expect(Number(logo().getAttribute("height"))).toBeCloseTo(59.4, 5);
  });

  it("la numerazione compare solo quando ha senso, come prima", async () => {
    await monta(<Telaio categoria="eventi" formato="carosello" numero={3} totale={8} />);
    expect(intestazione().textContent).toContain("03 / 08");

    await monta(<Telaio categoria="eventi" formato="carosello" numero={1} totale={1} />);
    expect(intestazione().textContent).not.toContain("01 / 01");
  });

  it("conLogo={false} toglie il logo e lascia l'intestazione: è il caso del carosello", async () => {
    await monta(<Telaio categoria="eventi" formato="carosello" conLogo={false} />);
    expect(logo()).toBeNull();
    expect(intestazione()).not.toBeNull();
  });
});

describe("l'omissione controllata dell'intestazione", () => {
  it("conIntestazione={false} toglie solo quella", async () => {
    await monta(<Telaio categoria="tour" formato="post" conIntestazione={false} />);
    expect(intestazione()).toBeNull();
    // Il resto della cornice resta: logo, tela, fondo.
    expect(logo()).not.toBeNull();
    expect(q("[data-slide]").style.height).toBe("1350px");
  });

  it("le due prop sono indipendenti, ed è così che TOUR le usa", async () => {
    await monta(
      <Telaio categoria="tour" formato="story" conIntestazione={false} conLogo={false} />,
    );
    expect(intestazione()).toBeNull();
    expect(logo()).toBeNull();
    // La tela c'è comunque: TOUR ci disegna sopra le proprie parti.
    expect(q("[data-slide]").style.height).toBe("1920px");
  });

  it("senza dire niente, l'intestazione c'è: il valore predefinito non è cambiato", async () => {
    await monta(<Telaio categoria="tour" formato="post" />);
    expect(intestazione()).not.toBeNull();
    expect(contenitore.textContent).toContain("01 / TOUR");
  });
});
