import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  FORMATI_TOUR,
  STATI_EVIDENZA,
  preflightTour,
  risoluzioneUtile,
  selezioneFoto,
  titoloDisegnato,
} from "./preflight-tour";
import { geometriaCover } from "../template/geometria-foto";
import { preflight } from "./preflight";
import { GEOMETRIA, QUANTI_DATI, ZONE_INSTAGRAM, datiVisibili, rettangoli } from "../design/tour";
import { templateDisponibile } from "../design/registro-template";
import { statoRubrica } from "../app/registro-editor";

/**
 * Il pre-flight della rubrica TOUR.
 *
 * Due domande che questo file tiene separate perché sono davvero separate:
 * che cosa dice la bozza, e che cosa è successo mentre la si disegnava. La
 * prima si risponde leggendo; la seconda no, e tutto il capitolo nasce da lì —
 * un `idBlob` dimostra una scelta, non un file caricabile, e un registro vuoto
 * può voler dire «niente da segnalare» o «nessuno ha ancora misurato».
 */

/* ================================================================== *
 * Fixture sintetiche
 * ================================================================== */

const ritaglio = (idBlob) => ({ idBlob, zoom: 1.2, x: 0.5, y: 0.5, specchiata: false });

/** Una bozza TOUR sintetica: nessun tour reale, nessun dato operativo. */
const BOZZA = Object.freeze({
  categoria: "tour",
  fattuali: {
    nome: "Percorso Di Prova",
    categoria: "4×4",
    durata: "3 Giorni",
    km: "240 km",
    livello: "Medio",
    periodo: "Aprile – Ottobre",
    prezzo: "890 €",
    url: "https://esempio.test/tour/percorso-di-prova",
  },
  editoriale: {
    titoloBreve: "Percorso Di Prova",
    claim: "Una frase breve di prova.",
    cta: "Scopri il tour",
  },
  media: {
    cover: ritaglio("b-cover"),
    esperienza: [],
    sfondi: { tourStory: ritaglio("b-story") },
  },
});

const con = (rami) => ({
  ...BOZZA,
  ...rami,
  fattuali: { ...BOZZA.fattuali, ...(rami.fattuali || {}) },
  editoriale: { ...BOZZA.editoriale, ...(rami.editoriale || {}) },
  media: { ...BOZZA.media, ...(rami.media || {}) },
});

const SORGENTI = Object.freeze({ cover: "cover.webp", story: "story.webp" });

/**
 * Una fotografia **davvero** sufficiente per i due formati.
 *
 * 1800×832 non lo è, e per accorgersene bisogna guardare come viene disegnata:
 * su una tela 4:5 quel 2,16:1 va ingrandito quasi due volte per coprire
 * l'altezza. Serve una fotografia alta: 2400×2600 copre il Post a 0,62× e la
 * Story a 0,89×, cioè si rimpicciolisce in entrambi i casi.
 */
const FOTO_BUONA = Object.freeze({ larghezza: 2400, altezza: 2600 });

/** Evidenze di un renderer che ha finito e non ha niente da dire. */
const evidenzeOk = (formato, sorgente, dimensioni = {}) => ({
  formato,
  misureInSospeso: 0,
  foto: {
    sorgente,
    stato: "caricata",
    larghezza: dimensioni.larghezza ?? FOTO_BUONA.larghezza,
    altezza: dimensioni.altezza ?? FOTO_BUONA.altezza,
  },
});

const controlla = (extra = {}) => {
  const formato = extra.formato || "post";
  const sorgenti = extra.sorgenti === undefined ? SORGENTI : extra.sorgenti;
  const attesa = selezioneFoto(extra.contenuto || BOZZA, formato, sorgenti || {}).sorgente;
  return preflightTour({
    contenuto: BOZZA,
    problemi: [],
    evidenze: evidenzeOk(formato, attesa),
    ...extra,
    formato,
    sorgenti,
  });
};

const ids = (esito, livello) => esito.esiti.filter((e) => e.livello === livello).map((e) => e.id);

/*
 * jsdom non implementa `document.fonts`: senza questo, il controllo comune dei
 * font restituirebbe un avviso in ogni prova e coprirebbe le conferme che qui
 * si vogliono misurare. Quel controllo ha le sue prove sul vero, altrove.
 */
let fontOriginali;
beforeEach(() => {
  fontOriginali = Object.getOwnPropertyDescriptor(document, "fonts");
  Object.defineProperty(document, "fonts", {
    configurable: true,
    value: { check: () => true },
  });
});
afterEach(() => {
  if (fontOriginali) Object.defineProperty(document, "fonts", fontOriginali);
  else delete document.fonts;
});

/* ================================================================== *
 * La base
 * ================================================================== */

