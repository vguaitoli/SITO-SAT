import React, { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { COLORI, FONT, TESTO } from "../design/tokens";
import { assicuraFontPronti } from "../motori/font";

/**
 * Primitivi condivisi da tutti i template.
 *
 * Sono la parte immutabile del format: micro-etichette, filetti, celle dati,
 * numerazione, testo che si adatta. I template compongono solo il contenuto.
 */

/* ================================================================== *
 * Registro degli sfori
 * ================================================================== */

const ContestoProblemi = createContext(null);
const ContestoAmbito = createContext("");
const ContestoMisure = createContext(null);

/**
 * Raccoglie i problemi rilevati durante il disegno.
 *
 * Il requisito è esplicito: se un contenuto non ci sta, va segnalato
 * nell'editor, non rimpicciolito fino a diventare illeggibile.
 *
 * Il registro è una mappa per chiave, quindi la chiave **è** l'identità della
 * segnalazione. Con chiavi globali come `stat-Durata` il Post, la Story e le
 * otto slide — che vengono montati insieme durante l'esportazione del
 * pacchetto — si scrivevano l'uno sull'altro: l'errore vero di una Story
 * spariva perché il Post scriveva `null` sulla stessa chiave. `AmbitoProblemi`
 * prefissa le chiavi con il formato e la slide, e ogni componente ripulisce la
 * propria voce quando viene smontato.
 *
 * **Due modi di leggere il registro, e servono entrambi.** `onProblemi` avvisa
 * l'interfaccia con un raggruppamento da 80 ms: va benissimo per ridisegnare
 * un pannello, e sarebbe una sorgente sbagliata per una decisione che si
 * prende adesso. Il pre-flight dell'esportazione è esattamente una decisione
 * che si prende adesso: le grafiche vengono montate fuori schermo e mezzo
 * frame dopo si deve sapere se sforano. `lettore` è la lettura sincrona dello
 * stesso registro, senza ritardo e senza passare da uno stato di React.
 *
 * @param {object} props
 * @param {(problemi: object[]) => void} [props.onProblemi]  notifica raggruppata
 * @param {{current: (() => object[])|null}} [props.lettore]
 *   Ci viene depositata la lettura sincrona del registro. È un ref perché chi
 *   deve leggere — l'editor — sta **fuori** dal provider e non può usarne il
 *   contesto.
 * @param {{current: (() => number)|null}} [props.misure]
 *   Ci viene depositato il conteggio delle misure tipografiche ancora in
 *   sospeso. Vedi `ContestoMisure`.
 */
export function FornitoreProblemi({ onProblemi, lettore, misure, children }) {
  const raccolti = useRef(new Map());
  const timer = useRef(null);
  /**
   * Le misure non ancora eseguite.
   *
   * Un registro vuoto è ambiguo: può voler dire «tutto misurato e niente
   * sfora» oppure «nessuno ha ancora misurato». Sono due situazioni opposte —
   * nella prima si può esportare, nella seconda si esporterebbe alla cieca — e
   * distinguerle contando le letture uguali non funziona: due letture vuote
   * consecutive capitano benissimo mentre i font stanno ancora arrivando.
   *
   * Ogni `TestoAdattivo` si dichiara in sospeso appena montato e si toglie
   * quando ha misurato davvero. Zero in sospeso è un fatto, non una scommessa.
   */
  const inSospeso = useRef(new Set());

  /** Il registro così com'è adesso. Nessun ritardo, nessuna copia in stato. */
  const leggi = useCallback(
    () => [...raccolti.current.entries()].map(([chiave, p]) => ({ chiave, ...p })),
    [],
  );

  useEffect(() => {
    if (!lettore) return undefined;
    lettore.current = leggi;
    return () => {
      lettore.current = null;
    };
  }, [lettore, leggi]);

  /** Apre o chiude una misura in sospeso. Stabile: non ridisegna nessuno. */
  const segnalaMisura = useCallback((chiave, pendente) => {
    if (pendente) inSospeso.current.add(chiave);
    else inSospeso.current.delete(chiave);
  }, []);

  const quanteMisureInSospeso = useCallback(() => inSospeso.current.size, []);

  useEffect(() => {
    if (!misure) return undefined;
    misure.current = quanteMisureInSospeso;
    return () => {
      misure.current = null;
    };
  }, [misure, quanteMisureInSospeso]);

  const segnala = useCallback(
    (chiave, problema) => {
      const precedente = raccolti.current.get(chiave);
      const nuovo = problema ? JSON.stringify(problema) : null;
      if ((precedente ? JSON.stringify(precedente) : null) === nuovo) return;

      if (problema === null) raccolti.current.delete(chiave);
      else raccolti.current.set(chiave, problema);

      // Si accumulano gli aggiornamenti di un ciclo di disegno in uno solo.
      clearTimeout(timer.current);
      timer.current = setTimeout(() => onProblemi?.(leggi()), 80);
    },
    [onProblemi, leggi],
  );

  // Il timer sopravviverebbe allo smontaggio e chiamerebbe `onProblemi` su un
  // componente che non c'è più.
  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <ContestoProblemi.Provider value={segnala}>
      <ContestoMisure.Provider value={segnalaMisura}>{children}</ContestoMisure.Provider>
    </ContestoProblemi.Provider>
  );
}

