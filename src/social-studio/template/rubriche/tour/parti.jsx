import React, { useLayoutEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { COLORI, FONT } from "../../../design/tokens";
import {
  GAP_COLONNE,
  GEOMETRIA,
  RITMO,
  ZONE_INSTAGRAM,
  larghezzaColonna,
} from "../../../design/tour";
import {
  Filo,
  Logo,
  MicroEtichetta,
  TestoAdattivo,
  useFontPronti,
  useSegnalazione,
} from "../../primitivi";

/**
 * Le parti della rubrica TOUR.
 *
 * Non importano nulla da EVENTI: il riferimento visivo è il sistema del sito —
 * «Scegli la tua avventura» e i token di `src/index.css` — e mescolare le due
 * grafiche significherebbe rifare a TOUR il trucco che §16.5 vieta.
 *
 * Ogni parte si posiziona **in assoluto** alle coordinate di `design/tour.js`.
 * Nessun flusso verticale: una riga che manca lascia aria e non fa risalire
 * quelle sopra, così le coordinate restano numeri verificabili invece di
 * conseguenze di quanto testo è arrivato.
 */

/** Un contenitore posizionato sulla riga che gli spetta. */
function Riga({ formato, riga, children, style }) {
  const g = GEOMETRIA[formato];
  const r = g.righe[riga];
  return (
    <div
      style={{
        position: "absolute",
        left: g.area.x,
        top: r.y,
        width: g.area.larghezza,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/**
 * Il marcatore della rubrica, disegnato **qui** e non dal telaio comune.
 *
 * Il telaio mette la propria intestazione a `margine.alto − 12` nel Post e
 * `− 90` nella Story: fuori dall'area di sicurezza, e nella Story dentro i
 * ~250 px che l'interfaccia di Instagram copre. Per TOUR il marcatore è
 * informazione leggibile e sta dentro l'area utile, alla riga dichiarata.
 */
export function IntestazioneTour({ formato }) {
  const g = GEOMETRIA[formato];
  return (
    <div
      style={{
        position: "absolute",
        left: g.area.x,
        top: g.intestazione.y,
        width: g.area.larghezza,
        height: g.intestazione.altezza,
      }}
      data-parte="intestazione"
    >
      <MicroEtichetta colore={COLORI.sabbia} style={{ lineHeight: `${RITMO.intestazione.riga}px` }}>
        01 / TOUR
      </MicroEtichetta>
    </div>
  );
}

/**
 * Il marchio, anch'esso locale.
 *
 * Nella Story il logo del telaio comune finirebbe a y 1631, cioè **dentro** la
 * fascia del Link Sticker: un marchio sotto uno sticker è un marchio che non si
 * vede. Qui sta al fondo dell'area utile, con lo stacco dichiarato dalla fascia.
 */
export function MarchioTour({ formato }) {
  const g = GEOMETRIA[formato];
  return (
    <div
      style={{ position: "absolute", left: g.area.x, top: g.marchio.y }}
      data-parte="marchio"
    >
      <Logo colore={COLORI.testo} accento={COLORI.accento} scala={g.marchio.scala} />
    </div>
  );
}

/** Il kicker: `TOUR / {TIPOLOGIA}`, in accento. Senza tipologia resta muto. */
export function KickerTour({ formato, tipologia }) {
  if (!tipologia) return null;
  return (
    <Riga formato={formato} riga="kicker" style={{ height: RITMO.kicker.riga }}>
      <MicroEtichetta
        colore={COLORI.accento}
        style={{
          fontSize: RITMO.kicker.size,
          letterSpacing: RITMO.kicker.spaziatura,
          lineHeight: `${RITMO.kicker.riga}px`,
        }}
      >
        TOUR / {String(tipologia).toUpperCase()}
      </MicroEtichetta>
    </Riga>
  );
}

/** Il titolo, in maiuscolo come il resto del sistema tipografico della tela. */
export function TitoloTour({ formato, testo }) {
  const g = GEOMETRIA[formato];
  if (!testo) return null;
  return (
    <Riga formato={formato} riga="titolo">
      <TestoAdattivo
        chiave="titolo"
        etichetta="Titolo"
        size={RITMO.titolo.size}
        minSize={RITMO.titolo.minSize}
        altezzaMassima={g.righe.titolo.altezza}
        /*
         * Niente `maxRighe`. Il ritaglio per righe è un `-webkit-box` che taglia
         * sul **blocco di riga**, e con `line-height` 0.88 l'inchiostro del Bebas
         * sporge sempre da quel blocco: nel PNG i titoli venivano rasati a
         * mezza altezza. `altezzaMassima` basta — rimpicciolisce fin dove può e
         * poi segnala — e il testo che davvero non entra si vede sbordare
         * invece di essere nascosto a metà.
         */
        style={{
          fontFamily: FONT.titolo,
          lineHeight: RITMO.titolo.interlinea,
          letterSpacing: "0.02em",
          textTransform: "uppercase",
          color: COLORI.testo,
        }}
      >
        {testo}
      </TestoAdattivo>
    </Riga>
  );
}

/**
 * Il claim: o entra intero, o non c'è — e se non c'è lo dice.
 *
 * Le due strade sbagliate erano entrambe a portata di mano. Troncarlo con i
 * puntini avrebbe pubblicato una frase a metà; ometterlo e basta l'avrebbe
 * fatto sparire senza che nessuno se ne accorgesse fino a grafica pubblicata.
 * Si misura, e se non entra si toglie **registrando un avviso**: chi lavora
 * scopre che manca mentre può ancora accorciarlo.
 *
 * Un claim vuoto non è un problema e non produce nessun avviso: è una scelta di
 * scrittura, e lo schema lo lascia vuoto per definizione.
 */
export function ClaimTour({ formato, testo }) {
  const g = GEOMETRIA[formato];
  const sonda = useRef(null);
  const fontPronti = useFontPronti();
  const [entra, setEntra] = useState(null);
  const tetto = g.righe.claim.altezza;

  useLayoutEffect(() => {
    if (!testo) {
      setEntra(null);
      return;
    }
    const el = sonda.current;
    if (!el || !fontPronti) return;
    setEntra(el.offsetHeight <= tetto + 1);
  }, [testo, tetto, fontPronti]);

  useSegnalazione(
    "claim",
    testo && entra === false
      ? {
          livello: "avviso",
          messaggio: `Claim: omesso perché non entra in ${g.righeClaim === 1 ? "una riga" : `${g.righeClaim} righe`}. Accorcialo per farlo comparire.`,
        }
      : null,
  );

  if (!testo) return null;

  const stile = {
    fontFamily: FONT.testo,
    fontSize: RITMO.claim.size,
    lineHeight: RITMO.claim.interlinea,
    color: COLORI.testoTenue,
    width: g.area.larghezza,
  };

  return (
    <>
      {/*
        La sonda misura il testo alla larghezza vera, fuori dal flusso e senza
        disegnare niente. `visibility: hidden` la tiene fuori anche dal PNG.
      */}
      <div
        ref={sonda}
        aria-hidden="true"
        style={{
          ...stile,
          position: "absolute",
          left: g.area.x,
          top: g.righe.claim.y,
          visibility: "hidden",
          pointerEvents: "none",
        }}
      >
        {testo}
      </div>
      {entra === true && (
        <Riga formato={formato} riga="claim">
          <div style={stile} data-parte="claim">
            {testo}
          </div>
        </Riga>
      )}
    </>
  );
}

/**
 * Una cella dato.
 *
 * Non riusa `Cella` dei primitivi per una ragione sola: quella tronca il valore
 * con i puntini **in silenzio**, e il contratto TOUR chiede che un valore
 * selezionato che non entra si faccia sentire. Qui il valore passa da
 * `TestoAdattivo`, che rimpicciolisce fin dove può e poi segnala.
 */
function CellaTour({ campo, valore, etichetta, larghezza }) {
  return (
    <div style={{ width: larghezza, minWidth: 0 }} data-parte="dato" data-campo={campo}>
      <TestoAdattivo
        chiave={`dato-${campo}`}
        etichetta={etichetta}
        size={RITMO.dato.valore.size}
        minSize={RITMO.dato.valore.minSize}
        altezzaMassima={RITMO.dato.valore.riga}
        style={{
          fontFamily: FONT.titolo,
          lineHeight: 0.9,
          color: COLORI.testo,
        }}
      >
        {valore}
      </TestoAdattivo>
      <div
        style={{
          marginTop: RITMO.dato.interstizio,
          fontFamily: FONT.etichetta,
          fontSize: RITMO.dato.etichetta.size,
          letterSpacing: RITMO.dato.etichetta.spaziatura,
          lineHeight: `${RITMO.dato.etichetta.riga}px`,
          textTransform: "uppercase",
          color: COLORI.testoDebole,
        }}
      >
        {etichetta}
      </div>
    </div>
  );
}

/**
 * Il filetto e la riga dei dati.
 *
 * Senza dati non si disegna niente: né celle vuote, né il filetto che le
 * introduce. Un filo sospeso sopra il nulla racconterebbe che qualcosa manca.
 */
export function DatiTour({ formato, dati }) {
  if (!dati.length) return null;
  const larghezza = larghezzaColonna(formato, dati.length);
  return (
    <>
      <Riga formato={formato} riga="filo" style={{ height: 1 }}>
        <div data-parte="filo">
          <Filo colore={COLORI.filo} />
        </div>
      </Riga>
      <Riga formato={formato} riga="dati" style={{ height: GEOMETRIA[formato].righe.dati.altezza }}>
        <div style={{ display: "flex", gap: GAP_COLONNE }}>
          {dati.map((d) => (
            <CellaTour key={d.campo} {...d} larghezza={larghezza} />
          ))}
        </div>
      </Riga>
    </>
  );
}

/**
 * La CTA: solo `editoriale.cta`, mai l'URL.
 *
 * L'indirizzo di destinazione è un dato operativo e resta fuori dalla grafica:
 * disegnarlo lo pubblicherebbe in un'immagine che nessuno può correggere dopo.
 * Con la CTA vuota non resta una freccia sola — una freccia che non dice dove
 * porta è un invito senza destinazione — ma non resta niente.
 */
export function CtaTour({ formato, testo }) {
  if (!testo) return null;
  return (
    <Riga formato={formato} riga="cta" style={{ height: RITMO.cta.riga }}>
      <span
        data-parte="cta"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 12,
          fontFamily: FONT.etichetta,
          fontSize: RITMO.cta.size,
          letterSpacing: RITMO.cta.spaziatura,
          lineHeight: `${RITMO.cta.riga}px`,
          textTransform: "uppercase",
          color: COLORI.sabbia,
        }}
      >
        {testo}
        <ArrowRight size={20} aria-hidden="true" />
      </span>
    </Riga>
  );
}

/**
 * La guida della fascia Link Sticker: **solo anteprima**.
 *
 * Serve a chi compone per vedere dove non deve mettere niente.
 * `data-solo-anteprima` è lo stesso segno che la cattura spegne prima di
 * fotografare: nel PNG non c'è.
 */
export function GuidaSticker() {
  const z = ZONE_INSTAGRAM.sticker;
  return (
    <div
      data-solo-anteprima="true"
      aria-hidden="true"
      style={{
        position: "absolute",
        left: z.x,
        top: z.y,
        width: z.larghezza,
        height: z.altezza,
        border: `1px dashed ${COLORI.filoForte}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: FONT.etichetta,
        fontSize: 20,
        letterSpacing: "0.24em",
        textTransform: "uppercase",
        color: COLORI.testoDebole,
        pointerEvents: "none",
      }}
    >
      Link sticker — lasciare libero
    </div>
  );
}
