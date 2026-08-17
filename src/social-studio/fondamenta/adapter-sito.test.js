import { describe, expect, it } from "vitest";
import { confrontaConLaFonte, daEvento, riallineaAllaFonte } from "./adapter-sito";

/**
 * L'adapter legge dal sito e non ci scrive. I test fissano due cose: che nulla
 * venga inventato, e che l'istantanea serva davvero ad accorgersi dei
 * cambiamenti.
 */

const EVENTO = {
  slug: "la-via-dei-giganti-2026",
  name: "La Via dei Giganti",
  subtitle: "Quattro giorni di sterrato, granito e mare. La Sardegna che non si lascia addomesticare",
  type: "Maxienduro",
  durata: "4 Giorni",
  km: "550 km",
  livello: "Medio-Avanzato",
  sterrato: "85%",
  interesse: "Punta Contratta, Monte Muros, Berchidda, Pattada, Lago del Coghinas",
  partenza: "Olbia",
  periodo: "29 ottobre – 1 novembre 2026",
  date: "2026-10-29T00:00:00.000Z",
  endDate: "2026-11-01T00:00:00.000Z",
  prezzo: "580 €",
  descrizione: "Percorreremo un anello di quasi 550 km.\nDalle spiagge della Gallura ai graniti del Limbara.",
  incluso: ["Mezza pensione in agriturismo", "Trasporto bagagli", "Assistenza tecnica"],
  esclusioni: ["Carburante", "Pranzi", ""],
  equipaggiamento: ["Abbigliamento tecnico da enduro", "Pneumatici Enduro/Dual in buone condizioni"],
  tappe: [
    { title: "Olbia – Tempio", desc: "Attraverseremo la Gallura." },
    { title: "Tempio – Buddusò", desc: "Fra Limbara e Monte Acuto." },
  ],
};

const OPZIONI = {
  tourGroup: "Da 5 a 10 partecipanti",
  urlBase: "https://www.sardegnatrailavventura.it",
  whatsapp: "+39 348 79 81 591",
};

describe("daEvento", () => {
  it("importa i dati fattuali dal sito", () => {
    const { fattuali } = daEvento(EVENTO, OPZIONI);
    expect(fattuali.nome).toBe("La Via dei Giganti");
    expect(fattuali.prezzo).toBe("580 €");
    expect(fattuali.km).toBe("550 km");
    expect(fattuali.sterrato).toBe("85%");
    expect(fattuali.livello).toBe("Medio-Avanzato");
    expect(fattuali.dataInizio).toBe("2026-10-29");
    expect(fattuali.dataFine).toBe("2026-11-01");
  });

  it("tiene il claim nel ramo editoriale, non fra i fatti", () => {
    const { fattuali, editoriale } = daEvento(EVENTO, OPZIONI);
    expect(editoriale.claim).toContain("non si lascia addomesticare");
    expect(fattuali).not.toHaveProperty("claim");
  });

  it("marca l'origine dei dati importati", () => {
    const { fattuali } = daEvento(EVENTO, OPZIONI);
    expect(fattuali.origine.prezzo).toBe("sito");
    expect(fattuali.origine.km).toBe("sito");
  });

  it("ricava i partecipanti dalla frase delle impostazioni", () => {
    const { fattuali } = daEvento(EVENTO, OPZIONI);
    expect(fattuali.partecipantiMin).toBe("5");
    expect(fattuali.partecipantiMax).toBe("10");
  });

  it("divide le tratte in partenza e arrivo", () => {
    const { fattuali } = daEvento(EVENTO, OPZIONI);
    expect(fattuali.tappe[0]).toMatchObject({ partenza: "Olbia", arrivo: "Tempio", giorno: "Giorno 1" });
    expect(fattuali.tappe[1]).toMatchObject({ partenza: "Tempio", arrivo: "Buddusò" });
  });

  it("NON inventa i km per tappa: il sito non li espone", () => {
    const { fattuali } = daEvento(EVENTO, OPZIONI);
    for (const t of fattuali.tappe) expect(t.km).toBe("");
  });

  it("scarta le voci vuote degli elenchi", () => {
    const { fattuali } = daEvento(EVENTO, OPZIONI);
    expect(fattuali.nonInclusi).toEqual(["Carburante", "Pranzi"]);
  });

  it("spezza i punti di interesse in un elenco", () => {
    const { fattuali } = daEvento(EVENTO, OPZIONI);
    expect(fattuali.puntiInteresse).toHaveLength(5);
    expect(fattuali.puntiInteresse[0]).toBe("Punta Contratta");
  });

  it("suggerisce i pneumatici dai requisiti quando ci sono", () => {
    expect(daEvento(EVENTO, OPZIONI).fattuali.pneumatici).toMatch(/Pneumatici/);
    // Se non ci sono, resta vuoto: non si inventa.
    const senza = daEvento({ ...EVENTO, equipaggiamento: ["Casco"] }, OPZIONI);
    expect(senza.fattuali.pneumatici).toBe("");
  });

  it("conserva l'istantanea della fonte", () => {
    const { fonte } = daEvento(EVENTO, OPZIONI);
    expect(fonte.tipo).toBe("evento");
    expect(fonte.slug).toBe("la-via-dei-giganti-2026");
    expect(fonte.istantanea.prezzo).toBe("580 €");
    expect(fonte.importatoIl).toBeTruthy();
  });

  it("rifiuta un import senza evento", () => {
    expect(() => daEvento(null)).toThrow(/Nessun evento/);
  });
});

describe("confrontaConLaFonte", () => {
  const contenuto = () => ({ fonte: daEvento(EVENTO, OPZIONI).fonte });

  it("dice allineato quando il sito non è cambiato", () => {
    expect(confrontaConLaFonte(contenuto(), EVENTO)).toEqual({ allineato: true, scostamenti: [] });
  });

  it("segnala un prezzo cambiato sul sito", () => {
    const esito = confrontaConLaFonte(contenuto(), { ...EVENTO, prezzo: "620 €" });
    expect(esito.allineato).toBe(false);
    expect(esito.scostamenti).toHaveLength(1);
    expect(esito.scostamenti[0]).toMatchObject({ campo: "prezzo", nome: "prezzo", prima: "580 €", adesso: "620 €" });
  });

  it("segnala una tappa aggiunta", () => {
    const esito = confrontaConLaFonte(contenuto(), {
      ...EVENTO,
      tappe: [...EVENTO.tappe, { title: "Buddusò – Siniscola", desc: "" }],
    });
    expect(esito.scostamenti.map((s) => s.campo)).toContain("tappe");
  });

  it("ignora i campi che cambiano sempre, come updatedAt", () => {
    const esito = confrontaConLaFonte(contenuto(), { ...EVENTO, updatedAt: "2027-01-01" });
    expect(esito.allineato).toBe(true);
  });

  it("non si lamenta se non c'è istantanea", () => {
    expect(confrontaConLaFonte({}, EVENTO).allineato).toBe(true);
  });

  it("dopo il riallineamento torna allineato", () => {
    const cambiato = { ...EVENTO, prezzo: "620 €" };
    const c = riallineaAllaFonte(contenuto(), cambiato);
    expect(confrontaConLaFonte(c, cambiato).allineato).toBe(true);
  });
});