/**
 * Dichiara al registro che una misura tipografica è in sospeso.
 *
 * Fuori da un `FornitoreProblemi` non fa niente: i template si montano anche
 * da soli nei test, e non devono rompersi per questo.
 */
export function useSegnalaMisura() {
  return useContext(ContestoMisure) || (() => {});
}

export function useSegnalaProblema() {
  return useContext(ContestoProblemi) || (() => {});
}

/**
 * Delimita un ambito di segnalazioni.
 *
 * I template ci avvolgono il proprio contenuto: `<AmbitoProblemi nome="story">`,
 * `<AmbitoProblemi nome="carosello/05">`. Gli ambiti si annidano, così una
 * seconda istanza dello stesso template — l'anteprima e la copia fuori schermo
 * del pacchetto — non condivide nessuna chiave con la prima.
 */
export function AmbitoProblemi({ nome, children }) {
  const genitore = useContext(ContestoAmbito);
  const valore = useMemo(
    () => [genitore, nome].filter(Boolean).join("/"),
    [genitore, nome],
  );
  return <ContestoAmbito.Provider value={valore}>{children}</ContestoAmbito.Provider>;
}

/** La chiave completa di una segnalazione, ambito compreso. */
export function useChiaveProblema(chiave) {
  const ambito = useContext(ContestoAmbito);
  return useMemo(() => [ambito, chiave].filter(Boolean).join("/"), [ambito, chiave]);
}

/**
 * Registra una segnalazione e la ritira allo smontaggio.
 *
 * Il ritiro è il punto: senza, passando da Story a Post restavano gli errori
 * della Story, e dopo l'esportazione del pacchetto restavano quelli dei quindici
 * template smontati. Il pre-flight mostrava problemi di grafiche che non
 * esistevano più.
 */
export function useSegnalazione(chiave, problema) {
  const segnala = useSegnalaProblema();
  const chiaveIntera = useChiaveProblema(chiave);
  const impronta = problema ? JSON.stringify(problema) : null;

  useEffect(() => {
    segnala(chiaveIntera, impronta ? JSON.parse(impronta) : null);
    return () => segnala(chiaveIntera, null);
    // `impronta` è la forma stabile di `problema`: senza, l'effetto girerebbe
    // a ogni render perché l'oggetto è nuovo ogni volta.
  }, [segnala, chiaveIntera, impronta]);

  return chiaveIntera;
}

/* ================================================================== *
 * Testo che si adatta
 * ================================================================== */

/**
 * Vero quando i webfont sono caricati.
 *
 * Misurare prima che arrivino significa misurare il carattere di sistema, che
 * ha metriche diverse: il testo sembra sbordare quando non sborda, e l'avviso
 * resta appiccicato perché nessuno rimisura. Vale anche per l'esportazione.
 */
export function useFontPronti() {
  const [pronti, setPronti] = useState(false);

  useLayoutEffect(() => {
    let vivo = true;
    assicuraFontPronti().then(() => {
      if (vivo) setPronti(true);
    });
    return () => {
      vivo = false;
    };
  }, []);

  return pronti;
}

