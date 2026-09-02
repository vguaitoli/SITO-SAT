import { VERSIONE_SCHEMA } from "./schema";

/**
 * Dai tour del sito a una bozza TOUR.
 *
 * Modulo **indipendente** da `adapter-sito.js`, che resta l'adapter EVENTI. Non
 * è una duplicazione da rifattorizzare: gli eventi e i tour hanno campi diversi
 * con semantiche diverse, e un adapter unico parametrizzato avrebbe significato
 * che una modifica pensata per TOUR può cambiare il comportamento EVENTI —
 * quello già approvato, già esportato, già in produzione.
 *
 * Riceve un tour **già passato da `normalizeTours()`**: i nomi dei campi sono
 * quelli italiani (`durata`, `km`, `livello`, `sterrato`, `periodo`, `prezzo`,
 * `descrizione`, `interesse`, `esclusioni`, `pranzo`, `tappe`). L'adapter non
 * legge `content/tours/index.json`: quel file entra solo nel test di contratto.
 *
 * La regola che governa tutto il modulo: **quello che il sito non dice, la
 * bozza non lo inventa**. I campi lasciati vuoti sono elencati e motivati uno
 * per uno più sotto, e restano compilabili a mano.
 */

/** Solo la data, senza l'ora: il confronto non deve reagire ai fusi. */
const soloData = (iso) => (iso ? String(iso).slice(0, 10) : "");

/** Scarta le righe vuote di un elenco, senza mutare l'originale. */
const soloPiene = (v) =>
  Array.isArray(v) ? v.map((x) => String(x ?? "")).filter((x) => x.trim()) : [];

const testo = (v) => (v === undefined || v === null ? "" : String(v));

/**
 * I campi che l'adapter importa davvero dal sito.
 *
 * `origine` marca `"sito"` **solo** questi, e solo quando hanno un valore: un
 * campo vuoto marcato come importato racconterebbe che il sito lo espone e che
 * per qualche ragione è venuto vuoto, mentre la verità è che il sito non lo
 * espone affatto. La differenza conta quando si decide se compilarlo a mano.
 */
const CAMPI_DAL_SITO = [
  "categoria", "nome", "dataInizio", "periodo", "prezzo", "km",
  "sterrato", "durata", "livello", "puntiInteresse", "nonInclusi", "url",
];

/** Vero se il valore è stato davvero valorizzato. */
const valorizzato = (v) => (Array.isArray(v) ? v.length > 0 : String(v ?? "") !== "");

/**
 * Traduce un tour del sito nei tre rami di una bozza.
 *
 * @param {object} tour  un tour già normalizzato da `normalizeTours()`
 * @param {{urlBase?: string}} [opzioni]
 * @returns {{fonte: object, fattuali: object, editoriale: object}}
 */
export function daTour(tour, { urlBase = "" } = {}) {
  if (!tour) throw new Error("Nessun tour da importare.");

  const base = String(urlBase || "").replace(/\/+$/, "");

  const fattuali = {
    categoria: testo(tour.type),
    nome: testo(tour.name),
    dataInizio: soloData(tour.date),

    /*
     * Vuoti perché il sito non li espone con semantica affidabile. Non è
     * pigrizia: ogni riga qui sotto è un dato che si potrebbe *dedurre*, e
     * dedurlo lo farebbe sembrare misurato.
     */
    // `area`: `interesse` è un elenco di luoghi, non un'area.
    area: "",
    // `dataFine`: la durata dice «3 Giorni», non da quando a quando.
    dataFine: "",
    // `partenza`: il sito non dichiara la località di raduno.
    partenza: "",
    /*
     * `mezzo`: **non** si copia da `type`. «Su Misura» è un tipo di tour, non
     * un veicolo, e basta quel caso per dimostrare che i due concetti non
     * coincidono. Copiarlo funzionerebbe otto volte su nove, che è il modo
     * peggiore di sbagliare.
     */
    mezzo: "",
    pneumatici: "",
    // `esperienza`: `livello` è la difficoltà del percorso, non il requisito
    // di chi guida. Sono due cose che il sito tiene separate.
    esperienza: "",
    partecipantiMin: "",
    partecipantiMax: "",

    periodo: testo(tour.periodo),
    prezzo: testo(tour.prezzo),
    km: testo(tour.km),
    sterrato: testo(tour.sterrato),
    durata: testo(tour.durata),
    livello: testo(tour.livello),

    puntiInteresse: testo(tour.interesse)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),

    /*
     * `inclusi`: il sito ha solo `lunchIncluded`, un booleano. Trasformarlo in
     * «Pranzo incluso» significherebbe scrivere una voce editoriale e spacciarla
     * per un dato importato. Il flag resta nell'istantanea, dove serve a
     * rilevare che è cambiato.
     */
    inclusi: [],
    nonInclusi: soloPiene(tour.esclusioni),
    // `requisiti`: il sito non ne pubblica per i tour.
    requisiti: [],
    /*
     * `tappe`: sul sito sono blocchi editoriali con titolo, descrizione e
     * fotografia — non tratte con partenza e arrivo. Spezzare il titolo su un
     * trattino, come si fa per gli eventi, inventerebbe due località. Restano
     * nell'istantanea e si compilano a mano.
     */
    tappe: [],

    url: tour.slug && base ? `${base}/tour/${tour.slug}` : "",
  };

  return {
    fonte: {
      tipo: "tour",
      slug: tour.slug || null,
      istantanea: strutturaConfrontabile(tour),
      importatoIl: new Date().toISOString(),
    },

    fattuali: {
      ...fattuali,
      origine: Object.fromEntries(
        CAMPI_DAL_SITO.filter((c) => valorizzato(fattuali[c])).map((c) => [c, "sito"]),
      ),
    },

    editoriale: {
      titoloBreve: testo(tour.name),
      /*
       * La descrizione del sito è il punto di partenza del testo, non un fatto:
       * si può riscrivere senza che nulla si disallinei.
       */
      descrizione: testo(tour.descrizione),
      /*
       * Vuoti perché sono scelte di scrittura. In particolare `claim`: i claim
       * di `src/data/categorie.js` appartengono alla **categoria di esperienza**
       * — «Grandi distanze, nessun limite» vale per la maxienduro, non per un
       * itinerario — e importarli farebbe sembrare scritto per questo tour un
       * testo scritto per una disciplina.
       */
      claim: "",
      kicker: "",
      fraseNumeri: "",
      cta: "",
    },
  };
}

