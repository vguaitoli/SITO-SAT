import { COLORI } from "./tokens";

/**
 * Sistema visuale della Story EVENTI, tradotto dal progetto Claude Design.
 *
 * **Fonte vincolante:** `Stories-Via-dei-Giganti.dc.html` del progetto
 * «La via dei giganti» (`027c20d9-bd4b-4afc-b0c9-3d770f26185c`), letto con
 * `DesignSync`. Struttura, geometria, colori, tipografia e sequenza vengono da
 * lì; `doc-page.js` e `support.js` sono stati letti per capire come il progetto
 * rende, ma sono impianto e non entrano qui né come codice né come dipendenza.
 *
 * **Sei schermate, in sequenza fissa.** Non è un Post allungato: ogni schermata
 * ha fondo, velo, inquadratura e ritmo propri. Il fondo non è uno — sono
 * quattro, e la 03 è su carta chiara.
 *
 * Nulla dell'evento è scritto qui: i testi vengono dai campi editoriali, i
 * numeri dai dati del sito, le fotografie dalla Media Library, il percorso dal
 * GPX locale. Il riferimento fornisce la forma, non il contenuto.
 */

/* ================================================================== *
 * Tela
 * ================================================================== */

export const TELA_STORY = { larghezza: 1080, altezza: 1920 };

/** Le sei schermate canoniche, nell'ordine. L'ordine è il format. */
export const SCHERMATE = [
  { id: "cover", numero: 1, file: "01-cover.png", nome: "Cover" },
  { id: "numeri", numero: 2, file: "02-numeri.png", nome: "Numeri" },
  { id: "mappa", numero: 3, file: "03-mappa.png", nome: "Mappa" },
  { id: "tappe", numero: 4, file: "04-tappe.png", nome: "Tappe" },
  { id: "incluso", numero: 5, file: "05-incluso.png", nome: "Incluso" },
  { id: "prenota", numero: 6, file: "06-prenota.png", nome: "Prenota" },
];

/* ================================================================== *
 * Fondi e inchiostri
 * ================================================================== */

/**
 * Quattro fondi diversi, non uno.
 *
 * Il fondo è la firma della schermata: `#17140F` della 04 non è un errore di
 * trascrizione di `#14120F`, e la 03 è deliberatamente su carta.
 */
export const FONDO = {
  scuro: "#14120F",
  scuroTappe: "#17140F",
  chiaro: "#E9E2D6",
};

/** Inchiostri sul fondo scuro. */
export const INCHIOSTRO = {
  primario: "#F7F0E6",
  secondario: "#B4A691",
  suVelo: "#DCD1BF",
  incluso: "#E4DACB",
  /** Etichette molto smorzate: il kicker della cover. */
  tenue: "#736652",
};

/**
 * Il payoff del marchio non usa il colore del riferimento.
 *
 * Il progetto Claude Design scrive `#574F40` sotto il nome. Su quella
 * fotografia funziona: è scura proprio lì. La Media Library, però, non
 * garantisce niente del genere — su una cover luminosa quel grigio-bruno
 * scompare, e il payoff diventa una riga che c'è nel DOM e non nell'immagine.
 *
 * Vale `#B4A691`, che è già `INCHIOSTRO.secondario`: nessun token nuovo, un
 * colore della palette canonica. È un adattamento deliberato, non una
 * trascrizione sbagliata — il format deve reggere fotografie diverse da quella
 * del progetto, e la fedeltà a un valore che sparisce non è fedeltà.
 */
export const PAYOFF_RIFERIMENTO = "#574F40";
export const COLORE_PAYOFF = INCHIOSTRO.secondario;

/** Inchiostri sulla schermata chiara: la 03 ha una palette propria. */
export const INCHIOSTRO_CHIARO = {
  primario: "#1F1B16",
  corpo: "#4A4034",
  etichetta: "#7A6A55",
};

export const FILO = "rgba(228,218,203,.2)";
export const FILO_CHIARO = "rgba(31,27,22,.28)";
export const FILO_SCORRI = "rgba(228,218,203,.4)";

/** Un solo accento, quello del progetto, letto dal token unico. */
export const ACCENTO = COLORI.accentoEventi;

/* ================================================================== *
 * Mood: quelli della Story non sono quelli del Post
 * ================================================================== */

/**
 * I tre mood della Story.
 *
 * Diversi da quelli della locandina: al posto di «Notte» c'è «Naturale», e
 * anche «Polvere» ha valori propri. Solo «Inchiostro» coincide. I due insiemi
 * restano separati perché unirli sarebbe una decisione grafica, non una
 * deduzione.
 *
 * Il riferimento si contraddice: la prop dichiara `default: "Inchiostro"`, il
 * codice ricade su `Naturale`. Vale `Naturale`, e lo si dichiara.
 */
