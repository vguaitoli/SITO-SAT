import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  CATEGORIA,
  ETICHETTE,
  GEOMETRIA,
  PRIORITA,
  QUANTI_DATI,
  ZONE_INSTAGRAM,
  datiVisibili,
  fotoDelPost,
  fotoDellaStory,
  larghezzaColonna,
  rettangoli,
  tuttoDentroAreaSicura,
} from "./tour";
import { FORMATI, dentroAreaSicura } from "./formati";
import { CATEGORIE } from "./categorie";
import { templateDisponibile } from "./registro-template";

/**
 * I parametri della rubrica TOUR.
 *
 * Sono numeri, non impressioni: una coordinata sbagliata qui diventa un logo
 * dentro la fascia dello sticker o un titolo tagliato dall'interfaccia di
 * Instagram, e nessuna delle due cose si vede guardando un'anteprima ridotta.
 */

describe("la geometria del Post", () => {
  const g = GEOMETRIA.post;

  it("sta sulla tela reale e dentro l'area utile dichiarata da formati.js", () => {
    expect(g.tela).toEqual({ larghezza: 1080, altezza: 1350 });
    expect(g.area).toEqual({ x: 84, y: 84, larghezza: 912, altezza: 1182, fondo: 1266 });
  });

  it("colloca intestazione, blocco e marchio alle coordinate del contratto", () => {
    expect(g.intestazione).toEqual({ y: 84, altezza: 19 });
    expect(g.intestazione.y + g.intestazione.altezza).toBe(103);

    expect(g.blocco.cima).toBe(481);
    expect(g.blocco.fondo).toBe(1172);

    expect(g.marchio.y).toBe(1212);
    expect(g.marchio.y + g.marchio.altezza).toBe(1266);
  });

  it("impila le righe dal basso, a slot fissi", () => {
    expect(g.righe).toEqual({
      kicker: { y: 481, altezza: 22 },
      titolo: { y: 523, altezza: 348 },
      claim: { y: 893, altezza: 78 },
      filo: { y: 997, altezza: 1 },
      dati: { y: 1024, altezza: 98 },
      cta: { y: 1143, altezza: 29 },
    });
    // Titolo su tre righe, claim su due: è ciò che rende 481 un numero e non
    // una conseguenza di quanto testo è arrivato.
    expect(g.righeTitolo).toBe(3);
    expect(g.righeClaim).toBe(2);
  });

  it("lascia almeno 40 px fra il fondo del blocco e il marchio", () => {
    expect(g.marchio.y - g.blocco.fondo).toBeGreaterThanOrEqual(40);
  });
});

describe("la geometria della Story", () => {
  const g = GEOMETRIA.story;

  it("sta sulla tela reale e dentro l'area utile dichiarata da formati.js", () => {
    expect(g.tela).toEqual({ larghezza: 1080, altezza: 1920 });
    expect(g.area).toEqual({ x: 90, y: 260, larghezza: 900, altezza: 1320, fondo: 1580 });
  });

  it("colloca intestazione, blocco e marchio alle coordinate del contratto", () => {
    expect(g.intestazione).toEqual({ y: 260, altezza: 19 });
    expect(g.intestazione.y + g.intestazione.altezza).toBe(279);

    expect(g.blocco.cima).toBe(924);
    expect(g.blocco.fondo).toBe(1460);

    expect(g.marchio.y).toBe(1500);
    expect(g.marchio.y + g.marchio.altezza).toBe(1554);
  });

  it("lascia libera la fotografia fra l'intestazione e il blocco", () => {
    // L'area fotografica dichiarata dal contratto: 279…924.
    expect(g.intestazione.y + g.intestazione.altezza).toBe(279);
    expect(g.blocco.cima).toBe(924);
    expect(g.blocco.cima - (g.intestazione.y + g.intestazione.altezza)).toBe(645);
  });

  it("titolo su due righe e claim su una: è la Story, non il Post allungato", () => {
    expect(g.righeTitolo).toBe(2);
    expect(g.righeClaim).toBe(1);
    expect(GEOMETRIA.post.righeTitolo).toBeGreaterThan(g.righeTitolo);
    expect(GEOMETRIA.post.blocco.altezza).toBeGreaterThan(g.blocco.altezza);
  });
});