describe("una bozza completa passa, e lo dice", () => {
  it.each([["post"], ["story"]])("%s: nessun errore, nessun avviso, cattura autorizzata", (formato) => {
    const esito = controlla({ formato });
    expect(esito.errori, JSON.stringify(esito.errori)).toEqual([]);
    expect(esito.avvisi, JSON.stringify(esito.avvisi)).toEqual([]);
    expect(esito.senzaErrori).toBe(true);
    expect(esito.richiedeConferma).toBe(false);
    expect(esito.puoiCatturare).toBe(true);
  });

  it("i formati previsti sono due, e un terzo è un errore", () => {
    expect(FORMATI_TOUR).toEqual(["post", "story"]);
    const esito = controlla({ formato: "carosello" });
    expect(ids(esito, "errore")).toEqual(["formato"]);
    expect(esito.puoiCatturare).toBe(false);
  });

  it("una rubrica diversa non viene giudicata con il metro di TOUR", () => {
    const esito = preflightTour({ contenuto: { ...BOZZA, categoria: "eventi" }, formato: "post" });
    expect(ids(esito, "errore")).toEqual(["rubrica"]);
  });
});

/* ================================================================== *
 * Titolo e CTA
 * ================================================================== */

describe("il titolo è quello che il template disegna davvero", () => {
  it("in mancanza di titoloBreve vale il nome", () => {
    expect(titoloDisegnato(con({ editoriale: { titoloBreve: "" } }))).toBe("Percorso Di Prova");
    expect(controlla({ contenuto: con({ editoriale: { titoloBreve: "" } }) }).errori).toEqual([]);
  });

  it("senza né l'uno né l'altro è un errore", () => {
    const esito = controlla({ contenuto: con({ editoriale: { titoloBreve: "" }, fattuali: { nome: "" } }) });
    expect(ids(esito, "errore")).toContain("titolo");
    expect(esito.puoiCatturare).toBe(false);
  });

  it("un titolo di soli spazi è un titolo mancante", () => {
    // Il template lo disegnerebbe, e non si vedrebbe niente.
    const esito = controlla({ contenuto: con({ editoriale: { titoloBreve: "   " }, fattuali: { nome: "  " } }) });
    expect(ids(esito, "errore")).toContain("titolo");
  });

  /**
   * Il ripiego è del renderer, non del pre-flight.
   *
   * `PostTour` e `StoryTour` scelgono con `titoloBreve || nome || ""`, e una
   * stringa di spazi è truthy: il ripiego **non scatta** e la grafica esce con
   * il blocco più grande vuoto. Applicare `trim` prima della selezione
   * significava giudicare un titolo diverso da quello pubblicato — il
   * pre-flight approvava «Percorso Di Prova» mentre il PNG non aveva titolo.
   */
  describe("la selezione è quella del renderer, e il giudizio viene dopo", () => {
    const conNome = (titoloBreve) => con({ editoriale: { titoloBreve }, fattuali: { nome: "Nome Di Prova" } });

    it.each([["post"], ["story"]])("%s — spazi con un nome valido: blocca, non ripiega", (formato) => {
      const bozza = conNome(" ");
      // Quel che il renderer disegna, letteralmente.
      expect(bozza.editoriale.titoloBreve || bozza.fattuali.nome || "").toBe(" ");
      expect(titoloDisegnato(bozza)).toBe(" ");

      const esito = controlla({ formato, contenuto: bozza });
      expect(ids(esito, "errore")).toContain("titolo");
      expect(esito.puoiCatturare).toBe(false);
      // E lo dice: il problema è il campo non vuoto, non il nome mancante.
      expect(esito.errori.find((e) => e.id === "titolo").messaggio).toMatch(/soli spazi/i);
    });

    it.each([["post"], ["story"]])("%s — stringa vuota con un nome valido: ripiega e passa", (formato) => {
      const bozza = conNome("");
      expect(titoloDisegnato(bozza)).toBe("Nome Di Prova");
      const esito = controlla({ formato, contenuto: bozza });
      expect(ids(esito, "errore")).not.toContain("titolo");
    });

    it.each([["post"], ["story"]])("%s — un titolo valido passa", (formato) => {
      const esito = controlla({ formato, contenuto: conNome("Titolo Buono") });
      expect(ids(esito, "errore")).not.toContain("titolo");
      expect(esito.esiti.find((e) => e.id === "titolo").messaggio).toContain("Titolo Buono");
    });
  });
});

describe("la CTA", () => {
  it("assente è un errore", () => {
    expect(ids(controlla({ contenuto: con({ editoriale: { cta: "" } }) }), "errore")).toContain("cta");
  });

  it("di soli spazi è un errore, non una CTA", () => {
    expect(ids(controlla({ contenuto: con({ editoriale: { cta: "   \t " } }) }), "errore")).toContain("cta");
  });

  it("non si ricava dall'URL: averlo non salva la CTA vuota", () => {
    const conUrl = con({ editoriale: { cta: "" }, fattuali: { url: "https://esempio.test/tour/x" } });
    const esito = controlla({ contenuto: conUrl });
    expect(ids(esito, "errore")).toContain("cta");
    // E l'URL non compare in nessun messaggio: resta fuori dalla grafica.
    expect(esito.esiti.map((e) => e.messaggio).join(" ")).not.toContain("esempio.test");
  });
});

