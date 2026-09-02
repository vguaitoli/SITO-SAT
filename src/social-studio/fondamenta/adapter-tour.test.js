import { describe, expect, it } from "vitest";
import { confrontaTourConLaFonte, daTour, riallineaTourAllaFonte } from "./adapter-tour";
import { contenutoVuoto, convalidaContenuto, VERSIONE_SCHEMA } from "./schema";
import { normalizeTours } from "@/content/normalize";
import catalogo from "@/../content/tours/index.json";

/**
 * Il contratto fra i tour del sito e Social Studio.
 *
 * Due gruppi di prove, e il secondo è quello che tiene: il primo lavora su un
 * tour sintetico e verifica le regole una per una; il secondo prende il
 * **catalogo reale**, lo passa da `normalizeTours()` e pretende che ogni bozza
 * risultante superi la convalida dello schema.
 *
 * Il tour sintetico non assomiglia a nessuno dei tour veri: nomi, prezzi, date
 * e slug del catalogo non entrano nel codice di produzione, e nemmeno qui come
 * valori attesi.
 */

/** Un tour già normalizzato, con tutto quello che il sito espone. */
const tourFinto = (extra = {}) => ({
  name: "Prova di Contratto",
  slug: "prova-di-contratto",
  updatedAt: "2026-01-01T00:00:00.000Z",
  type: "Enduro",
  duration: "2 Giorni",
  durata: "2 Giorni",
  distance: "150 km",
  km: "150 km",
  level: "Intermedio",
  livello: "Intermedio",
  offroad: "70%",
  sterrato: "70%",
  interest: "Alfa, Beta , Gamma",
  interesse: "Alfa, Beta , Gamma",
  lunchIncluded: true,
  pranzo: true,
  period: "Marzo - Maggio",
  periodo: "Marzo - Maggio",
  date: "2026-04-11T00:00:00.000Z",
  price: "480 €",
  prezzo: "480 €",
  description: "Due giorni di prova, scritti per il test.",
  descrizione: "Due giorni di prova, scritti per il test.",
  esclusioni: ["Viaggio", "   ", "Assicurazione", ""],
  groups: ["weekend"],
  tappe: [
    { title: "Prima — Seconda", desc: "Descrizione uno", foto: "/media/uno.webp", fotoAlt: "Alt uno" },
    { title: "Seconda — Terza", desc: "Descrizione due", foto: "/media/due.webp", fotoAlt: "Alt due" },
  ],
  ...extra,
});

