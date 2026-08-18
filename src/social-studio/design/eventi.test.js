import { describe, expect, it } from "vitest";
import {
  ACCENTI, ACCENTO, ASSENTI, DATI, ELENCO_MOOD, FONDO, INCHIOSTRO, MAPPA,
  MOOD, MOOD_PREDEFINITO, mood, ORDINATE, OTTICO, TELA, TIPO,
} from "./eventi";
import { COLORI } from "./tokens";
import { dividiTitolo } from "../template/rubriche/eventi/PostEvento";

/**
 * Token EVENTI.
 *
 * Non si verifica che le costanti esistano: si verifica che siano *quelle del
 * progetto Claude Design* e che il sistema non abbia introdotto di nascosto
 * qualcosa che il riferimento non contiene. Un token sbagliato di una cifra
 * non si vede guardando l'anteprima.
 */

describe("palette", () => {
  it("usa il nero caldo del riferimento, non quello del sito", () => {
    expect(FONDO).toBe("#14120F");
    // Il fondo del design system globale resta quello che era: i token globali
    // non si piegano per far tornare EVENTI.
    expect(COLORI.fondo).toBe("#1C1814");
    expect(FONDO).not.toBe(COLORI.fondo);
  });

  it("ha i quattro inchiostri del riferimento", () => {
    expect(INCHIOSTRO).toEqual({
      primario: "#F7F0E6",
      secondario: "#B4A691",
      suVelo: "#DCD1BF",
      kicker: "#E4DACB",
    });
  });

  it("usa l'accento del progetto e lo dichiara fra le alternative", () => {
    expect(ACCENTO).toBe("#E08A3C");
    expect(ACCENTI[0]).toBe(ACCENTO);
    expect(ACCENTI).toEqual(["#E08A3C", "#C25A18", "#D9C27E", "#8FA36B"]);
  });

  it("l'accento EVENTI ha una sola definizione", () => {
    // `ACCENTO` non è una copia: è `COLORI.accentoEventi`. Se qualcuno cambiasse
    // uno dei due lasciando indietro l'altro, questo test cadrebbe.
    expect(ACCENTO).toBe(COLORI.accentoEventi);
    // E il vecchio valore scritto a mano in conversazione non è più in giro.
    expect(COLORI.accentoEventi).not.toBe("#E18A3C");
  });

  it("nessun modulo del sistema EVENTI porta il vecchio arancione", () => {
    const tutto = JSON.stringify({ ACCENTO, ACCENTI, MOOD, TIPO, INCHIOSTRO, FONDO });
    expect(tutto.toUpperCase()).not.toContain("E18A3C");
  });
});

describe("mood", () => {
  it("sono i tre del progetto", () => {
    expect(ELENCO_MOOD).toEqual(["Notte", "Polvere", "Inchiostro"]);
    expect(MOOD_PREDEFINITO).toBe("Notte");
  });

  it("ogni mood è una coppia filtro + velo", () => {
    for (const nome of ELENCO_MOOD) {
      expect(MOOD[nome].filtroFoto, nome).toBeTruthy();
      expect(MOOD[nome].velo, nome).toMatch(/^linear-gradient\(180deg,/);
    }
  });

  it("il velo di Notte ha le cinque tappe del riferimento", () => {
    const tappe = MOOD.Notte.velo.match(/rgba\([^)]+\)\s+\d+%/g);
    expect(tappe).toHaveLength(5);
    expect(MOOD.Notte.velo).toContain("rgba(20,18,15,.34) 26%");
    expect(MOOD.Notte.filtroFoto).toBe("grayscale(.28) contrast(1.06) saturate(.9)");
  });

  it("nessun mood cambia l'accento", () => {
    for (const nome of ELENCO_MOOD) {
      expect(MOOD[nome]).not.toHaveProperty("accento");
      expect(JSON.stringify(MOOD[nome]).toUpperCase()).not.toContain("E08A3C");
    }
  });

  it("un mood sconosciuto ricade sul predefinito invece di inventarne uno", () => {
    expect(mood("Nebbia")).toBe(MOOD.Notte);
    expect(mood(undefined)).toBe(MOOD.Notte);
  });
});