/* ================================================================== *
 * I dati
 * ================================================================== */

describe("quanti dati servono, per formato", () => {
  it("i minimi sono quelli dichiarati in design/tour.js", () => {
    expect(QUANTI_DATI.post.minimo).toBe(2);
    expect(QUANTI_DATI.story.minimo).toBe(1);
  });

  const svuota = (tenuti) => {
    const fattuali = { ...BOZZA.fattuali };
    for (const campo of ["durata", "km", "livello", "periodo", "prezzo", "sterrato", "area", "mezzo"]) {
      if (!tenuti.includes(campo)) fattuali[campo] = "";
    }
    return con({ fattuali });
  };

  it("il Post con un dato solo è bloccato, con due passa", () => {
    const uno = controlla({ formato: "post", contenuto: svuota(["durata"]) });
    expect(ids(uno, "errore")).toContain("dati");

    const due = controlla({ formato: "post", contenuto: svuota(["durata", "km"]) });
    expect(ids(due, "errore")).not.toContain("dati");
  });

  it("la Story con un dato solo passa: il suo minimo è uno", () => {
    const uno = controlla({ formato: "story", contenuto: svuota(["durata"]) });
    expect(ids(uno, "errore")).not.toContain("dati");

    const zero = controlla({ formato: "story", contenuto: svuota([]) });
    expect(ids(zero, "errore")).toContain("dati");
  });

  it("i due formati hanno minimi diversi sullo stesso contenuto", () => {
    // Un dato solo: la Story lo accetta, il Post no. È il punto del contratto.
    const magra = svuota(["durata"]);
    expect(ids(controlla({ formato: "story", contenuto: magra }), "errore")).not.toContain("dati");
    expect(ids(controlla({ formato: "post", contenuto: magra }), "errore")).toContain("dati");
  });

  it("non si inventa nessun dato e non si aggiunge nessuna unità", () => {
    const grezza = con({ fattuali: { km: "240" } });
    const esito = controlla({ contenuto: grezza });
    const messaggi = esito.esiti.map((e) => e.messaggio).join(" ");
    // Il valore resta com'è nella bozza: il pre-flight non lo completa.
    expect(datiVisibili(grezza.fattuali, "post").find((d) => d.campo === "km").valore).toBe("240");
    expect(messaggi).not.toMatch(/240\s*km/);
  });

  it("la selezione è quella di design/tour.js, non una seconda copia", () => {
    const esito = controlla({ formato: "story" });
    const atteso = datiVisibili(BOZZA.fattuali, "story").map((d) => d.etichetta);
    const voceDati = esito.esiti.find((e) => e.id === "dati");
    for (const etichetta of atteso) expect(voceDati.messaggio).toContain(etichetta);
  });
});

/* ================================================================== *
 * Le fotografie
 * ================================================================== */

describe("le regole fotografiche", () => {
  it("il Post richiede la cover", () => {
    const senza = con({ media: { cover: null } });
    const esito = controlla({ formato: "post", contenuto: senza, sorgenti: { cover: null, story: "story.webp" } });
    expect(ids(esito, "errore")).toContain("foto-cover-assente");
  });

  it("il Post non ripiega sulla fotografia della Story, nemmeno se c'è", () => {
    // Lo slot Story è pieno e la sua sorgente risolta: non cambia niente.
    const senzaCover = con({ media: { cover: null, sfondi: { tourStory: ritaglio("b-story") } } });
    const esito = controlla({ formato: "post", contenuto: senzaCover, sorgenti: { cover: null, story: "story.webp" } });
    expect(ids(esito, "errore")).toContain("foto-cover-assente");
    expect(esito.selezione.sorgente).toBeNull();
  });

  it("una cover assegnata che non si risolve è un errore, non un'assenza", () => {
    const esito = controlla({ formato: "post", sorgenti: { cover: null, story: "story.webp" } });
    expect(ids(esito, "errore")).toContain("foto-cover-irrecuperabile");
    expect(ids(esito, "errore")).not.toContain("foto-cover-assente");
  });

  it("la Story con la propria fotografia non produce avvisi", () => {
    const esito = controlla({ formato: "story" });
    expect(esito.avvisi).toEqual([]);
    expect(esito.esiti.find((e) => e.id === "foto").messaggio).toMatch(/dedicata/i);
  });

  it("la Story che ripiega sulla cover è un avviso, non un errore", () => {
    const senzaStory = con({ media: { sfondi: {} } });
    const esito = controlla({ formato: "story", contenuto: senzaStory });
    expect(ids(esito, "errore")).toEqual([]);
    expect(ids(esito, "avviso")).toEqual(["foto-story-ripiego"]);
    // Nessun errore, e comunque non si cattura: l'avviso va confermato.
    expect(esito.senzaErrori).toBe(true);
    expect(esito.puoiCatturare).toBe(false);
    expect(esito.richiedeConferma).toBe(true);
  });

  it("la Story senza fotografia propria né cover è un errore", () => {
    const nuda = con({ media: { cover: null, sfondi: {} } });
    const esito = controlla({ formato: "story", contenuto: nuda, sorgenti: { cover: null, story: null } });
    expect(ids(esito, "errore")).toContain("foto-story-assente");
  });

  /**
   * Il difetto A, dal lato del pre-flight.
   *
   * Uno slot Story assegnato e irrecuperabile non deve diventare un ripiego
   * silenzioso: il ripiego userebbe l'URL della cover con il ritaglio della
   * Story, cioè l'inquadratura di una fotografia applicata a un'altra.
   */
  it("uno slot Story assegnato e irrecuperabile è un errore dichiarato", () => {
    const esito = controlla({ formato: "story", sorgenti: { cover: "cover.webp", story: null } });
    expect(ids(esito, "errore")).toContain("foto-story-irrecuperabile");
    expect(ids(esito, "avviso")).not.toContain("foto-story-ripiego");
    expect(esito.selezione.sorgente).toBeNull();
    expect(esito.selezione.ripiego).toBe(false);
  });

  it("nessun idBlob rende da solo una fotografia pronta", () => {
    /*
     * Il riferimento c'è, la sorgente pure, e il renderer dice che il
     * caricamento è fallito: il contenuto è a posto e si blocca lo stesso.
     */
    const esito = controlla({
      formato: "post",
      evidenze: { formato: "post", misureInSospeso: 0, foto: { sorgente: "cover.webp", stato: "fallita" } },
    });
    expect(ids(esito, "errore")).toContain("foto-non-caricata");
    expect(esito.puoiCatturare).toBe(false);
  });
});

