import { FORMATI, areaUtile, dentroAreaSicura } from "./formati";
import {
  conRipiegoCoverDellaRubrica,
  leggiSlotDellaRubrica,
  slotDellaRubricaPieno,
} from "../media/slot";

/**
 * I parametri della rubrica TOUR: geometria, dati, etichette.
 *
 * Modulo **puro**, senza React: lo leggono i template, e domani lo leggerà il
 * pre-flight, che non può tirarsi dietro un albero di componenti per sapere
 * dove sta un rettangolo.
 *
 * L'autorità visiva di TOUR è il sistema del sito — «Scegli la tua avventura»
 * (`src/components/Categorie.jsx`) e i token di `src/index.css` — **non** il
 * progetto Claude Design di EVENTI. Da qui non si importa nulla di EVENTI, e
 * non si deve cominciare.
 *
 * Le coordinate sono assolute sulla tela reale, non proporzioni: le grafiche si
 * disegnano su 1080×1350 e 1080×1920 e si fotografano a quella misura. Un
 * numero scritto qui è lo stesso numero che finisce nel PNG.
 */

export const CATEGORIA = "tour";

/**
 * Interlinee e passi tipografici **della rubrica**, distinti dai token globali.
 *
 * `TESTO.titoloXL.lineHeight` vale 0.86 e serve alla locandina EVENTI. TOUR usa
 * 0.88, che è ciò che fa tornare le altezze di riga a numeri interi — 116 px a
 * 132 — e quindi rende verificabile la geometria invece di lasciarla a un
 * arrotondamento. Stessa ragione per il claim: 1.5 invece di 1.55.
 */
export const RITMO = Object.freeze({
  titolo: Object.freeze({ size: 132, minSize: 96, interlinea: 0.88, riga: 116 }),
  claim: Object.freeze({ size: 26, minSize: 22, interlinea: 1.5, riga: 39 }),
  kicker: Object.freeze({ size: 22, spaziatura: "0.2em", riga: 22 }),
  intestazione: Object.freeze({ size: 19, spaziatura: "0.3em", riga: 19 }),
  cta: Object.freeze({ size: 22, spaziatura: "0.2em", riga: 29 }),
  dato: Object.freeze({
    valore: Object.freeze({ size: 64, minSize: 40, riga: 58 }),
    etichetta: Object.freeze({ size: 19, spaziatura: "0.24em", riga: 23 }),
    interstizio: 8,
    /*
     * L'inchiostro che il Bebas sporge sotto il proprio blocco di riga, misurato
     * sul rendering reale: `TestoAdattivo` lo riserva come padding, e senza
     * metterlo nel conto il rettangolo dichiarato sarebbe 9 px più corto di
     * quello disegnato — proprio il tipo di scarto che il futuro pre-flight non
     * avrebbe modo di scoprire.
     */
    inchiostro: 9,
    riga: 58 + 9 + 8 + 23,
  }),
});

/** Lo spazio fra una riga e la successiva del blocco testuale. */
const RESPIRO = Object.freeze({
  kickerTitolo: 20,
  titoloClaim: 22,
  claimFilo: 26,
  filoDati: 26,
  datiCta: 21,
  blocoMarchio: 40,
  colonne: 24,
});

/**
 * Il blocco testuale è **ancorato in basso e a slot fissi**.
 *
 * Ogni riga ha un'altezza dichiarata che non dipende da quanto contenuto
 * arriva: un claim assente lascia aria, non fa risalire il titolo. Costa
 * qualche pixel di vuoto e restituisce una composizione che non si muove, con
 * coordinate che una prova — e domani il pre-flight — possono verificare con un
 * numero invece che con una misura.
 */
function impila(fondo, righe) {
  const posizioni = {};
  let y = fondo;
  for (const [nome, altezza, respiroSopra] of [...righe].reverse()) {
    y -= altezza;
    posizioni[nome] = Object.freeze({ y, altezza });
    y -= respiroSopra;
  }
  return { posizioni: Object.freeze(posizioni), cima: y + righe[0][2] };
}

function costruisciGeometria(formato, { righeTitolo, righeClaim, fondoBlocco, marchio }) {
  const f = FORMATI[formato];
  const area = areaUtile(formato);
  const fondoArea = area.y + area.altezza;

  const { posizioni, cima } = impila(fondoBlocco, [
    ["kicker", RITMO.kicker.riga, 0],
    ["titolo", RITMO.titolo.riga * righeTitolo, RESPIRO.kickerTitolo],
    ["claim", RITMO.claim.riga * righeClaim, RESPIRO.titoloClaim],
    ["filo", 1, RESPIRO.claimFilo],
    ["dati", RITMO.dato.riga, RESPIRO.filoDati],
    ["cta", RITMO.cta.riga, RESPIRO.datiCta],
  ]);

  return Object.freeze({
    formato,
    tela: Object.freeze({ larghezza: f.larghezza, altezza: f.altezza }),
    area: Object.freeze({ ...area, fondo: fondoArea }),
    intestazione: Object.freeze({
      y: area.y,
      altezza: RITMO.intestazione.riga,
    }),
    marchio: Object.freeze(marchio),
    blocco: Object.freeze({ cima, fondo: fondoBlocco, altezza: fondoBlocco - cima }),
    righe: posizioni,
    righeTitolo,
    righeClaim,
  });
}

