import React, { createContext, useCallback, useContext, useLayoutEffect, useRef, useState } from "react";
import {
  Bed, Coffee, Utensils, Compass, Wrench, Luggage, Satellite, ShieldCheck,
  Fuel, Truck, Camera, Gift, Check, X,
} from "lucide-react";
import { COLORI, FONT, MARGINE, TELA, TESTO, TOTALE_SLIDE } from "./tokens";

/**
 * Elementi condivisi da tutte le slide.
 *
 * Sono la parte immutabile del format: cornice, margini, posizione del logo,
 * numerazione, micro-etichette, filetti. Le singole slide compongono solo il
 * contenuto dentro questa struttura.
 */

/* ------------------------------------------------------------------ *
 * Segnalazione degli sfori
 * ------------------------------------------------------------------ */

const ContestoProblemi = createContext(null);

/**
 * Raccoglie gli sfori di testo rilevati durante il disegno delle slide.
 *
 * Il requisito è esplicito: se un contenuto non ci sta, va segnalato
 * nell'editor, non rimpicciolito fino a diventare illeggibile.
 */
export function FornitoreProblemi({ onProblemi, children }) {
  const raccolti = useRef(new Map());
  const timer = useRef(null);

  const segnala = useCallback(
    (chiave, messaggio) => {
      const precedente = raccolti.current.get(chiave);
      if (precedente === messaggio) return;
      if (messaggio === null) raccolti.current.delete(chiave);
      else raccolti.current.set(chiave, messaggio);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        onProblemi?.(Array.from(raccolti.current.entries()).map(([k, m]) => ({ chiave: k, messaggio: m })));
      }, 80);
    },
    [onProblemi],
  );

  return <ContestoProblemi.Provider value={segnala}>{children}</ContestoProblemi.Provider>;
}

export function useSegnalaProblema() {
  return useContext(ContestoProblemi) || (() => {});
}

/* ------------------------------------------------------------------ *
 * Testo che si adatta
 * ------------------------------------------------------------------ */

/**
 * Riduce il corpo del testo finché entra nello spazio, entro un minimo.
 *
 * Sotto il minimo non scende: a quel punto segnala il problema e lascia il
 * testo leggibile ma sbordante, così l'errore è evidente nell'anteprima.
 */
export function TestoAdattivo({
  children,
  chiave,
  etichettaProblema,
  size,
  minSize,
  maxRighe,
  style,
  ...resto
}) {
  const ref = useRef(null);
  const [corpo, setCorpo] = useState(size);
  const segnala = useSegnalaProblema();

  useLayoutEffect(() => {
    setCorpo(size);
  }, [size, children]);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const sbordaAltezza = () => el.scrollHeight > el.clientHeight + 1;
    if (!sbordaAltezza()) {
      segnala(chiave, null);
      return;
    }
    let attuale = corpo;
    // Riduzione a passi dell'8%: poche iterazioni, nessun tremolio visibile.
    while (attuale > minSize && el.scrollHeight > el.clientHeight + 1) {
      attuale = Math.max(minSize, Math.round(attuale * 0.92));
      el.style.fontSize = `${attuale}px`;
    }
    if (attuale !== corpo) setCorpo(attuale);
    segnala(
      chiave,
      el.scrollHeight > el.clientHeight + 1
        ? `${etichettaProblema}: il testo non entra nello spazio previsto. Accorcialo.`
        : null,
    );
  });

  return (
    <div
      ref={ref}
      style={{
        fontSize: `${corpo}px`,
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
        ? `${etichetta}: ${quante} voci, il layout ne regge ${massimo}. Toglierne ${quante - massimo}.`
        : null,
    );
  }, [chiave, etichetta, quante, massimo, segnala]);
  return null;
}

/* ------------------------------------------------------------------ *
 * Cornice
 * ------------------------------------------------------------------ */

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

/** Reticolo tecnico discreto: due filetti verticali ai margini. */
function Reticolo() {
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      <div style={{ position: "absolute", top: 0, bottom: 0, left: MARGINE, width: 1, background: "rgba(245,235,217,0.055)" }} />
      <div style={{ position: "absolute", top: 0, bottom: 0, right: MARGINE, width: 1, background: "rgba(245,235,217,0.055)" }} />
    </div>
  );
}

/**
 * Texture topografica discreta: isoipse morbide generate una volta sola.
 * È il richiamo cartografico del brand, tenuto molto basso di contrasto.
 */