/* ================================================================== *
 * Il claim
 * ================================================================== */

describe("il claim", () => {
  it("vuoto è un'assenza legittima: nessun avviso", () => {
    const esito = controlla({ contenuto: con({ editoriale: { claim: "" } }) });
    expect(esito.avvisi).toEqual([]);
    expect(esito.esiti.find((e) => e.id === "claim").livello).toBe("ok");
    expect(esito.puoiCatturare).toBe(true);
  });

  it("omesso per capienza è l'avviso vero del template, non una soglia di caratteri", () => {
    /*
     * Un claim lunghissimo con il registro muto non produce nessun avviso: la
     * capienza la misura il template, sui font caricati e alla larghezza
     * reale. Qui non c'è nessun conteggio di caratteri che possa contraddirlo.
     */
    const lungo = "Una frase ".repeat(60);
    const senzaSegnalazione = controlla({ contenuto: con({ editoriale: { claim: lungo } }) });
    expect(senzaSegnalazione.avvisi).toEqual([]);

    const conSegnalazione = controlla({
      contenuto: con({ editoriale: { claim: lungo } }),
      problemi: [{ chiave: "tour-post/claim", livello: "avviso", messaggio: "Claim: omesso perché non entra in 2 righe. Accorcialo per farlo comparire." }],
    });
    expect(ids(conSegnalazione, "avviso")).toContain("sforo-tour-post/claim");
    expect(conSegnalazione.richiedeConferma).toBe(true);
  });
});

/* ================================================================== *
 * Gli sfori dei template
 * ================================================================== */

describe("le misure dei template arrivano dal registro", () => {
  it("un titolo che non entra nemmeno al minimo blocca", () => {
    const esito = controlla({
      problemi: [{ chiave: "tour-post/titolo", livello: "errore", messaggio: "Titolo: il testo non entra nello spazio previsto nemmeno al corpo minimo (96 px). Accorcialo." }],
    });
    expect(ids(esito, "errore")).toContain("sforo-tour-post/titolo");
    expect(esito.puoiCatturare).toBe(false);
  });

  it("un dato che non entra blocca allo stesso modo", () => {
    const esito = controlla({
      problemi: [{ chiave: "tour-post/dato-durata", livello: "errore", messaggio: "DURATA: il testo non entra nello spazio previsto nemmeno al corpo minimo (40 px). Accorcialo." }],
    });
    expect(ids(esito, "errore")).toContain("sforo-tour-post/dato-durata");
  });

  it("lo stesso sforo raccontato due volte diventa una voce sola", () => {
    const uno = { chiave: "tour-post/titolo", livello: "errore", messaggio: "Titolo: non entra." };
    const esito = controlla({ problemi: [uno, { ...uno }] });
    expect(ids(esito, "errore").filter((i) => i === "sforo-tour-post/titolo")).toHaveLength(1);
  });
});

/* ================================================================== *
 * Le evidenze del renderer
 * ================================================================== */

