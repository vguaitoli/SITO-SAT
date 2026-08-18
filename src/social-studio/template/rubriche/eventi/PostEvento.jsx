import React from "react";
import Telaio from "../../Telaio";
import { TestoAdattivo } from "../../primitivi";
import { FORMATI } from "../../../design/formati";
import { COLORI, FONT } from "../../../design/tokens";
import {
  BadgeData, BadgeDisciplina, FasciaFoto, MarchioSuFoto, Percorso, Piede, Prezzo, Stats, StatoPosti, SOFT,
} from "./parti";
import { periodoBreve, periodoLeggibile } from "./date";

/**
 * Post evento — 1080×1350.
 *
 * Gerarchia della locandina del progetto, riproporzionata sul master 4:5: la
 * fotografia tiene la fascia alta e resta libera da testo, il testo vive sulla
 * fascia scura sotto, i dati in quattro colonne divise da filetti, il percorso
 * in una riga, il piede con nota e sito.
 *
 * Lo spazio guadagnato passando da 1080 a 1350 va alla fascia dati, che nella
 * locandina quadrata era compressa: qui ci entra anche il prezzo, che il
 * formato quadrato non aveva.
 */
export default function PostEvento({ contenuto, immagini = {}, riferimento }) {
  const f = FORMATI.post;
  const dati = contenuto.fattuali || {};
  const testi = contenuto.editoriale || {};

  const GUTTER = 60;
  const ALTEZZA_FOTO = 700; // 51,9% dell'altezza: la stessa frazione della locandina

  const colonne = [
    { etichetta: "Durata", valore: dati.durata },
    { etichetta: "Percorso", valore: dati.km },
    { etichetta: "Sterrato", valore: dati.sterrato },
    { etichetta: "Livello", valore: dati.livello },
  ];

  return (
    <Telaio categoria="eventi" formato="post" riferimento={riferimento} conLogo={false} conIsoipse={false}>
      <FasciaFoto
        altezza={ALTEZZA_FOTO}
        sorgente={immagini[contenuto.media?.cover?.idBlob]}
        ritaglio={contenuto.media?.cover}
      >
        <div style={{ position: "absolute", top: 52, left: GUTTER }}>
          <MarchioSuFoto />
        </div>
        <div style={{ position: "absolute", top: 52, right: GUTTER }}>
          <BadgeDisciplina>{dati.categoria || dati.mezzo}</BadgeDisciplina>
        </div>
        <div style={{ position: "absolute", left: GUTTER, bottom: 34, display: "flex", alignItems: "center", gap: 16 }}>
          <BadgeData>{periodoBreve(dati)}</BadgeData>
          <StatoPosti stato={testi.statoPosti} />
        </div>
      </FasciaFoto>

      {/* Fascia dei testi. */}
      <div
        style={{
          position: "absolute",
          top: ALTEZZA_FOTO,
          left: 0,
          right: 0,
          bottom: 0,
          padding: `38px ${GUTTER}px 52px`,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <TestoAdattivo
          chiave="post-evento-titolo"
          etichetta="Titolo del post"
          size={112}
          minSize={64}
          altezzaMassima={112 * 0.85 * 2}
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
            chiave="post-evento-claim"
            etichetta="Claim"
            size={25}
            minSize={18}
            altezzaMassima={25 * 1.5 * 3}
            style={{
              marginTop: 16,
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

        {/* `margin-top: auto` spinge i dati in fondo: è la struttura della locandina. */}
        <div style={{ marginTop: "auto" }}>
          <Stats colonne={colonne} />

          <div style={{ marginTop: 20 }}>
            <Percorso tappe={dati.tappe} puntiInteresse={dati.puntiInteresse} />
          </div>

          <div
            style={{
              marginTop: 22,
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              gap: 28,
            }}
          >
            <Prezzo valore={dati.prezzo} />
            {testi.cta && (
              <span
                style={{
                  flex: "none",
                  fontFamily: FONT.etichetta,
                  fontSize: 20,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: COLORI.testo,
                  background: COLORI.verde,
                  padding: "14px 24px",
                }}
              >
                {testi.cta}
              </span>
            )}
          </div>

          <div style={{ marginTop: 22 }}>
            <Piede
              nota={
                dati.partecipantiMin && dati.partecipantiMax
                  ? `Gruppi da ${dati.partecipantiMin} a ${dati.partecipantiMax} partecipanti · ${periodoLeggibile(dati)}`
                  : periodoLeggibile(dati)
              }
            />
          </div>
        </div>
      </div>
    </Telaio>
  );
}
