import { describe, expect, it } from "vitest";
import { contenutoVuoto } from "../fondamenta/schema";
import {
  differenzaSostanziale, elencoRevisioni, MASSIME_REVISIONI,
  registraRevisione, ripristinaRevisione,
} from "../fondamenta/versioni";
import { cerca, tipoAmmesso, valoriDistinti, valutaRisoluzione } from "../media/libreria";
import { preflight } from "./preflight";

/* ================================================================== *
 * Version History
 * ================================================================== */

describe("Version History", () => {
  const base = () => ({ ...contenutoVuoto({ categoria: "eventi" }), titolo: "Giganti" });

  it("riconosce una modifica sostanziale e ignora il resto", () => {
    const a = base();
    // Il titolo non è fra i rami sorvegliati: da solo non merita una revisione.
    expect(differenzaSostanziale(a, { ...a, titolo: "Altro" }).cambiato).toBe(false);
    // I testi sì.
    const b = { ...a, editoriale: { ...a.editoriale, claim: "Nuovo claim" } };
    expect(differenzaSostanziale(a, b)).toMatchObject({ cambiato: true, rami: ["editoriale"] });
  });

  it("registra la revisione con lo stato PRECEDENTE", () => {
    const prima = base();
    const dopo = { ...prima, editoriale: { ...prima.editoriale, claim: "Nuovo" } };
    const conStoria = registraRevisione(dopo, prima);

    expect(conStoria.versioni).toHaveLength(1);
    // È lo stato a cui si vuole tornare.
    expect(conStoria.versioni[0].dati.editoriale.claim).toBe("");
    expect(conStoria.versioni[0].etichetta).toBe("testi");
  });

  it("non registra nulla se non è cambiato niente di sostanziale", () => {
    const a = base();
    expect(registraRevisione(a, a).versioni).toEqual([]);
  });

  it("etichetta le modifiche multiple in modo leggibile", () => {
    const prima = base();
    const dopo = {
      ...prima,
      editoriale: { ...prima.editoriale, claim: "x" },
      mappa: { ...prima.mappa, rotazione: 15 },
    };
    expect(registraRevisione(dopo, prima).versioni[0].etichetta).toBe("testi e mappa");
  });

  it("ripristina una revisione e conserva lo stato attuale", () => {
    const v1 = base();
    let corrente = registraRevisione(
      { ...v1, editoriale: { ...v1.editoriale, claim: "secondo" } }, v1,
    );
    corrente = registraRevisione(
      { ...corrente, editoriale: { ...corrente.editoriale, claim: "terzo" } }, corrente,
    );

    const ripristinato = ripristinaRevisione(corrente, 1);
    expect(ripristinato.editoriale.claim).toBe("");
    // Il ritorno indietro è a sua volta reversibile.
    expect(ripristinato.versioni.length).toBeGreaterThan(corrente.versioni.length);
  });

  it("rifiuta una revisione inesistente", () => {
    expect(() => ripristinaRevisione(base(), 99)).toThrow(/inesistente/);
  });

  it("dirada le revisioni vecchie senza superare il tetto", () => {
    let c = base();
    let prima = null;
    for (let i = 0; i < MASSIME_REVISIONI + 12; i += 1) {
      prima = c;
      c = registraRevisione({ ...c, editoriale: { ...c.editoriale, claim: `v${i}` } }, prima);
    }
    expect(c.versioni.length).toBeLessThanOrEqual(MASSIME_REVISIONI);
    // Le più recenti restano tutte.
    const numeri = c.versioni.map((v) => v.n);
    expect(numeri.at(-1)).toBeGreaterThan(MASSIME_REVISIONI);
    expect(elencoRevisioni(c)[0].n).toBe(numeri.at(-1));
  });
});

/* ================================================================== *
 * Media Library
 * ================================================================== */

