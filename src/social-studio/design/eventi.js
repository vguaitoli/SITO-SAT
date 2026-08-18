/**
 * Sistema visuale EVENTI, tradotto dal progetto Claude Design.
 *
 * **Fonte primaria e vincolante:** il progetto Claude Design «La via dei
 * giganti» (`027c20d9-bd4b-4afc-b0c9-3d770f26185c`), file
 * `Locandina-Via-dei-Giganti.dc.html`, letto tramite `DesignSync`.
 * Ogni valore qui sotto è trascritto da quel file, non ricostruito a occhio;
 * accanto a ciascuno c'è la dichiarazione da cui viene.
 *
 * Il PNG esportato (`post-instagram-1080x1350-2.png`, master 2160×2700 a 2×)
 * serve a giudicare il risultato, non a fornire i parametri.
 *
 * **Perché un modulo e non il file .dc.html incorporato.** Il `.dc.html` è un
 * documento: una fotografia sola, un evento solo, coordinate trascinate a mano
 * nell'editor. Qui serve un sistema che regga qualsiasi evento e qualsiasi
 * fotografia mantenendo la stessa atmosfera. Quindi: i colori diventano token,
 * i tre mood una configurazione, il velo una funzione della fotografia, le
 * posizioni una griglia dichiarata.
 *
 * Questi valori sono identità: il Brand Lock li protegge come `palette`,
 * `font`, `scalaTipografica`, `strutturaTemplate`, `proporzioni` e `areaSicura`.
 * Non passano dall'editor.
 */

import { COLORI } from "./tokens";

/* ================================================================== *
 * Tela e griglia
 * ================================================================== */

/** `<doc-page width="1080px" height="1350px">` e `padding: 58px 62px 52px`. */
export const TELA = {
  larghezza: 1080,
  altezza: 1350,
  padding: { alto: 58, destro: 62, basso: 52, sinistro: 62 },
};

/**
 * Allineamento ottico dei testi grandi.
 *
 * Nel riferimento titolo, claim e kicker non stanno sul margine di 62: stanno
 * a 46, 53 e 45. Non è un errore di trascinamento ripetuto tre volte — è
 * l'allineamento ottico che i caratteri display richiedono, perché una lettera
 * come «L» appare rientrata se il suo bordo coincide col margine.
 */
export const OTTICO = { titolo: 46, claim: 53, kicker: 45 };

/**
 * Ordinate dei blocchi, in coordinate di tela.
 *
 * Il riferimento le ottiene con `justify-content: space-between` più tre
 * posizionamenti assoluti dentro l'editor. Tradotte in ordinate esplicite
 * perché una composizione che dipende dall'altezza dei suoi figli cambia
 * quando cambia il contenuto, e qui l'atmosfera deve restare costante.
 */
export const ORDINATE = {
  /** Riga marchio + badge: parte dal padding alto. */
  intestazione: 58,
  /** Kicker: `top: 328px` nel riferimento. */
  kicker: 328,
  /** Titolo: `top: -195px` rispetto allo slot centrale, cioè 392 sulla tela. */
  titolo: 392,
  /** Claim: `top: 681px`. */
  claim: 681,
  /** Blocco dati: finisce sul padding basso, 1298. */
  datiFine: 1298,
};

/* ================================================================== *
 * Colori
 * ================================================================== */

/** `background: #14120F` della sezione. È il nero caldo sotto tutto. */
export const FONDO = "#14120F";

/**
 * Gli inchiostri del riferimento.
 *
 * Quattro, non tre: il claim sta su velo e ha un avorio proprio, più chiaro
 * del testo secondario e meno del primario.
 */
export const INCHIOSTRO = {
  /** Titolo, valori dei dati, itinerario, sito nel piede. */
  primario: "#F7F0E6",
  /** Etichette, payoff del marchio, «POSTI LIMITATI», inclusi, piede. */
  secondario: "#B4A691",
  /** Claim, sopra il velo. */
  suVelo: "#DCD1BF",
  /** Etichetta del kicker. */
  kicker: "#E4DACB",
};

/** `border-top: 1px solid rgba(228,218,203,.24)`. */
export const FILO = "rgba(228,218,203,.24)";

/**
 * Accento EVENTI — **una sola fonte di verità**.
 *
 * Il valore vive in `COLORI.accentoEventi` e viene dal progetto Claude Design
 * (prop `accent`, default `#E08A3C`). Qui si ri-esporta col nome che il sistema
 * EVENTI usa, senza duplicarlo: Post, Story, carosello, primitive e controlli
 * dell'editor leggono tutti lo stesso token.
 *
 * La dipendenza va in un verso solo — `eventi.js` → `tokens.js` — perché i
 * token globali sono la base e non possono dipendere da una rubrica.
 */
