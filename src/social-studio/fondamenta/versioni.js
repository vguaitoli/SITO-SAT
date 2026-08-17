/**
 * Version History.
 *
 * Non serve un Git: servono pochi punti di ritorno affidabili. Si registra una
 * revisione quando cambia qualcosa di sostanziale — grafica, caption, ritaglio,
 * template, dati editoriali — e non a ogni battitura.
 *
 * Le revisioni si conservano dentro il contenuto stesso, così un backup le
 * porta con sé senza bisogno di un secondo archivio da tenere allineato.
 */

/** Oltre questo numero le revisioni più vecchie si accorpano, non si perdono. */
export const MASSIME_REVISIONI = 20;

/** I rami la cui modifica merita una revisione. */
const RAMI_SORVEGLIATI = ["editoriale", "media", "mappa", "fattuali", "variante", "formato"];

const impronta = (valore) => JSON.stringify(valore ?? null);

/**
 * Dice se fra due stati c'è una differenza che vale una revisione.
 * @returns {{cambiato: boolean, rami: string[]}}
 */
export function differenzaSostanziale(prima, dopo) {
  if (!prima) return { cambiato: true, rami: ["creazione"] };
  const rami = RAMI_SORVEGLIATI.filter((r) => impronta(prima[r]) !== impronta(dopo[r]));
  return { cambiato: rami.length > 0, rami };
}

/** Etichetta leggibile, ricavata da ciò che è cambiato. */
export function etichettaAutomatica(rami) {
  const nomi = {
    editoriale: "testi",
    media: "fotografie",
    mappa: "mappa",
    fattuali: "dati",
    variante: "variante",
    formato: "formato",
    creazione: "creazione",
  };
  const leggibili = rami.map((r) => nomi[r] || r);
  if (!leggibili.length) return "modifica";
  if (leggibili.length === 1) return leggibili[0];
  return `${leggibili.slice(0, -1).join(", ")} e ${leggibili.at(-1)}`;
}

/**
 * Registra una revisione, se serve.
 *
 * La revisione conserva lo stato **precedente**: è quello a cui si vuole
 * tornare. Lo stato attuale è già nel contenuto.
 *
 * @param {object} contenuto   lo stato nuovo
 * @param {object|null} prima  lo stato precedente
 * @returns {object} contenuto con l'elenco revisioni aggiornato
 */
export function registraRevisione(contenuto, prima, { forza = false, etichetta } = {}) {
  const { cambiato, rami } = differenzaSostanziale(prima, contenuto);
  // `forza` serve al ripristino, che deve conservare lo stato attuale anche se
  // coincide con quello passato: senza, il ritorno indietro non sarebbe a sua
  // volta reversibile.
  if (!cambiato && !forza) return contenuto;

  const precedenti = contenuto.versioni || [];
  const n = (precedenti.at(-1)?.n || 0) + 1;

  const nuova = {
    n,
    quando: new Date().toISOString(),
    etichetta: etichetta || etichettaAutomatica(rami),
    dati: prima
      ? {
          editoriale: prima.editoriale,
          media: prima.media,
          mappa: prima.mappa,
          fattuali: prima.fattuali,
          variante: prima.variante,
          formato: prima.formato,
        }
      : null,
  };

  let elenco = [...precedenti, nuova];

  // Oltre il tetto si diradano le più vecchie tenendone una ogni due: si perde
  // granularità sul passato remoto, non la possibilità di tornarci.
  if (elenco.length > MASSIME_REVISIONI) {
    const recenti = elenco.slice(-Math.floor(MASSIME_REVISIONI / 2));
    const vecchie = elenco.slice(0, -Math.floor(MASSIME_REVISIONI / 2)).filter((_, i) => i % 2 === 0);
    elenco = [...vecchie, ...recenti];
  }

  return { ...contenuto, versioni: elenco };
}

/**
 * Ripristina una revisione.
 *
 * Il ripristino è esso stesso una modifica: prima di sovrascrivere registra lo
 * stato attuale come nuova revisione, così si può tornare indietro dal
 * ritorno indietro.
 */
export function ripristinaRevisione(contenuto, n) {
  const revisione = (contenuto.versioni || []).find((v) => v.n === n);
  if (!revisione) throw new Error(`Revisione ${n} inesistente.`);
  if (!revisione.dati) throw new Error(`La revisione ${n} è il punto di creazione: non contiene uno stato da ripristinare.`);

  const conStoria = registraRevisione(contenuto, contenuto, {
    forza: true,
    etichetta: `stato prima del ripristino della v${n}`,
  });
  return {
    ...conStoria,
    ...revisione.dati,
    modificato: new Date().toISOString(),
  };
}

/** Riepilogo per l'interfaccia, dalla più recente. */
export function elencoRevisioni(contenuto) {
  return [...(contenuto.versioni || [])]
    .reverse()
    .map((v) => ({ n: v.n, quando: v.quando, etichetta: v.etichetta, ripristinabile: Boolean(v.dati) }));
}
