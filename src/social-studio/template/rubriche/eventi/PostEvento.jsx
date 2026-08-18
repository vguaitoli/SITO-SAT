import React from "react";
import TelaioEvento from "./TelaioEvento";
import { AmbitoProblemi, TestoAdattivo } from "../../primitivi";
import {
  ACCENTO, BADGE, DATI, DISTANZA_BLOCCHI, FILO, INCHIOSTRO, ITINERARIO,
  KICKER, MARCHIO, ORDINATE, OTTICO, PIEDE, TELA, TIPO,
} from "../../../design/eventi";
import { periodoBreve } from "./date";

/**
 * Post EVENTI — variante `EVENTO STANDARD / EDITORIAL`, 1080×1350.
 *
 * Traduzione fedele di `Locandina-Via-dei-Giganti.dc.html` (progetto Claude
 * Design «La via dei giganti»), non un miglioramento. Dove il riferimento
 * posiziona a mano, qui ci sono le ordinate dichiarate in `design/eventi.js`:
 * una composizione che dipende dall'altezza dei propri figli cambia atmosfera
 * quando cambia il testo, e l'atmosfera è il punto.
 *
 * **Prezzo e CTA non ci sono.** Il Post canonico non li contiene: al loro posto,
 * in fondo, ci sono contatti e sito. Comprimerli dentro avrebbe alterato la
 * gerarchia del riferimento, quindi non li ho messi — il conflitto col master
 * funzionale è dichiarato nel checkpoint e si risolverà nelle varianti di
 * conversione.
 */

/** Le righe di un testo, come le ha scritte l'autore. */
const righe = (testo) => String(testo || "").split(/\r?\n/);

/** Numerali italiani per l'etichetta dell'itinerario, come nel riferimento. */
const PAROLE = ["", "una", "due", "tre", "quattro", "cinque", "sei", "sette", "otto"];

/**
 * Divide il titolo: l'ultima parola va in accento.
 *
 * Nel riferimento il titolo è «La via dei» + «giganti» in arancio. La regola
 * generale che riproduce quel risultato è: l'ultima parola prende l'accento e
 * va a capo. Su un titolo di una sola parola non c'è nulla da dividere.
 */
export function dividiTitolo(titolo) {
  const parole = String(titolo || "").trim().split(/\s+/).filter(Boolean);
  if (parole.length <= 1) return { prima: "", accento: parole[0] || "" };
  return { prima: parole.slice(0, -1).join(" "), accento: parole.at(-1) };
}