/**
 * Estrae il testo puro da un albero di figli React.
 *
 * Serve come dipendenza stabile per la misura: `JSON.stringify(children)` non
 * si può usare, perché un elemento React contiene riferimenti circolari — i
 * provider di contesto si richiudono su se stessi — e solleva un'eccezione.
 */
function testoDa(nodo) {
  if (nodo === null || nodo === undefined || typeof nodo === "boolean") return "";
  if (typeof nodo === "string" || typeof nodo === "number") return String(nodo);
  if (Array.isArray(nodo)) return nodo.map(testoDa).join(" ");
  if (typeof nodo === "object" && nodo.props) return testoDa(nodo.props.children);
  return "";
}

/**
 * Testo che riduce il corpo finché entra nello spazio, entro un minimo.
 *
 * La misura avviene una volta sola per ogni cambio di contenuto, con una
 * ricerca binaria fra minimo e massimo: sette passaggi bastano a coprire
 * l'intero intervallo. La versione precedente riduceva a passi dell'8% dentro
 * un effetto senza dipendenze, quindi rimisurava a ogni render — funzionava,
 * ma era fragile e poteva innescare cicli.
 *
 * Sotto il minimo non scende: segnala il problema e lascia il testo leggibile
 * ma sbordante, così l'errore è visibile invece che nascosto.
 */
