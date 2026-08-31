import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import StoryCanonica from "./StoryCanonica";
import { CAPIENZA, POSTI, PAYOFF_RIFERIMENTO, SCHERMATE, TELA_STORY, ZONA_STICKER } from "../../../design/eventi-story";
import { contenutoVuoto } from "../../../fondamenta/schema";
import { scriviSlot } from "../../../media/slot";

/**
 * Le sei schermate, montate davvero.
 *
 * I parametri si verificano altrove: qui si verifica ciò che finisce nel PNG.
 * Tre difetti stavano proprio in questo scarto — la fotografia della Story che
 * non arrivava, «sold out» che non si vedeva, e cinque tappe su otto disegnate
 * senza dirlo.
 */

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const LOGO = "/media/logo-sardegna-trail-avventura.png";

const IMMAGINI = {
  "b-cover": "blob:cover",
  "b-numeri": "blob:numeri",
  "b-incluso": "blob:incluso",
  "b-prenota": "blob:prenota",
};

const rif = (idBlob) => ({ idBlob, zoom: 1, x: 0.5, y: 0.5, specchiata: false });

/** Una scheda evento completa, senza niente della Via dei Giganti dentro. */
function scheda(modifiche = {}) {
  const base = contenutoVuoto({ categoria: "eventi", formato: "story" });
  return {
    ...base,
    ...modifiche,
    fattuali: {
      ...base.fattuali,
      nome: "Traversata di prova",
      km: "120 km",
      sterrato: "70%",
      durata: "2 giorni",
      partenza: "Paese",
      livello: "Medio",
      prezzo: "390 €",
      periodo: "12–13 aprile",
      url: "https://esempio.test/eventi/prova",
      inclusi: ["Guida", "Cena", "Hotel"],
      requisiti: ["Patente A", "Moto in regola"],
      tappe: [
        { id: "t1", partenza: "Uno", arrivo: "Due", descrizione: "Prima" },
        { id: "t2", partenza: "Due", arrivo: "Tre", descrizione: "Seconda" },
      ],
      ...(modifiche.fattuali || {}),
    },
    editoriale: {
      ...base.editoriale,
      titoloBreve: "Traversata di prova",
      kicker: "PROVA",
      claim: "Una riga di prova.",
      cta: "Scrivici per prenotare",
      whatsapp: "+39 000 000 0000",
      ...(modifiche.editoriale || {}),
    },
    media: { cover: null, esperienza: [null, null, null, null], sfondi: {}, ...(modifiche.media || {}) },
  };
}

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

function monta(id, contenuto, immagini = IMMAGINI) {
  act(() => {
    radice.render(<StoryCanonica id={id} contenuto={contenuto} immagini={immagini} traccia={null} />);
  });
  return contenitore.firstElementChild;
}

/** L'immagine della fotografia: il logo del marchio non conta. */
const fotografia = () =>
  [...contenitore.querySelectorAll("img")].find((i) => i.getAttribute("src") !== LOGO) || null;

const testo = () => contenitore.textContent;

/* ------------------------------------------------------------------ *
 * La tela
 * ------------------------------------------------------------------ */

describe("le sei schermate", () => {
  it.each(SCHERMATE.map((s) => [s.id, s.numero]))("«%s» è una tela 1080×1920", (id, numero) => {
    const tela = monta(id, scheda());
    expect(tela.dataset.slide).toBe(`eventi-story-${numero}`);
    expect(tela.style.width).toBe(`${TELA_STORY.larghezza}px`);
    expect(tela.style.height).toBe(`${TELA_STORY.altezza}px`);
  });

  it("un id che non esiste non disegna niente", () => {
    act(() => radice.render(<StoryCanonica id="altimetria" contenuto={scheda()} immagini={{}} />));
    expect(contenitore.firstElementChild).toBeNull();
  });
});

/* ------------------------------------------------------------------ *
 * Le fotografie delle schermate
 * ------------------------------------------------------------------ */