describe("Media Library", () => {
  const voci = [
    { id: "1", nome: "buddus-salita.webp", larghezza: 1600, tag: { evento: "La Via dei Giganti", luogo: "Buddusò", data: "2026-10-30", disciplina: "Maxienduro", soggetto: ["moto"], mezzo: "Beta 390", libere: [] } },
    { id: "2", nome: "cena-crew.jpg", larghezza: 2000, tag: { evento: "La Via dei Giganti", luogo: "Tempio", data: "2026-10-29", disciplina: "Maxienduro", soggetto: ["gruppo", "cibo"], mezzo: "", libere: ["crew"] } },
    { id: "3", nome: "vittorio-ritratto.png", larghezza: 900, tag: { evento: "", luogo: "Olbia", data: "2025-05-01", disciplina: "Enduro", soggetto: ["persona"], mezzo: "", libere: ["Vittorio"] } },
  ];

  it("accetta solo jpg, png e webp", () => {
    expect(tipoAmmesso({ type: "image/webp", name: "a.webp" })).toBe(true);
    expect(tipoAmmesso({ type: "image/jpeg", name: "a.jpg" })).toBe(true);
    expect(tipoAmmesso({ type: "image/gif", name: "a.gif" })).toBe(false);
    expect(tipoAmmesso({ type: "application/pdf", name: "a.pdf" })).toBe(false);
    // Alcuni sistemi non dichiarano il MIME.
    expect(tipoAmmesso({ type: "", name: "FOTO.JPEG" })).toBe(true);
  });

  it("cerca ignorando gli accenti", () => {
    expect(cerca(voci, "budduso").map((v) => v.id)).toEqual(["1"]);
    expect(cerca(voci, "Buddusò").map((v) => v.id)).toEqual(["1"]);
  });

  it("richiede TUTTI i termini: la ricerca restringe", () => {
    expect(cerca(voci, "Buddusò Maxienduro 2026").map((v) => v.id)).toEqual(["1"]);
    // Un termine che non c'è azzera il risultato invece di allargarlo.
    expect(cerca(voci, "Buddusò Quad")).toHaveLength(0);
  });

  it("trova per prefisso", () => {
    expect(cerca(voci, "maxi")).toHaveLength(2);
    expect(cerca(voci, "vitt").map((v) => v.id)).toEqual(["3"]);
  });

  it("combina query e filtri", () => {
    expect(cerca(voci, "giganti", { soggetto: "cibo" }).map((v) => v.id)).toEqual(["2"]);
    expect(cerca(voci, "", { anno: "2025" }).map((v) => v.id)).toEqual(["3"]);
    expect(cerca(voci, "", { disciplina: "Enduro" }).map((v) => v.id)).toEqual(["3"]);
  });

  it("con query vuota restituisce tutto", () => {
    expect(cerca(voci, "")).toHaveLength(3);
  });

  it("elenca i valori distinti per costruire i filtri", () => {
    expect(valoriDistinti(voci, "disciplina")).toEqual(["Enduro", "Maxienduro"]);
    expect(valoriDistinti(voci, "soggetto")).toEqual(["cibo", "gruppo", "moto", "persona"]);
  });

  it("giudica la risoluzione rispetto alla tela", () => {
    expect(valutaRisoluzione(voci[0], 1080).esito).toBe("ok");
    // 900 px su 1080 è sotto, ma non drammatico.
    expect(valutaRisoluzione(voci[2], 1080).esito).toBe("avviso");
    expect(valutaRisoluzione({ nome: "x", larghezza: 600 }, 1080).esito).toBe("errore");
    expect(valutaRisoluzione({ nome: "x" }, 1080).esito).toBe("avviso");
  });
});

/* ================================================================== *
 * Pre-flight
 * ================================================================== */