export function TestoAdattivo({
  children,
  chiave,
  etichetta,
  size,
  minSize,
  altezzaMassima,
  maxRighe,
  style,
  ...resto
}) {
  const ref = useRef(null);
  const [corpo, setCorpo] = useState(size);
  /**
   * Spazio da riservare sotto il testo per l'inchiostro che sporge.
   *
   * Con `line-height` minore di 1 il blocco di riga è più basso dei glifi: un
   * titolo Bebas da 112 px occupa 95 px di riga e ne disegna 115. I venti di
   * troppo non sono un errore da correggere — sono la tipografia della
   * locandina — ma vanno messi nel conto, altrimenti finiscono tagliati o
   * addosso a ciò che sta sotto. Si misurano invece di stimarli: dipendono
   * dalle metriche del carattere, che non sono affar nostro.
   */
  const [respiro, setRespiro] = useState(0);
  const segnala = useSegnalaProblema();
  const segnalaMisura = useSegnalaMisura();
  const chiaveIntera = useChiaveProblema(chiave);
  const testo = testoDa(children);
  const fontPronti = useFontPronti();

  /*
   * Il ritiro sta in un effetto proprio, separato dalla misura: la misura non
   * gira quando il componente viene smontato, e senza questo la segnalazione
   * resterebbe nel registro per sempre.
   */
  useEffect(() => () => segnala(chiaveIntera, null), [segnala, chiaveIntera]);

  /*
   * In sospeso dal montaggio fino alla prima misura vera.
   *
   * Dichiarato **prima** dell'effetto che misura, così dentro lo stesso commit
   * si apre e — se la misura avviene — si chiude subito dopo. Se i font non
   * sono ancora arrivati la misura non avviene, e questa voce resta aperta: è
   * il modo in cui l'esportazione sa che non può ancora decidere.
   */
  useLayoutEffect(() => {
    segnalaMisura(chiaveIntera, true);
    return () => segnalaMisura(chiaveIntera, false);
  }, [segnalaMisura, chiaveIntera]);

  useLayoutEffect(() => {
    const el = ref.current;
    // Finché i font non sono pronti non si misura: si userebbero le metriche
    // del carattere di sistema. La voce in sospeso resta aperta apposta.
    if (!el || !fontPronti) return;

    /**
     * Altezza reale del contenuto a un dato corpo, misurata senza il vincolo.
     *
     * Non si può confrontare `scrollHeight` con `clientHeight`: con
     * `line-height` minore di 1 — che è lo stile dei titoli STA — i discendenti
     * dei caratteri sporgono sempre dal proprio blocco di riga, quindi
     * `scrollHeight` risulta maggiore a qualsiasi dimensione e ogni testo
     * sembrerebbe sbordare. Si toglie il tetto, si misura, si rimette.
     */
    const altezzaContenuto = (dimensione) => {
      const tettoPrecedente = el.style.maxHeight;
      el.style.maxHeight = "none";
      el.style.fontSize = `${dimensione}px`;
      const altezza = el.offsetHeight;
      el.style.maxHeight = tettoPrecedente;
      return altezza;
    };

    const tetto = Number.isFinite(altezzaMassima) ? altezzaMassima : Infinity;
    const sbordaA = (dimensione) => altezzaContenuto(dimensione) > tetto + 1;

    /** Inchiostro che sporge dal blocco di riga, al corpo scelto. */
    const misuraRespiro = (dimensione) => {
      const tettoPrecedente = el.style.maxHeight;
      const respiroPrecedente = el.style.paddingBottom;
      el.style.maxHeight = "none";
      el.style.paddingBottom = "0px";
      el.style.fontSize = `${dimensione}px`;
      const sporgenza = Math.max(0, el.scrollHeight - el.clientHeight);
      el.style.maxHeight = tettoPrecedente;
      el.style.paddingBottom = respiroPrecedente;
      return sporgenza;
    };

    // Al massimo entra: niente da fare, se non riservare l'inchiostro.
    if (!sbordaA(size)) {
      setCorpo(size);
      setRespiro(misuraRespiro(size));
      segnala(chiaveIntera, null);
      segnalaMisura(chiaveIntera, false);
      return;
    }

    // Ricerca binaria del corpo più grande che entra.
    let basso = minSize;
    let alto = size;
    let migliore = minSize;
    for (let i = 0; i < 7 && basso <= alto; i += 1) {
      const mezzo = Math.floor((basso + alto) / 2);
      if (sbordaA(mezzo)) {
        alto = mezzo - 1;
      } else {
        migliore = mezzo;
        basso = mezzo + 1;
      }
    }

    const nonEntraNemmeoAlMinimo = sbordaA(migliore);
    el.style.fontSize = `${migliore}px`;
    setCorpo(migliore);
    setRespiro(misuraRespiro(migliore));

    segnala(
      chiaveIntera,
      nonEntraNemmeoAlMinimo
        ? {
            livello: "errore",
            messaggio: `${etichetta}: il testo non entra nello spazio previsto nemmeno al corpo minimo (${minSize} px). Accorcialo.`,
          }
        : migliore < size * 0.75
          ? {
              livello: "avviso",
              messaggio: `${etichetta}: il testo è stato ridotto da ${size} a ${migliore} px per farlo entrare. Verifica che si legga.`,
            }
          : null,
    );
    segnalaMisura(chiaveIntera, false);
    // La misura dipende solo dagli ingressi, non da `corpo`: nessun ciclo.
  }, [testo, size, minSize, altezzaMassima, chiaveIntera, etichetta, segnala, segnalaMisura, fontPronti]);

  return (
    <div
      ref={ref}
      style={{
        fontSize: `${corpo}px`,
        /*
         * Il tetto vale sulle RIGHE, non sull'inchiostro: gli si somma il
         * respiro misurato. Il respiro è anche spazio reale nel flusso — senza,
         * il titolo finirebbe addosso al claim che gli sta sotto.
         */
        maxHeight: Number.isFinite(altezzaMassima) ? altezzaMassima + respiro : altezzaMassima,
        paddingBottom: respiro,
        /*
         * Niente ritaglio, se non si sta troncando per righe con `maxRighe`.
         *
         * Non è una scelta di stile: html2canvas non applica `overflow: hidden`
         * come il browser — ritaglia sul contenuto ignorando il padding — e
         * quindi rasava i glifi **solo nel PNG**. Nel DOM il testo era intero,
         * nell'esportazione no: il difetto era invisibile all'anteprima e si
         * vedeva solo aprendo il file a 1080.
         *
         * Senza ritaglio il testo che non entra sborda e si vede, che è ciò che
         * questo componente dichiara di voler fare, e il pre-flight lo segnala
         * come errore invece di nasconderlo.
         */
        overflow: maxRighe ? "hidden" : "visible",
        display: maxRighe ? "-webkit-box" : undefined,
        WebkitLineClamp: maxRighe,
        WebkitBoxOrient: maxRighe ? "vertical" : undefined,
        ...style,
      }}
      {...resto}
    >
      {children}
    </div>
  );
}

