import { describe, expect, it } from "vitest";
import {
  ACCENTO, ASSENTI_STORY, CAPIENZA, capienzaCaratteri, COLORE_PAYOFF,
  ELENCO_MOOD_STORY, ETICHETTE, FONDO, FOTO_SCHERMATA, GRIGLIA_NUMERI, INCHIOSTRO,
  INCHIOSTRO_CHIARO, LARGHEZZA_UTILE, MAPPA_STORY, MOOD_STORY,
  MOOD_STORY_PREDEFINITO, moodStory, PADDING, PAYOFF_RIFERIMENTO, POSTI, posti,
  SCHERMATE, TELA_STORY, TIPO_STORY, VELO, ZONA_STICKER,
} from "./eventi-story";
import { MOOD as MOOD_POST } from "./eventi";
import { COLORI } from "./tokens";
import { STATI_POSTI } from "../fondamenta/schema";
import { FASCIA, zonePerSlot } from "../template/rubriche/eventi/zone";

/**
 * Parametri della Story canonica.
 *
 * Non si verifica che le costanti esistano: si verifica che siano quelle del
 * progetto Claude Design, e che le differenze fra Story e Post siano
 * dichiarate invece di essere state appianate per comodità.
 */

describe("sequenza", () => {
  it("è di sei schermate, in ordine", () => {
    expect(SCHERMATE.map((s) => s.id)).toEqual([
      "cover", "numeri", "mappa", "tappe", "incluso", "prenota",
    ]);
    expect(SCHERMATE.map((s) => s.numero)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("i nomi dei file seguono la sequenza", () => {
    expect(SCHERMATE.map((s) => s.file)).toEqual([
      "01-cover.png", "02-numeri.png", "03-mappa.png",
      "04-tappe.png", "05-incluso.png", "06-prenota.png",
    ]);
  });

  it("la tela è 1080×1920", () => {
    expect(TELA_STORY).toEqual({ larghezza: 1080, altezza: 1920 });
  });
});

describe("fondi", () => {
  it("sono quattro, non uno", () => {
    expect(FONDO.scuro).toBe("#14120F");
    // `#17140F` della schermata delle tappe non è un errore di trascrizione.
    expect(FONDO.scuroTappe).toBe("#17140F");
    expect(FONDO.scuroTappe).not.toBe(FONDO.scuro);
    // La 03 è su carta.
    expect(FONDO.chiaro).toBe("#E9E2D6");
  });

  it("la schermata chiara ha una palette propria", () => {
    expect(INCHIOSTRO_CHIARO).toEqual({
      primario: "#1F1B16", corpo: "#4A4034", etichetta: "#7A6A55",
    });
    // Nessun inchiostro del fondo scuro finisce su quello chiaro.
    expect(Object.values(INCHIOSTRO)).not.toContain(INCHIOSTRO_CHIARO.primario);
  });

  it("usa l'accento del token unico", () => {
    expect(ACCENTO).toBe(COLORI.accentoEventi);
    expect(ACCENTO).toBe("#E08A3C");
  });
});

describe("veli", () => {
  it("ogni schermata ha il proprio", () => {
    for (const chiave of ["cover", "numeri", "mappa", "incluso", "prenota"]) {
      expect(VELO[chiave], chiave).toMatch(/^linear-gradient\(180deg,/);
    }
    // Cinque gradienti diversi: non sono varianti dello stesso.
    expect(new Set(Object.values(VELO)).size).toBe(5);
  });

  it("la cover ha il varco luminoso a metà", () => {
    // È quel varco fra il 22% e il 40% che fa respirare la fotografia.
    expect(VELO.cover).toContain("rgba(20,18,15,.12) 22%");
    expect(VELO.cover).toContain("rgba(20,18,15,.1) 40%");
  });

  it("il velo della mappa è su carta, non su nero", () => {
    expect(VELO.mappa).toContain("rgba(233,226,214,");
    expect(VELO.mappa).not.toContain("rgba(20,18,15,");
  });
});

describe("mood", () => {
  it("sono i tre della Story, che non sono quelli del Post", () => {
    expect(ELENCO_MOOD_STORY).toEqual(["Naturale", "Polvere", "Inchiostro"]);
    // «Notte» è del Post e non esiste qui; «Naturale» è della Story.
    expect(ELENCO_MOOD_STORY).not.toContain("Notte");
    expect(Object.keys(MOOD_POST)).not.toContain("Naturale");
  });

  it("perfino «Polvere» ha valori propri", () => {
    expect(MOOD_STORY.Polvere.filtroFoto).toBe("sepia(.3) saturate(1.12) contrast(1.08)");
    expect(MOOD_STORY.Polvere.filtroFoto).not.toBe(MOOD_POST.Polvere.filtroFoto);
  });

  it("solo «Inchiostro» coincide fra i due insiemi", () => {
    expect(MOOD_STORY.Inchiostro.filtroFoto).toBe(MOOD_POST.Inchiostro.filtroFoto);
  });

  it("il predefinito è Naturale, come fa il codice del riferimento", () => {
    // Il file si contraddice: la prop dichiara «Inchiostro», il codice ricade
    // su «Naturale». Vale il codice, ed è dichiarato.
    expect(MOOD_STORY_PREDEFINITO).toBe("Naturale");
    expect(moodStory("Nebbia")).toBe(MOOD_STORY.Naturale);
    expect(moodStory(undefined)).toBe(MOOD_STORY.Naturale);
  });

  it("nessun mood tocca l'accento", () => {
    for (const m of ELENCO_MOOD_STORY) {
      expect(JSON.stringify(MOOD_STORY[m]).toUpperCase()).not.toContain("E08A3C");
    }
  });
});

describe("fotografia", () => {
  it("due schermate a pieno campo, due in fascia", () => {
    expect(FOTO_SCHERMATA.cover.altezza).toBeNull();
    expect(FOTO_SCHERMATA.prenota.altezza).toBeNull();
    expect(FOTO_SCHERMATA.numeri.altezza).toBe(620);
    expect(FOTO_SCHERMATA.incluso.altezza).toBe(560);
  });

  it("ogni schermata ha la propria inquadratura", () => {
    const y = Object.values(FOTO_SCHERMATA).map((f) => f.posizione.y);
    expect(y).toEqual([0.58, 0.78, 0.3, 0.46]);
    expect(new Set(y).size).toBe(4);
  });

  it("cover e prenota seguono il mood, le fasce hanno filtri fissi", () => {
    expect(FOTO_SCHERMATA.cover.filtro).toBe("mood");
    expect(FOTO_SCHERMATA.prenota.filtro).toBe("mood");
    expect(FOTO_SCHERMATA.numeri.filtro).toBe("saturate(.9) contrast(1.06)");
    expect(FOTO_SCHERMATA.incluso.filtro).toBe("saturate(.88) contrast(1.05)");
  });
});

describe("geometria", () => {
  it("il padding basso riserva la zona dello sticker su ogni schermata", () => {
    for (const [nome, p] of Object.entries(PADDING)) {
      expect(p.basso, nome).toBeGreaterThanOrEqual(200);
      expect(p.laterale, nome).toBe(80);
    }
  });

  it("le due schermate con fascia non hanno padding in alto", () => {
    expect(PADDING.numeri.alto).toBe(0);
    expect(PADDING.incluso.alto).toBe(0);
  });

  it("nella griglia dei numeri il filetto è lo spazio fra le celle", () => {
    expect(GRIGLIA_NUMERI.spessoreFilo).toBe(1);
    expect(GRIGLIA_NUMERI.colonne).toBe(2);
  });

  it("la mappa tiene la geometria del riferimento", () => {
    expect(MAPPA_STORY.larghezza).toBe(1240);
    expect(MAPPA_STORY.centro).toEqual({ x: 0.5, y: 0.46 });
    // 4:3, come l'immagine sorgente del progetto (2400×1800): il riferimento
    // fissa solo la larghezza e lascia l'altezza al rapporto.
    expect(MAPPA_STORY.altezza).toBe(930);
    expect(MAPPA_STORY.larghezza / MAPPA_STORY.altezza).toBeCloseTo(4 / 3, 2);
  });
});

describe("tipografia", () => {
  it("Bebas ai titoli, Oswald alle etichette, Montserrat al corpo", () => {
    expect(TIPO_STORY.titoloCover.famiglia).toMatch(/Bebas/);
    expect(TIPO_STORY.prezzo.famiglia).toMatch(/Bebas/);
    expect(TIPO_STORY.kicker.famiglia).toMatch(/Oswald/);
    expect(TIPO_STORY.etichettaDato.famiglia).toMatch(/Oswald/);
    expect(TIPO_STORY.claimCover.famiglia).toMatch(/Montserrat/);
    expect(TIPO_STORY.corpo.peso).toBe(300);
  });

  it("i corpi sono quelli del riferimento", () => {
    expect(TIPO_STORY.titoloCover.corpo).toBe(168);
    expect(TIPO_STORY.titoloCover.interlinea).toBe(0.84);
    expect(TIPO_STORY.prezzo.corpo).toBe(150);
    expect(TIPO_STORY.valoreDato.corpo).toBe(80);
  });

  it("il titolo della cover è più grande di quello del Post", () => {
    // 168 su 1920 non è 132 su 1350 riscalato: è una scelta del riferimento.
    expect(TIPO_STORY.titoloCover.corpo).toBeGreaterThan(132);
  });
});

describe("zone di ritaglio", () => {
  it("la Story è a pieno campo, non più in fascia", () => {
    expect(FASCIA.story).toBe(1920);
    const cover = zonePerSlot("cover");
    expect(cover.find((z) => z.id === "story").altezza).toBe(1920);
  });

  it("le fasce delle schermate 02 e 05 hanno zone proprie", () => {
    expect(zonePerSlot("storyNumeri")[0].altezza).toBe(620);
    expect(zonePerSlot("storyIncluso")[0].altezza).toBe(560);
    expect(zonePerSlot("storyPrenota")[0].altezza).toBe(1920);
  });
});

describe("stati dei posti", () => {
  it("sono i quattro dello schema, con «disponibili» muto", () => {
    expect(Object.keys(POSTI)).toEqual(STATI_POSTI);
    expect(POSTI.disponibili.etichetta).toBeNull();
    expect(POSTI.ultimi.etichetta).toBe("Posti limitati");
    expect(POSTI.soldout.etichetta).toBe("Sold out");
    expect(POSTI.attesa.etichetta).toBe("Lista d'attesa");
  });

  it("«sold out» ha più risalto di «posti limitati»", () => {
    // Un evento esaurito che sembra prenotabile è peggio di un'etichetta
    // mancante: il risalto è parte del significato.
    expect(POSTI.soldout.risalto).toBe("pieno");
    expect(POSTI.ultimi.risalto).toBe("testo");
    expect(POSTI.attesa.risalto).toBe("contorno");
    expect(new Set(Object.values(POSTI).map((p) => p.risalto)).size).toBe(4);
  });

  it("uno stato sconosciuto ripiega su «disponibili», che non scrive nulla", () => {
    expect(posti("quasi-pieno")).toBe(POSTI.disponibili);
    expect(posti(undefined).etichetta).toBeNull();
  });
});

describe("payoff del marchio", () => {
  it("usa un colore della palette, non uno nuovo", () => {
    expect(COLORE_PAYOFF).toBe("#B4A691");
    expect(COLORE_PAYOFF).toBe(INCHIOSTRO.secondario);
    expect(Object.values(INCHIOSTRO)).toContain(COLORE_PAYOFF);
  });

  it("dichiara il valore del riferimento e il fatto di non usarlo", () => {
    // `#574F40` è fedele e invisibile su una cover luminosa: la deviazione è
    // deliberata, e resta scritta accanto al valore che sostituisce.
    expect(PAYOFF_RIFERIMENTO).toBe("#574F40");
    expect(COLORE_PAYOFF).not.toBe(PAYOFF_RIFERIMENTO);
  });
});

describe("capienza", () => {
  it("è dichiarata, non nascosta in un `slice`", () => {
    expect(CAPIENZA.tappe).toBe(5);
    expect(CAPIENZA.inclusi).toBe(5);
    expect(CAPIENZA.righeRequisiti).toBe(5);
    expect(CAPIENZA.righeDescrizioneTappa).toBe(2);
  });

  it("le larghezze utili vengono dalla tela e dai padding, non a occhio", () => {
    expect(LARGHEZZA_UTILE.schermata).toBe(TELA_STORY.larghezza - 160);
    expect(LARGHEZZA_UTILE.tappa).toBe(
      LARGHEZZA_UTILE.schermata - TIPO_STORY.numeroTappa.larghezza - 28,
    );
    expect(LARGHEZZA_UTILE.tappa).toBeLessThan(LARGHEZZA_UTILE.schermata);
  });

  it("più righe e corpo più piccolo fanno entrare più caratteri", () => {
    const stile = TIPO_STORY.corpoRequisiti;
    expect(capienzaCaratteri(stile, 2)).toBeLessThan(capienzaCaratteri(stile, 5));
    expect(capienzaCaratteri(TIPO_STORY.titoloTappe, 2))
      .toBeLessThan(capienzaCaratteri(stile, 2));
    // Colonna più stretta, meno caratteri.
    expect(capienzaCaratteri(stile, 2, LARGHEZZA_UTILE.tappa))
      .toBeLessThan(capienzaCaratteri(stile, 2, LARGHEZZA_UTILE.schermata));
  });
});

describe("zona dello sticker", () => {
  it("è la banda che ogni schermata lascia libera in fondo", () => {
    expect(ZONA_STICKER).toBe(200);
    for (const [nome, p] of Object.entries(PADDING)) {
      expect(p.basso, nome).toBeGreaterThanOrEqual(ZONA_STICKER);
    }
    expect(ZONA_STICKER).toBeLessThan(TELA_STORY.altezza);
  });
});

describe("niente dell'evento è scritto nei parametri", () => {
  it("le etichette sono cornice, non contenuto", () => {
    const tutto = JSON.stringify({ ETICHETTE, TIPO_STORY, VELO, FONDO, MOOD_STORY, PADDING, POSTI });
    for (const parola of [
      "giganti", "Olbia", "Tempio", "Buddusò", "Siniscola", "550", "580",
      "85%", "Maxienduro", "Gallura", "Limbara", "ottobre",
    ]) {
      expect(tutto.toLowerCase(), parola).not.toContain(parola.toLowerCase());
    }
  });

  it("nessun riferimento ad asset del progetto Claude Design", () => {
    const tutto = JSON.stringify({ MAPPA_STORY, FOTO_SCHERMATA, ETICHETTE });
    for (const traccia of ["logo-512", "uploads/", "hero-realistico", ".dc.html", "dc-runtime"]) {
      expect(tutto, traccia).not.toContain(traccia);
    }
  });

  it("dichiara ciò che non introduce", () => {
    expect(ASSENTI_STORY.join(" ")).toMatch(/animazioni/i);
    expect(ASSENTI_STORY.join(" ")).toMatch(/ken burns/i);
  });
});
