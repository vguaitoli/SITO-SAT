import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import SelettoreSlot from "./SelettoreSlot";
import { conRipiegoCover, leggiSlot, scriviSlot, SLOT_MEDIA, SLOT_SFONDO, slotPieno } from "./slot";
import { contenutoVuoto, convalidaContenuto } from "../fondamenta/schema";

/**
 * Gli slot fotografici, e in particolare i tre della Story.
 *
 * Il difetto era muto: `storyNumeri`, `storyIncluso` e `storyPrenota` erano
 * dichiarati nell'interfaccia ma finivano nel ramo `esperienza-N`, dove
 * `Number("storyNumeri".split("-")[1])` vale `NaN`. Si assegnava una
 * fotografia, non compariva niente, e nessun messaggio spiegava perché.
 *
 * Questi test girano su tutti e tre gli slot: quello che vale per uno deve
 * valere per gli altri due, altrimenti la logica non è davvero una sola.
 */

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const STORY = ["storyNumeri", "storyIncluso", "storyPrenota"];
const rif = (idBlob, extra = {}) => ({ idBlob, zoom: 1, x: 0.5, y: 0.5, ...extra });

const vuoto = () => ({ cover: null, esperienza: [null, null, null, null], sfondi: {} });

describe("gli slot dichiarati", () => {
  it("comprendono i tre della Story, in `sfondi` come la CTA", () => {
    expect(SLOT_SFONDO).toEqual(["cta", "storyNumeri", "storyIncluso", "storyPrenota"]);
  });

  it("nessuno slot finisce per sbaglio fra le esperienze", () => {
    // È esattamente il ripiego che rompeva i tre slot della Story.
    const perEsperienza = SLOT_MEDIA.filter((s) => s.dove === "esperienza");
    expect(perEsperienza.map((s) => s.id)).toEqual([
      "esperienza-0", "esperienza-1", "esperienza-2", "esperienza-3",
    ]);
    for (const s of perEsperienza) expect(Number.isInteger(s.indice)).toBe(true);
  });

  it("uno slot inventato non legge e non scrive nulla", () => {
    const media = vuoto();
    expect(leggiSlot(media, "storyMappa")).toBeNull();
    expect(scriviSlot(media, "storyMappa", rif("x"))).toBe(media);
  });
});

