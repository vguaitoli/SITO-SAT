/**
 * Token grafici di Social Studio.
 *
 * Sono gli stessi valori del sito (src/index.css, tailwind.config.js), fissati
 * qui in numeri assoluti perché le grafiche si disegnano su tele di dimensione
 * reale — 1080×1350 e 1080×1920 — non in unità relative: solo così l'anteprima
 * e il PNG esportato coincidono al pixel.
 *
 * L'unica aggiunta rispetto al sito è `accentoEventi`. La locandina degli
 * eventi usa un arancio più luminoso dell'oxblood del sito, e sul nero dello
 * schermo si legge meglio: resta però confinato alla rubrica EVENTI e non
 * sostituisce l'accento globale.
 *
 * QUESTI VALORI NON SONO CONTENUTO. Cambiarli cambia l'identità di tutti gli
 * eventi passati e futuri, ed è esattamente ciò che il Brand Lock impedisce di
 * fare per distrazione.
 */

export const COLORI = {
  // --- dal sito, invariati ---
  fondo: "#1C1814", // obsidian
  fondoAlt: "#252019", // carbon
  bordoScuro: "#2F2A22", // graphite
  testo: "#F5EBD9", // granite mist
  testoTenue: "rgba(245, 235, 217, 0.72)",
  testoDebole: "rgba(245, 235, 217, 0.5)",
  accento: "#A0612A", // oxblood
  accentoChiaro: "#B87033",
  sabbia: "#E4D4B0", // aeolian sand
  verde: "#6B7A3E", // wild sage, solo CTA di contatto/conferma
  verdeChiaro: "#7E8F4A",
  filo: "rgba(245, 235, 217, 0.16)",
  filoForte: "rgba(245, 235, 217, 0.3)",

  // --- specifico della rubrica EVENTI ---
  accentoEventi: "#E18A3C",

  // --- fondo chiaro, per la rubrica INFO ---
  fondoChiaro: "#F5EBD9",
  testoSuChiaro: "#1C1814",
  testoSuChiaroTenue: "rgba(28, 24, 20, 0.7)",
  filoSuChiaro: "rgba(28, 24, 20, 0.16)",
};

export const FONT = {
  titolo: '"Bebas Neue", system-ui, sans-serif',
  testo: '"Montserrat", system-ui, sans-serif',
  etichetta: '"Oswald", system-ui, sans-serif',
};

/** I font che devono essere caricati prima di ogni esportazione. */
export const FAMIGLIE_RICHIESTE = ["Bebas Neue", "Montserrat", "Oswald"];

/** Scala tipografica. I nomi indicano il ruolo, non la dimensione. */
export const TESTO = {
  microEtichetta: { size: 19, spacing: "0.3em", weight: 500 },
  etichetta: { size: 22, spacing: "0.2em", weight: 500 },
  titoloXL: { size: 132, spacing: "0.01em", lineHeight: 0.86 },
  titoloL: { size: 96, spacing: "0.02em", lineHeight: 0.88 },
  titoloM: { size: 64, spacing: "0.02em", lineHeight: 0.92 },
  titoloS: { size: 44, spacing: "0.03em", lineHeight: 0.96 },
  numeroXL: { size: 92, lineHeight: 0.9 },
  numeroL: { size: 64, lineHeight: 0.9 },
  corpo: { size: 26, lineHeight: 1.55 },
  corpoS: { size: 22, lineHeight: 1.5 },
  didascalia: { size: 18, lineHeight: 1.4 },
};

/** Trattamento fotografico: scuro, cinematografico, leggermente desaturato. */
export const FOTO = {
  filtro: "saturate(0.82) contrast(1.06) brightness(0.9)",
  /** Più la grafica pesa, più il velo è denso: le due cose vanno insieme. */
  velo: {
    leggero: "linear-gradient(180deg, rgba(28,24,20,0.10) 0%, rgba(28,24,20,0.55) 100%)",
    medio: "linear-gradient(180deg, rgba(28,24,20,0.25) 0%, rgba(28,24,20,0.60) 55%, rgba(28,24,20,0.92) 100%)",
    denso: "linear-gradient(180deg, rgba(28,24,20,0.55) 0%, rgba(28,24,20,0.88) 60%, rgba(28,24,20,0.97) 100%)",
    laterale: "linear-gradient(90deg, rgba(28,24,20,0.92) 0%, rgba(28,24,20,0.45) 45%, rgba(28,24,20,0.10) 100%)",
  },
};

export const MAPPA = {
  mare: "#191510",
  terra: "#E8DCC2",
  terraScura: "#CBB78F",
  costa: "#F5EBD9",
  curva: "rgba(120, 92, 56, 0.5)",
  curvaForte: "rgba(120, 92, 56, 0.75)",
  traccia: "#A0612A",
  tracciaEventi: "#E18A3C",
  tracciaAlone: "rgba(28, 24, 20, 0.85)",
  marker: "#1C1814",
  etichetta: "#1C1814",
};

/** Profilo altimetrico: pulito, minimale, gli stessi due colori. */
export const ALTIMETRIA = {
  linea: "#E18A3C",
  riempimento: "rgba(225, 138, 60, 0.18)",
  griglia: "rgba(245, 235, 217, 0.12)",
  testo: "rgba(245, 235, 217, 0.6)",
};