/**
 * Post 1080×1350 e Story 1080×1920.
 *
 * Il Post regge un titolo su tre righe e un claim su due; la Story si ferma a
 * due e a una. Non è una preferenza: sopra quei valori il blocco testuale
 * mangia la fotografia, e TOUR è una rubrica al 60% fotografica.
 */
export const GEOMETRIA = Object.freeze({
  post: costruisciGeometria("post", {
    righeTitolo: 3,
    righeClaim: 2,
    fondoBlocco: 1172,
    // `Logo` è alto quanto la sua immagine: 54 px a scala 1.
    marchio: { y: 1212, altezza: 54, scala: 1 },
  }),
  story: costruisciGeometria("story", {
    righeTitolo: 2,
    righeClaim: 1,
    fondoBlocco: 1460,
    /*
     * Scala 1, non 1.1 come proposto nel contratto: a 1.1 il marchio è alto
     * 59,4 px e, ancorato a 1500, lascerebbe 20,6 px alla fascia dello sticker,
     * sotto i 21 richiesti. Fra una proposta grafica e una distanza di
     * sicurezza vince la distanza.
     */
    marchio: { y: 1500, altezza: 54, scala: 1 },
  }),
});

/**
 * Le due fasce che l'interfaccia di Instagram occupa nella Story.
 *
 * `zonaSticker.dalBasso` è la distanza del bordo **superiore** della fascia dal
 * fondo della tela, e `altezza` si estende verso il basso:
 *
 *     alto  = 1920 − 340 = 1580
 *     basso = 1580 + 180 = 1760
 *
 * Il bordo superiore coincide al pixel con la fine dell'area utile (260 + 1320).
 * L'interpretazione opposta — la fascia a 1400…1580, cioè *dentro* l'area utile
 * — va esclusa: `dentroAreaSicura` dichiarerebbe valido per il contenuto un
 * rettangolo che il contratto dichiara da lasciare libero, e due regole
 * direbbero il contrario sullo stesso pixel.
 */
export const ZONE_INSTAGRAM = Object.freeze({
  sticker: Object.freeze({
    x: 0,
    y: FORMATI.story.altezza - FORMATI.story.zonaSticker.dalBasso,
    larghezza: FORMATI.story.larghezza,
    altezza: FORMATI.story.zonaSticker.altezza,
  }),
  risposta: Object.freeze({
    x: 0,
    y:
      FORMATI.story.altezza -
      FORMATI.story.zonaSticker.dalBasso +
      FORMATI.story.zonaSticker.altezza,
    larghezza: FORMATI.story.larghezza,
    altezza:
      FORMATI.story.zonaSticker.dalBasso - FORMATI.story.zonaSticker.altezza,
  }),
});

/**
 * I rettangoli che il futuro pre-flight dovrà verificare.
 *
 * Nessuna misura, nessun DOM: numeri deterministici, gli stessi che i template
 * usano per posizionare. Se i due divergessero, la prova se ne accorgerebbe.
 */
export function rettangoli(formato) {
  const g = GEOMETRIA[formato];
  if (!g) throw new Error(`Formato TOUR sconosciuto: ${formato}`);
  const larghezza = g.area.larghezza;
  return Object.freeze({
    intestazione: { x: g.area.x, y: g.intestazione.y, larghezza, altezza: g.intestazione.altezza },
    kicker: { x: g.area.x, y: g.righe.kicker.y, larghezza, altezza: g.righe.kicker.altezza },
    titolo: { x: g.area.x, y: g.righe.titolo.y, larghezza, altezza: g.righe.titolo.altezza },
    claim: { x: g.area.x, y: g.righe.claim.y, larghezza, altezza: g.righe.claim.altezza },
    filo: { x: g.area.x, y: g.righe.filo.y, larghezza, altezza: g.righe.filo.altezza },
    dati: { x: g.area.x, y: g.righe.dati.y, larghezza, altezza: g.righe.dati.altezza },
    cta: { x: g.area.x, y: g.righe.cta.y, larghezza, altezza: g.righe.cta.altezza },
    marchio: { x: g.area.x, y: g.marchio.y, larghezza, altezza: g.marchio.altezza },
  });
}

/** Vero se ogni rettangolo del formato sta dentro l'area di sicurezza. */
export function tuttoDentroAreaSicura(formato) {
  return Object.entries(rettangoli(formato))
    .map(([nome, r]) => ({ nome, ...dentroAreaSicura(formato, r) }))
    .filter((e) => !e.dentro);
}

/* ================================================================== *
 * I dati
 * ================================================================== */