describe("le fasce dell'interfaccia di Instagram", () => {
  it("la fascia sticker si calcola dal basso e comincia dove finisce l'area utile", () => {
    const atteso = FORMATI.story.altezza - FORMATI.story.zonaSticker.dalBasso;
    expect(atteso).toBe(1580);
    expect(ZONE_INSTAGRAM.sticker).toEqual({ x: 0, y: 1580, larghezza: 1080, altezza: 180 });
    expect(ZONE_INSTAGRAM.sticker.y + ZONE_INSTAGRAM.sticker.altezza).toBe(1760);
    // Non 1400…1580: quella lettura la metterebbe *dentro* l'area utile.
    expect(ZONE_INSTAGRAM.sticker.y).not.toBe(1400);
    expect(ZONE_INSTAGRAM.sticker.y).toBe(GEOMETRIA.story.area.fondo);
  });

  it("l'area risposta occupa il resto del margine inferiore", () => {
    expect(ZONE_INSTAGRAM.risposta).toEqual({ x: 0, y: 1760, larghezza: 1080, altezza: 160 });
    expect(ZONE_INSTAGRAM.risposta.y + ZONE_INSTAGRAM.risposta.altezza).toBe(1920);
  });

  it("nessun elemento TOUR entra nelle due fasce", () => {
    const g = GEOMETRIA.story;
    const fine = (r) => r.y + r.altezza;
    for (const [nome, r] of Object.entries(rettangoli("story"))) {
      expect(fine(r), `«${nome}» entra nella fascia sticker`).toBeLessThanOrEqual(
        ZONE_INSTAGRAM.sticker.y,
      );
    }
    // E resta lo stacco richiesto fra il marchio e la fascia.
    expect(ZONE_INSTAGRAM.sticker.y - fine(g.marchio ? { y: g.marchio.y, altezza: g.marchio.altezza } : null)).toBeGreaterThanOrEqual(21);
  });
});

describe("tutto sta dentro l'area di sicurezza", () => {
  it.each(["post", "story"])("%s: nessun rettangolo sfora", (formato) => {
    expect(tuttoDentroAreaSicura(formato)).toEqual([]);
  });

  it.each(["post", "story"])("%s: i rettangoli passano dal controllo di formati.js", (formato) => {
    for (const [nome, r] of Object.entries(rettangoli(formato))) {
      const esito = dentroAreaSicura(formato, r);
      expect(esito.dentro, `«${nome}» sfora da: ${esito.sfori.join(", ")}`).toBe(true);
    }
  });

  it("una coordinata inventata fuori area viene riconosciuta", () => {
    // La prova sopra non è vuota: il controllo sa dire di no.
    expect(dentroAreaSicura("story", { x: 90, y: 1600, larghezza: 100, altezza: 50 }).dentro).toBe(
      false,
    );
  });
});

describe("le costanti sono congelate", () => {
  it.each(["post", "story"])("%s: geometria e righe non si possono alterare", (formato) => {
    expect(Object.isFrozen(GEOMETRIA[formato])).toBe(true);
    expect(Object.isFrozen(GEOMETRIA[formato].righe)).toBe(true);
    expect(Object.isFrozen(GEOMETRIA[formato].area)).toBe(true);
    expect(() => {
      GEOMETRIA[formato].blocco.fondo = 0;
    }).toThrow();
  });

  it("priorità, quantità ed etichette non si possono alterare", () => {
    expect(Object.isFrozen(PRIORITA)).toBe(true);
    expect(Object.isFrozen(PRIORITA.post)).toBe(true);
    expect(Object.isFrozen(ETICHETTE)).toBe(true);
    expect(() => PRIORITA.post.push("inventato")).toThrow();
  });
});

/* ================================================================== *
 * I dati
 * ================================================================== */

const FATTUALI = {
  durata: "3 Giorni",
  km: "240 km",
  livello: "Medio",
  periodo: "Aprile – Ottobre",
  prezzo: "890 €",
  sterrato: "60%",
  area: "",
  mezzo: "",
};