describe.each(STORY)("slot «%s»", (slot) => {
  it("assegnazione e lettura", () => {
    const dopo = scriviSlot(vuoto(), slot, rif("foto-1"));
    expect(leggiSlot(dopo, slot)).toEqual(rif("foto-1"));
    // Il difetto vecchio: la fotografia finiva in `esperienza[NaN]`.
    expect(dopo.sfondi[slot].idBlob).toBe("foto-1");
    expect(dopo.esperienza).toEqual([null, null, null, null]);
    expect(JSON.stringify(dopo)).not.toContain("null,null,null,null,");
  });

  it("sostituzione", () => {
    let media = scriviSlot(vuoto(), slot, rif("foto-1"));
    media = scriviSlot(media, slot, rif("foto-2"));
    expect(leggiSlot(media, slot).idBlob).toBe("foto-2");
    expect(Object.keys(media.sfondi)).toEqual([slot]);
  });

  it("modifica del ritaglio", () => {
    let media = scriviSlot(vuoto(), slot, rif("foto-1"));
    const attuale = leggiSlot(media, slot);
    media = scriviSlot(media, slot, { ...attuale, zoom: 2.4, x: 0.2, y: 0.8, specchiata: true });
    expect(leggiSlot(media, slot)).toEqual({
      idBlob: "foto-1", zoom: 2.4, x: 0.2, y: 0.8, specchiata: true,
    });
  });

  it("non tocca gli altri slot", () => {
    let media = scriviSlot(vuoto(), "cover", rif("cover-1"));
    media = scriviSlot(media, "esperienza-2", rif("esp-2"));
    const prima = JSON.stringify(media);
    const dopo = scriviSlot(media, slot, rif("story-1"));
    expect(JSON.stringify(media)).toBe(prima); // l'originale non è mutato
    expect(dopo.cover.idBlob).toBe("cover-1");
    expect(dopo.esperienza[2].idBlob).toBe("esp-2");
    for (const altro of STORY.filter((s) => s !== slot)) {
      expect(leggiSlot(dopo, altro)).toBeNull();
    }
  });

  it("sopravvive alla convalida e alla riapertura", () => {
    const scheda = contenutoVuoto({ categoria: "eventi", formato: "story" });
    const conFoto = {
      ...scheda,
      media: scriviSlot(scheda.media, slot, { idBlob: "foto-1", zoom: 1.8, x: 0.3, y: 0.7, specchiata: false }),
    };

    // Salvataggio e rilettura passano entrambi dalla convalida: è lì che una
    // bozza vecchia perdeva i campi non dichiarati.
    const riletto = convalidaContenuto(JSON.parse(JSON.stringify(convalidaContenuto(conFoto))));

    expect(leggiSlot(riletto.media, slot)).toEqual({
      idBlob: "foto-1", zoom: 1.8, x: 0.3, y: 0.7, specchiata: false,
    });
    expect(slotPieno(riletto.media, slot)).toBe(true);
  });

  it("ripiega sulla cover solo finché non ha una fotografia sua", () => {
    const soloCover = scriviSlot(vuoto(), "cover", rif("cover-1"));
    expect(slotPieno(soloCover, slot)).toBe(false);
    expect(conRipiegoCover(soloCover, slot).idBlob).toBe("cover-1");

    const conSua = scriviSlot(soloCover, slot, rif("story-1"));
    expect(slotPieno(conSua, slot)).toBe(true);
    expect(conRipiegoCover(conSua, slot).idBlob).toBe("story-1");

    // Un ritaglio senza fotografia non è una fotografia: il ripiego resta.
    const senzaBlob = scriviSlot(soloCover, slot, { idBlob: null, zoom: 1, x: 0.5, y: 0.5 });
    expect(slotPieno(senzaBlob, slot)).toBe(false);
    expect(conRipiegoCover(senzaBlob, slot).idBlob).toBe("cover-1");
  });

  it("senza cover e senza fotografia propria non inventa niente", () => {
    expect(conRipiegoCover(vuoto(), slot)).toBeNull();
  });
});

/* ------------------------------------------------------------------ *
 * L'indicatore dell'editor
 * ------------------------------------------------------------------ */

describe("indicatore degli slot nell'editor", () => {
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

  const monta = (media) => {
    act(() => radice.render(<SelettoreSlot media={media} attivo="cover" onSceglie={() => {}} />));
  };
  const pulsante = (slot) => contenitore.querySelector(`[data-slot="${slot}"]`);

  it("mostra un pulsante per ogni slot dichiarato", () => {
    monta(vuoto());
    expect(contenitore.querySelectorAll("[data-slot]")).toHaveLength(SLOT_MEDIA.length);
    for (const s of STORY) expect(pulsante(s)).not.toBeNull();
  });

  it("il pallino si accende sullo slot Story che ha la fotografia", () => {
    let media = vuoto();
    monta(media);
    for (const s of STORY) expect(pulsante(s).dataset.piena).toBe("no");

    media = scriviSlot(media, "storyIncluso", rif("foto-1"));
    monta(media);

    expect(pulsante("storyIncluso").dataset.piena).toBe("si");
    expect(pulsante("storyIncluso").textContent).toContain("•");
    // Solo quello: prima l'indicatore era spento su tutti e tre.
    expect(pulsante("storyNumeri").dataset.piena).toBe("no");
    expect(pulsante("storyPrenota").dataset.piena).toBe("no");
    expect(pulsante("esperienza-0").dataset.piena).toBe("no");
  });

  it("la cover assegnata non accende gli slot della Story", () => {
    // Il ripiego serve al disegno, non all'indicatore: chi compone deve vedere
    // quali slot ha davvero riempito.
    monta(scriviSlot(vuoto(), "cover", rif("cover-1")));
    expect(pulsante("cover").dataset.piena).toBe("si");
    for (const s of STORY) expect(pulsante(s).dataset.piena).toBe("no");
  });
});
