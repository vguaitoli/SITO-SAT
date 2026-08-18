import React from "react";
import Telaio from "../../Telaio";
import { TestoAdattivo } from "../../primitivi";
import { FORMATI } from "../../../design/formati";
import { COLORI, FONT } from "../../../design/tokens";
import {
  ACCENTO, BadgeData, BadgeDisciplina, FasciaFoto, MarchioSuFoto, Prezzo, SOFT, Stats, StatoPosti,
} from "./parti";
import { periodoBreve } from "./date";

/**
 * Story evento — 1080×1920.
 *
 * Non è il Post stirato. Il 9:16 ha vincoli propri: in alto passano avatar e
 * barra di avanzamento, in basso il campo «rispondi» e lo sticker del link.
 * Titolo, dati e CTA stanno dentro l'area sicura; la fascia bassa resta libera
 * perché è lì che si mette il link.
 *
 * Rispetto al Post cambia anche la quantità di informazione: al massimo tre
 * dati invece di quattro, e nessun elenco di tappe. Una Story si guarda per
 * cinque secondi.
 */
export default function StoryEvento({ contenuto, immagini = {}, riferimento }) {
  const f = FORMATI.story;
  const dati = contenuto.fattuali || {};
  const testi = contenuto.editoriale || {};

  const GUTTER = f.margine.sinistro; // 90
  const ALTEZZA_FOTO = 1040; // 54%: la fotografia domina più che nel Post
  const BASSO_LIBERO = f.zonaSticker.dalBasso; // 340: sticker e «rispondi»

  // Tre dati, non quattro: nel 9:16 le colonne diventerebbero troppo strette.
  const colonne = [
    { etichetta: "Durata", valore: dati.durata },
    { etichetta: "Percorso", valore: dati.km },
    { etichetta: "Sterrato", valore: dati.sterrato },
  ];

  return (
    <Telaio categoria="eventi" formato="story" riferimento={riferimento} conLogo={false} conIsoipse={false}>
      <FasciaFoto
        altezza={ALTEZZA_FOTO}
        sorgente={immagini[contenuto.media?.cover?.idBlob]}
        ritaglio={contenuto.media?.cover}
      >
        {/* Il marchio scende sotto la barra di avanzamento di Instagram. */}
        <div style={{ position: "absolute", top: f.margine.alto - 60, left: GUTTER }}>
          <MarchioSuFoto scala={1.15} />
        </div>
        <div style={{ position: "absolute", top: f.margine.alto - 52, right: GUTTER }}>
          <BadgeDisciplina scala={1.1}>{dati.categoria || dati.mezzo}</BadgeDisciplina>
        </div>
        <div style={{ position: "absolute", left: GUTTER, bottom: 40, display: "flex", alignItems: "center", gap: 18 }}>
          <BadgeData scala={1.15}>{periodoBreve(dati)}</BadgeData>
          <StatoPosti stato={testi.statoPosti} scala={1.1} />
        </div>
      </FasciaFoto>

      <div
        style={{
          position: "absolute",
          top: ALTEZZA_FOTO,
          left: 0,
          right: 0,
          bottom: BASSO_LIBERO,
          padding: `44px ${GUTTER}px 0`,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <TestoAdattivo
          chiave="story-evento-titolo"
          etichetta="Titolo della Story"
          size={132}
          minSize={72}
          altezzaMassima={132 * 0.85 * 2}
          style={{
            fontFamily: FONT.titolo,
            lineHeight: 0.85,
            letterSpacing: "0.012em",
            textTransform: "uppercase",
            color: COLORI.testo,
          }}
        >
          {testi.titoloBreve || dati.nome}
        </TestoAdattivo>

        {testi.claim && (
          <TestoAdattivo
            chiave="story-evento-claim"
            etichetta="Claim della Story"
            size={28}
            minSize={20}
            altezzaMassima={28 * 1.5 * 2}
            style={{
              marginTop: 20,
              fontFamily: FONT.etichetta,
              letterSpacing: "0.18em",
              lineHeight: 1.5,
              textTransform: "uppercase",
              color: SOFT,
            }}
          >
            {testi.claim}
          </TestoAdattivo>
        )}

        <div style={{ marginTop: "auto", paddingBottom: 34 }}>
          <Stats colonne={colonne} scala={1.15} corpoValore={40} />

          <div style={{ marginTop: 30, display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 24 }}>
            <Prezzo valore={dati.prezzo} scala={1.15} corpo={92} />
          </div>
        </div>
      </div>

      {/* Zona sticker: si lascia libera, e lo si dice a chi impagina. */}
      <div
        style={{
          position: "absolute",
          left: GUTTER,
          right: GUTTER,
          bottom: BASSO_LIBERO - f.zonaSticker.altezza,
          height: f.zonaSticker.altezza,
          border: `1px dashed rgba(245,235,217,0.18)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        data-solo-anteprima="true"
      >
        <span
          style={{
            fontFamily: FONT.etichetta,
            fontSize: 20,
            letterSpacing: "0.24em",
            textTransform: "uppercase",
            color: "rgba(245,235,217,0.35)",
          }}
        >
          Spazio per lo sticker del link
        </span>
      </div>

      {/* La CTA sta sopra la zona sticker, dentro l'area sicura. */}
      {testi.cta && (
        <div style={{ position: "absolute", left: GUTTER, right: GUTTER, bottom: BASSO_LIBERO + 30 }}>
          <span
            style={{
              display: "block",
              textAlign: "center",
              fontFamily: FONT.etichetta,
              fontSize: 30,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: COLORI.testo,
              background: COLORI.verde,
              padding: "22px 28px",
            }}
          >
            {testi.cta}
          </span>
        </div>
      )}

      <div
        style={{
          position: "absolute",
          left: GUTTER,
          right: GUTTER,
          bottom: 60,
          textAlign: "center",
          fontFamily: FONT.etichetta,
          fontSize: 18,
          letterSpacing: "0.13em",
          textTransform: "uppercase",
          color: "rgba(245,235,217,0.5)",
          borderTop: `1px solid ${ACCENTO}`,
          paddingTop: 14,
        }}
      >
        sardegnatrailavventura.it
      </div>
    </Telaio>
  );
}