export const MOOD_STORY = {
  Naturale: { nome: "Naturale", filtroFoto: "saturate(.92) contrast(1.08)" },
  Polvere: { nome: "Polvere", filtroFoto: "sepia(.3) saturate(1.12) contrast(1.08)" },
  Inchiostro: { nome: "Inchiostro", filtroFoto: "grayscale(1) contrast(1.14)" },
};

export const MOOD_STORY_PREDEFINITO = "Naturale";
export const ELENCO_MOOD_STORY = Object.keys(MOOD_STORY);

export function moodStory(nome) {
  return MOOD_STORY[nome] || MOOD_STORY[MOOD_STORY_PREDEFINITO];
}

/* ================================================================== *
 * Veli: uno per schermata
 * ================================================================== */

const scuro = (a) => `rgba(20,18,15,${a})`;
const carta = (a) => `rgba(233,226,214,${a})`;

/**
 * I gradienti, uno per schermata.
 *
 * Non sono varianti dello stesso velo. La cover si apre scura, si schiarisce
 * fra il 22% e il 40% per lasciare respirare la fotografia, e richiude in
 * fondo: è quel varco a metà che fa sembrare la foto più luminosa di quanto
 * sia.
 */
export const VELO = {
  cover: `linear-gradient(180deg, ${scuro(".72")} 0%, ${scuro(".12")} 22%, ${scuro(".1")} 40%, ${scuro(".74")} 62%, ${scuro(".97")} 82%, ${FONDO.scuro} 100%)`,
  numeri: `linear-gradient(180deg, ${scuro(".5")} 0%, ${scuro("0")} 34%, ${scuro(".9")} 88%, ${FONDO.scuro} 100%)`,
  mappa: `linear-gradient(180deg, ${carta(".92")} 0%, ${carta(".2")} 20%, ${carta("0")} 46%, ${carta(".86")} 76%, ${FONDO.chiaro} 92%)`,
  incluso: `linear-gradient(180deg, ${scuro(".55")} 0%, ${scuro(".05")} 30%, ${scuro(".85")} 86%, ${FONDO.scuro} 100%)`,
  prenota: `linear-gradient(180deg, ${scuro(".68")} 0%, ${scuro(".18")} 24%, ${scuro(".82")} 54%, ${scuro(".99")} 76%, ${FONDO.scuro} 100%)`,
};

/* ================================================================== *
 * Fotografia
 * ================================================================== */

/**
 * Come ogni schermata inquadra la propria fotografia.
 *
 * `altezza: null` significa piena tela. Le fasce della 02 e della 05 hanno
 * un'altezza dichiarata, e sono quelle le zone che l'editor di ritaglio deve
 * mostrare.
 *
 * `filtro` fisso dove il riferimento lo fissa; `mood` dove segue il mood.
 * Il ribaltamento è un dato del ritaglio, spento per definizione: nel
 * riferimento è una scelta su quella fotografia, non una regola del format.
 */
export const FOTO_SCHERMATA = {
  cover: { altezza: null, posizione: { x: 0.5, y: 0.58 }, filtro: "mood" },
  numeri: { altezza: 620, posizione: { x: 0.5, y: 0.78 }, filtro: "saturate(.9) contrast(1.06)" },
  incluso: { altezza: 560, posizione: { x: 0.5, y: 0.3 }, filtro: "saturate(.88) contrast(1.05)" },
  prenota: { altezza: null, posizione: { x: 0.5, y: 0.46 }, filtro: "mood" },
};

/**
 * La mappa della 03.
 *
 * Nel riferimento è un PNG largo 1240 centrato a `50% / 46%`. Qui la stessa
 * geometria ospita la traccia disegnata dal GPX locale: nessuna immagine del
 * progetto entra nell'app.
 */
export const MAPPA_STORY = {
  larghezza: 1240,
  /*
   * 930, non 1240. Il riferimento dichiara solo `width: 1240px` e lascia
   * l'altezza automatica: l'immagine sorgente è 2400×1800, quindi il riquadro
   * reale è 1240×930. Avevo supposto un quadrato — leggere il binario ha
   * corretto la supposizione.
   */
  altezza: 930,
  centro: { x: 0.5, y: 0.46 },
  /** Lo stato finale del ken burns, che in stampa è quello che si vede. */
  scalaRiferimento: 1.06,
};

/* ================================================================== *
 * Geometria delle schermate
 * ================================================================== */

