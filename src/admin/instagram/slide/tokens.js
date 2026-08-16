/**
 * Token grafici del format Instagram.
 *
 * Sono gli stessi valori del sito (src/index.css, tailwind.config.js), fissati
 * qui in numeri assoluti perché le slide si disegnano su una tela di 1080×1350
 * px reali, non in unità relative: solo così l'anteprima e il PNG esportato
 * coincidono al pixel.
 *
 * QUESTI VALORI NON SONO VARIABILI DI CONTENUTO. Cambiarli cambia il format di
 * tutti gli eventi: è esattamente ciò che il template deve impedire evento per
 * evento. Da toccare solo per una revisione consapevole dell'identità.
 */

export const TELA = { larghezza: 1080, altezza: 1350 };

/** Margine di sicurezza. Instagram non ritaglia il 4:5, ma il respiro è parte del look. */
export const MARGINE = 84;

export const COLORI = {
  fondo: "#1C1814", // obsidian
  fondoAlt: "#252019", // carbon
  bordoScuro: "#2F2A22", // graphite
  testo: "#F5EBD9", // granite mist
  testoTenue: "rgba(245, 235, 217, 0.72)",
  testoDebole: "rgba(245, 235, 217, 0.5)",
  accento: "#A0612A", // oxblood
  accentoChiaro: "#B87033",
  sabbia: "#E4D4B0", // aeolian sand
  verde: "#6B7A3E", // wild sage, solo CTA contatto/conferma
  verdeChiaro: "#7E8F4A",
  filo: "rgba(245, 235, 217, 0.16)",
  filoForte: "rgba(245, 235, 217, 0.3)",
};

export const FONT = {
  titolo: '"Bebas Neue", system-ui, sans-serif',
  testo: '"Montserrat", system-ui, sans-serif',
  etichetta: '"Oswald", system-ui, sans-serif',
};

/** Scala tipografica del format. */
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

/** Le otto slide, in ordine. Il nome file è quello dell'esportazione. */
export const SLIDE = [
  { id: "cover", numero: 1, titolo: "Cover", file: "01-cover.png" },
  { id: "numeri", numero: 2, titolo: "L'evento in numeri", file: "02-numeri.png" },
  { id: "percorso", numero: 3, titolo: "Il percorso", file: "03-percorso.png" },
  { id: "tappe", numero: 4, titolo: "Le tappe", file: "04-tappe.png" },
  { id: "esperienza", numero: 5, titolo: "Cosa vivrai", file: "05-esperienza.png" },
  { id: "incluso", numero: 6, titolo: "Cosa è incluso", file: "06-incluso.png" },
  { id: "requisiti", numero: 7, titolo: "È il tour giusto per te?", file: "07-requisiti.png" },
  { id: "cta", numero: 8, titolo: "Prezzo e CTA", file: "08-cta.png" },
];

export const TOTALE_SLIDE = SLIDE.length;

/** Trattamento fotografico: scuro, cinematografico, leggermente desaturato. */
export const FOTO = {
  filtro: "saturate(0.82) contrast(1.06) brightness(0.9)",
  velo: "linear-gradient(180deg, rgba(28,24,20,0.25) 0%, rgba(28,24,20,0.55) 55%, rgba(28,24,20,0.94) 100%)",
  veloLaterale: "linear-gradient(90deg, rgba(28,24,20,0.92) 0%, rgba(28,24,20,0.45) 45%, rgba(28,24,20,0.1) 100%)",
  veloLeggero: "linear-gradient(180deg, rgba(28,24,20,0.15) 0%, rgba(28,24,20,0.7) 100%)",
};

export const MAPPA = {
  mare: "#191510",
  terra: "#E8DCC2",
  terraScura: "#CBB78F",
  costa: "#F5EBD9",
  curva: "rgba(120, 92, 56, 0.5)",
  curvaForte: "rgba(120, 92, 56, 0.75)",
  traccia: "#A0612A",
  tracciaAlone: "rgba(28, 24, 20, 0.85)",
  marker: "#1C1814",
  etichetta: "#1C1814",
};