describe("le evidenze del renderer", () => {
  it("assenti: non si cattura", () => {
    const esito = controlla({ evidenze: undefined });
    expect(ids(esito, "errore")).toContain("evidenze-assenti");
    expect(esito.puoiCatturare).toBe(false);
  });

  it("di un altro formato: non valgono", () => {
    const esito = controlla({ formato: "post", evidenze: evidenzeOk("story", "cover.webp") });
    expect(ids(esito, "errore")).toEqual(["evidenze-altro-formato"]);
  });

  it("con misure ancora in sospeso: non si cattura", () => {
    const esito = controlla({ evidenze: { ...evidenzeOk("post", "cover.webp"), misureInSospeso: 2 } });
    expect(ids(esito, "errore")).toContain("misure-in-sospeso");
    expect(esito.errori[0].messaggio).toContain("2 misure");
  });

  it("un registro vuoto non significa renderer pronto", () => {
    // Nessuna segnalazione, e comunque due misure aperte: si aspetta.
    const esito = controlla({ problemi: [], evidenze: { ...evidenzeOk("post", "cover.webp"), misureInSospeso: 2 } });
    expect(esito.puoiCatturare).toBe(false);
  });

  it.each([
    ["conteggio non intero", { misureInSospeso: 1.5 }],
    ["conteggio negativo", { misureInSospeso: -1 }],
    ["conteggio assente", { misureInSospeso: undefined }],
  ])("malformate — %s — bloccano", (_nome, rami) => {
    const esito = controlla({ evidenze: { ...evidenzeOk("post", "cover.webp"), ...rami } });
    expect(ids(esito, "errore")).toContain("evidenze-malformate");
  });

  it.each([
    ["esito foto assente", { foto: undefined }],
    ["stato sconosciuto", { foto: { sorgente: "cover.webp", stato: "quasi" } }],
    ["caricata senza dimensioni", { foto: { sorgente: "cover.webp", stato: "caricata" } }],
    ["caricata con dimensioni a zero", { foto: { sorgente: "cover.webp", stato: "caricata", larghezza: 0, altezza: 0 } }],
  ])("malformate — %s — bloccano", (_nome, rami) => {
    const esito = controlla({ evidenze: { ...evidenzeOk("post", "cover.webp"), ...rami } });
    expect(ids(esito, "errore")).toContain("evidenze-malformate");
    expect(esito.puoiCatturare).toBe(false);
  });

  it("il registro non letto è una evidenza malformata, non un registro pulito", () => {
    const esito = controlla({ problemi: undefined });
    expect(ids(esito, "errore")).toContain("evidenze-malformate");
  });

  it("in corso: la fotografia sta ancora caricando", () => {
    const esito = controlla({
      evidenze: { formato: "post", misureInSospeso: 0, foto: { sorgente: "cover.webp", stato: "in-corso" } },
    });
    expect(ids(esito, "errore")).toContain("foto-in-corso");
  });

  it("obsolete: l'esito appartiene a un'altra sorgente", () => {
    const esito = controlla({ evidenze: evidenzeOk("post", "una-vecchia.webp") });
    expect(ids(esito, "errore")).toContain("evidenze-obsolete");
    expect(esito.errori[0].messaggio).toContain("una-vecchia.webp");
    expect(esito.errori[0].messaggio).toContain("cover.webp");
  });

  it("gli stati leciti sono tre", () => {
    expect(STATI_EVIDENZA).toEqual(["caricata", "in-corso", "fallita"]);
  });

  it("una fotografia troppo piccola per la tela è un avviso o un errore, secondo la libreria", () => {
    // Le soglie restano quelle della libreria: sotto il 75% errore, sotto il
    // 100% avviso. Cambia il numero che si confronta, non il metro.
    const poco = controlla({ evidenze: evidenzeOk("post", "cover.webp", { larghezza: 1100, altezza: 1500 }) });
    expect(ids(poco, "avviso")).toContain("foto-risoluzione");

    const troppoPoco = controlla({ evidenze: evidenzeOk("post", "cover.webp", { larghezza: 600, altezza: 800 }) });
    expect(ids(troppoPoco, "errore")).toContain("foto-risoluzione");
  });

  it("un fallimento già raccontato dal registro non viene detto due volte", () => {
    const esito = controlla({
      evidenze: { formato: "post", misureInSospeso: 0, foto: { sorgente: "cover.webp", stato: "fallita" } },
      problemi: [{ chiave: "cattura/foto", livello: "errore", messaggio: "Fotografia: non si è potuta caricare, quindi non se ne conoscono le dimensioni." }],
    });
    expect(ids(esito, "errore")).not.toContain("foto-non-caricata");
    expect(ids(esito, "errore")).toContain("sforo-cattura/foto");
    // Resta comunque bloccante: una voce, non zero.
    expect(esito.puoiCatturare).toBe(false);
  });
});


/* ================================================================== *
 * La risoluzione che conta è quella disegnata
 * ================================================================== */