describe("tela e composizione", () => {
  it("è 1080×1350 col padding del riferimento", () => {
    expect(TELA.larghezza).toBe(1080);
    expect(TELA.altezza).toBe(1350);
    expect(TELA.padding).toEqual({ alto: 58, destro: 62, basso: 52, sinistro: 62 });
  });

  it("i testi grandi restano a sinistra del margine, per allineamento ottico", () => {
    for (const chiave of ["titolo", "claim", "kicker"]) {
      expect(OTTICO[chiave], chiave).toBeLessThan(TELA.padding.sinistro);
    }
  });

  it("le ordinate dei blocchi rispettano l'ordine della locandina", () => {
    expect(ORDINATE.intestazione).toBeLessThan(ORDINATE.kicker);
    expect(ORDINATE.kicker).toBeLessThan(ORDINATE.titolo);
    expect(ORDINATE.titolo).toBeLessThan(ORDINATE.claim);
    expect(ORDINATE.claim).toBeLessThan(ORDINATE.datiFine);
    expect(ORDINATE.datiFine).toBe(TELA.altezza - TELA.padding.basso);
  });

  it("le quattro colonne dei dati sono quelle del riferimento", () => {
    expect(DATI.colonne).toEqual(["DATE", "PARTENZA", "STERRATO", "LIVELLO"]);
  });
});

describe("tipografia", () => {
  it("Oswald porta le etichette E i valori dei dati", () => {
    expect(TIPO.etichettaDato.famiglia).toMatch(/Oswald/);
    expect(TIPO.valoreDato.famiglia).toMatch(/Oswald/);
    expect(TIPO.valoreDato.peso).toBe(500);
    expect(TIPO.valoreDato.corpo).toBe(27);
  });

  it("Bebas resta ai titoli e Montserrat al corpo", () => {
    expect(TIPO.titolo.famiglia).toMatch(/Bebas/);
    expect(TIPO.claim.famiglia).toMatch(/Montserrat/);
    expect(TIPO.claim.peso).toBe(300);
  });

  it("il titolo ha le tre taglie del progetto", () => {
    expect(TIPO.titolo.taglie).toEqual({ Enorme: 150, Grande: 132, Contenuto: 116 });
    expect(TIPO.titolo.interlinea).toBe(0.84);
  });
});

describe("mappa decorativa", () => {
  it("schiarisce invece di colorare", () => {
    expect(MAPPA.fusione).toBe("luminosity");
    expect(MAPPA.opacita).toBeCloseTo(0.22);
  });

  it("usa la maschera standard, non quella col prefisso webkit", () => {
    // Il file ne dichiara due: `-webkit-` a 100% 78% e la standard a 120% 100%.
    expect(MAPPA.maschera).toContain("120% 100%");
    expect(MAPPA.maschera).not.toContain("100% 78%");
  });
});

describe("nessuna aggiunta arbitraria", () => {
  it("dichiara ciò che il riferimento non contiene", () => {
    expect(ASSENTI).toContain("vignettatura laterale");
  });

  it("nessun token introduce una vignettatura o una texture", () => {
    const tutto = JSON.stringify({ FONDO, INCHIOSTRO, MOOD, TIPO, MAPPA, DATI });
    for (const parola of ["vignette", "vignetta", "texture", "noise", "grain"]) {
      expect(tutto.toLowerCase()).not.toContain(parola);
    }
  });
});

describe("divisione del titolo", () => {
  it("mette l'ultima parola in accento, come nel riferimento", () => {
    expect(dividiTitolo("La Via dei Giganti")).toEqual({ prima: "La Via dei", accento: "Giganti" });
  });

  it("con una sola parola non divide", () => {
    expect(dividiTitolo("Giganti")).toEqual({ prima: "", accento: "Giganti" });
  });

  it("regge il vuoto senza rompersi", () => {
    expect(dividiTitolo("")).toEqual({ prima: "", accento: "" });
    expect(dividiTitolo(undefined)).toEqual({ prima: "", accento: "" });
  });
});