/** Padding per schermata: `[alto, laterale, basso]`. */
export const PADDING = {
  cover: { alto: 190, laterale: 80, basso: 200 },
  numeri: { alto: 0, laterale: 80, basso: 200 },
  mappa: { alto: 190, laterale: 80, basso: 200 },
  tappe: { alto: 220, laterale: 80, basso: 220 },
  incluso: { alto: 0, laterale: 80, basso: 200 },
  prenota: { alto: 190, laterale: 80, basso: 200 },
};

/**
 * Il padding basso da 200 non è margine grafico: è l'area che l'interfaccia
 * di Instagram copre col campo «rispondi» e con lo sticker del link. Il
 * riferimento lo tiene libero su ogni schermata.
 */
export const ZONA_STICKER = 200;

/* ================================================================== *
 * Tipografia
 * ================================================================== */

const BEBAS = '"Bebas Neue", system-ui, sans-serif';
const OSWALD = '"Oswald", system-ui, sans-serif';
const MONTSERRAT = '"Montserrat", system-ui, sans-serif';

export const TIPO_STORY = {
  titoloCover: { famiglia: BEBAS, corpo: 168, tracking: "0.015em", interlinea: 0.84, ombra: "0 10px 50px rgba(0,0,0,.7)" },
  titoloSchermata: { famiglia: BEBAS, corpo: 104, interlinea: 0.88 },
  titoloTappe: { famiglia: BEBAS, corpo: 100, interlinea: 0.88 },
  valoreDato: { famiglia: BEBAS, corpo: 80, interlinea: 0.95 },
  valoreDatoLungo: { famiglia: BEBAS, corpo: 64, interlinea: 1 },
  valoreMappa: { famiglia: BEBAS, corpo: 58, interlinea: 1 },
  numeroTappa: { famiglia: BEBAS, corpo: 62, interlinea: 1, larghezza: 74 },
  prezzo: { famiglia: BEBAS, corpo: 150, interlinea: 0.9 },
  marchioNome: { famiglia: BEBAS, corpo: 34, tracking: "0.06em", interlinea: 1.05 },

  kicker: { famiglia: OSWALD, corpo: 24, tracking: "0.28em" },
  etichettaSezione: { famiglia: OSWALD, corpo: 20, tracking: "0.28em" },
  etichettaDato: { famiglia: OSWALD, corpo: 18, tracking: "0.24em" },
  etichettaMappa: { famiglia: OSWALD, corpo: 17, tracking: "0.24em" },
  badge: { famiglia: OSWALD, corpo: 26, tracking: "0.2em", padding: "12px 22px" },
  data: { famiglia: OSWALD, corpo: 30, tracking: "0.06em" },
  titoloTappa: { famiglia: OSWALD, corpo: 38, tracking: "0.06em" },
  itinerario: { famiglia: OSWALD, corpo: 34, tracking: "0.07em", interlinea: 1.35 },
  posti: { famiglia: OSWALD, corpo: 40, tracking: "0.1em", peso: 600 },
  scorri: { famiglia: OSWALD, corpo: 22, tracking: "0.24em" },
  marchioPayoff: { famiglia: OSWALD, corpo: 15, tracking: "0.26em" },

  claimCover: { famiglia: MONTSERRAT, corpo: 36, peso: 300, interlinea: 1.4, larghezzaMax: 820 },
  corpo: { famiglia: MONTSERRAT, corpo: 32, peso: 300, interlinea: 1.45 },
  corpoMappa: { famiglia: MONTSERRAT, corpo: 30, peso: 300, interlinea: 1.45, larghezzaMax: 800 },
  corpoRequisiti: { famiglia: MONTSERRAT, corpo: 29, peso: 300, interlinea: 1.5 },
  corpoTappa: { famiglia: MONTSERRAT, corpo: 27, peso: 300, interlinea: 1.4 },
  voceInclusi: { famiglia: MONTSERRAT, corpo: 32 },
  notaPrezzo: { famiglia: MONTSERRAT, corpo: 28, peso: 300 },
  piede: { famiglia: MONTSERRAT, corpo: 26 },
};

/* ================================================================== *
 * Blocchi
 * ================================================================== */

export const MARCHIO_STORY = {
  logo: 118,
  logoPrenota: 108,
  distanza: 20,
  distanzaTesto: 7,
  ombra: "drop-shadow(0 6px 20px rgba(0,0,0,.7))",
  nome: ["Sardegna Trail", "Avventura"],
  payoff: "LA SARDEGNA CHE NON TI ASPETTI",
};

export const KICKER_STORY = { barra: { larghezza: 64, altezza: 8 }, distanza: 20 };

/** «SCORRI» con il suo filetto: l'invito a passare alla schermata dopo. */
export const SCORRI = { testo: "SCORRI", filo: { larghezza: 90, altezza: 1 }, distanza: 16 };

