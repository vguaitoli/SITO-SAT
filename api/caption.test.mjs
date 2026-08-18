import { afterEach, beforeEach, describe, expect, it } from "vitest";
import handler, { CAMPI_FATTUALI, richiestaSchema } from "./caption.js";
import { estraiFattuali } from "../src/social-studio/motori/caption/fact-lock.js";

/**
 * Endpoint delle caption: cosa riesce a entrare.
 *
 * Non si verifica che «lo schema esista»: si verifica che i payload che
 * vorremmo respingere vengano davvero respinti. La versione precedente
 * dichiarava `fattuali` come dizionario aperto, quindi `fattuali.gpx` passava
 * la validazione pur essendo lo schema `.strict()`. Un test che guarda solo la
 * richiesta valida non lo avrebbe mai scoperto.
 */

const UTENTE = "prova";
const PASSWORD = "parola-di-prova";
const CREDENZIALI = `Basic ${Buffer.from(`${UTENTE}:${PASSWORD}`).toString("base64")}`;

const RICHIESTA_VALIDA = {
  rubrica: "eventi",
  lunghezza: "standard",
  fattuali: {
    nome: "La Via dei Giganti",
    prezzo: "580 €",
    dataInizio: "2026-10-29",
    dataFine: "2026-11-01",
    periodo: "",
    km: "550 km",
    sterrato: "85%",
    durata: "4 Giorni",
    livello: "Medio-Avanzato",
    partecipantiMin: "5",
    partecipantiMax: "10",
    partenza: "Olbia",
  },
  editoriale: { titolo: "La Via dei Giganti", claim: "Sterrato e granito", note: "" },
  paragrafiBloccati: ["Primo paragrafo, scritto a mano."],
};

/** Richiesta completa e legittima, con tutte le intestazioni che servono. */
function chiamata(corpo, { autorizzazione = CREDENZIALI, contentType = "application/json" } = {}) {
  return new Request("https://www.sardegnatrailavventura.it/admin/social/api/caption", {
    method: "POST",
    headers: {
      authorization: autorizzazione,
      "content-type": contentType,
      host: "www.sardegnatrailavventura.it",
      "sec-fetch-site": "same-origin",
    },
    body: typeof corpo === "string" ? corpo : JSON.stringify(corpo),
  });
}

describe("schema dei fattuali", () => {
  it("copre esattamente i campi prodotti da estraiFattuali", () => {
    // Se qualcuno aggiunge un campo al Fact Lock, l'endpoint deve saperlo:
    // altrimenti il campo nuovo viene respinto in produzione senza spiegazione,
    // oppure — peggio — se ne aggiunge uno qui che il Fact Lock non produce.
    const prodotti = Object.keys(estraiFattuali({ fattuali: {} }));
    expect([...CAMPI_FATTUALI].sort()).toEqual([...prodotti].sort());
  });

  it("accetta la richiesta legittima", () => {
    const esito = richiestaSchema.safeParse(RICHIESTA_VALIDA);
    expect(esito.success).toBe(true);
    expect(esito.data.fattuali.prezzo).toBe("580 €");
  });

  it("respinge ogni campo fattuale non previsto", () => {
    for (const intruso of ["gpx", "idBlob", "coordinate", "media", "lat", "lon", "traccia", "qualsiasi"]) {
      const esito = richiestaSchema.safeParse({
        ...RICHIESTA_VALIDA,
        fattuali: { ...RICHIESTA_VALIDA.fattuali, [intruso]: "x" },
      });
      expect(esito.success, `«${intruso}» non doveva passare`).toBe(false);
    }
  });

  it("respinge un campo estraneo alla radice e dentro editoriale", () => {
    expect(richiestaSchema.safeParse({ ...RICHIESTA_VALIDA, gpx: "..." }).success).toBe(false);
    expect(richiestaSchema.safeParse({
      ...RICHIESTA_VALIDA,
      editoriale: { ...RICHIESTA_VALIDA.editoriale, idBlob: "img-1" },
    }).success).toBe(false);
  });

  it("respinge valori che non sono testo breve", () => {
    // Un oggetto annidato è il modo naturale di far passare una geometria.
    expect(richiestaSchema.safeParse({
      ...RICHIESTA_VALIDA,
      fattuali: { ...RICHIESTA_VALIDA.fattuali, km: { lat: 40.9, lon: 9.5 } },
    }).success).toBe(false);
    expect(richiestaSchema.safeParse({
      ...RICHIESTA_VALIDA,
      fattuali: { ...RICHIESTA_VALIDA.fattuali, nome: "x".repeat(401) },
    }).success).toBe(false);
  });
});

describe("endpoint", () => {
  beforeEach(() => {
    process.env.SOCIAL_STUDIO_UTENTE = UTENTE;
    process.env.SOCIAL_STUDIO_PASSWORD = PASSWORD;
    delete process.env.CAPTION_PROVIDER;
    delete process.env.CAPTION_API_KEY;
  });

  afterEach(() => {
    delete process.env.SOCIAL_STUDIO_UTENTE;
    delete process.env.SOCIAL_STUDIO_PASSWORD;
  });

  it("resta 501 finché il fornitore non è configurato", async () => {
    const r = await handler(chiamata(RICHIESTA_VALIDA));
    expect(r.status).toBe(501);
    const corpo = await r.json();
    expect(corpo.errore).toMatch(/Nessun fornitore/i);
    // Non si rimanda al client nulla che non sia già suo.
    expect(JSON.stringify(corpo)).not.toMatch(/CAPTION_API_KEY\s*[:=]\s*\S/);
  });

  it("risponde 400 a gpx, idBlob, coordinate, media e campi inventati", async () => {
    for (const intruso of ["gpx", "idBlob", "coordinate", "media"]) {
      const r = await handler(chiamata({
        ...RICHIESTA_VALIDA,
        fattuali: { ...RICHIESTA_VALIDA.fattuali, [intruso]: "contenuto vietato" },
      }));
      expect(r.status, `«${intruso}» doveva dare 400`).toBe(400);
    }
    const radice = await handler(chiamata({ ...RICHIESTA_VALIDA, allegato: "traccia.gpx" }));
    expect(radice.status).toBe(400);
  });

  it("non fa uscire il contenuto vietato nel messaggio d'errore", async () => {
    const r = await handler(chiamata({
      ...RICHIESTA_VALIDA,
      fattuali: { ...RICHIESTA_VALIDA.fattuali, gpx: "40.9245,9.5118 40.9310,9.5200" },
    }));
    expect(r.status).toBe(400);
    // Il dettaglio dello scarto nomina il campo, non il suo valore: un errore
    // che restituisce il payload è un modo di esfiltrarlo dai log.
    expect(await r.text()).not.toContain("40.9245");
  });

  it("nega l'accesso senza credenziali, prima di guardare il corpo", async () => {
    const r = await handler(chiamata(RICHIESTA_VALIDA, { autorizzazione: "" }));
    expect(r.status).toBe(401);
  });

  it("rifiuta un Content-Type diverso da JSON", async () => {
    const r = await handler(chiamata(RICHIESTA_VALIDA, { contentType: "text/plain" }));
    expect(r.status).toBe(415);
  });

  it("rifiuta i metodi diversi da POST", async () => {
    const r = await handler(new Request("https://www.sardegnatrailavventura.it/admin/social/api/caption"));
    expect(r.status).toBe(405);
  });

  it("rifiuta un corpo che non è JSON valido", async () => {
    const r = await handler(chiamata("{non json"));
    expect(r.status).toBe(400);
  });
});