/**
 * L'ordine con cui si scelgono i dati da mostrare, per formato.
 *
 * È **fisso**: a parità di bozza la grafica è sempre la stessa, e chi la guarda
 * non deve chiedersi perché oggi compare il prezzo e ieri no. `area` e `mezzo`
 * stanno in fondo perché l'adapter del sito li lascia legittimamente vuoti
 * (§17.2): sono ripieghi veri, non dati di prima scelta.
 */
export const PRIORITA = Object.freeze({
  post: Object.freeze(["durata", "km", "livello", "periodo", "prezzo", "sterrato", "area", "mezzo"]),
  story: Object.freeze(["durata", "livello", "km", "periodo", "prezzo"]),
});

/** Quanti dati mostra un formato, e quanti gliene servono per essere completo. */
export const QUANTI_DATI = Object.freeze({
  post: Object.freeze({ massimo: 3, minimo: 2 }),
  story: Object.freeze({ massimo: 2, minimo: 1 }),
});

/**
 * L'etichetta di un campo. È una **costante del campo**, non del valore.
 *
 * Derivarla dal valore — «3 GIORNI» → «GIORNI» — produrrebbe etichette diverse
 * per lo stesso dato a seconda di come è scritto, e su due grafiche vicine si
 * leggerebbe come se fossero due dati diversi.
 */
export const ETICHETTE = Object.freeze({
  durata: "DURATA",
  km: "KM",
  livello: "LIVELLO",
  periodo: "PERIODO",
  prezzo: "PREZZO",
  sterrato: "STERRATO",
  area: "AREA",
  mezzo: "MEZZO",
});

const valorizzato = (v) => typeof v === "string" && v.trim() !== "";

/**
 * I dati da mostrare, già scelti e nell'ordine in cui vanno disegnati.
 *
 * Il valore esce **così com'è nella bozza**, senza unità aggiunte, senza
 * arrotondamenti e senza conversioni: se il sito scrive `"240 km"` si legge
 * `240 km`, se scrive `"240"` si legge `240`. Aggiungere l'unità mancante
 * significherebbe scrivere un dato e farlo sembrare importato.
 *
 * @returns {Array<{campo: string, valore: string, etichetta: string}>}
 */
export function datiVisibili(fattuali, formato) {
  const priorita = PRIORITA[formato];
  if (!priorita) throw new Error(`Formato TOUR sconosciuto: ${formato}`);
  return priorita
    .filter((campo) => valorizzato(fattuali?.[campo]))
    .slice(0, QUANTI_DATI[formato].massimo)
    .map((campo) => ({
      campo,
      valore: fattuali[campo].trim(),
      etichetta: ETICHETTE[campo],
    }));
}

/**
 * Larghezza di una colonna dati.
 *
 * Le celle restano uguali fra loro e riempiono l'area utile: due dati non
 * lasciano un buco a destra, che leggerebbe come un dato mancante.
 */
export function larghezzaColonna(formato, quanti) {
  const g = GEOMETRIA[formato];
  if (!g) throw new Error(`Formato TOUR sconosciuto: ${formato}`);
  if (quanti < 1) return 0;
  return (g.area.larghezza - RESPIRO.colonne * (quanti - 1)) / quanti;
}

export const GAP_COLONNE = RESPIRO.colonne;
export const RESPIRO_BLOCCO_MARCHIO = RESPIRO.blocoMarchio;

/* ================================================================== *
 * Le fotografie
 * ================================================================== */

/**
 * Quale fotografia disegna la Story, e se è la propria o un ripiego.
 *
 * Il ripiego sulla cover è **solo di rendering**: `slotDellaRubricaPieno`
 * continua a dire che lo slot Story è vuoto, perché lo è, e la Media Library
 * non racconta di avere una fotografia che nessuno ha scelto. Chi ripiega lo
 * dichiara, così il futuro pre-flight può trasformarlo in un avviso:
 * l'inquadratura della cover è pensata per il 4:5 e qui finisce su una tela 9:16.
 */
export function fotoDellaStory({ media, sorgenteStory, sorgenteCover }) {
  if (slotDellaRubricaPieno(CATEGORIA, media, "story") && sorgenteStory) {
    return {
      sorgente: sorgenteStory,
      ritaglio: leggiSlotDellaRubrica(CATEGORIA, media, "story"),
      ripiego: false,
    };
  }
  const cover = conRipiegoCoverDellaRubrica(CATEGORIA, media, "story");
  if (cover && sorgenteCover) {
    return { sorgente: sorgenteCover, ritaglio: cover, ripiego: true };
  }
  return { sorgente: null, ritaglio: null, ripiego: false };
}

/** La fotografia del Post: la cover, e nient'altro. Nessun ripiego. */
export function fotoDelPost({ media, sorgenteCover }) {
  const cover = leggiSlotDellaRubrica(CATEGORIA, media, "cover");
  if (cover?.idBlob && sorgenteCover) {
    return { sorgente: sorgenteCover, ritaglio: cover, ripiego: false };
  }
  return { sorgente: null, ritaglio: cover || null, ripiego: false };
}