function Isoipse({ opacita = 0.05 }) {
  return (
    <svg
      width={TELA.larghezza}
      height={TELA.altezza}
      viewBox={`0 0 ${TELA.larghezza} ${TELA.altezza}`}
      style={{ position: "absolute", inset: 0, opacity: opacita, pointerEvents: "none" }}
      aria-hidden="true"
    >
      {Array.from({ length: 14 }, (_, i) => {
        const base = 120 + i * 96;
        const ampiezza = 46 + (i % 4) * 22;
        const passo = 300 + (i % 3) * 90;
        const d = Array.from({ length: 13 }, (_, k) => {
          const x = (k / 12) * TELA.larghezza;
          const y = base + Math.sin((x / passo) + i * 0.7) * ampiezza;
          return `${k === 0 ? "M" : "L"}${x.toFixed(0)} ${y.toFixed(0)}`;
        }).join(" ");
        return <path key={i} d={d} fill="none" stroke={COLORI.sabbia} strokeWidth={1.4} />;
      })}
    </svg>
  );
}

/** Marchio: sempre nello stesso punto, in basso a sinistra. */
export function Logo({ colore = COLORI.testo }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <img
        src="/media/logo-sardegna-trail-avventura.png"
        alt=""
        width={54}
        height={54}
        style={{ width: 54, height: 54, objectFit: "contain", display: "block" }}
      />
      <span
        style={{
          fontFamily: FONT.etichetta,
          fontSize: 17,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: colore,
          lineHeight: 1.35,
          borderLeft: `1px solid ${COLORI.accento}`,
          paddingLeft: 14,
        }}
      >
        Sardegna
        <br />
        Trail Avventura
      </span>
    </div>
  );
}

/**
 * La cornice di ogni slide: dimensioni, fondo, texture, numerazione, logo.
 *
 * @param {object} props
 * @param {number} props.numero          progressivo della slide
 * @param {string} [props.etichetta]     micro-etichetta in alto a sinistra
 * @param {React.ReactNode} [props.sfondo]  livello fotografico sotto al contenuto
 * @param {boolean} [props.conLogo]
 */
export function Telaio({ numero, etichetta, sfondo, children, conLogo = true, isoipse = true }) {
  return (
    <div
      style={{
        position: "relative",
        width: TELA.larghezza,
        height: TELA.altezza,
        background: COLORI.fondo,
        color: COLORI.testo,
        fontFamily: FONT.testo,
        overflow: "hidden",
        flex: "none",
      }}
    >
      {sfondo}
      {isoipse && <Isoipse />}
      <Reticolo />

      {/* Intestazione: etichetta a sinistra, numerazione a destra. */}
      <div
        style={{
          position: "absolute",
          top: MARGINE - 12,
          left: MARGINE,
          right: MARGINE,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <MicroEtichetta>{etichetta}</MicroEtichetta>
        <MicroEtichetta colore={COLORI.testoDebole}>
          {String(numero).padStart(2, "0")} / {String(TOTALE_SLIDE).padStart(2, "0")}
        </MicroEtichetta>
      </div>

      {children}

      {conLogo && (
        <div style={{ position: "absolute", left: MARGINE, bottom: MARGINE - 16 }}>
          <Logo />
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Griglia tecnica
 * ------------------------------------------------------------------ */

/** Una cella dato: valore grande in Bebas, etichetta piccola spaziata. */
export function Cella({ valore, etichetta, grande = false }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
      <span
        style={{
          fontFamily: FONT.titolo,
          fontSize: grande ? TESTO.numeroXL.size : TESTO.numeroL.size,
          lineHeight: 0.9,
          color: COLORI.testo,
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
          color: COLORI.testoDebole,
        }}
      >
        {etichetta}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Icone — le stesse del sito (lucide), per non introdurre un secondo stile
 * ------------------------------------------------------------------ */

const ICONE = {
  letto: Bed,
  caffe: Coffee,
  posate: Utensils,
  guida: Compass,
  chiave: Wrench,
  bagaglio: Luggage,
  gps: Satellite,
  scudo: ShieldCheck,
  carburante: Fuel,
  furgone: Truck,
  foto: Camera,
  regalo: Gift,
  spunta: Check,
  croce: X,
};

export function Icona({ nome, size = 30, colore = COLORI.accento, strokeWidth = 1.6 }) {
  const Componente = ICONE[nome] || Check;
  return <Componente size={size} color={colore} strokeWidth={strokeWidth} aria-hidden="true" />;
}