describe("daTour", () => {
  it("rifiuta un tour assente", () => {
    expect(() => daTour(null)).toThrow(/Nessun tour da importare/);
    expect(() => daTour(undefined)).toThrow();
  });

  it("importa fedelmente i campi che il sito espone", () => {
    const { fattuali } = daTour(tourFinto(), { urlBase: "https://esempio.test" });
    expect(fattuali.categoria).toBe("Enduro");
    expect(fattuali.nome).toBe("Prova di Contratto");
    expect(fattuali.dataInizio).toBe("2026-04-11");
    expect(fattuali.periodo).toBe("Marzo - Maggio");
    expect(fattuali.prezzo).toBe("480 €");
    expect(fattuali.km).toBe("150 km");
    expect(fattuali.sterrato).toBe("70%");
    expect(fattuali.durata).toBe("2 Giorni");
    expect(fattuali.livello).toBe("Intermedio");
    // I punti di interesse si dividono sulle virgole e si ripuliscono.
    expect(fattuali.puntiInteresse).toEqual(["Alfa", "Beta", "Gamma"]);
  });

  it("senza data non inventa una data", () => {
    const { fattuali } = daTour(tourFinto({ date: undefined }));
    expect(fattuali.dataInizio).toBe("");
    expect(fattuali.origine.dataInizio).toBeUndefined();
  });

  it("non calcola dataFine dalla durata", () => {
    // «2 Giorni» dice quanto dura, non da quando a quando.
    const { fattuali } = daTour(tourFinto());
    expect(fattuali.dataFine).toBe("");
  });

  it("non ricava l'area dai punti di interesse", () => {
    const { fattuali } = daTour(tourFinto());
    expect(fattuali.area).toBe("");
    // E non ci finisce dentro nemmeno un pezzo dei luoghi.
    for (const luogo of ["Alfa", "Beta", "Gamma"]) {
      expect(fattuali.area).not.toContain(luogo);
    }
  });

  it("non copia il mezzo dalla tipologia", () => {
    /*
     * «Su Misura» è un tipo di tour, non un veicolo: basta quel caso a
     * dimostrare che i due concetti non coincidono. Copiare `type` in `mezzo`
     * funzionerebbe quasi sempre, che è il modo peggiore di sbagliare.
     */
    for (const type of ["Enduro", "Su Misura", "4x4"]) {
      const { fattuali } = daTour(tourFinto({ type }));
      expect(fattuali.categoria).toBe(type);
      expect(fattuali.mezzo).toBe("");
    }
  });

  it("non inventa claim, kicker, frase dei numeri né CTA", () => {
    const { editoriale } = daTour(tourFinto());
    expect(editoriale.claim).toBe("");
    expect(editoriale.kicker).toBe("");
    expect(editoriale.fraseNumeri).toBe("");
    expect(editoriale.cta).toBe("");
    // La descrizione del sito però diventa il testo editoriale iniziale.
    expect(editoriale.descrizione).toBe("Due giorni di prova, scritti per il test.");
    expect(editoriale.titoloBreve).toBe("Prova di Contratto");
  });

  it("non importa nulla dalle categorie di esperienza del sito", async () => {
    /*
     * `src/data/categorie.js` è autorità visiva, non fonte di dati: i suoi
     * claim appartengono alla disciplina («Grandi distanze, nessun limite» vale
     * per la maxienduro, non per un itinerario). Nessuno dei suoi testi deve
     * comparire nella bozza.
     */
    const { CATEGORIE } = await import("@/data/categorie");
    const bozza = JSON.stringify(daTour(tourFinto({ type: "Maxienduro" })));
    for (const c of CATEGORIE) {
      for (const campo of ["claim", "cardIntro", "intro", "adatto"]) {
        if (c[campo]) expect(bozza).not.toContain(c[campo]);
      }
      // E nemmeno gli slug delle fotografie di categoria.
      if (c.fotoCard) expect(bozza).not.toContain(c.fotoCard);
    }
  });

  it("origine marca solo i campi davvero importati e pieni", () => {
    const { fattuali } = daTour(tourFinto(), { urlBase: "https://esempio.test" });
    const marcati = Object.keys(fattuali.origine).sort();
    expect(marcati).toEqual([
      "categoria", "dataInizio", "durata", "km", "livello", "nome",
      "nonInclusi", "periodo", "prezzo", "puntiInteresse", "sterrato", "url",
    ]);
    // I campi lasciati manuali non devono sembrare arrivati dal sito.
    for (const campo of ["area", "mezzo", "partenza", "pneumatici", "esperienza",
      "partecipantiMin", "partecipantiMax", "inclusi", "requisiti", "tappe", "dataFine"]) {
      expect(fattuali.origine[campo]).toBeUndefined();
    }
    // E un campo esposto ma vuoto non viene marcato.
    const magro = daTour(tourFinto({ prezzo: "", interesse: "", esclusioni: [] })).fattuali;
    expect(magro.origine.prezzo).toBeUndefined();
    expect(magro.origine.puntiInteresse).toBeUndefined();
    expect(magro.origine.nonInclusi).toBeUndefined();
    expect(magro.origine.nome).toBe("sito");
  });

  it("costruisce l'URL italiano, anche con la base che finisce in slash", () => {
    expect(daTour(tourFinto(), { urlBase: "https://esempio.test" }).fattuali.url)
      .toBe("https://esempio.test/tour/prova-di-contratto");
    expect(daTour(tourFinto(), { urlBase: "https://esempio.test/" }).fattuali.url)
      .toBe("https://esempio.test/tour/prova-di-contratto");
    expect(daTour(tourFinto(), { urlBase: "https://esempio.test///" }).fattuali.url)
      .toBe("https://esempio.test/tour/prova-di-contratto");
    // Senza base non si inventa un URL relativo.
    expect(daTour(tourFinto()).fattuali.url).toBe("");
    expect(daTour(tourFinto({ slug: "" }), { urlBase: "https://esempio.test" }).fattuali.url).toBe("");
  });

  it("scarta le esclusioni vuote", () => {
    const { fattuali } = daTour(tourFinto());
    expect(fattuali.nonInclusi).toEqual(["Viaggio", "Assicurazione"]);
  });

  it("non trasforma le tappe del sito in tappe fattuali", () => {
    /*
     * Sul sito una tappa TOUR è un blocco editoriale con titolo, descrizione e
     * foto — non una tratta. Spezzare «Prima — Seconda» su un trattino
     * inventerebbe due località che il sito non dichiara.
     */
    const { fattuali } = daTour(tourFinto());
    expect(fattuali.tappe).toEqual([]);
    const serializzato = JSON.stringify(fattuali);
    expect(serializzato).not.toContain("Prima");
    expect(serializzato).not.toContain("Seconda");
  });

  it("il pranzo incluso non diventa una voce di «inclusi»", () => {
    expect(daTour(tourFinto({ pranzo: true })).fattuali.inclusi).toEqual([]);
    expect(daTour(tourFinto({ pranzo: false })).fattuali.inclusi).toEqual([]);
  });

  it("nessun riferimento fotografico entra nei media o nei fattuali", () => {
    const bozza = daTour(tourFinto());
    expect(bozza.media).toBeUndefined();
    expect(JSON.stringify(bozza.fattuali)).not.toContain("/media/");
    expect(JSON.stringify(bozza.editoriale)).not.toContain("/media/");
    // Nell'istantanea la foto c'è, ma come sola stringa di riferimento.
    expect(bozza.fonte.istantanea.tappe[0].foto).toBe("/media/uno.webp");
    expect(typeof bozza.fonte.istantanea.tappe[0].foto).toBe("string");
  });

  it("non muta il tour ricevuto", () => {
    const tour = tourFinto();
    const copia = JSON.parse(JSON.stringify(tour));
    daTour(tour, { urlBase: "https://esempio.test" });
    expect(tour).toEqual(copia);
  });
});