export default function PostEvento({ contenuto, immagini = {}, traccia, riferimento }) {
  const dati = contenuto.fattuali || {};
  const testi = contenuto.editoriale || {};
  const cover = contenuto.media?.cover;
  const { prima, accento } = dividiTitolo(testi.titoloBreve || dati.nome);

  const tappe = dati.tappe || [];
  const etichettaItinerario = tappe.length && PAROLE[tappe.length]
    ? `L'ANELLO IN ${PAROLE[tappe.length].toUpperCase()} TAPPE`
    : "L'ITINERARIO";

  const percorso = tappe.length
    ? [tappe[0]?.partenza, ...tappe.map((t) => t.arrivo)].filter(Boolean)
    : dati.puntiInteresse || [];

  const colonne = [
    { etichetta: DATI.colonne[0], valore: periodoBreve(dati) },
    { etichetta: DATI.colonne[1], valore: dati.partenza },
    { etichetta: DATI.colonne[2], valore: dati.sterrato },
    { etichetta: DATI.colonne[3], valore: dati.livello },
  ];

  return (
    <AmbitoProblemi nome="post">
      <TelaioEvento
        sorgente={immagini[cover?.idBlob]}
        ritaglio={cover}
        segmenti={traccia?.segmenti || []}
        configurazioneMappa={contenuto.mappa}
        mood={contenuto.visual?.mood}
        riferimento={riferimento}
      >
        {/* ---- intestazione: marchio a sinistra, badge a destra ---- */}
        <div
          style={{
            position: "absolute",
            top: ORDINATE.intestazione,
            left: TELA.padding.sinistro,
            right: TELA.padding.destro,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 24,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: MARCHIO.distanzaLogoTesto }}>
            <img
              src="/media/logo-sardegna-trail-avventura.png"
              alt=""
              style={{
                width: MARCHIO.logo.larghezza,
                height: MARCHIO.logo.altezza,
                objectFit: "contain",
                flex: "none",
                filter: MARCHIO.ombraLogo,
              }}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: MARCHIO.distanzaNomePayoff }}>
              <div
                style={{
                  fontFamily: TIPO.marchioNome.famiglia,
                  fontSize: TIPO.marchioNome.corpo,
                  letterSpacing: TIPO.marchioNome.tracking,
                  lineHeight: TIPO.marchioNome.interlinea,
                  textTransform: "uppercase",
                  color: INCHIOSTRO.primario,
                }}
              >
                {MARCHIO.nome[0]}
                <br />
                {MARCHIO.nome[1]}
              </div>
              <div
                style={{
                  fontFamily: TIPO.marchioPayoff.famiglia,
                  fontSize: TIPO.marchioPayoff.corpo,
                  letterSpacing: TIPO.marchioPayoff.tracking,
                  color: INCHIOSTRO.secondario,
                }}
              >
                {MARCHIO.payoff}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: BADGE.distanzaPosti }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: BADGE.larghezza,
                height: BADGE.altezza,
                padding: BADGE.padding,
                boxSizing: "border-box",
                border: `${BADGE.bordo}px solid ${ACCENTO}`,
                fontFamily: TIPO.badge.famiglia,
                fontSize: TIPO.badge.corpo,
                letterSpacing: TIPO.badge.tracking,
                color: ACCENTO,
                textAlign: "center",
              }}
            >
              {(dati.categoria || dati.mezzo || "").toUpperCase()}
            </div>
            {testi.statoPosti === "ultimi" && (
              <div
                style={{
                  fontFamily: TIPO.posti.famiglia,
                  fontSize: TIPO.posti.corpo,
                  letterSpacing: TIPO.posti.tracking,
                  color: INCHIOSTRO.secondario,
                }}
              >
                POSTI LIMITATI
              </div>
            )}
          </div>
        </div>

        {/* ---- kicker: barra in accento più etichetta. Solo se c'è. ---- */}
        {testi.kicker && (
          <div
            style={{
              position: "absolute",
              top: ORDINATE.kicker,
              left: OTTICO.kicker,
              display: "flex",
              alignItems: "center",
              gap: KICKER.distanza,
            }}
          >
            <span
              style={{
                width: KICKER.barra.larghezza,
                height: KICKER.barra.altezza,
                background: ACCENTO,
                flex: "none",
              }}
            />
            <span
              style={{
                fontFamily: TIPO.kicker.famiglia,
                fontSize: TIPO.kicker.corpo,
                letterSpacing: TIPO.kicker.tracking,
                color: INCHIOSTRO.kicker,
              }}
            >
              {testi.kicker}
            </span>
          </div>
        )}

        {/* ---- titolo: ultima parola in accento ---- */}
        <div style={{ position: "absolute", top: ORDINATE.titolo, left: OTTICO.titolo, right: TELA.padding.destro }}>
          <TestoAdattivo
            chiave="titolo"
            etichetta="Titolo del post"
            size={TIPO.titolo.taglie[TIPO.titolo.tagliaPredefinita]}
            minSize={TIPO.titolo.taglie.Contenuto - 32}
            altezzaMassima={TIPO.titolo.taglie.Enorme * TIPO.titolo.interlinea * 2}
            style={{
              fontFamily: TIPO.titolo.famiglia,
              letterSpacing: TIPO.titolo.tracking,
              lineHeight: TIPO.titolo.interlinea,
              textTransform: "uppercase",
              color: INCHIOSTRO.primario,
              textShadow: TIPO.titolo.ombra,
            }}
          >
            {prima}
            {prima && <br />}
            <span style={{ color: ACCENTO }}>{accento}</span>
          </TestoAdattivo>
        </div>

        {/* ---- claim ---- */}
        {testi.claim && (
          <div style={{ position: "absolute", top: ORDINATE.claim, left: OTTICO.claim, width: 405 }}>
            <TestoAdattivo
              chiave="claim"
              etichetta="Claim"
              size={TIPO.claim.corpo}
              minSize={20}
              altezzaMassima={TIPO.claim.corpo * TIPO.claim.interlinea * 5}
              style={{
                fontFamily: TIPO.claim.famiglia,
                fontWeight: TIPO.claim.peso,
                lineHeight: TIPO.claim.interlinea,
                // `text-align: justify` è nel riferimento, e si vede: nel master
                // le righe del claim arrivano tutte allo stesso margine destro.
                textAlign: "justify",
                color: INCHIOSTRO.suVelo,
              }}
            >
              {/*
                Le andate a capo del claim si rispettano. Nel riferimento il
                claim ha un `<br>` dopo «mare.»: con `justify` e nessuna
                interruzione, l'ultima riga corta si allarga fino a spaziare le
                parole in modo goffo. Dove va a capo è una scelta di chi scrive.
              */}
              {righe(testi.claim).map((riga, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <br />}
                  {riga}
                </React.Fragment>
              ))}
            </TestoAdattivo>
          </div>
        )}

        {/* ---- piede della composizione: dati, itinerario, contatti ---- */}
        <div
          style={{
            position: "absolute",
            left: TELA.padding.sinistro,
            right: TELA.padding.destro,
            bottom: TELA.padding.basso,
            display: "flex",
            flexDirection: "column",
            gap: DISTANZA_BLOCCHI,
          }}
        >
          {/* quattro colonne fra due filetti */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              gap: DATI.distanzaColonne,
              borderTop: `1px solid ${FILO}`,
              borderBottom: `1px solid ${FILO}`,
              padding: `${DATI.paddingVerticale}px 0`,
            }}
          >
            {colonne.map((c) => (
              <div key={c.etichetta} style={{ display: "flex", flexDirection: "column", gap: DATI.distanzaEtichettaValore, minWidth: 0 }}>
                <span
                  style={{
                    fontFamily: TIPO.etichettaDato.famiglia,
                    fontSize: TIPO.etichettaDato.corpo,
                    letterSpacing: TIPO.etichettaDato.tracking,
                    color: INCHIOSTRO.secondario,
                  }}
                >
                  {c.etichetta}
                </span>
                <span
                  style={{
                    fontFamily: TIPO.valoreDato.famiglia,
                    fontWeight: TIPO.valoreDato.peso,
                    fontSize: TIPO.valoreDato.corpo,
                    letterSpacing: TIPO.valoreDato.tracking,
                    textTransform: "uppercase",
                    color: INCHIOSTRO.primario,
                  }}
                >
                  {c.valore || "—"}
                </span>
              </div>
            ))}
          </div>

          {/* itinerario a sinistra, servizi inclusi a destra */}
          <div style={{ display: "flex", justifyContent: "space-between", gap: 36 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: ITINERARIO.distanzaEtichettaValore, minWidth: 0 }}>
              <span
                style={{
                  fontFamily: TIPO.etichettaDato.famiglia,
                  fontSize: TIPO.etichettaDato.corpo,
                  letterSpacing: TIPO.etichettaDato.tracking,
                  color: INCHIOSTRO.secondario,
                }}
              >
                {etichettaItinerario}
              </span>
              <TestoAdattivo
                chiave="itinerario"
                etichetta="Itinerario"
                size={TIPO.itinerario.corpo}
                minSize={17}
                altezzaMassima={TIPO.itinerario.corpo * TIPO.itinerario.interlinea * 2}
                style={{
                  fontFamily: TIPO.itinerario.famiglia,
                  letterSpacing: TIPO.itinerario.tracking,
                  lineHeight: TIPO.itinerario.interlinea,
                  textTransform: "uppercase",
                  textAlign: "justify",
                  color: INCHIOSTRO.primario,
                }}
              >
                {percorso.join(" · ")}
              </TestoAdattivo>
            </div>

            {dati.inclusi?.length > 0 && (
              <ul
                style={{
                  width: ITINERARIO.inclusi.larghezza,
                  flex: "none",
                  margin: 0,
                  padding: 0,
                  listStyle: "none",
                  fontFamily: TIPO.inclusi.famiglia,
                  fontWeight: TIPO.inclusi.peso,
                  fontSize: TIPO.inclusi.corpo,
                  lineHeight: TIPO.inclusi.interlinea,
                  textTransform: "capitalize",
                  color: INCHIOSTRO.secondario,
                }}
              >
                {dati.inclusi.slice(0, 4).map((v, i) => (
                  <li key={`${v}-${i}`}>{v}</li>
                ))}
              </ul>
            )}
          </div>

          {/* contatti e sito */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 24,
              borderTop: `1px solid ${FILO}`,
              paddingTop: PIEDE.paddingSopra,
              fontFamily: TIPO.piede.famiglia,
              fontSize: TIPO.piede.corpo,
              color: INCHIOSTRO.secondario,
            }}
          >
            <div>{testi.whatsapp || ""}</div>
            <div style={{ color: INCHIOSTRO.primario, fontWeight: 500 }}>
              {(dati.url || "").replace(/^https?:\/\//, "").replace(/\/eventi\/.*$/, "")}
            </div>
          </div>
        </div>
      </TelaioEvento>
    </AmbitoProblemi>
  );
}
