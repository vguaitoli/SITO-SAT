import { CATEGORIE, formatoValido, varianteValida } from "./categorie";

/**
 * Quali grafiche esistono davvero.
 *
 * `categorie.js` dichiara ventidue varianti su otto rubriche: sono varianti
 * **previste e approvate**, il piano editoriale del profilo. Di template
 * costruiti, oggi, ce ne sono tre. La distinzione fra le due cose non è
 * pedanteria: senza, il pre-flight lascia passare l'esportazione di una
 * combinazione per cui nessuno ha scritto un renderer, e il difetto si scopre
 * davanti a un PNG vuoto o a una grafica ripiegata su un'altra rubrica.
 *
 * Da qui la regola: **niente ripieghi**. Una combinazione non registrata non
 * diventa `standard`, non diventa EVENTI, non diventa niente — dà errore. Un
 * ripiego silenzioso è il modo peggiore di scoprire un template mancante,
 * perché produce un file che sembra giusto.
 *
 * Modulo puro: nessun React, nessun componente. Il registro degli **editor**
 * vive altrove (`app/registro-editor.js`) proprio per non trascinare l'albero
 * dei componenti dentro il pre-flight, che di React non sa nulla.
 */

/**
 * Le combinazioni con un renderer reale.
 *
 * Non compaiono `locandina` e `minimale`: sono varianti approvate per EVENTI,
 * ma oggi non esiste un dispatch verso renderer distinti — il template è uno
 * solo. Registrarle significherebbe dichiarare disponibile qualcosa che non
 * c'è.
 */
const IMPLEMENTATI = Object.freeze([
  Object.freeze({ categoria: "eventi", formato: "post", variante: "standard" }),
  Object.freeze({ categoria: "eventi", formato: "story", variante: "standard" }),
  Object.freeze({ categoria: "eventi", formato: "carosello", variante: "standard" }),
]);

const chiave = (categoria, formato, variante) => `${categoria}/${formato}/${variante}`;

/**
 * Costruisce l'indice delle combinazioni, convalidandole.
 *
 * È esportata perché la convalida **è** il mestiere di questo modulo, non un
 * gancio aggiunto per i test: si può interrogare con un elenco qualunque e
 * chiedere se sarebbe accettabile. Non muta niente e non c'è nessun modo di
 * cambiare il registro reale attraverso di lei.
 *
 * Il registro si controlla da sé all'avvio.
 *
 * Una voce che nomina una rubrica, un formato o una variante non approvati in
 * `categorie.js` è un errore di battitura che altrimenti si scoprirebbe come
 * grafica mancante. E una voce ripetuta è un errore che non si scoprirebbe
 * affatto — il `Set` la assorbirebbe in silenzio, e l'elenco pubblico direbbe
 * quattro combinazioni dove ce ne sono tre. Meglio non far partire il modulo.
 */
export function costruisciIndice(elenco) {
  const insieme = new Set();
  for (const { categoria, formato, variante } of elenco) {
    if (!CATEGORIE[categoria]) {
      throw new Error(`Registro template: rubrica «${categoria}» inesistente.`);
    }
    if (!formatoValido(categoria, formato)) {
      throw new Error(`Registro template: il formato «${formato}» non è previsto per «${categoria}».`);
    }
    if (!varianteValida(categoria, variante)) {
      throw new Error(`Registro template: la variante «${variante}» non è approvata per «${categoria}».`);
    }
    const k = chiave(categoria, formato, variante);
    if (insieme.has(k)) {
      throw new Error(`Registro template: combinazione «${k}» dichiarata due volte.`);
    }
    insieme.add(k);
  }
  return insieme;
}

const INSIEME = costruisciIndice(IMPLEMENTATI);

/**
 * Le combinazioni implementate.
 *
 * È **lo stesso** array usato internamente, non una copia: congelato, con ogni
 * descrittore congelato. Una copia si sarebbe potuta modificare senza toccare
 * il registro — e allora l'elenco pubblico e il comportamento reale avrebbero
 * potuto raccontare due cose diverse, che è il difetto peggiore di un registro.
 * Congelando l'originale non c'è nulla da tenere in sincronia.
 */
export const COMBINAZIONI_IMPLEMENTATE = IMPLEMENTATI;

/**
 * C'è un template per questa combinazione?
 *
 * @returns {boolean} falso anche per rubriche, formati o varianti inesistenti:
 *   la domanda è «si può disegnare», e la risposta è no in tutti quei casi.
 */
export function templateDisponibile(categoria, formato, variante) {
  return INSIEME.has(chiave(categoria, formato, variante));
}

/**
 * Come sopra, ma pretende che il template esista.
 *
 * Serve dove un ripiego sarebbe peggio di un'interruzione: al momento di
 * montare una grafica per la cattura. Il messaggio nomina la combinazione
 * chiesta e quelle che esistono, perché «template non trovato» da solo non
 * dice a chi legge quale sia l'alternativa.
 */
export function richiediTemplate(categoria, formato, variante) {
  const k = chiave(categoria, formato, variante);
  if (INSIEME.has(k)) return k;
  throw new Error(
    `Nessun template implementato per «${k}». Implementati: ${[...INSIEME].join(", ")}.`,
  );
}

/** I formati con almeno un template, per una rubrica. Vuoto se non ce ne sono. */
export function formatiImplementati(categoria) {
  return [...new Set(IMPLEMENTATI.filter((c) => c.categoria === categoria).map((c) => c.formato))];
}

/** Le varianti con un template, per rubrica e formato. Vuoto se non ce ne sono. */
export function variantiImplementate(categoria, formato) {
  return IMPLEMENTATI.filter((c) => c.categoria === categoria && c.formato === formato).map(
    (c) => c.variante,
  );
}

/** Vero se la rubrica ha almeno un template. */
export function rubricaImplementata(categoria) {
  return formatiImplementati(categoria).length > 0;
}
