import React from "react";
import Foto from "../../Foto";
import { TestoAdattivo } from "../../primitivi";
import { COLORI, FONT } from "../../../design/tokens";

/**
 * Parti condivise dei formati EVENTI.
 *
 * Derivano dalla locandina del progetto (docs/locandina-template.html) e dal
 * suo raster: la fotografia tiene la fascia alta e resta libera da testo, il
 * testo vive sulla fascia scura sotto, i dati stanno in una griglia di colonne
 * divise da filetti, il piede porta contatti e sito.
 *
 * La locandina è 1080×1080. Qui la gerarchia è la stessa ma le proporzioni sono
 * ricalcolate sul master 1080×1350: la fotografia tiene circa la stessa
 * frazione di altezza (51%), e lo spazio guadagnato va alla fascia dati, che
 * nella locandina era compressa.
 *
 * Colori: token del sito, con #E18A3C come unico accento aggiunto e riservato
 * a questa rubrica. Il bronzo #C98B4B della locandina è sostituito dalla sabbia
 * #E4D4B0, che è un token del sito.
 */

/** Il velo della locandina: scuro in alto per il marchio, scuro in basso per il raccordo. */
export const VELO_FOTO =
  "linear-gradient(to bottom, rgba(28,24,20,0.72) 0%, rgba(28,24,20,0.10) 22%, rgba(28,24,20,0) 38%), " +
  "linear-gradient(to top, rgba(28,24,20,1) 0%, rgba(28,24,20,0.55) 12%, rgba(28,24,20,0) 30%)";

export const ACCENTO = "#E18A3C";
export const SOFT = COLORI.sabbia;

/** Marchio sulla fotografia, in alto a sinistra come nella locandina. */
export function MarchioSuFoto({ scala = 1 }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 17 * scala }}>
      <img
        src="/media/logo-sardegna-trail-avventura.png"
        alt=""
        width={70 * scala}
        height={70 * scala}
        style={{ width: 70 * scala, height: 70 * scala, objectFit: "contain", display: "block" }}
      />
      <span
        style={{
          fontFamily: FONT.etichetta,
          fontSize: 18 * scala,
          lineHeight: 1.26,
          letterSpacing: "0.21em",
          textTransform: "uppercase",
          color: COLORI.testo,
        }}
      >
        Sardegna
        <br />
        Trail Avventura
      </span>
    </div>
  );
}

/** Etichetta della data: fondo pieno d'accento, come `.when` nella locandina. */
export function BadgeData({ children, scala = 1 }) {
  if (!children) return null;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        background: ACCENTO,
        color: COLORI.fondo,
        fontFamily: FONT.etichetta,
        fontWeight: 500,
        fontSize: 22 * scala,
        letterSpacing: "0.15em",
        textTransform: "uppercase",
        padding: `${12 * scala}px ${22 * scala}px`,
      }}
    >
      {children}
    </span>
  );
}

/** Badge della disciplina, riquadrato: viene dal raster della locandina. */
export function BadgeDisciplina({ children, scala = 1 }) {
  if (!children) return null;
  return (
    <span
      style={{
        display: "inline-block",
        border: `2px solid ${ACCENTO}`,
        color: ACCENTO,
        fontFamily: FONT.etichetta,
        fontWeight: 500,
        fontSize: 22 * scala,
        letterSpacing: "0.2em",
        textTransform: "uppercase",
        padding: `${11 * scala}px ${20 * scala}px`,
      }}
    >
      {children}
    </span>
  );
}

/**
 * Fascia fotografica superiore.
 * La fotografia resta libera da testo: il mezzo è il soggetto.
 */
export function FasciaFoto({ altezza, sorgente, ritaglio, children }) {
  return (
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: altezza, overflow: "hidden" }}>
      <Foto
        sorgente={sorgente}
        ritaglio={ritaglio || { zoom: 1, x: 0.5, y: 0.46 }}
        velo={VELO_FOTO}
        etichettaVuoto="Fotografia dell'evento"
      />
      {children}
    </div>
  );
}

/**
 * Griglia dei dati, con i filetti della locandina.
 *
 * I valori vanno a capo invece di troncarsi: «29 ottobre – 1 novembre» è un
 * dato, non un dettaglio da abbreviare con i puntini.
 */