describe("istantanea e scostamento", () => {
  const conIstantanea = (tour) => ({ fonte: daTour(tour).fonte });

  it("l'istantanea conserva i campi confrontabili e non updatedAt", () => {
    const { istantanea } = daTour(tourFinto()).fonte;
    expect(Object.keys(istantanea).sort()).toEqual([
      "date", "descrizione", "durata", "esclusioni", "groups", "interesse",
      "km", "livello", "name", "periodo", "pranzo", "prezzo", "slug",
      "sterrato", "tappe", "type",
    ]);
    expect(istantanea).not.toHaveProperty("updatedAt");
    // Delle tappe conserva quattro campi, non solo il titolo.
    expect(Object.keys(istantanea.tappe[0]).sort()).toEqual(["desc", "foto", "fotoAlt", "title"]);
  });

  it("updatedAt che cambia non produce scostamenti", () => {
    const prima = conIstantanea(tourFinto());
    const esito = confrontaTourConLaFonte(prima, tourFinto({ updatedAt: "2026-12-31T23:59:59.000Z" }));
    expect(esito.allineato).toBe(true);
    expect(esito.scostamenti).toEqual([]);
  });

  it.each([
    ["prezzo", { prezzo: "990 €" }],
    ["date", { date: "2027-01-01T00:00:00.000Z" }],
    ["descrizione", { descrizione: "Riscritta." }],
    ["pranzo", { pranzo: false }],
    ["groups", { groups: ["settimana"] }],
  ])("rileva la variazione di «%s»", (campo, modifica) => {
    const prima = conIstantanea(tourFinto());
    const esito = confrontaTourConLaFonte(prima, tourFinto(modifica));
    expect(esito.allineato).toBe(false);
    expect(esito.scostamenti.map((s) => s.campo)).toContain(campo);
  });

  it.each(["title", "desc", "foto", "fotoAlt"])(
    "rileva la variazione di «%s» in una tappa",
    (chiave) => {
      /*
       * Il caso della fotografia è il motivo per cui l'istantanea TOUR conserva
       * quattro campi per tappa: con il solo titolo, sostituire l'immagine di
       * una tappa passerebbe inosservato.
       */
      const prima = conIstantanea(tourFinto());
      const tappe = tourFinto().tappe.map((t, i) => (i === 0 ? { ...t, [chiave]: "cambiato" } : t));
      const esito = confrontaTourConLaFonte(prima, tourFinto({ tappe }));
      expect(esito.allineato).toBe(false);
      expect(esito.scostamenti.map((s) => s.campo)).toContain("tappe");
    },
  );

  it("senza istantanea o senza tour non si pronuncia", () => {
    expect(confrontaTourConLaFonte({}, tourFinto()).allineato).toBe(true);
    expect(confrontaTourConLaFonte(conIstantanea(tourFinto()), null).allineato).toBe(true);
  });

  it("il riallineamento non sovrascrive il lavoro editoriale", () => {
    const contenuto = {
      ...contenutoVuoto({ categoria: "tour", formato: "post" }),
      ...daTour(tourFinto(), { urlBase: "https://esempio.test" }),
    };
    // Il lavoro fatto a mano dopo l'import.
    const lavorato = {
      ...contenuto,
      fattuali: { ...contenuto.fattuali, area: "Barbagia", mezzo: "Enduro 300", prezzo: "500 € trattati" },
      editoriale: { ...contenuto.editoriale, claim: "Scritto a mano", cta: "Scrivici" },
      media: { cover: { idBlob: "b1", zoom: 1, x: 0.5, y: 0.5, specchiata: false }, esperienza: [], sfondi: {} },
      visual: { ...contenuto.visual, mood: "Polvere" },
      mappa: { ...contenuto.mappa, zoom: 2.5 },
    };

    const riallineato = riallineaTourAllaFonte(lavorato, tourFinto({ prezzo: "990 €" }));

    expect(riallineato.fattuali).toEqual(lavorato.fattuali);
    expect(riallineato.editoriale).toEqual(lavorato.editoriale);
    expect(riallineato.media).toEqual(lavorato.media);
    expect(riallineato.visual).toEqual(lavorato.visual);
    expect(riallineato.mappa).toEqual(lavorato.mappa);
    // Solo `fonte` si muove, e adesso il confronto torna allineato.
    expect(riallineato.fonte.istantanea.prezzo).toBe("990 €");
    expect(riallineato.fonte.tipo).toBe("tour");
    expect(confrontaTourConLaFonte(riallineato, tourFinto({ prezzo: "990 €" })).allineato).toBe(true);
  });

  it("il riallineamento non muta il contenuto ricevuto", () => {
    const contenuto = { ...contenutoVuoto({ categoria: "tour", formato: "post" }), ...daTour(tourFinto()) };
    const copia = JSON.parse(JSON.stringify(contenuto));
    riallineaTourAllaFonte(contenuto, tourFinto({ prezzo: "990 €" }));
    expect(contenuto).toEqual(copia);
  });
});

