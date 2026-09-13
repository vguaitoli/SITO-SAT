import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import SelettoreSlot from "./SelettoreSlot";
import {
  conRipiegoCover,
  conRipiegoCoverDellaRubrica,
  costruisciRegistroSlot,
  descrizioneSlotDellaRubrica,
  leggiSlot,
  leggiSlotDellaRubrica,
  scriviSlot,
  scriviSlotDellaRubrica,
  SLOT_MEDIA,
  SLOT_SFONDO,
  slotDellaRubrica,
  slotDellaRubricaPieno,
  slotPieno,
} from "./slot";
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

/* ================================================================== *
 * Il registro per rubrica
 * ================================================================== */

/**
 * Rubriche diverse, registri indipendenti.
 *
 * Il rischio è sempre lo stesso che questo file esiste per evitare: un ripiego
 * per esclusione. Se una rubrica sconosciuta ereditasse gli slot di EVENTI, una
 * scrittura finirebbe in un ramo che quella rubrica non ha, e la fotografia
 * sparirebbe senza un errore.
 */
describe("il registro è per rubrica", () => {
  it("EVENTI conserva i suoi nove slot, nell'ordine", () => {
    const eventi = slotDellaRubrica("eventi");
    expect(eventi).toHaveLength(9);
    expect(eventi.map((s) => s.id)).toEqual([
      "cover",
      "esperienza-0",
      "esperienza-1",
      "esperienza-2",
      "esperienza-3",
      "cta",
      "storyNumeri",
      "storyIncluso",
      "storyPrenota",
    ]);
    // E l'export storico è lo stesso elenco.
    expect(SLOT_MEDIA).toEqual(eventi);
  });

  it("TOUR dichiara esattamente cover e story", () => {
    const tour = slotDellaRubrica("tour");
    expect(tour.map((s) => s.id)).toEqual(["cover", "story"]);
    // La Story vive in un ramo suo: non condivide il ritaglio della cover.
    expect(descrizioneSlotDellaRubrica("tour", "story")).toEqual({
      id: "story",
      nome: "Story",
      dove: "sfondi",
      chiave: "tourStory",
    });
  });

  it("i due registri non si contaminano", () => {
    // Uno slot EVENTI non esiste in TOUR, e viceversa.
    expect(descrizioneSlotDellaRubrica("tour", "esperienza-0")).toBeNull();
    expect(descrizioneSlotDellaRubrica("tour", "storyNumeri")).toBeNull();
    expect(descrizioneSlotDellaRubrica("eventi", "story")).toBeNull();
    // Scrivere uno slot dell'altra rubrica non cambia niente.
    const media = { cover: null, esperienza: [], sfondi: {} };
    expect(scriviSlotDellaRubrica("tour", media, "esperienza-0", { idBlob: "x" })).toBe(media);
    expect(scriviSlotDellaRubrica("eventi", media, "story", { idBlob: "x" })).toBe(media);
  });

  it("una rubrica sconosciuta non ha slot e non ne eredita", () => {
    expect(slotDellaRubrica("inesistente")).toHaveLength(0);
    expect(slotDellaRubrica(undefined)).toHaveLength(0);
    // In particolare non eredita quelli di EVENTI.
    expect(descrizioneSlotDellaRubrica("inesistente", "cover")).toBeNull();
    const media = { cover: null, esperienza: [], sfondi: {} };
    expect(leggiSlotDellaRubrica("inesistente", media, "cover")).toBeNull();
    expect(scriviSlotDellaRubrica("inesistente", media, "cover", { idBlob: "x" })).toBe(media);
    expect(conRipiegoCoverDellaRubrica("inesistente", { cover: { idBlob: "c" } }, "cover")).toBeNull();
  });

  it("uno slot sconosciuto non legge e non scrive", () => {
    const media = { cover: { idBlob: "c" }, esperienza: [], sfondi: {} };
    expect(leggiSlotDellaRubrica("tour", media, "inventato")).toBeNull();
    expect(scriviSlotDellaRubrica("tour", media, "inventato", { idBlob: "x" })).toBe(media);
    expect(slotDellaRubricaPieno("tour", media, "inventato")).toBe(false);
    expect(conRipiegoCoverDellaRubrica("tour", media, "inventato")).toBeNull();
    // Nessun indice NaN da nessuna parte.
    expect(media.esperienza).toHaveLength(0);
  });

  it("elenchi e descrittori pubblici non si possono alterare", () => {
    const tour = slotDellaRubrica("tour");
    expect(Object.isFrozen(tour)).toBe(true);
    expect(Object.isFrozen(tour[0])).toBe(true);
    expect(() => {
      "use strict";
      tour.push({ id: "abusivo" });
    }).toThrow();
    expect(() => {
      "use strict";
      tour[0].chiave = "altro";
    }).toThrow();
    // E una nuova lettura resta quella di prima.
    expect(slotDellaRubrica("tour").map((s) => s.id)).toEqual(["cover", "story"]);
  });
});