/**
 * La larghezza originale non dice niente da sola.
 *
 * Una fotografia 1800×10 ha 1800 px di larghezza e passa qualunque soglia di
 * larghezza; ma su una Story deve coprire 1920 px di altezza partendo da 10,
 * quindi viene ingrandita 192 volte e disegnata a 345600×1920. Nella larghezza
 * visibile ci finiscono **sei pixel** del file. Il giudizio si prende sulla
 * risoluzione equivalente sulla tela, che tiene conto di entrambi gli assi e
 * dello zoom del ritaglio.
 */
describe("la risoluzione si misura su come la fotografia viene disegnata", () => {
  const conZoom = (zoom) => con({ media: { cover: { ...ritaglio("b-cover"), zoom }, sfondi: {} } });

  const giudizio = (esito) => esito.esiti.find((e) => e.id === "foto-risoluzione" || e.id === "foto-renderer");

  it("un panorama bassissimo è un errore, non una fotografia larga", () => {
    const esito = controlla({ formato: "story", evidenze: evidenzeOk("story", "story.webp", { larghezza: 1800, altezza: 10 }) });
    const g = giudizio(esito);
    expect(g.livello).toBe("errore");
    expect(g.id).toBe("foto-risoluzione");
    // Il messaggio porta i numeri veri: quanto ingrandisce e quanto resta.
    expect(g.messaggio).toMatch(/1800×10/);
    expect(g.messaggio).toMatch(/su 1080/);
  });

  it("una fotografia verticale sufficiente passa", () => {
    // 2000×3600: sulla Story copre senza ingrandire.
    const esito = controlla({ formato: "story", evidenze: evidenzeOk("story", "story.webp", { larghezza: 2000, altezza: 3600 }) });
    expect(giudizio(esito).livello).toBe("ok");
    expect(ids(esito, "errore")).toEqual([]);
  });

  it("lo zoom peggiora il giudizio, perché ingrandisce", () => {
    const livelli = [1, 1.6, 3].map((zoom) => {
      const esito = preflightTour({
        contenuto: conZoom(zoom),
        formato: "post",
        sorgenti: SORGENTI,
        problemi: [],
        evidenze: evidenzeOk("post", "cover.webp", { larghezza: 1600, altezza: 2000 }),
      });
      return giudizio(esito).livello;
    });
    expect(livelli).toEqual(["ok", "avviso", "errore"]);
  });

  it("la stessa fotografia può bastare per il Post e non per la Story", () => {
    // 2200×1750 con zoom 1.2: il Post la rimpicciolisce, la Story la ingrandisce.
    const dimensioni = { larghezza: 2200, altezza: 1750 };
    const post = controlla({ formato: "post", evidenze: evidenzeOk("post", "cover.webp", dimensioni) });
    const story = controlla({ formato: "story", evidenze: evidenzeOk("story", "story.webp", dimensioni) });
    expect(giudizio(post).livello).toBe("ok");
    expect(giudizio(story).livello).not.toBe("ok");
  });

  it("quando la Story ripiega, si misura il ritaglio della cover", () => {
    /*
     * Due ritagli con zoom diversi sullo stesso file: se si misurasse quello
     * dello slot Story — che non viene disegnato — il giudizio parlerebbe di
     * una fotografia che nessuno vede.
     */
    const dimensioni = { larghezza: 1600, altezza: 2600 };
    const coverLarga = con({
      media: {
        cover: { ...ritaglio("b-cover"), zoom: 1 },
        sfondi: {},
      },
    });
    const coverStretta = con({
      media: {
        cover: { ...ritaglio("b-cover"), zoom: 2.4 },
        sfondi: {},
      },
    });
    const largo = controlla({ formato: "story", contenuto: coverLarga, evidenze: evidenzeOk("story", "cover.webp", dimensioni) });
    const stretto = controlla({ formato: "story", contenuto: coverStretta, evidenze: evidenzeOk("story", "cover.webp", dimensioni) });

    expect(largo.selezione.ripiego).toBe(true);
    expect(largo.selezione.ritaglio.zoom).toBe(1);
    expect(giudizio(largo).livello).toBe("ok");
    // Lo stesso file, lo stesso formato: cambia solo lo zoom della cover.
    expect(giudizio(stretto).livello).toBe("errore");
  });

  it("una geometria non calcolabile blocca, non dichiara adeguata", () => {
    // Zoom zero: `geometriaCover` non ha niente da restituire.
    const esito = preflightTour({
      contenuto: conZoom(0),
      formato: "post",
      sorgenti: SORGENTI,
      problemi: [],
      evidenze: evidenzeOk("post", "cover.webp"),
    });
    expect(ids(esito, "errore")).toContain("foto-geometria");
    expect(esito.puoiCatturare).toBe(false);
  });

  it("`risoluzioneUtile` è la stessa geometria che disegna, non una copia", () => {
    const intrinseca = { larghezza: 1800, altezza: 832 };
    const ritaglioCover = { zoom: 1.1, x: 0.5, y: 0.45 };
    const u = risoluzioneUtile({ formato: "post", intrinseca, ritaglio: ritaglioCover });
    const g = geometriaCover({ intrinseca, contenitore: GEOMETRIA.post.tela, zoom: 1.1, x: 0.5, y: 0.45 });
    expect(u.scala).toBeCloseTo(g.scala, 9);
    expect(u.equivalente).toBeCloseTo(1080 / g.scala, 9);
    expect(risoluzioneUtile({ formato: "carosello", intrinseca, ritaglio: ritaglioCover })).toBeNull();
  });

  /**
   * La fotografia diagnostica del banco, misurata sul serio.
   *
   * `public/media/reali/4x4-guado-1800.webp` è 1800×832, cioè 2,16:1. Con il
   * controllo corretto **non basta per nessuno dei due formati**: sul Post
   * viene ingrandita 1,79× e sulla Story 3,12×. È un fatto sul file, non una
   * soglia da abbassare.
   */
  it("la fotografia del banco (1800×832) non è sufficiente, e lo si dice", () => {
    const casi = [
      ["post", 1.1, { larghezza: 1080, altezza: 1350 }],
      ["story", 1.35, { larghezza: 1080, altezza: 1920 }],
    ];
    for (const [formato, zoom, tela] of casi) {
      const u = risoluzioneUtile({ formato, intrinseca: { larghezza: 1800, altezza: 832 }, ritaglio: { zoom } });
      expect(u.tela).toEqual(tela);
      // Sotto il 75% della tela: per la libreria è un errore.
      expect(u.equivalente, `${formato}: ${u.equivalente}`).toBeLessThan(tela.larghezza * 0.75);
    }
  });
});