/**
 * Segnala quando un elenco ha più voci di quante il layout ne regga.
 * Non taglia nulla: mostra tutto e avvisa.
 */
export function ControlloCapienza({ chiave, etichetta, quante, massimo }) {
  useSegnalazione(
    chiave,
    quante > massimo
      ? {
          livello: "avviso",
          messaggio: `${etichetta}: ${quante} voci, il layout ne regge ${massimo} con equilibrio. Toglierne ${quante - massimo} o passare a una variante compatta.`,
        }
      : null,
  );
  return null;
}

/* ================================================================== *
 * Elementi di cornice
 * ================================================================== */

export function MicroEtichetta({ children, colore = COLORI.accento, style }) {
  return (
    <span
      style={{
        fontFamily: FONT.etichetta,
        fontSize: TESTO.microEtichetta.size,
        fontWeight: TESTO.microEtichetta.weight,
        letterSpacing: TESTO.microEtichetta.spacing,
        textTransform: "uppercase",
        color: colore,
        lineHeight: 1,
        ...style,
      }}
    >
      {children}
    </span>
  );
}

export function Filo({ colore = COLORI.filo, style }) {
  return <div style={{ height: 1, background: colore, width: "100%", ...style }} />;
}

/** Cella dato: valore grande in Bebas, etichetta piccola spaziata. */
export function Cella({ valore, etichetta, grande = false, size, colore = COLORI.testo, coloreEtichetta = COLORI.testoDebole }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
      <span
        style={{
          fontFamily: FONT.titolo,
          fontSize: size || (grande ? TESTO.numeroXL.size : TESTO.numeroL.size),
          lineHeight: 0.9,
          color: colore,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {valore || "—"}
      </span>
      <span
        style={{
          fontFamily: FONT.etichetta,
          fontSize: TESTO.microEtichetta.size,
          letterSpacing: "0.24em",
          textTransform: "uppercase",
          color: coloreEtichetta,
        }}
      >
        {etichetta}
      </span>
    </div>
  );
}

/** Marchio. La posizione la decide il telaio: qui c'è solo la composizione. */
export function Logo({ colore = COLORI.testo, accento = COLORI.accento, scala = 1 }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14 * scala }}>
      <img
        src="/media/logo-sardegna-trail-avventura.png"
        alt=""
        width={54 * scala}
        height={54 * scala}
        style={{ width: 54 * scala, height: 54 * scala, objectFit: "contain", display: "block" }}
      />
      <span
        style={{
          fontFamily: FONT.etichetta,
          fontSize: 17 * scala,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: colore,
          lineHeight: 1.35,
          borderLeft: `1px solid ${accento}`,
          paddingLeft: 14 * scala,
        }}
      >
        Sardegna
        <br />
        Trail Avventura
      </span>
    </div>
  );
}

/** Isoipse: il richiamo cartografico del brand, tenuto molto basso. */
export function Isoipse({ larghezza, altezza, opacita = 0.05, colore = COLORI.sabbia }) {
  const linee = 14;
  return (
    <svg
      width={larghezza}
      height={altezza}
      viewBox={`0 0 ${larghezza} ${altezza}`}
      style={{ position: "absolute", inset: 0, opacity: opacita, pointerEvents: "none" }}
      aria-hidden="true"
    >
      {Array.from({ length: linee }, (_, i) => {
        const base = (altezza / linee) * (i + 0.5);
        const ampiezza = 46 + (i % 4) * 22;
        const passo = 300 + (i % 3) * 90;
        const d = Array.from({ length: 13 }, (_, k) => {
          const x = (k / 12) * larghezza;
          const y = base + Math.sin(x / passo + i * 0.7) * ampiezza;
          return `${k === 0 ? "M" : "L"}${x.toFixed(0)} ${y.toFixed(0)}`;
        }).join(" ");
        return <path key={i} d={d} fill="none" stroke={colore} strokeWidth={1.4} />;
      })}
    </svg>
  );
}