describe("cover e story di TOUR sono due ritagli distinti", () => {
  const vuoto = () => ({ cover: null, esperienza: [], sfondi: {} });

  it("assegnare l'uno non tocca l'altro", () => {
    let media = vuoto();
    media = scriviSlotDellaRubrica("tour", media, "cover", { idBlob: "b-cover", zoom: 1 });
    media = scriviSlotDellaRubrica("tour", media, "story", { idBlob: "b-story", zoom: 2 });

    expect(leggiSlotDellaRubrica("tour", media, "cover")).toEqual({ idBlob: "b-cover", zoom: 1 });
    expect(leggiSlotDellaRubrica("tour", media, "story")).toEqual({ idBlob: "b-story", zoom: 2 });
    // Rami diversi: la Story non finisce dentro `cover`.
    expect(media.cover.idBlob).toBe("b-cover");
    expect(media.sfondi.tourStory.idBlob).toBe("b-story");

    // Sostituire la cover lascia la Story dov'è.
    media = scriviSlotDellaRubrica("tour", media, "cover", { idBlob: "b-cover-2" });
    expect(leggiSlotDellaRubrica("tour", media, "story").idBlob).toBe("b-story");
  });

  it("la Story ripiega sulla cover solo quando manca la sua", () => {
    let media = scriviSlotDellaRubrica("tour", vuoto(), "cover", { idBlob: "b-cover" });

    // Senza fotografia dedicata si disegna la cover…
    expect(conRipiegoCoverDellaRubrica("tour", media, "story")).toEqual({ idBlob: "b-cover" });
    // …ma lo slot resta vuoto: il ripiego è rendering, non assegnazione.
    expect(slotDellaRubricaPieno("tour", media, "story")).toBe(false);

    media = scriviSlotDellaRubrica("tour", media, "story", { idBlob: "b-story" });
    // Appena c'è la sua, comanda quella.
    expect(conRipiegoCoverDellaRubrica("tour", media, "story")).toEqual({ idBlob: "b-story" });
    expect(slotDellaRubricaPieno("tour", media, "story")).toBe(true);
  });
});

/**
 * Una configurazione sbagliata deve fermarsi alla costruzione.
 *
 * Scoprirla durante l'uso significa scoprirla a fotografia sparita: un `dove`
 * sconosciuto cadeva nel ramo `esperienza` e scriveva in un indice inventato, e
 * due id sulla stessa destinazione sono due comandi che si cancellano a
 * vicenda senza che nessuno capisca perché.
 */
describe("il costruttore del registro è fail-closed", () => {
  const ok = { id: "cover", nome: "Cover", dove: "cover" };

  it("accetta una configurazione valida e la congela", () => {
    const r = costruisciRegistroSlot([ok, { id: "s", nome: "S", dove: "sfondi", chiave: "k" }]);
    expect(r.elenco.map((d) => d.id)).toEqual(["cover", "s"]);
    expect(Object.isFrozen(r)).toBe(true);
    expect(Object.isFrozen(r.elenco)).toBe(true);
    expect(Object.isFrozen(r.elenco[0])).toBe(true);
  });

  const INVALIDE = [
    ["non è un array", "niente un array"],
    ["descrittore non oggetto", [null]],
    ["id mancante", [{ nome: "X", dove: "cover" }]],
    ["id vuoto", [{ id: "  ", nome: "X", dove: "cover" }]],
    ["id duplicato", [ok, { ...ok, nome: "Altro" }]],
    ["nome mancante", [{ id: "a", dove: "cover" }]],
    ["nome vuoto", [{ id: "a", nome: "", dove: "cover" }]],
    ["dove sconosciuto", [{ id: "a", nome: "A", dove: "altrove" }]],
    /*
     * Con una chiave valida accanto: senza il controllo sulla destinazione
     * questo descrittore passerebbe tutti gli altri e finirebbe per esclusione
     * nel ramo sbagliato, che è il difetto da impedire.
     */
    ["dove sconosciuto ma per il resto completo", [{ id: "a", nome: "A", dove: "altrove", chiave: "k", indice: 0 }]],
    ["dove assente", [{ id: "a", nome: "A" }]],
    ["due cover", [ok, { id: "cover2", nome: "C2", dove: "cover" }]],
    ["indice non intero", [{ id: "a", nome: "A", dove: "esperienza", indice: 1.5 }]],
    ["indice negativo", [{ id: "a", nome: "A", dove: "esperienza", indice: -1 }]],
    ["indice assente", [{ id: "a", nome: "A", dove: "esperienza" }]],
    [
      "indice duplicato",
      [
        { id: "a", nome: "A", dove: "esperienza", indice: 0 },
        { id: "b", nome: "B", dove: "esperienza", indice: 0 },
      ],
    ],
    ["chiave mancante", [{ id: "a", nome: "A", dove: "sfondi" }]],
    ["chiave vuota", [{ id: "a", nome: "A", dove: "sfondi", chiave: " " }]],
    [
      "chiave duplicata",
      [
        { id: "a", nome: "A", dove: "sfondi", chiave: "k" },
        { id: "b", nome: "B", dove: "sfondi", chiave: "k" },
      ],
    ],
  ];

  it.each(INVALIDE)("rifiuta: %s", (_nome, descrittori) => {
    expect(() => costruisciRegistroSlot(descrittori)).toThrow();
  });

  it("il motivo del rifiuto è quello giusto", () => {
    expect(() =>
      costruisciRegistroSlot([{ id: "a", nome: "A", dove: "altrove", chiave: "k" }]),
    ).toThrow(/destinazione/i);
  });
});

