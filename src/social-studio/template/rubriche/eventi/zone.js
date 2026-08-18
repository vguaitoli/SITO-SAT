/**
 * Le zone in cui una fotografia viene realmente ritagliata.
 *
 * Il punto focale non produce un ritaglio 4:5: produce **tanti** ritagli
 * diversi, uno per ogni fascia in cui la stessa immagine viene inserita. La
 * fascia del Post è larga e bassa, quella della Story quasi quadrata, quella
 * della CTA ancora più schiacciata: lo stesso punto focale dà tre inquadrature
 * che non si assomigliano.
 *
 * Le misure vivono qui e non nei template, perché l'editor di ritaglio deve
 * mostrare esattamente ciò che il template disegnerà. Se stessero scritte due
 * volte, prima o poi divergerebbero e l'anteprima mentirebbe.
 */

/** Altezza della fascia fotografica, per formato. */
export const FASCIA = {
  /**
   * Post: **tutta la tela**.
   *
   * Il riferimento canonico mette la fotografia a pieno campo con un velo
   * sopra, non in una fascia alta. Il valore resta dichiarato perché la slide
   * 01 del carosello usa ancora la fascia da 700 — allineare il carosello
   * appartiene al capitolo successivo.
   */
  post: 1350,
  /**
   * Story 1080×1920: 940 px, il 49%.
   *
   * Era 1040. La Story porta titolo, claim, tre dati, prezzo e CTA in uno
   * spazio che i 340 px riservati all'interfaccia di Instagram accorciano già
   * molto: con la fascia a 1040 il testo non ci stava e i blocchi si
   * sovrapponevano. Cento pixel tolti alla fotografia li risolvono senza
   * rimpicciolire la tipografia.
   */
  story: 940,
  /** Slide 01 del carosello: è la locandina, identica al Post. */
  caroselloCover: 700,
  /** Slide 08, prezzo e CTA: la fascia si accorcia per far posto ai dati. */
  caroselloCta: 560,
};

/** La griglia fotografica della slide 05 «Cosa vivrai». */
export const GRIGLIA_ESPERIENZA = {
  /** Larghezza utile del carosello meno i due gutter da 60. */
  larghezzaUtile: 960,
  distanza: 10,
  /** Con tre o quattro fotografie: due righe da 250. */
  rigaBassa: 250,
  /** Con una o due: una riga sola, più alta. */
  rigaAlta: 420,
};

/** Larghezza di una cella della griglia 2×N della slide 05. */
export const CELLA_ESPERIENZA =
  (GRIGLIA_ESPERIENZA.larghezzaUtile - GRIGLIA_ESPERIENZA.distanza) / 2;

const LARGHEZZA_TELA = 1080;

/**
 * Le zone in cui finisce la fotografia di uno slot.
 *
 * @param {string} slot  "cover" | "cta" | "esperienza-N"
 * @returns {{id: string, nome: string, larghezza: number, altezza: number}[]}
 */
export function zonePerSlot(slot) {
  if (slot === "cover") {
    return [
      { id: "post", nome: "Post · pieno campo", larghezza: LARGHEZZA_TELA, altezza: FASCIA.post },
      { id: "story", nome: "Story · fascia foto", larghezza: LARGHEZZA_TELA, altezza: FASCIA.story },
      { id: "carosello-01", nome: "Carosello 01 · fascia", larghezza: LARGHEZZA_TELA, altezza: FASCIA.caroselloCover },
    ];
  }
  if (slot === "cta") {
    return [
      { id: "carosello-08", nome: "Carosello 08 · CTA", larghezza: LARGHEZZA_TELA, altezza: FASCIA.caroselloCta },
    ];
  }
  if (String(slot).startsWith("esperienza")) {
    return [
      { id: "griglia-4", nome: "Slide 05 · griglia da 4", larghezza: CELLA_ESPERIENZA, altezza: GRIGLIA_ESPERIENZA.rigaBassa },
      { id: "griglia-2", nome: "Slide 05 · griglia da 2", larghezza: CELLA_ESPERIENZA, altezza: GRIGLIA_ESPERIENZA.rigaAlta },
    ];
  }
  return [];
}

/**
 * Banda bassa riservata al marchio, nelle slide che lo mostrano.
 *
 * Misurata sul PNG a 1080×1350: il marchio occupa da 1228 a 1282 px, cioè una
 * banda alta 122 px dal fondo. Il corpo delle slide arrivava a 1294 e gli
 * finiva sopra — il nome delle tappe passava sotto il logo. Non è una
 * questione di gusto: due cose diverse disegnate nello stesso posto.
 *
 * 150 px lasciano 28 px di respiro sopra il marchio.
 */
export const BANDA_MARCHIO = 150;