export const ACCENTO = COLORI.accentoEventi;

/**
 * Le alternative offerte dall'editor del progetto.
 *
 * La prima è l'accento in uso: se il token cambia, l'elenco lo segue invece di
 * contraddirlo.
 */
export const ACCENTI = [ACCENTO, "#C25A18", "#D9C27E", "#8FA36B"];

/* ================================================================== *
 * Mood: fotografia e velo cambiano insieme
 * ================================================================== */

/**
 * I tre mood del riferimento.
 *
 * Un mood è una coppia: filtro sulla fotografia e velo sopra di essa. Non sono
 * separabili — il velo di «Polvere» è caldo perché la fotografia sotto è virata
 * seppia, e usarne uno senza l'altro dà un grigio sporco.
 *
 * **Il velo è la ragione per cui il fondo non è un colore.** Quel grigio caldo
 * che si vede al centro della locandina è fotografia desaturata più velo al 34%
 * in quel punto: cambiando fotografia cambia il grigio, e restano costanti
 * leggibilità, atmosfera e gerarchia. Nessun `background` lo riproduce.
 */
export const MOOD = {
  Notte: {
    nome: "Notte",
    filtroFoto: "grayscale(.28) contrast(1.06) saturate(.9)",
    velo:
      "linear-gradient(180deg, rgba(20,18,15,.78) 0%, rgba(20,18,15,.34) 26%, " +
      "rgba(20,18,15,.72) 52%, rgba(20,18,15,.96) 76%, rgba(20,18,15,1) 100%)",
  },
  Polvere: {
    nome: "Polvere",
    filtroFoto: "sepia(.4) saturate(1.1) contrast(1.08)",
    velo:
      "linear-gradient(180deg, rgba(28,20,12,.74) 0%, rgba(70,40,16,.26) 28%, " +
      "rgba(20,18,15,.78) 54%, rgba(20,18,15,.97) 78%, rgba(20,18,15,1) 100%)",
  },
  Inchiostro: {
    nome: "Inchiostro",
    filtroFoto: "grayscale(1) contrast(1.14)",
    velo:
      "linear-gradient(180deg, rgba(16,15,13,.88) 0%, rgba(16,15,13,.6) 30%, " +
      "rgba(16,15,13,.86) 58%, rgba(16,15,13,1) 82%)",
  },
};

export const MOOD_PREDEFINITO = "Notte";
export const ELENCO_MOOD = Object.keys(MOOD);

/** Il mood richiesto, o quello predefinito. Mai un mood inventato. */
export function mood(nome) {
  return MOOD[nome] || MOOD[MOOD_PREDEFINITO];
}

/* ================================================================== *
 * Fotografia
 * ================================================================== */

/**
 * La fotografia occupa tutta la tela: `position: absolute; inset: 0;
 * object-fit: cover; object-position: 50% 42%`.
 *
 * Nel riferimento c'è anche `transform: scaleX(-1)`, ma è una scelta su
 * *quella* fotografia — serviva a portare la luce dall'altro lato. Non diventa
 * una regola: `specchiata` è un dato del ritaglio, spento per definizione.
 */
export const FOTO = {
  posizione: { x: 0.5, y: 0.42 },
  specchiataPerDefault: false,
  /** `box-shadow: 0px 4px 12px 0px #1813133C` sull'immagine di fondo. */
  ombra: "0px 4px 12px 0px #1813133C",
};

/* ================================================================== *
 * Mappa decorativa
 * ================================================================== */

/**
 * La traccia sopra la fotografia, sotto il velo.
 *
 * `mix-blend-mode: luminosity` è il punto: la mappa non colora, schiarisce.
 * Così resta leggibile su qualsiasi fotografia senza diventare un disegno
 * sovrapposto. La maschera radiale la fa sfumare prima dei bordi.
 *
 * Il file dichiara due maschere, una con prefisso `-webkit-` a `100% 78%` e la
 * standard a `120% 100%`: vale la standard, che è quella che i browser
 * applicano.
 */
export const MAPPA = {
  opacita: 0.22,
  opacitaMin: 0,
  opacitaMax: 0.6,
  passo: 0.02,
  fusione: "luminosity",
  maschera: "radial-gradient(120% 100% at 50% 42%, #000 32%, rgba(0,0,0,.35) 66%, transparent 60%)",
  /** `left: -105px; top: -7px; width: 1335px; height: 848px`. */
  riquadro: { sinistra: -105, alto: -7, larghezza: 1335, altezza: 848 },
  ombra: "0px 4px 12px 0px #23201E26",
};

/* ================================================================== *
 * Scala tipografica
 * ================================================================== */

