import React from "react";
import { COLORI, FONT, FOTO } from "../design/tokens";

/**
 * Fotografia dentro una grafica.
 *
 * L'immagine originale non viene mai alterata: zoom, punto focale e velo sono
 * trattamenti di sola visualizzazione, applicati identici in anteprima e in
 * esportazione. Il file nella libreria resta quello caricato.
 */
export default function Foto({
  sorgente,
  ritaglio,
  velo = FOTO.velo.medio,
  filtro = FOTO.filtro,
  style,
  etichettaVuoto = "Foto da caricare",
}) {
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
          transform: `scale(${zoom})`,
          transformOrigin: `${x}% ${y}%`,
          filter: filtro,
          display: "block",
        }}
      />
      {velo && <div style={{ position: "absolute", inset: 0, background: velo }} />}
    </div>
  );
}
