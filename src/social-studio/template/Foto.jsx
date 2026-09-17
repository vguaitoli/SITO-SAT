import React, { useEffect, useState } from "react";
import { COLORI, FONT, FOTO } from "../design/tokens";
import { geometriaCover } from "./geometria-foto";
import { useChiaveProblema, useSegnalaMisura, useSegnalazione } from "./primitivi";

/**
 * Fotografia dentro una grafica.
 *
 * L'immagine originale non viene mai alterata: zoom, punto focale e velo sono
 * trattamenti di sola visualizzazione, applicati identici in anteprima e in
 * esportazione. Il file nella libreria resta quello caricato.
 *
 * **Due modi di posizionare, e il secondo esiste per l'esportazione.** Quello
 * predefinito usa `object-fit: cover`: è ciò che tutte le grafiche EVENTI hanno
 * sempre fatto e non cambia di un pixel. Passando `dimensioni` si ottiene
 * invece la geometria **esplicita** di `geometria-foto.js` — larghezza, altezza
 * e offset in pixel — perché html2canvas 1.4.1 `object-fit` non lo legge e
 * deformava la fotografia nel solo PNG.
 */
export default function Foto({
  sorgente,
  ritaglio,
  velo = FOTO.velo.medio,
  filtro = FOTO.filtro,
  style,
  etichettaVuoto = "Foto da caricare",
  /**
   * Le dimensioni reali del riquadro, in pixel.
   *
   * Presenti, attivano la geometria esplicita. Assenti — cioè dappertutto dove
   * `Foto` era già usata — non cambia niente.
   */
  dimensioni,
  /** Chiave con cui dichiarare al registro che le misure non sono pronte. */
  chiave = "foto",
}) {
  // `specchiata` è un dato del ritaglio, non una proprietà del template: sta
  // accanto a zoom e punto focale, si salva con la bozza e per definizione è
  // spenta. Nel riferimento EVENTI una fotografia è ribaltata, ma è una scelta
  // su quella fotografia — non una regola del format.
  const specchiata = Boolean(ritaglio?.specchiata);

  /*
   * Le dimensioni intrinseche del file, **legate alla sorgente che le ha
   * prodotte**.
   *
   * Tenerle in uno stato anonimo non bastava. Cambiando fotografia, il primo
   * render successivo aveva già la sorgente nuova e ancora le misure della
   * vecchia: una panoramica 1800×832 sostituita da una verticale 900×1600
   * veniva disegnata a 2920×1350, con il registro che dichiarava **zero**
   * misure in sospeso — cioè con il via libera a fotografarla. Azzerare lo
   * stato in un effetto arriva dopo, e dopo è già stato disegnato.
   *
   * Portandosi dietro la sorgente, il confronto si fa **durante il render**: la
   * geometria di prima non è utilizzabile nemmeno per un fotogramma, e una
   * risposta tardiva di una richiesta superata non ha modo di rientrare.
   */
  const [esitoFoto, setEsitoFoto] = useState(null);
  const segnalaMisura = useSegnalaMisura();
  // Con l'ambito: due copie della stessa grafica — l'anteprima e quella che
  // viene fotografata — non devono condividere una voce del registro, o
  // liberarne una libererebbe anche l'altra.
  const chiaveIntera = useChiaveProblema(chiave);
  const esplicita = Boolean(dimensioni);

  /*
   * Un esito solo, non due stati separati.
   *
   * Con `misurata` e `fallita` distinti, una sorgente che prima falliva e poi
   * caricava lasciava indietro il proprio fallimento: la geometria tornava
   * giusta e l'errore restava appeso, perché nessuno lo cancellava. Tenendo un
   * esito unico per sorgente, il successo **sostituisce** il fallimento invece
   * di affiancarlo, e il confronto con la sorgente resta dov'era — durante il
   * render, non in un effetto che arriva dopo.
   */
  const suo = esitoFoto && esitoFoto.sorgente === sorgente ? esitoFoto : null;
  const intrinseca =
    suo && !suo.fallita ? { larghezza: suo.larghezza, altezza: suo.altezza } : null;
  const nonCaricata = Boolean(suo?.fallita);

  useEffect(() => {
    if (!esplicita || !sorgente) return undefined;
    let vivo = true;
    const img = new Image();
    const prendi = () => {
      if (!vivo || !img.naturalWidth || !img.naturalHeight) return;
      setEsitoFoto({ sorgente, larghezza: img.naturalWidth, altezza: img.naturalHeight });
    };
    img.onload = prendi;
    img.onerror = () => {
      if (vivo) setEsitoFoto({ sorgente, fallita: true });
    };
    img.src = sorgente;
    // Una sorgente già in cache è `complete` subito e `onload` non scatta.
    if (img.complete) prendi();
    return () => {
      vivo = false;
    };
  }, [esplicita, sorgente]);

  /*
   * In sospeso finché le dimensioni non arrivano. È lo stesso canale che
   * `TestoAdattivo` usa per i font: chi esporta sa di non poter ancora
   * decidere, invece di fotografare un riquadro vuoto e non accorgersene.
   *
   * Resta in sospeso anche quando il caricamento è fallito: non c'è nessuna
   * geometria, e dire «pronto» sarebbe la bugia più costosa. Il perché lo dice
   * la segnalazione qui sotto.
   */
  const inAttesa = esplicita && Boolean(sorgente) && !intrinseca;
  useEffect(() => {
    if (!inAttesa) return undefined;
    segnalaMisura(chiaveIntera, true);
    return () => segnalaMisura(chiaveIntera, false);
  }, [inAttesa, segnalaMisura, chiaveIntera]);

  useSegnalazione(
    chiave,
    esplicita && nonCaricata
      ? {
          livello: "errore",
          messaggio: "Fotografia: non si è potuta caricare, quindi non se ne conoscono le dimensioni. Verifica il file prima di esportare.",
        }
      : null,
  );

  if (!sorgente) {
    return (
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `repeating-linear-gradient(135deg, ${COLORI.fondoAlt} 0px, ${COLORI.fondoAlt} 14px, ${COLORI.fondo} 14px, ${COLORI.fondo} 28px)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          ...style,
        }}
      >
        <span
          style={{
            fontFamily: FONT.etichetta,
            fontSize: 22,
            letterSpacing: "0.24em",
            textTransform: "uppercase",
            color: COLORI.testoDebole,
            border: `1px solid ${COLORI.filo}`,
            padding: "12px 22px",
          }}
        >
          {etichettaVuoto}
        </span>
      </div>
    );
  }

  const zoom = ritaglio?.zoom ?? 1;
  const x = (ritaglio?.x ?? 0.5) * 100;
  const y = (ritaglio?.y ?? 0.5) * 100;

  if (esplicita) {
    const g = geometriaCover({
      intrinseca,
      contenitore: dimensioni,
      zoom,
      x: ritaglio?.x ?? 0.5,
      y: ritaglio?.y ?? 0.5,
    });
    return (
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", ...style }}>
        {g && (
          <img
            src={sorgente}
            alt=""
            /*
             * Larghezza e altezza in pixel, nessun `object-fit`, nessuna
             * percentuale: il riquadro dell'immagine ha già le proporzioni del
             * file, e chi lo disegna — browser o html2canvas — deve applicare
             * una scala sola. Il ritaglio lo fa l'`overflow: hidden` del
             * contenitore, non una deformazione.
             */
            style={{
              position: "absolute",
              left: g.sinistra,
              top: g.alto,
              width: g.larghezza,
              height: g.altezza,
              transform: specchiata ? "scaleX(-1)" : undefined,
              transformOrigin: "center",
              filter: filtro,
              display: "block",
              maxWidth: "none",
            }}
          />
        )}
        {velo && <div style={{ position: "absolute", inset: 0, background: velo }} />}
      </div>
    );
  }

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", ...style }}>
      <img
        src={sorgente}
        alt=""
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: `${x}% ${y}%`,
          transform: `scale(${zoom})${specchiata ? " scaleX(-1)" : ""}`,
          transformOrigin: `${x}% ${y}%`,
          filter: filtro,
          display: "block",
        }}
      />
      {velo && <div style={{ position: "absolute", inset: 0, background: velo }} />}
    </div>
  );
}
