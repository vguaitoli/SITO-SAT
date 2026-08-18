import React from "react";
import Foto from "../../Foto";
import Mappa from "../../Mappa";
import { FONDO, MAPPA, mood as moodDi, TELA, TIPO } from "../../../design/eventi";

/**
 * La cornice canonica di EVENTI: quattro strati, sempre nello stesso ordine.
 *
 * Tradotta da `Locandina-Via-dei-Giganti.dc.html`. È qui che vive la ragione
 * per cui il fondo di EVENTI non è un colore:
 *
 *   z0  fotografia a pieno campo, filtrata dal mood
 *   z1  traccia cartografica, `mix-blend-mode: luminosity` sotto il velo
 *   z2  velo verticale a cinque tappe, anch'esso dal mood
 *   z3  contenuto
 *
 * Il grigio caldo che si vede al centro non è dipinto da nessuno: è la
 * fotografia desaturata vista attraverso il velo al 34% in quel punto. Cambiando
 * fotografia cambia il grigio e restano costanti atmosfera e leggibilità — che
 * è esattamente ciò che un colore piatto non saprebbe fare.
 *
 * Questo telaio non porta marcatore di rubrica né numerazione: nel riferimento
 * non ci sono, e non si aggiungono. `Telaio` continua a servire Story e
 * carosello, che in questo capitolo non si toccano.
 */
export default function TelaioEvento({
  sorgente,
  ritaglio,
  segmenti = [],
  configurazioneMappa,
  mood: nomeMood,
  mostraMappa = true,
  riferimento,
  children,
}) {
  const m = moodDi(nomeMood);

  return (
    <div
      ref={riferimento}
      data-slide="eventi-post-standard"
      style={{
        position: "relative",
        width: TELA.larghezza,
        height: TELA.altezza,
        background: FONDO,
        overflow: "hidden",
        fontFamily: TIPO.claim.famiglia,
        flex: "none",
      }}
    >
      {/* z0 — la fotografia occupa tutta la tela. */}
      <Foto
        sorgente={sorgente}
        ritaglio={ritaglio}
        velo={null}
        filtro={m.filtroFoto}
        etichettaVuoto="Fotografia dell'evento"
      />

      {/*
        z1 — la traccia. Non colora: schiarisce. `luminosity` è ciò che la rende
        leggibile su qualunque fotografia senza sembrare un disegno appiccicato
        sopra, e la maschera radiale la spegne prima dei bordi.
      */}
      {mostraMappa && segmenti.length > 0 && (
        <div
          style={{
            position: "absolute",
            left: MAPPA.riquadro.sinistra,
            top: MAPPA.riquadro.alto,
            width: MAPPA.riquadro.larghezza,
            height: MAPPA.riquadro.altezza,
            zIndex: 1,
            opacity: configurazioneMappa?.opacitaDecorativa ?? MAPPA.opacita,
            mixBlendMode: MAPPA.fusione,
            WebkitMaskImage: MAPPA.maschera,
            maskImage: MAPPA.maschera,
            pointerEvents: "none",
          }}
        >
          <Mappa
            segmenti={segmenti}
            configurazione={configurazioneMappa}
            larghezza={MAPPA.riquadro.larghezza}
            altezza={MAPPA.riquadro.altezza}
            bordi={false}
          />
        </div>
      )}

      {/* z2 — il velo. */}
      <div style={{ position: "absolute", inset: 0, zIndex: 2, background: m.velo }} />

      {/* z3 — il contenuto. */}
      <div style={{ position: "absolute", inset: 0, zIndex: 3 }}>{children}</div>
    </div>
  );
}
