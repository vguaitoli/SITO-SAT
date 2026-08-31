import { SCHERMATE } from "../design/eventi-story";
import { SLIDE_CAROSELLO } from "../template/rubriche/eventi/CaroselloEvento";

/**
 * Il pacchetto evento: cosa contiene, in che ordine, con che nomi.
 *
 * Vive in un modulo suo e non dentro l'editor perché è una promessa
 * verificabile — quindici PNG più la caption, la Story in sequenza canonica,
 * niente GPX — e una promessa che si può controllare solo aprendo lo ZIP non è
 * una promessa. Da qui la leggono l'editor e i test, e nessuno dei due la
 * riscrive per conto proprio: un elenco copiato nei test proverebbe che la
 * copia è giusta, non che il pacchetto lo è.
 *
 * L'ordine è quello in cui si pubblica: prima il Post, poi le sei schermate
 * della Story, poi le otto slide del carosello.
 */
export const PACCHETTO = [
  { id: "post", nome: "post-1080x1350.png", formato: "post" },
  ...SCHERMATE.map((s) => ({ id: `story-${s.id}`, nome: `story/${s.file}`, formato: "story" })),
  ...SLIDE_CAROSELLO.map((s) => ({ id: s.id, nome: `carosello/${s.file}`, formato: "post" })),
];

/** Quante grafiche produce il pacchetto. La caption non è una grafica. */
export const QUANTE_GRAFICHE = PACCHETTO.length;

/** I file dello ZIP, caption compresa quando c'è del testo da allegare. */
export function fileDelPacchetto({ conCaption = true } = {}) {
  const nomi = PACCHETTO.map((p) => p.nome);
  return conCaption ? [...nomi, "caption.txt"] : nomi;
}

/**
 * Cosa promette il pulsante di esportazione della vista corrente.
 *
 * «Esporta story» sembrava un file solo: sono sei, e chi premeva non lo sapeva
 * finché non arrivava lo ZIP. I numeri vengono dalle sequenze, non da cifre
 * scritte a mano che invecchiano alla prima schermata aggiunta.
 */
export function etichettaExport(vista) {
  if (vista === "story") return `Esporta ${SCHERMATE.length} Story`;
  if (vista === "carosello") return `Esporta ${SLIDE_CAROSELLO.length} slide`;
  return "Esporta il Post";
}