describe("schema: l'aggiunta di area è additiva", () => {
  it("VERSIONE_SCHEMA resta 1", () => {
    expect(VERSIONE_SCHEMA).toBe(1);
  });

  it("una vecchia bozza EVENTI si convalida e riceve area vuota", () => {
    // Una bozza salvata prima che `area` esistesse: nel record non c'è.
    const vecchia = {
      id: "cnt-vecchio",
      versioneSchema: 1,
      categoria: "eventi",
      formato: "post",
      creato: "2026-01-01T00:00:00.000Z",
      modificato: "2026-01-01T00:00:00.000Z",
      titolo: "Bozza di prima",
      fattuali: { nome: "Evento", prezzo: "580 €", km: "395 km" },
    };
    const convalidata = convalidaContenuto(vecchia);
    expect(convalidata.fattuali.area).toBe("");
    // E nulla di quello che c'era si è perso.
    expect(convalidata.fattuali.nome).toBe("Evento");
    expect(convalidata.fattuali.prezzo).toBe("580 €");
    expect(convalidata.fattuali.km).toBe("395 km");
    expect(convalidata.versioneSchema).toBe(1);
  });
});

/* ------------------------------------------------------------------ *
 * Contratto sul catalogo reale
 * ------------------------------------------------------------------ */

describe("il catalogo vero passa il contratto", () => {
  /*
   * Il catalogo entra **solo qui**: in produzione l'adapter riceve un tour già
   * normalizzato e non conosce il file. Questo test è la prova che il contratto
   * regge sui dati veri e non solo sul campione sintetico.
   *
   * Il numero dei tour non è scritto: si confronta la quantità normalizzata con
   * quella della fonte, così aggiungerne uno non rompe niente.
   */
  const tours = normalizeTours(catalogo);

  it("la normalizzazione non perde né aggiunge tour", () => {
    expect(tours).toHaveLength(catalogo.tours.length);
    expect(tours.length).toBeGreaterThan(0);
  });

  it("ogni tour reale produce un contenuto che supera la convalida", () => {
    for (const tour of tours) {
      const bozza = {
        ...contenutoVuoto({ categoria: "tour", formato: "post" }),
        ...daTour(tour, { urlBase: "https://esempio.test" }),
      };
      expect(() => convalidaContenuto(bozza)).not.toThrow();
      const convalidata = convalidaContenuto(bozza);
      expect(convalidata.categoria).toBe("tour");
      expect(convalidata.fonte.tipo).toBe("tour");
      expect(convalidata.fattuali.nome).toBe(tour.name);
      // Le regole valgono su tutti, non solo sul campione.
      expect(convalidata.fattuali.area).toBe("");
      expect(convalidata.fattuali.mezzo).toBe("");
      expect(convalidata.fattuali.dataFine).toBe("");
      expect(convalidata.fattuali.tappe).toEqual([]);
      expect(convalidata.editoriale.claim).toBe("");
    }
  });

  it("nessun tour reale porta riferimenti fotografici nei fattuali", () => {
    for (const tour of tours) {
      const { fattuali, editoriale } = daTour(tour, { urlBase: "https://esempio.test" });
      expect(JSON.stringify(fattuali)).not.toContain("/media/");
      expect(JSON.stringify(editoriale)).not.toContain("/media/");
    }
  });

  it("il confronto è allineato subito dopo l'import, per ogni tour", () => {
    for (const tour of tours) {
      const bozza = { ...contenutoVuoto({ categoria: "tour", formato: "post" }), ...daTour(tour) };
      expect(confrontaTourConLaFonte(bozza, tour).allineato).toBe(true);
    }
  });
});