describe("Pre-flight", () => {
  const evento = (extra = {}) => {
    const c = contenutoVuoto({ categoria: "eventi", formato: "post" });
    return {
      ...c,
      titolo: "La Via dei Giganti",
      fattuali: { ...c.fattuali, nome: "La Via dei Giganti", prezzo: "580 €", dataInizio: "2026-10-29" },
      editoriale: { ...c.editoriale, cta: "Scrivici", caption: { ...c.editoriale.caption, testo: "Quattro giorni di sterrato e granito nel nord della Sardegna. Scrivici per prenotare il tuo posto: i posti sono limitati e le iscrizioni chiudono a fine settembre." } },
      media: { ...c.media, cover: { idBlob: "img-1", zoom: 1, x: 0.5, y: 0.5 } },
      ...extra,
    };
  };
  const media = [{ id: "img-1", nome: "cover.webp", larghezza: 1600 }];

  it("passa su un contenuto completo", () => {
    const esito = preflight({ contenuto: evento(), vociMedia: media, formato: "post" });
    expect(esito.errori).toEqual([]);
    expect(esito.puoiEsportare).toBe(true);
  });

  it("blocca su prezzo o date mancanti in un evento", () => {
    const c = evento();
    const senzaPrezzo = preflight({
      contenuto: { ...c, fattuali: { ...c.fattuali, prezzo: "" } },
      vociMedia: media,
    });
    expect(senzaPrezzo.puoiEsportare).toBe(false);
    expect(senzaPrezzo.errori.map((e) => e.id)).toContain("prezzo");

    const senzaDate = preflight({
      contenuto: { ...c, fattuali: { ...c.fattuali, dataInizio: "", periodo: "" } },
      vociMedia: media,
    });
    expect(senzaDate.errori.map((e) => e.id)).toContain("date");
  });

  it("blocca una variante non approvata", () => {
    const esito = preflight({ contenuto: { ...evento(), variante: "neon" }, vociMedia: media });
    expect(esito.errori.map((e) => e.id)).toContain("variante");
  });

  it("blocca un formato non previsto per la rubrica", () => {
    const c = contenutoVuoto({ categoria: "crew", formato: "carosello" });
    const esito = preflight({ contenuto: { ...c, titolo: "x" }, vociMedia: [] });
    expect(esito.errori.map((e) => e.id)).toContain("formato");
  });

  it("blocca una rubrica fotografica senza fotografie", () => {
    const c = contenutoVuoto({ categoria: "crew", formato: "post" });
    const esito = preflight({ contenuto: { ...c, titolo: "Cena" }, vociMedia: [] });
    expect(esito.errori.map((e) => e.id)).toContain("foto-mancanti");
  });

  it("segnala una fotografia che non è più nella libreria", () => {
    const esito = preflight({ contenuto: evento(), vociMedia: [] });
    expect(esito.errori.some((e) => e.id.startsWith("foto-perduta"))).toBe(true);
  });

  it("esige il GPX solo dove la mappa fa parte del format", () => {
    const carosello = { ...evento(), formato: "carosello", variante: "standard" };
    expect(preflight({ contenuto: carosello, vociMedia: media }).errori.map((e) => e.id)).toContain("gpx");
    // Sul post no: la slide del percorso non c'è.
    expect(preflight({ contenuto: evento(), vociMedia: media }).errori.map((e) => e.id)).not.toContain("gpx");
  });

  it("avvisa su una caption senza invito all'azione", () => {
    const c = evento();
    const esito = preflight({
      contenuto: { ...c, editoriale: { ...c.editoriale, caption: { ...c.editoriale.caption, testo: "Quattro giorni fra granito e mare nel nord dell'isola, con fondo vario e panorami che cambiano di continuo lungo tutto il percorso." } } },
      vociMedia: media,
    });
    expect(esito.avvisi.map((e) => e.id)).toContain("caption-cta");
    // È un avviso: non blocca.
    expect(esito.puoiEsportare).toBe(true);
  });

  it("riporta gli sfori di testo rilevati dal disegno", () => {
    const esito = preflight({
      contenuto: evento(),
      vociMedia: media,
      problemi: [{ chiave: "cover-titolo", livello: "errore", messaggio: "Il titolo non entra." }],
    });
    expect(esito.puoiEsportare).toBe(false);
    expect(esito.errori.map((e) => e.id)).toContain("sforo-cover-titolo");
  });

  it("non segnala piu' EVENTI come provvisoria: la grafica deriva dalla locandina", () => {
    const esito = preflight({ contenuto: evento(), vociMedia: media });
    expect(esito.avvisi.map((e) => e.id)).not.toContain("provvisoria");
  });

  it("un controllo che si rompe non nasconde gli altri", () => {
    // `media` con una forma inattesa: il controllo fotografie potrebbe rompersi.
    const esito = preflight({ contenuto: evento(), vociMedia: null });
    expect(esito.esiti.length).toBeGreaterThan(0);
  });
});
