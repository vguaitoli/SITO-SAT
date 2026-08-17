import React from "react";
import { CATEGORIE } from "../design/categorie";
import { FORMATI } from "../design/formati";
import { COLORI, FONT, TESTO } from "../design/tokens";
import { Isoipse, Logo, MicroEtichetta } from "./primitivi";

/**
 * La cornice comune a ogni grafica.
 *
 * È la parte che il Brand Lock protegge: dimensioni della tela, margini,
 * posizione del marchio, marcatore della rubrica, numerazione. Cambia solo in
 * funzione del formato — un Post e una Story hanno aree di sicurezza diverse —
 * e della rubrica, che decide accento e densità del velo.
 *
 * Il nodo che questo componente restituisce è **lo stesso** che l'esportazione
 * fotografa: non esiste una versione «da anteprima» e una «da export». È così
 * che il WYSIWYG diventa strutturale invece di essere una promessa.
 */
export default function Telaio({
  categoria,
  formato = "post",
  numero,
  totale,
  etichetta,
  sfondo,
  children,
  conLogo = true,
  conIsoipse = true,
  riferimento,
}) {
  const rubrica = CATEGORIE[categoria];
  if (!rubrica) throw new Error(`Rubrica sconosciuta: ${categoria}`);
  const f = FORMATI[formato];
  if (!f) throw new Error(`Formato sconosciuto: ${formato}`);

  const chiaro = Boolean(rubrica.fondoChiaro);
  const coloreFondo = chiaro ? COLORI.fondoChiaro : COLORI.fondo;
  const coloreTesto = chiaro ? COLORI.testoSuChiaro : COLORI.testo;
  const coloreDebole = chiaro ? COLORI.testoSuChiaroTenue : COLORI.testoDebole;

  // Sopra il 70% di peso fotografico gli elementi grafici si fanno da parte:
  // niente isoipse, niente reticolo. È il modo in cui il peso dichiarato nella
  // rubrica diventa una conseguenza concreta e non un numero decorativo.
  const graficaDiscreta = rubrica.pesoFoto >= 70;

  return (
    <div
      ref={riferimento}
      data-slide={`${categoria}-${formato}-${numero ?? 1}`}
      style={{
        position: "relative",
        width: f.larghezza,
        height: f.altezza,
        background: coloreFondo,
        color: coloreTesto,
        fontFamily: FONT.testo,
        overflow: "hidden",
        flex: "none",
      }}
    >
      {sfondo}

      {conIsoipse && !graficaDiscreta && (
        <Isoipse
          larghezza={f.larghezza}
          altezza={f.altezza}
          opacita={chiaro ? 0.07 : 0.05}
          colore={chiaro ? COLORI.accento : COLORI.sabbia}
        />
      )}

      {/* Reticolo tecnico: due filetti sui margini, appena percettibili. */}
      {!graficaDiscreta && (
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          <div style={{ position: "absolute", top: 0, bottom: 0, left: f.margine.sinistro, width: 1, background: chiaro ? "rgba(28,24,20,0.06)" : "rgba(245,235,217,0.055)" }} />
          <div style={{ position: "absolute", top: 0, bottom: 0, right: f.margine.destro, width: 1, background: chiaro ? "rgba(28,24,20,0.06)" : "rgba(245,235,217,0.055)" }} />
        </div>
      )}

      {/* Intestazione: marcatore della rubrica a sinistra, numerazione a destra. */}
      <div
        style={{
          position: "absolute",
          top: f.margine.alto - (formato === "story" ? 90 : 12),
          left: f.margine.sinistro,
          right: f.margine.destro,
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 24,
        }}
      >
        <MicroEtichetta colore={rubrica.accento}>
          {rubrica.numero} / {rubrica.nome.toUpperCase()}
          {etichetta ? ` · ${etichetta}` : ""}
        </MicroEtichetta>

        {numero && totale > 1 && (
          <MicroEtichetta colore={coloreDebole}>
            {String(numero).padStart(2, "0")} / {String(totale).padStart(2, "0")}
          </MicroEtichetta>
        )}
      </div>

      {children}

      {conLogo && (
        <div
          style={{
            position: "absolute",
            left: f.margine.sinistro,
            bottom: f.margine.basso - (formato === "story" ? 110 : 16),
          }}
        >
          <Logo
            colore={coloreTesto}
            accento={rubrica.accento}
            scala={formato === "story" ? 1.1 : 1}
          />
        </div>
      )}

      {/* Nelle rubriche provvisorie il segno resta visibile in anteprima e
          viene tolto dall'esportazione: serve a non dimenticarsene. */}
      {rubrica.provvisoria && (
        <div
          data-solo-anteprima="true"
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            padding: "10px 16px",
            background: rubrica.accento,
            color: COLORI.fondo,
            fontFamily: FONT.etichetta,
            fontSize: TESTO.microEtichetta.size,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
          }}
        >
          Grafica provvisoria
        </div>
      )}
    </div>
  );
}