export function Stats({ colonne, scala = 1, corpoValore = 38 }) {
  return (
    <div
      style={{
        display: "flex",
        borderTop: `1px solid rgba(245,235,217,0.22)`,
        borderBottom: `1px solid rgba(245,235,217,0.22)`,
      }}
    >
      {colonne.map((c, i) => (
        <div
          key={c.etichetta}
          style={{
            flex: 1,
            minWidth: 0,
            padding: `${17 * scala}px ${i === 0 ? 0 : 18 * scala}px ${15 * scala}px ${i === 0 ? 0 : 18 * scala}px`,
            borderLeft: i === 0 ? "none" : "1px solid rgba(245,235,217,0.16)",
          }}
        >
          <span
            style={{
              display: "block",
              fontFamily: FONT.etichetta,
              fontSize: 13 * scala,
              letterSpacing: "0.19em",
              textTransform: "uppercase",
              color: "rgba(245,235,217,0.55)",
              marginBottom: 6 * scala,
            }}
          >
            {c.etichetta}
          </span>
          <TestoAdattivo
            chiave={`stat-${c.etichetta}`}
            etichetta={`Dato «${c.etichetta}»`}
            size={corpoValore * scala}
            minSize={Math.round(corpoValore * scala * 0.62)}
            altezzaMassima={corpoValore * scala * 2.1}
            style={{
              fontFamily: FONT.titolo,
              lineHeight: 1,
              color: SOFT,
              // Nessun nowrap: il testo va a capo, non si tronca.
              overflowWrap: "anywhere",
            }}
          >
            {c.valore || "—"}
          </TestoAdattivo>
        </div>
      ))}
    </div>
  );
}

/** Riga del percorso: le tappe in sequenza, come `.route` nella locandina. */
export function Percorso({ tappe, puntiInteresse, scala = 1 }) {
  const tratte = tappe?.length
    ? [tappe[0]?.partenza, ...tappe.map((t) => t.arrivo)].filter(Boolean)
    : puntiInteresse || [];
  if (!tratte.length) return null;

  return (
    <TestoAdattivo
      chiave="eventi-percorso"
      etichetta="Percorso"
      size={18 * scala}
      minSize={14 * scala}
      altezzaMassima={18 * scala * 1.6 * 2}
      style={{ fontSize: 18 * scala, lineHeight: 1.6, color: "rgba(245,235,217,0.85)" }}
    >
      {tratte.map((t, i) => (
        <React.Fragment key={`${t}-${i}`}>
          {i > 0 && <span style={{ color: SOFT }}> · </span>}
          <b style={{ color: i === 0 || i === tratte.length - 1 ? SOFT : "inherit", fontWeight: 600 }}>
            {t}
          </b>
        </React.Fragment>
      ))}
    </TestoAdattivo>
  );
}

/**
 * Prezzo con la dizione «a persona» accanto, sulla stessa linea di base.
 *
 * Nella versione precedente l'etichetta stava sotto il numero, in posizione
 * assoluta, e finiva sopra la colonna del livello. Qui la collisione non è
 * corretta: è impossibile, perché i due elementi stanno nello stesso flusso.
 */
export function Prezzo({ valore, scala = 1, corpo = 84 }) {
  if (!valore) return null;
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 14 * scala, minWidth: 0 }}>
      <span
        style={{
          fontFamily: FONT.titolo,
          fontSize: corpo * scala,
          lineHeight: 0.9,
          color: ACCENTO,
          whiteSpace: "nowrap",
        }}
      >
        {valore}
      </span>
      <span
        style={{
          fontFamily: FONT.etichetta,
          fontSize: 17 * scala,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: "rgba(245,235,217,0.55)",
          whiteSpace: "nowrap",
        }}
      >
        a persona
      </span>
    </div>
  );
}

/** Piede: nota a sinistra, sito a destra sottolineato d'accento. */
export function Piede({ nota, sito = "sardegnatrailavventura.it", scala = 1 }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 24 * scala }}>
      <span style={{ fontSize: 15 * scala, color: "rgba(245,235,217,0.58)", minWidth: 0 }}>{nota}</span>
      <span
        style={{
          flex: "none",
          fontFamily: FONT.etichetta,
          fontSize: 18 * scala,
          letterSpacing: "0.13em",
          textTransform: "uppercase",
          color: COLORI.testo,
          borderBottom: `2px solid ${ACCENTO}`,
          paddingBottom: 5 * scala,
        }}
      >
        {sito}
      </span>
    </div>
  );
}

/** Stato dei posti, quando non è quello ordinario. */
export function StatoPosti({ stato, scala = 1 }) {
  const etichette = { ultimi: "Ultimi posti", soldout: "Sold out", attesa: "Lista d'attesa" };
  const testo = etichette[stato];
  if (!testo) return null;
  const soldOut = stato === "soldout";
  return (
    <span
      style={{
        display: "inline-block",
        fontFamily: FONT.etichetta,
        fontSize: 16 * scala,
        letterSpacing: "0.22em",
        textTransform: "uppercase",
        padding: `${8 * scala}px ${16 * scala}px`,
        color: soldOut ? COLORI.testo : COLORI.fondo,
        background: soldOut ? "transparent" : SOFT,
        border: soldOut ? `1px solid rgba(245,235,217,0.4)` : "none",
      }}
    >
      {testo}
    </span>
  );
}