/**
 * La forma confrontabile di un tour: quello che vale la pena guardare per
 * capire se il sito è cambiato.
 *
 * `updatedAt` è escluso di proposito — cambia a ogni salvataggio del CMS e
 * renderebbe rumoroso ogni confronto.
 *
 * Delle tappe conserva **quattro** campi. L'istantanea EVENTI tiene solo il
 * titolo, e per gli eventi basta; qui no: sul sito una tappa TOUR porta una
 * fotografia, e sostituirla è un cambiamento reale che con il solo titolo
 * passerebbe inosservato.
 */
function strutturaConfrontabile(tour) {
  return {
    slug: tour.slug ?? null,
    name: tour.name ?? null,
    type: tour.type ?? null,
    date: soloData(tour.date),
    durata: tour.durata ?? null,
    km: tour.km ?? null,
    livello: tour.livello ?? null,
    sterrato: tour.sterrato ?? null,
    interesse: tour.interesse ?? null,
    pranzo: tour.pranzo ?? null,
    periodo: tour.periodo ?? null,
    prezzo: tour.prezzo ?? null,
    descrizione: tour.descrizione ?? null,
    esclusioni: soloPiene(tour.esclusioni),
    groups: soloPiene(tour.groups),
    tappe: (tour.tappe || []).map((t) => ({
      title: t?.title ?? null,
      desc: t?.desc ?? null,
      /*
       * Solo il **percorso** della fotografia, come stringa. È un riferimento
       * testuale che serve a vedere se l'immagine è stata sostituita: non entra
       * in `media`, non entra in IndexedDB, non finisce in `public/`.
       */
      foto: t?.foto ?? null,
      fotoAlt: t?.fotoAlt ?? null,
    })),
  };
}

/** Etichette leggibili, per i messaggi di scostamento. */
const NOMI = {
  slug: "slug", name: "nome", type: "tipologia", date: "data",
  durata: "durata", km: "chilometri", livello: "livello", sterrato: "sterrato",
  interesse: "punti di interesse", pranzo: "pranzo incluso", periodo: "periodo",
  prezzo: "prezzo", descrizione: "descrizione", esclusioni: "esclusioni",
  groups: "gruppi", tappe: "tappe",
};

/**
 * Confronta l'istantanea con il tour attuale del sito.
 *
 * È il senso di `fonte.istantanea`: una bozza approvata la settimana scorsa può
 * riferirsi a un prezzo che nel frattempo è cambiato, e guardando la grafica
 * nessuno se ne accorgerebbe.
 *
 * @returns {{allineato: boolean, scostamenti: {campo, nome, prima, adesso}[]}}
 */
export function confrontaTourConLaFonte(contenuto, tourAttuale) {
  const istantanea = contenuto?.fonte?.istantanea;
  if (!istantanea || !tourAttuale) return { allineato: true, scostamenti: [] };

  const adesso = strutturaConfrontabile(tourAttuale);
  const scostamenti = [];

  for (const campo of Object.keys(adesso)) {
    const prima = JSON.stringify(istantanea[campo] ?? null);
    const dopo = JSON.stringify(adesso[campo] ?? null);
    if (prima !== dopo) {
      scostamenti.push({
        campo,
        nome: NOMI[campo] || campo,
        prima: istantanea[campo] ?? null,
        adesso: adesso[campo] ?? null,
      });
    }
  }

  return { allineato: scostamenti.length === 0, scostamenti };
}

/**
 * Aggiorna l'istantanea dopo un reimport consapevole.
 *
 * Tocca **solo** `fonte`. Riallineare non è reimportare: significa dire «ho
 * visto che il sito è cambiato e va bene così», e il lavoro editoriale fatto
 * sopra non si perde per averlo detto. `fattuali`, `editoriale`, `media`,
 * `visual` e `mappa` restano dove sono.
 */
export function riallineaTourAllaFonte(contenuto, tourAttuale) {
  return {
    ...contenuto,
    versioneSchema: contenuto.versioneSchema ?? VERSIONE_SCHEMA,
    fonte: {
      ...contenuto.fonte,
      tipo: "tour",
      slug: tourAttuale?.slug ?? contenuto?.fonte?.slug ?? null,
      istantanea: strutturaConfrontabile(tourAttuale),
      importatoIl: new Date().toISOString(),
    },
  };
}
