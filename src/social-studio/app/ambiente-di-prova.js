/**
 * L'ambiente grafico che jsdom non ha, in un posto solo.
 *
 * **Serve esclusivamente alle prove.** Nessun modulo dell'applicazione lo
 * importa, e non deve cominciare: qui dentro si sostituiscono API globali del
 * browser, che in produzione ci sono davvero.
 *
 * Tre cose mancano a jsdom e servono a chiunque monti un template TOUR:
 *
 * - **`ResizeObserver`**, che `Anteprima` usa per scalare la grafica sulla
 *   larghezza disponibile. Senza, il montaggio solleva;
 * - **`document.fonts`**, che il controllo comune dei font interroga. Senza, ogni
 *   prova raccoglie un avviso che parla dell'ambiente e non di ciò che si sta
 *   misurando;
 * - **`Image`**, che jsdom non carica. Lasciarlo com'è significa non sapere mai
 *   le dimensioni di una fotografia, cioè misurare sempre e soltanto il caso
 *   «in corso».
 *
 * L'`Image` pilotata non è una comodità: è ciò che rende **deterministiche** le
 * prove sulle corse. La risposta arriva quando la decide la prova, non quando
 * capita, e questo permette di osservare la finestra fra «assegnata» e
 * «misurata» senza nessuna attesa sperata.
 */

let ImmagineOriginale = null;
let OsservatoreOriginale = null;
let FontOriginali = null;
let attivo = false;

/**
 * Un `Image` che risponde solo quando lo decide la prova.
 *
 * Tiene le istanze per sorgente: una sorgente sostituita non risolve quella di
 * prima, e si può far arrivare la risposta di una fotografia superata **dopo**
 * quella della nuova, che è la corsa da verificare.
 */
export function pilotaImmagini() {
  const mappa = new Map();
  globalThis.Image = class {
    constructor() {
      this.naturalWidth = 0;
      this.naturalHeight = 0;
      this.complete = false;
    }
    set src(v) {
      this._src = v;
      const istanze = mappa.get(v) || [];
      istanze.push(this);
      mappa.set(v, istanze);
    }
    get src() {
      return this._src;
    }
  };

  const applica = (istanze, larghezza, altezza) => {
    for (const i of istanze) {
      i.naturalWidth = larghezza;
      i.naturalHeight = altezza;
      i.complete = true;
      i.onload?.();
    }
  };

  return {
    /** Tutte le sorgenti viste finora, con una misura che regge i due formati. */
    risolviTutte(larghezza = 2400, altezza = 2600) {
      for (const istanze of mappa.values()) applica(istanze, larghezza, altezza);
    },
    /** Una sola sorgente: serve a far rispondere la vecchia dopo la nuova. */
    risolvi(sorgente, larghezza = 2400, altezza = 2600) {
      applica(mappa.get(sorgente) || [], larghezza, altezza);
    },
    falliscilTutte() {
      for (const istanze of mappa.values()) {
        for (const i of istanze) i.onerror?.();
      }
    },
    fallisci(sorgente) {
      for (const i of mappa.get(sorgente) || []) i.onerror?.();
    },
    /** Le sorgenti per cui è stato creato almeno un `Image`. */
    sorgenti() {
      return [...mappa.keys()];
    },
  };
}

/**
 * Accende l'ambiente grafico finto e restituisce il pilota delle immagini.
 *
 * Idempotente per errore di chiamata: una seconda accensione senza spegnimento
 * salverebbe come «originali» le sostituzioni della prima, e il ripristino non
 * ripristinerebbe niente.
 */
export function accendiAmbienteGrafico() {
  if (!attivo) {
    ImmagineOriginale = globalThis.Image;
    OsservatoreOriginale = globalThis.ResizeObserver;
    FontOriginali = Object.getOwnPropertyDescriptor(document, "fonts");
    attivo = true;
  }

  Object.defineProperty(document, "fonts", {
    configurable: true,
    value: { check: () => true, load: () => Promise.resolve([]), ready: Promise.resolve() },
  });

  globalThis.ResizeObserver = class {
    observe() {}
    disconnect() {}
  };

  return pilotaImmagini();
}

/** Rimette le API globali com'erano. */
export function spegniAmbienteGrafico() {
  if (!attivo) return;
  globalThis.Image = ImmagineOriginale;
  globalThis.ResizeObserver = OsservatoreOriginale;
  if (FontOriginali) Object.defineProperty(document, "fonts", FontOriginali);
  else delete document.fonts;
  attivo = false;
}
