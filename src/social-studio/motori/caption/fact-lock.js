/**
 * Fact Lock.
 *
 * I dati fattuali si estraggono in un oggetto separato, congelato, che il
 * generatore riceve come contesto in sola lettura. Dopo la generazione si
 * controlla che i numeri comparsi nel testo coincidano con quelli veri.
 *
 * Il controllo non corregge: segnala. Il testo resta dell'autore, e una
 * correzione automatica su un dato commerciale sarebbe il tipo di aiuto che
 * fa danni.
 */

/** Estrae i fatti e li congela: nessuno può modificarli per sbaglio. */
export function estraiFattuali(contenuto) {
  const f = contenuto.fattuali || {};
  return Object.freeze({
    nome: f.nome || "",
    prezzo: f.prezzo || "",
    dataInizio: f.dataInizio || "",
    dataFine: f.dataFine || "",
    periodo: f.periodo || "",
    km: f.km || "",
    sterrato: f.sterrato || "",
    durata: f.durata || "",
    livello: f.livello || "",
    partecipantiMin: f.partecipantiMin || "",
    partecipantiMax: f.partecipantiMax || "",
    partenza: f.partenza || "",
  });
}

const numeriIn = (testo) =>
  [...String(testo || "").matchAll(/\d+(?:[.,]\d+)?/g)].map((m) => m[0].replace(",", "."));

/** Etichette leggibili per i messaggi. */
const NOMI = {
  prezzo: "prezzo", km: "chilometri", sterrato: "percentuale di sterrato",
  durata: "durata", partecipantiMin: "partecipanti minimi", partecipantiMax: "partecipanti massimi",
};

/**
 * Confronta i numeri del testo con i fatti.
 *
 * Il criterio è deliberatamente prudente: si segnala solo quando nel testo
 * compare, **nello stesso contesto**, un numero diverso da quello vero. Un
 * numero che semplicemente non c'è non è un errore, e un numero legittimo di
 * troppo non deve generare falsi allarmi.
 *
 * @returns {{campo: string, nome: string, atteso: string, trovato: string[]}[]}
 */
export function verificaFattuale(testo, fatti) {
  const discordanze = [];
  if (!testo?.trim()) return discordanze;

  const controlla = (campo, regex) => {
    const atteso = fatti[campo];
    if (!atteso) return;
    const attesi = numeriIn(atteso);
    if (!attesi.length) return;

    for (const m of String(testo).matchAll(regex)) {
      const trovati = numeriIn(m[0]);
      if (!trovati.length) continue;
      // Basta che uno dei numeri attesi compaia: «580 €» in «580 euro» va bene.
      if (!trovati.some((t) => attesi.includes(t))) {
        discordanze.push({ campo, nome: NOMI[campo] || campo, atteso, trovato: trovati });
      }
    }
  };

  // Contesti riconoscibili: importi, distanze, percentuali, giorni, gruppo.
  controlla("prezzo", /\d+(?:[.,]\d+)?\s*(?:€|euro)/gi);
  controlla("km", /\d+(?:[.,]\d+)?\s*(?:km|chilometri)/gi);
  controlla("sterrato", /\d+(?:[.,]\d+)?\s*%/g);
  controlla("durata", /\d+\s*giorn[io]/gi);

  return discordanze;
}

/** Suddivide una caption in paragrafi, conservando gli indici. */
export function paragrafi(testo) {
  return String(testo || "").split(/\n{2,}/).map((t, i) => ({ i, testo: t }));
}

/** Ricompone i paragrafi, tenendo intatti quelli bloccati. */
export function ricomponi(nuovi, precedenti, bloccati) {
  const uscita = nuovi.slice();
  for (const i of bloccati) {
    if (precedenti[i] !== undefined) uscita[i] = precedenti[i];
  }
  return uscita.join("\n\n");
}