describe("fotografia delle schermate", () => {
  const CASI = [
    ["numeri", "storyNumeri", "b-numeri", "blob:numeri"],
    ["incluso", "storyIncluso", "b-incluso", "blob:incluso"],
    ["prenota", "storyPrenota", "b-prenota", "blob:prenota"],
  ];

  it.each(CASI)("la schermata «%s» disegna la fotografia del suo slot", (id, slot, blob, url) => {
    const c = scheda();
    c.media = scriviSlot(scriviSlot(c.media, "cover", rif("b-cover")), slot, rif(blob));
    monta(id, c);
    // Il difetto vecchio: lo slot non veniva mai letto e usciva sempre la cover.
    expect(fotografia().getAttribute("src")).toBe(url);
  });

  it.each(CASI)("«%s» ripiega sulla cover finché non ha la sua", (id, slot) => {
    const c = scheda();
    c.media = scriviSlot(c.media, "cover", rif("b-cover"));
    monta(id, c);
    expect(fotografia().getAttribute("src")).toBe("blob:cover");

    // Assegnata la sua, il ripiego smette.
    c.media = scriviSlot(c.media, slot, rif("b-numeri"));
    monta(id, c);
    expect(fotografia().getAttribute("src")).toBe("blob:numeri");
  });

  it("senza cover e senza fotografia propria mostra il vuoto, non un'immagine", () => {
    monta("numeri", scheda());
    expect(fotografia()).toBeNull();
    expect(testo()).toContain("Fotografia della Story");
  });

  it("sulla foto presa in prestito comanda l'inquadratura della schermata", () => {
    const c = scheda();
    // Cover inquadrata in alto dall'utente: è una scelta fatta sulla tela
    // intera, non dentro la fascia da 620 della schermata 02.
    c.media = scriviSlot(c.media, "cover", { idBlob: "b-cover", zoom: 1, x: 0.5, y: 0.1, specchiata: false });
    monta("numeri", c);
    expect(fotografia().style.objectPosition).toBe("50% 78%");

    // Con una fotografia sua, l'inquadratura torna a essere quella scelta.
    c.media = scriviSlot(c.media, "storyNumeri", { idBlob: "b-numeri", zoom: 1, x: 0.5, y: 0.1, specchiata: false });
    monta("numeri", c);
    expect(fotografia().style.objectPosition).toBe("50% 10%");
  });
});

/* ------------------------------------------------------------------ *
 * Stato dei posti
 * ------------------------------------------------------------------ */

describe("stato dei posti nella schermata 06", () => {
  const conStato = (statoPosti) => {
    const c = scheda();
    c.editoriale = { ...c.editoriale, statoPosti };
    return c;
  };
  const badge = () => contenitore.querySelector("[data-posti]");

  it("«disponibili» non scrive nessuna etichetta di scarsità", () => {
    monta("prenota", conStato("disponibili"));
    expect(badge()).toBeNull();
    for (const p of Object.values(POSTI)) {
      if (p.etichetta) expect(testo()).not.toContain(p.etichetta);
    }
  });

  it("«ultimi» scrive «Posti limitati»", () => {
    monta("prenota", conStato("ultimi"));
    expect(badge().textContent).toBe("Posti limitati");
    expect(badge().dataset.posti).toBe("testo");
  });

  it("«soldout» scrive «Sold out», e non in sordina", () => {
    monta("prenota", conStato("soldout"));
    expect(badge().textContent).toBe("Sold out");
    // Un evento esaurito non deve sembrare ancora prenotabile: l'etichetta è
    // in accento pieno, non una riga di testo accanto al prezzo.
    expect(badge().dataset.posti).toBe("pieno");
    expect(badge().style.background).not.toBe("");
    expect(badge().style.padding).not.toBe("");
  });

  it("«attesa» scrive «Lista d'attesa»", () => {
    monta("prenota", conStato("attesa"));
    expect(badge().textContent).toBe("Lista d'attesa");
    expect(badge().dataset.posti).toBe("contorno");
    expect(badge().style.border).toContain("solid");
  });

  it.each(["disponibili", "ultimi", "soldout", "attesa"])(
    "con «%s» la CTA resta quella scritta dall'autore",
    (statoPosti) => {
      const c = conStato(statoPosti);
      c.editoriale = { ...c.editoriale, cta: "Scrivici in privato" };
      monta("prenota", c);
      expect(testo()).toContain("Scrivici in privato");
    },
  );

  it("uno stato sconosciuto non inventa scarsità", () => {
    monta("prenota", conStato("disponibili"));
    const senza = contenitore.innerHTML;
    const c = scheda();
    c.editoriale = { ...c.editoriale, statoPosti: "quasi-pieno" };
    monta("prenota", c);
    expect(contenitore.innerHTML).toBe(senza);
  });
});

/* ------------------------------------------------------------------ *
 * Guida del Link Sticker
 * ------------------------------------------------------------------ */