/* ================================================================== *
 * Geometria e fasce
 * ================================================================== */

describe("area di sicurezza e fasce della Story", () => {
  it("i rettangoli canonici del Post stanno dentro l'area utile", () => {
    const esito = controlla({ formato: "post" });
    expect(ids(esito, "errore").filter((i) => i.startsWith("area-"))).toEqual([]);
    expect(esito.esiti.find((e) => e.id === "geometria").livello).toBe("ok");
  });

  it("la Story resta sopra le due fasce, e il controllo le nomina", () => {
    const esito = controlla({ formato: "story" });
    expect(ids(esito, "errore").filter((i) => i.startsWith("zona-"))).toEqual([]);
    const messaggio = esito.esiti.find((e) => e.id === "geometria").messaggio;
    expect(messaggio).toContain("1580–1760");
    expect(messaggio).toContain("1760–1920");
  });

  it("le fasce sono quelle canoniche, e nessun rettangolo le tocca", () => {
    expect(ZONE_INSTAGRAM.sticker.y).toBe(1580);
    expect(ZONE_INSTAGRAM.sticker.y + ZONE_INSTAGRAM.sticker.altezza).toBe(1760);
    expect(ZONE_INSTAGRAM.risposta.y).toBe(1760);
    expect(ZONE_INSTAGRAM.risposta.y + ZONE_INSTAGRAM.risposta.altezza).toBe(1920);
    for (const [nome, r] of Object.entries(rettangoli("story"))) {
      expect(r.y + r.altezza, `${nome} entra nella fascia sticker`).toBeLessThanOrEqual(1580);
    }
  });
});

/* ================================================================== *
 * Che cosa TOUR non chiede
 * ================================================================== */

describe("nessun requisito GPX, mappa o altimetria", () => {
  it.each([["post"], ["story"]])("%s: nemmeno un errore che li nomini", (formato) => {
    const esito = controlla({ formato });
    expect(ids(esito, "errore")).toEqual([]);
    expect(esito.esiti.map((e) => e.id)).not.toContain("gpx");
    expect(esito.esiti.map((e) => e.id)).not.toContain("altimetria");
    expect(esito.esiti.find((e) => e.id === "gpx-non-richiesto").livello).toBe("ok");
  });

  it("una bozza senza `mappa` passa comunque", () => {
    const senzaMappa = { ...BOZZA };
    delete senzaMappa.mappa;
    expect(controlla({ contenuto: senzaMappa }).errori).toEqual([]);
  });
});

/* ================================================================== *
 * Conferma e impronta
 * ================================================================== */

