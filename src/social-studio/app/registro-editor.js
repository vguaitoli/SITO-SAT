import EditorEvento from "./EditorEvento";
import { CATEGORIE } from "../design/categorie";
import { rubricaImplementata } from "../design/registro-template";

/**
 * Quale editor apre una rubrica.
 *
 * Sta separato dal registro dei template (`design/registro-template.js`) per
 * una ragione precisa: quello è puro e lo legge il pre-flight, questo importa
 * componenti React. Tenendoli insieme, `preflight.js` finirebbe per tirarsi
 * dietro `EditorEvento` — che a sua volta importa il pre-flight — e il ciclo si
 * chiuderebbe.
 *
 * Anche qui **nessun ripiego**: una rubrica senza editor restituisce `null`, e
 * chi chiama decide cosa mostrare. Aprire l'editor EVENTI su una rubrica che
 * non è EVENTI produrrebbe una bozza con la categoria sbagliata e campi che non
 * le appartengono.
 *
 * **Servono entrambe le cose.** Una rubrica è disponibile solo se ha un editor
 * *e* almeno un template implementato, perché i due registri possono divergere
 * in due modi e nessuno dei due è utile a chi lavora:
 *
 * - editor senza template — si apre una schermata che scrive una bozza e poi
 *   non riesce a esportarla: il pre-flight la ferma con
 *   `template-non-implementato`, ma dopo che il lavoro è stato fatto;
 * - template senza editor — la grafica esiste e non c'è modo di riempirla.
 *
 * Dichiarare «disponibile» in uno di quei due stati significa promettere un
 * flusso che si interrompe a metà. Meglio dire «da implementare» finché non ci
 * sono tutti e due i lati.
 */

const EDITOR = {
  eventi: EditorEvento,
};

/**
 * L'editor di una rubrica, o `null` se il flusso non è completo.
 *
 * `null` anche quando l'editor esiste ma nessun template è implementato: aprire
 * una schermata che non può esportare non è un servizio.
 *
 * @param {string} categoria  id della rubrica
 * @returns {React.ComponentType|null}
 */
export function editorPerRubrica(categoria) {
  return editorDisponibile(categoria) ? EDITOR[categoria] : null;
}

/** Vero se la rubrica ha **sia** un editor **sia** almeno un template. */
export function editorDisponibile(categoria) {
  return Boolean(EDITOR[categoria]) && rubricaImplementata(categoria);
}

/**
 * Distingue «rubrica prevista ma non ancora costruita» da «id inesistente».
 *
 * Sono due cose diverse per chi legge: la prima è un lavoro in coda, la seconda
 * è un errore di chiamata.
 *
 * @returns {"disponibile"|"pianificata"|"sconosciuta"}
 */
export function statoRubrica(categoria) {
  if (editorDisponibile(categoria)) return "disponibile";
  // Prevista in `categorie.js` ma con un lato mancante — editor o template:
  // in entrambi i casi è lavoro in coda, non un errore di chiamata.
  return CATEGORIE[categoria] ? "pianificata" : "sconosciuta";
}