describe("guida del Link Sticker", () => {
  const guida = () => contenitore.querySelector("[data-solo-anteprima]");

  it("si vede nell'anteprima della schermata 06", () => {
    monta("prenota", scheda());
    expect(guida()).not.toBeNull();
    expect(guida().textContent).toBe("Spazio per il Link Sticker");
  });

  it("è marcata come sola anteprima, con lo stesso segno che la cattura spegne", () => {
    monta("prenota", scheda());
    expect(guida().getAttribute("data-solo-anteprima")).toBe("true");
    // `cattura` cerca esattamente questo selettore prima di fotografare.
    const tela = contenitore.firstElementChild;
    const nascosti = [...tela.querySelectorAll("[data-solo-anteprima]")];
    expect(nascosti).toContain(guida());

    // Spenti quelli, la guida non è più disegnata: è ciò che finisce nel PNG.
    nascosti.forEach((el) => { el.style.display = "none"; });
    expect(guida().style.display).toBe("none");
  });

  it("occupa la banda riservata e non esce dalla tela", () => {
    const tela = monta("prenota", scheda());
    const g = guida();
    expect(g.style.height).toBe(`${ZONA_STICKER}px`);
    expect(g.style.bottom).toBe("0px");
    // Dentro la safe area: la banda sta nella tela, e il contenuto le sta sopra.
    expect(ZONA_STICKER).toBeLessThan(Number.parseInt(tela.style.height, 10));
    const contenuto = tela.querySelector('[style*="justify-content: space-between"]');
    expect(Number.parseInt(contenuto.style.paddingBottom, 10)).toBeGreaterThanOrEqual(ZONA_STICKER);
  });
});

/* ------------------------------------------------------------------ *
 * Capienza: niente sparisce in silenzio
 * ------------------------------------------------------------------ */

describe("capienza delle schermate", () => {
  const conTappe = (quante) => {
    const c = scheda();
    c.fattuali = {
      ...c.fattuali,
      tappe: Array.from({ length: quante }, (_, i) => ({
        id: `t${i}`, partenza: `Da ${i}`, arrivo: `A ${i}`, descrizione: "",
      })),
    };
    return c;
  };

  /** I progressivi «01», «02»… delle tappe disegnate. */
  const progressivi = () =>
    [...contenitore.querySelectorAll("span")]
      .map((s) => s.textContent)
      .filter((t) => /^\d{2}$/.test(t));

  it("la schermata 04 disegna esattamente la capienza dichiarata", () => {
    monta("tappe", conTappe(CAPIENZA.tappe + 3));
    // Il titolo dice quante sono davvero: è il PNG a non poterle contenere.
    expect(contenitore.textContent).toContain(`${CAPIENZA.tappe + 3} tappe`);
    // Se qualcuno rimettesse un `slice(0, 5)` scritto a mano mentre la
    // capienza dichiarata dice altro, questo elenco divergerebbe.
    expect(progressivi()).toEqual(
      Array.from({ length: CAPIENZA.tappe }, (_, i) => String(i + 1).padStart(2, "0")),
    );
  });

  it("con tappe entro la capienza le disegna tutte", () => {
    monta("tappe", conTappe(CAPIENZA.tappe));
    expect(progressivi()).toHaveLength(CAPIENZA.tappe);
  });

  it("la schermata 05 disegna al più la capienza degli inclusi", () => {
    const c = scheda();
    c.fattuali = {
      ...c.fattuali,
      inclusi: Array.from({ length: CAPIENZA.inclusi + 4 }, (_, i) => `Voce ${i}`),
    };
    monta("incluso", c);
    const presenti = Array.from({ length: CAPIENZA.inclusi + 4 }, (_, i) => `Voce ${i}`)
      .filter((v) => contenitore.textContent.includes(v));
    expect(presenti).toHaveLength(CAPIENZA.inclusi);
  });
});

/* ------------------------------------------------------------------ *
 * Marchio
 * ------------------------------------------------------------------ */

describe("marchio sulla cover", () => {
  it("il payoff non usa più il colore che spariva sulle foto chiare", () => {
    monta("cover", scheda());
    const payoff = [...contenitore.querySelectorAll("span")]
      .find((s) => s.textContent === "LA SARDEGNA CHE NON TI ASPETTI");
    expect(payoff).toBeDefined();
    expect(payoff.style.color).toBe("rgb(180, 166, 145)"); // #B4A691
    expect(contenitore.innerHTML.toUpperCase()).not.toContain(PAYOFF_RIFERIMENTO.slice(1));
  });

  it("usa il logo dell'app, non un asset del progetto Claude Design", () => {
    monta("cover", scheda());
    const logo = contenitore.querySelector(`img[src="${LOGO}"]`);
    expect(logo).not.toBeNull();
    expect(contenitore.innerHTML).not.toContain("logo-512");
    expect(contenitore.innerHTML).not.toContain("uploads/");
  });
});