describe("la scelta dei dati", () => {
  it("il Post prende i primi tre della propria priorità", () => {
    expect(datiVisibili(FATTUALI, "post").map((d) => d.campo)).toEqual([
      "durata",
      "km",
      "livello",
    ]);
  });

  it("la Story prende i primi due, in un ordine suo", () => {
    expect(datiVisibili(FATTUALI, "story").map((d) => d.campo)).toEqual(["durata", "livello"]);
  });

  it("i campi vuoti scalano, quelli assenti non compaiono", () => {
    const magro = { durata: "", km: "240 km", livello: "   ", periodo: "Estate" };
    expect(datiVisibili(magro, "post").map((d) => d.campo)).toEqual(["km", "periodo"]);
    expect(datiVisibili(magro, "story").map((d) => d.campo)).toEqual(["km", "periodo"]);
  });

  it("area e mezzo sono ripieghi veri, non prime scelte", () => {
    const soloRipieghi = { area: "Gallura", mezzo: "Enduro" };
    expect(datiVisibili(soloRipieghi, "post").map((d) => d.campo)).toEqual(["area", "mezzo"]);
    // Ma appena c'è un dato di prima scelta, passano dietro.
    expect(
      datiVisibili({ ...soloRipieghi, durata: "2 Giorni", km: "120 km", livello: "Facile" }, "post")
        .map((d) => d.campo),
    ).toEqual(["durata", "km", "livello"]);
  });

  it("nessuna unità aggiunta: il valore è quello della bozza", () => {
    const senzaUnita = { durata: "3", km: "240", livello: "Medio" };
    expect(datiVisibili(senzaUnita, "post").map((d) => d.valore)).toEqual(["3", "240", "Medio"]);
    // E con l'unità già scritta, resta quella e non si duplica.
    expect(datiVisibili(FATTUALI, "post").map((d) => d.valore)).toEqual([
      "3 Giorni",
      "240 km",
      "Medio",
    ]);
  });

  it("l'etichetta appartiene al campo, non al valore", () => {
    expect(datiVisibili({ durata: "3 Giorni" }, "post")[0].etichetta).toBe("DURATA");
    expect(datiVisibili({ durata: "Un pomeriggio" }, "post")[0].etichetta).toBe("DURATA");
  });

  it("nessun dato: elenco vuoto, non celle vuote", () => {
    expect(datiVisibili({}, "post")).toEqual([]);
    expect(datiVisibili({}, "story")).toEqual([]);
    expect(datiVisibili(undefined, "post")).toEqual([]);
  });

  it("i massimi e i minimi sono quelli della rubrica", () => {
    expect(QUANTI_DATI.post).toEqual({ massimo: 3, minimo: 2 });
    expect(QUANTI_DATI.story).toEqual({ massimo: 2, minimo: 1 });
    // Più dati disponibili del massimo non è un problema: la priorità sceglie.
    expect(datiVisibili(FATTUALI, "post")).toHaveLength(3);
    expect(datiVisibili(FATTUALI, "story")).toHaveLength(2);
  });

  it("un formato sconosciuto non ripiega su un altro", () => {
    expect(() => datiVisibili(FATTUALI, "carosello")).toThrow(/sconosciuto/i);
    expect(() => larghezzaColonna("carosello", 2)).toThrow(/sconosciuto/i);
  });
});

describe("la griglia delle colonne", () => {
  it("le celle riempiono l'area utile, senza buchi a destra", () => {
    expect(larghezzaColonna("post", 3)).toBe(288);
    expect(larghezzaColonna("post", 2)).toBe(444);
    expect(larghezzaColonna("post", 1)).toBe(912);
    expect(larghezzaColonna("story", 2)).toBe(438);
    expect(larghezzaColonna("story", 1)).toBe(900);
  });

  it("la somma di celle e interstizi è esattamente l'area utile", () => {
    for (const [formato, quanti] of [["post", 3], ["post", 2], ["story", 2]]) {
      const somma = larghezzaColonna(formato, quanti) * quanti + 24 * (quanti - 1);
      expect(somma).toBe(GEOMETRIA[formato].area.larghezza);
    }
  });
});

/* ================================================================== *
 * Le fotografie
 * ================================================================== */

const ritaglio = (idBlob) => ({ idBlob, zoom: 1.2, x: 0.5, y: 0.5, specchiata: false });