/**
 * La griglia dei numeri della 02.
 *
 * `gap: 1px` su un fondo chiaro: **il filetto è lo spazio fra le celle**, non
 * un bordo. Cambiando il gap si cambia lo spessore del filetto.
 */
export const GRIGLIA_NUMERI = {
  colonne: 2,
  spessoreFilo: 1,
  padding: { verticale: 44, orizzontale: 38 },
  distanzaEtichettaValore: 8,
};

/**
 * I quattro stati dei posti, e quanto risalto merita ciascuno.
 *
 * `disponibili` non scrive niente: la scarsità inventata è la peggiore delle
 * bugie commerciali. Gli altri tre invece devono vedersi, e `soldout` più di
 * tutti — una Story che dice «sold out» in corpo piccolo accanto a un prezzo
 * grande è una Story che sembra ancora prenotabile.
 *
 * L'etichetta della scarsità non tocca la CTA: quella la scrive l'autore, e
 * riscrivergliela sarebbe metterle in bocca parole sue.
 */
export const POSTI = {
  disponibili: { etichetta: null, risalto: "nessuno" },
  ultimi: { etichetta: "Posti limitati", risalto: "testo" },
  soldout: { etichetta: "Sold out", risalto: "pieno" },
  attesa: { etichetta: "Lista d'attesa", risalto: "contorno" },
};

/** Lo stato dei posti, con il ripiego su «disponibili». */
export function posti(stato) {
  return POSTI[stato] || POSTI.disponibili;
}

/* ================================================================== *
 * Capienza
 * ================================================================== */

/** Larghezze utili al testo, ricavate dalla tela e dai padding. */
export const LARGHEZZA_UTILE = {
  /** Colonna piena di una schermata: tela meno i due margini laterali. */
  schermata: TELA_STORY.larghezza - 80 * 2,
  /** Colonna di una tappa: la piena meno il numero e il suo spazio. */
  tappa: TELA_STORY.larghezza - 80 * 2 - TIPO_STORY.numeroTappa.larghezza - 28,
};

/**
 * Quanto entra davvero in una schermata.
 *
 * Il riferimento elenca cinque tappe e cinque voci di «incluso», e le
 * schermate sono costruite su quel numero: sei righe non si stringono, escono
 * dalla tela. Prima il template tagliava a cinque con `slice(0, 5)` e non lo
 * diceva a nessuno — il PNG usciva pulito, con tre tappe in meno.
 *
 * Il limite resta, perché è la geometria a imporlo. Quello che cambia è che
 * ora è dichiarato qui, il pre-flight lo controlla, e il taglio si vede prima
 * dell'esportazione invece di scoprirlo pubblicando.
 */
export const CAPIENZA = {
  tappe: 5,
  inclusi: 5,
  /** Righe disponibili al blocco dei requisiti, come da `altezzaMassima`. */
  righeRequisiti: 5,
  /** Righe disponibili alla descrizione di una tappa. */
  righeDescrizioneTappa: 2,
};

/**
 * Larghezza media di un glifo, in frazione del corpo.
 *
 * Una stima, non una misura: serve a decidere quando avvisare **prima** che il
 * template venga montato. La misura vera la fa `TestoAdattivo` sul nodo reale,
 * e le sue segnalazioni restano l'ultima parola.
 */
const FATTORE_GLIFO = 0.52;

/** Quanti caratteri stanno in `righe` righe di uno stile, su una larghezza. */
export function capienzaCaratteri(stile, righe, larghezza = LARGHEZZA_UTILE.schermata) {
  return Math.floor((larghezza / (stile.corpo * FATTORE_GLIFO)) * righe);
}

/** Le etichette fisse delle sezioni. Sono cornice, non contenuto dell'evento. */
export const ETICHETTE = {
  numeri: "IL VIAGGIO IN CIFRE",
  mappa: "IL TRACCIATO",
  tappe: "L'ITINERARIO",
  incluso: "COSA TROVI",
  requisiti: "COSA SERVE A TE",
  prezzo: "QUOTA DI PARTECIPAZIONE",
  durata: "DURATA",
  sterrato: "STERRATO",
  partenza: "PARTENZA",
  livello: "LIVELLO",
  km: "KM",
  tappeConteggio: "TAPPE",
};

/**
 * Elementi del riferimento che questo sistema non introduce.
 *
 * Le animazioni ci sono nel progetto — ken burns e ingresso dei testi — ma
 * `doc-page.js` le azzera in stampa, e una Story esportata è un'immagine
 * ferma. Lo zoom finale del ken burns non viene incorporato: competerebbe con
 * lo zoom del ritaglio, che è dell'utente.
 */
export const ASSENTI_STORY = [
  "animazioni (solo a schermo nel riferimento)",
  "zoom finale del ken burns",
  "vignettatura",
  "numerazione delle schermate",
];