/**
 * Le tre famiglie, con i ruoli che il riferimento assegna.
 *
 * Oswald non è solo per le etichette: nel riferimento porta anche i **valori**
 * dei dati (500, 27px) e l'itinerario. Bebas resta ai titoli e Montserrat al
 * corpo. È la divisione che i template precedenti non rispettavano.
 */
export const TIPO = {
  titolo: {
    famiglia: '"Bebas Neue", system-ui, sans-serif',
    taglie: { Enorme: 150, Grande: 132, Contenuto: 116 },
    tagliaPredefinita: "Grande",
    tracking: "0.015em",
    interlinea: 0.84,
    ombra: "0 8px 40px rgba(0,0,0,.55)",
  },
  kicker: { famiglia: '"Oswald", system-ui, sans-serif', corpo: 20, tracking: "0.3em" },
  badge: { famiglia: '"Oswald", system-ui, sans-serif', corpo: 30, tracking: "0.2em" },
  posti: { famiglia: '"Oswald", system-ui, sans-serif', corpo: 13, tracking: "0.2em" },
  marchioNome: {
    famiglia: '"Bebas Neue", system-ui, sans-serif',
    corpo: 30, tracking: "0.06em", interlinea: 1.06,
  },
  marchioPayoff: { famiglia: '"Oswald", system-ui, sans-serif', corpo: 12, tracking: "0.26em" },
  etichettaDato: { famiglia: '"Oswald", system-ui, sans-serif', corpo: 12, tracking: "0.24em" },
  valoreDato: {
    famiglia: '"Oswald", system-ui, sans-serif',
    corpo: 27, peso: 500, tracking: "0.02em",
  },
  itinerario: {
    famiglia: '"Oswald", system-ui, sans-serif',
    corpo: 23, tracking: "0.08em", interlinea: 1.35,
  },
  claim: {
    famiglia: '"Montserrat", system-ui, sans-serif',
    corpo: 26, peso: 300, interlinea: 1.4,
    /** `text-align: justify` nel riferimento, sia sul claim sia sull'itinerario. */
    allineamento: "justify",
  },
  inclusi: {
    famiglia: '"Montserrat", system-ui, sans-serif',
    corpo: 19, peso: 300, interlinea: 1.45,
  },
  piede: { famiglia: '"Montserrat", system-ui, sans-serif', corpo: 17 },
};

/* ================================================================== *
 * Blocchi
 * ================================================================== */

/** Lockup del marchio: logo, nome su due righe, payoff. */
export const MARCHIO = {
  logo: { larghezza: 144, altezza: 124 },
  ombraLogo: "drop-shadow(0 6px 20px rgba(0,0,0,.65))",
  distanzaLogoTesto: 16,
  distanzaNomePayoff: 5,
  nome: ["Sardegna Trail", "Avventura"],
  payoff: "LA SARDEGNA CHE NON TI ASPETTI",
};

/** Badge della disciplina: riquadro vuoto col bordo in accento. */
export const BADGE = {
  larghezza: 203,
  altezza: 62,
  padding: "8px 15px",
  bordo: 1,
  distanzaPosti: 8,
};

/** Kicker: barra piena in accento più etichetta spaziata. */
export const KICKER = {
  barra: { larghezza: 56, altezza: 8 },
  distanza: 18,
};

/** Fascia dei dati: quattro colonne fra due filetti. */
export const DATI = {
  larghezza: 958,
  altezzaContenuto: 58,
  paddingVerticale: 20,
  distanzaColonne: 28,
  distanzaEtichettaValore: 5,
  /** Le quattro colonne del riferimento, nell'ordine. */
  colonne: ["DATE", "PARTENZA", "STERRATO", "LIVELLO"],
};

/** Itinerario e servizi inclusi, sulla stessa riga. */
export const ITINERARIO = {
  larghezza: 961,
  altezza: 103,
  distanzaEtichettaValore: 14,
  etichetta: "L'ANELLO IN QUATTRO TAPPE",
  inclusi: { sinistra: 522, alto: -3, larghezza: 436, altezza: 120 },
};

/** Piede: contatti a sinistra, sito a destra, sopra un filetto. */
export const PIEDE = { paddingSopra: 18 };

/** Distanza fra i blocchi del piede della composizione. */
export const DISTANZA_BLOCCHI = 30;

/**
 * Elementi del riferimento che questo sistema **non** introduce.
 *
 * Serve a rendere verificabile l'assenza: se un giorno comparissero, si saprà
 * che non vengono da qui.
 */
export const ASSENTI = [
  "vignettatura laterale",
  "texture",
  "cornici",
  "marcatore di rubrica in alto",
  "numerazione delle slide",
];