describe("quale fotografia disegna ogni formato", () => {
  it("il Post usa la cover, e non ripiega su nient'altro", () => {
    const media = { cover: ritaglio("b-cover"), esperienza: [], sfondi: { tourStory: ritaglio("b-story") } };
    const f = fotoDelPost({ media, sorgenteCover: "cover.webp" });
    expect(f).toEqual({ sorgente: "cover.webp", ritaglio: media.cover, ripiego: false });

    // Senza cover non prende la Story: resta senza fotografia.
    const senzaCover = { cover: null, esperienza: [], sfondi: { tourStory: ritaglio("b-story") } };
    expect(fotoDelPost({ media: senzaCover, sorgenteCover: null }).sorgente).toBeNull();
  });

  it("la Story preferisce il proprio slot", () => {
    const media = { cover: ritaglio("b-cover"), esperienza: [], sfondi: { tourStory: ritaglio("b-story") } };
    const f = fotoDellaStory({ media, sorgenteStory: "story.webp", sorgenteCover: "cover.webp" });
    expect(f.sorgente).toBe("story.webp");
    expect(f.ritaglio.idBlob).toBe("b-story");
    expect(f.ripiego).toBe(false);
  });

  it("senza slot Story ripiega sulla cover, e lo dichiara", () => {
    const media = { cover: ritaglio("b-cover"), esperienza: [], sfondi: {} };
    const f = fotoDellaStory({ media, sorgenteStory: null, sorgenteCover: "cover.webp" });
    expect(f.sorgente).toBe("cover.webp");
    expect(f.ritaglio.idBlob).toBe("b-cover");
    expect(f.ripiego).toBe(true);
  });

  it("senza né Story né cover non c'è fotografia", () => {
    const media = { cover: null, esperienza: [], sfondi: {} };
    const f = fotoDellaStory({ media, sorgenteStory: null, sorgenteCover: null });
    expect(f).toEqual({ sorgente: null, ritaglio: null, ripiego: false });
  });
});

/* ================================================================== *
 * Quel che questo capitolo NON fa
 * ================================================================== */

describe("TOUR resta pianificata", () => {
  it("la rubrica è dichiarata, i template non sono registrati", () => {
    expect(CATEGORIE.tour.varianti).toContain("standard");
    expect(CATEGORIE.tour.formati).toEqual(["post", "story"]);
    // Il prototipo esiste, il registro no: senza pre-flight TOUR la
    // registrazione prometterebbe un'esportazione che non protegge nulla.
    expect(templateDisponibile("tour", "post", "standard")).toBe(false);
    expect(templateDisponibile("tour", "story", "standard")).toBe(false);
  });

  it("le altre due varianti restano approvate e non implementate", () => {
    expect(CATEGORIE.tour.varianti).toEqual(["standard", "editoriale", "griglia-dati"]);
    expect(templateDisponibile("tour", "post", "editoriale")).toBe(false);
    expect(templateDisponibile("tour", "post", "griglia-dati")).toBe(false);
  });
});

describe("i moduli TOUR non dipendono da EVENTI né dalla fixture", () => {
  const cartella = path.resolve(__dirname, "..");
  const FILE = [
    "design/tour.js",
    "template/rubriche/tour/parti.jsx",
    "template/rubriche/tour/PostTour.jsx",
    "template/rubriche/tour/StoryTour.jsx",
  ];

  it.each(FILE)("%s non importa nulla di EVENTI", (relativo) => {
    const sorgente = fs.readFileSync(path.join(cartella, relativo), "utf8");
    const importazioni = [...sorgente.matchAll(/^import[^;]*?from\s+["']([^"']+)["']/gm)].map(
      (m) => m[1],
    );
    for (const i of importazioni) {
      expect(i.toLowerCase(), `${relativo} importa «${i}»`).not.toContain("eventi");
    }
  });

  it.each(FILE)("%s non porta dentro dati della prova né asset", (relativo) => {
    const sorgente = fs.readFileSync(path.join(cartella, relativo), "utf8");
    for (const spia of ["PROVA VISIVA", "4x4-guado", "/media/reali"]) {
      expect(sorgente, `${relativo} contiene «${spia}»`).not.toContain(spia);
    }
  });

  it("la rubrica è quella giusta e non cambia sotto silenzio", () => {
    expect(CATEGORIA).toBe("tour");
  });
});