describe("nessun errore non è autorizzazione", () => {
  const conAvviso = () => controlla({ formato: "story", contenuto: con({ media: { sfondi: {} } }) });

  it("un avviso non confermato non autorizza la cattura", () => {
    const esito = conAvviso();
    expect(esito.senzaErrori).toBe(true);
    expect(esito.puoiCatturare).toBe(false);
  });

  it("la conferma con l'impronta giusta autorizza", () => {
    const primo = conAvviso();
    const secondo = controlla({
      formato: "story",
      contenuto: con({ media: { sfondi: {} } }),
      conferma: { impronta: primo.impronta },
    });
    expect(secondo.confermaValida).toBe(true);
    expect(secondo.puoiCatturare).toBe(true);
  });

  it("una conferma di un'altra verifica non autorizza", () => {
    const esito = controlla({
      formato: "story",
      contenuto: con({ media: { sfondi: {} } }),
      conferma: { impronta: "qualcos'altro" },
    });
    expect(esito.confermaValida).toBe(false);
    expect(esito.puoiCatturare).toBe(false);
  });

  it("senza conferma non si autorizza nemmeno con impronta nulla", () => {
    // `impronta` è `null` sugli esiti che nemmeno arrivano ai controlli.
    const esito = preflightTour({ contenuto: { categoria: "altro" }, conferma: { impronta: null } });
    expect(esito.confermaValida).toBe(false);
    expect(esito.puoiCatturare).toBe(false);
  });

  it.each([
    ["il titolo", { editoriale: { titoloBreve: "Un Altro Titolo" } }],
    ["la CTA", { editoriale: { cta: "Prenota adesso" } }],
    ["il claim", { editoriale: { claim: "Un'altra frase." } }],
    ["un dato", { fattuali: { durata: "4 Giorni" } }],
  ])("cambiare %s invalida la conferma", (_nome, rami) => {
    const base = con({ media: { sfondi: {} } });
    const primo = controlla({ formato: "story", contenuto: base });
    const dopo = controlla({
      formato: "story",
      contenuto: con({ ...rami, media: { sfondi: {} } }),
      conferma: { impronta: primo.impronta },
    });
    expect(dopo.impronta).not.toBe(primo.impronta);
    expect(dopo.puoiCatturare).toBe(false);
  });

  it("cambiare il ritaglio invalida la conferma", () => {
    const base = con({ media: { sfondi: {} } });
    const primo = controlla({ formato: "story", contenuto: base });
    const altroRitaglio = con({ media: { cover: { ...ritaglio("b-cover"), zoom: 1.6 }, sfondi: {} } });
    const dopo = controlla({ formato: "story", contenuto: altroRitaglio, conferma: { impronta: primo.impronta } });
    expect(dopo.puoiCatturare).toBe(false);
  });

  it("cambiare le condizioni del renderer invalida la conferma", () => {
    const base = con({ media: { sfondi: {} } });
    const primo = controlla({ formato: "story", contenuto: base });
    const dopo = preflightTour({
      contenuto: base,
      formato: "story",
      sorgenti: SORGENTI,
      problemi: [],
      // Stessa sorgente, dimensioni diverse: è un'altra fotografia sotto lo
      // stesso indirizzo, e la conferma di prima non la riguarda.
      evidenze: evidenzeOk("story", "cover.webp", { larghezza: 1200, altezza: 1600 }),
      conferma: { impronta: primo.impronta },
    });
    expect(dopo.puoiCatturare).toBe(false);
  });

  it("l'impronta è stabile a parità di ingressi", () => {
    expect(conAvviso().impronta).toBe(conAvviso().impronta);
  });

  it("un avviso confermato non copre un errore comparso dopo", () => {
    const primo = conAvviso();
    const dopo = controlla({
      formato: "story",
      contenuto: con({ media: { sfondi: {} } }),
      conferma: { impronta: primo.impronta },
      problemi: [{ chiave: "tour-story/titolo", livello: "errore", messaggio: "Titolo: non entra." }],
    });
    expect(dopo.senzaErrori).toBe(false);
    expect(dopo.puoiCatturare).toBe(false);
  });
});

/* ================================================================== *
 * Quel che questo capitolo non cambia
 * ================================================================== */

describe("il pre-flight generale resta intatto", () => {
  it("TOUR continua a ricevere template-non-implementato", () => {
    for (const formato of ["post", "story"]) {
      const esito = preflight({
        contenuto: { ...BOZZA, formato, variante: "standard" },
        vociMedia: [],
        formato,
      });
      expect(esito.errori.map((e) => e.id)).toContain("template-non-implementato");
      expect(esito.puoiEsportare).toBe(false);
    }
  });

  it("il pre-flight specifico non registra niente e non apre nessuna scorciatoia", () => {
    controlla({ formato: "post" });
    controlla({ formato: "story" });
    expect(templateDisponibile("tour", "post", "standard")).toBe(false);
    expect(templateDisponibile("tour", "story", "standard")).toBe(false);
    expect(statoRubrica("tour")).toBe("pianificata");
  });

  it("EVENTI passa dal pre-flight generale come prima", () => {
    const evento = {
      categoria: "eventi",
      formato: "post",
      variante: "standard",
      fattuali: { nome: "Prova", prezzo: "10 €", periodo: "Aprile" },
      editoriale: { cta: "Scrivici", kicker: "Sardegna", caption: { testo: "" } },
      media: { cover: { idBlob: "x" }, esperienza: [], sfondi: {} },
    };
    const esito = preflight({ contenuto: evento, vociMedia: [{ id: "x", larghezza: 2000 }], formato: "post" });
    expect(esito.errori.map((e) => e.id)).not.toContain("template-non-implementato");
  });
});
