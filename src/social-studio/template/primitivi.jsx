import React, { createContext, useCallback, useContext, useLayoutEffect, useRef, useState } from "react";
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

/**
 * Raccoglie i problemi rilevati durante il disegno.
 *
 * Il requisito è esplicito: se un contenuto non ci sta, va segnalato
 * nell'editor, non rimpicciolito fino a diventare illeggibile.
 */
export function FornitoreProblemi({ onProblemi, children }) {
  const raccolti = useRef(new Map());
  const timer = useRef(null);

  const segnala = useCallback(
    (chiave, problema) => {
      const precedente = raccolti.current.get(chiave);
      const nuovo = problema ? JSON.stringify(problema) : null;
      if ((precedente ? JSON.stringify(precedente) : null) === nuovo) return;

      if (problema === null) raccolti.current.delete(chiave);
      else raccolti.current.set(chiave, problema);

      // Si accumulano gli aggiornamenti di un ciclo di disegno in uno solo.
      clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        onProblemi?.([...raccolti.current.entries()].map(([chiave, p]) => ({ chiave, ...p })));
      }, 80);
    },
    [onProblemi],
  );

  return <ContestoProblemi.Provider value={segnala}>{children}</ContestoProblemi.Provider>;
}

export function useSegnalaProblema() {
  return useContext(ContestoProblemi) || (() => {});
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
  const segnala = useSegnalaProblema();
  const testo = testoDa(children);
  const fontPronti = useFontPronti();

  useLayoutEffect(() => {
    const el = ref.current;
    // Finché i font non sono pronti non si misura: si userebbero le metriche
    // del carattere di sistema.
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

    // Al massimo entra: niente da fare.
    if (!sbordaA(size)) {
      setCorpo(size);
      segnala(chiave, null);
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

    segnala(
      chiave,
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
    // La misura dipende solo dagli ingressi, non da `corpo`: nessun ciclo.
  }, [testo, size, minSize, altezzaMassima, chiave, etichetta, segnala, fontPronti]);

  return (
    <div
      ref={ref}
      style={{
        fontSize: `${corpo}px`,
        maxHeight: altezzaMassima,
        overflow: "hidden",
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
  const segnala = useSegnalaProblema();
  useLayoutEffect(() => {
    segnala(
      chiave,
      quante > massimo
        ? {
            livello: "avviso",
            messaggio: `${etichetta}: ${quante} voci, il layout ne regge ${massimo} con equilibrio. Toglierne ${quante - massimo} o passare a una variante compatta.`,
          }
        : null,
    );
  }, [chiave, etichetta, quante, massimo, segnala]);
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