/**
 * «Congelato» deve voler dire congelato.
 *
 * Il registro restituiva `Object.freeze({ elenco, perId })`: l'involucro e
 * l'elenco erano davvero immutabili, la `Map` no — `Object.freeze` non tocca il
 * contenuto di una Map, e `set`, `delete` e `clear` restavano a disposizione di
 * chiunque avesse il registro in mano. Bastava `registro.perId.set("intruso", …)`
 * per ottenere due viste discordi dello stesso registro: lo slot compariva alla
 * ricerca e mancava dall'elenco.
 */
describe("il registro non espone stato mutabile", () => {
  const DUE = [
    { id: "cover", nome: "Cover", dove: "cover" },
    { id: "story", nome: "Story", dove: "sfondi", chiave: "tourStory" },
  ];

  it("la ricerca è una funzione di sola lettura, non una Map", () => {
    const r = costruisciRegistroSlot(DUE);

    expect(typeof r.descrizione).toBe("function");
    expect(r.descrizione("cover")).toEqual({ id: "cover", nome: "Cover", dove: "cover" });
    expect(r.descrizione("inventato")).toBeNull();

    // Nessun valore pubblico è una Map, e nessuno offre modi per scriverci.
    expect(r.perId).toBeUndefined();
    for (const [nome, v] of Object.entries(r)) {
      expect(v instanceof Map, `«${nome}» è una Map`).toBe(false);
      for (const metodo of ["set", "delete", "clear"]) {
        expect(typeof v?.[metodo], `«${nome}.${metodo}»`).not.toBe("function");
      }
    }
  });

  it("nessuna via fa comparire alla ricerca uno slot assente dall'elenco", () => {
    const r = costruisciRegistroSlot(DUE);
    const intruso = Object.freeze({ id: "intruso", nome: "Intruso", dove: "cover" });

    // Le vie che un chiamante avrebbe davvero, se il registro gliele lasciasse.
    const tentativi = [
      () => r.perId.set("intruso", intruso),
      () => {
        r.perId = new Map([["intruso", intruso]]);
      },
      () => {
        r.descrizione = (id) => (id === "intruso" ? intruso : null);
      },
      () => r.elenco.push(intruso),
      () => {
        r.elenco = [...r.elenco, intruso];
      },
    ];
    for (const tentativo of tentativi) expect(tentativo).toThrow();

    expect(r.descrizione("intruso")).toBeNull();
    expect(r.elenco.map((s) => s.id)).toEqual(["cover", "story"]);
  });

  it("elenco e descrittori restano gli stessi riferimenti congelati", () => {
    const r = costruisciRegistroSlot(DUE);
    expect(Object.isFrozen(r)).toBe(true);
    expect(Object.isFrozen(r.elenco)).toBe(true);
    expect(r.elenco.every((d) => Object.isFrozen(d))).toBe(true);
    // La ricerca restituisce l'elemento dell'elenco, non una copia.
    expect(r.descrizione("story")).toBe(r.elenco[1]);

    // E lo stesso vale per i registri veri, letti due volte.
    expect(slotDellaRubrica("tour")).toBe(slotDellaRubrica("tour"));
    expect(descrizioneSlotDellaRubrica("tour", "story")).toBe(slotDellaRubrica("tour")[1]);
  });
});

describe("gli export storici non sono copie", () => {
  it("SLOT_MEDIA è lo stesso elenco del registro EVENTI", () => {
    expect(SLOT_MEDIA).toBe(slotDellaRubrica("eventi"));
  });
});
