import React from "react";
import { ArrowRight, MessageCircle } from "lucide-react";
import FotoSlide from "./FotoSlide";
import MappaPercorso from "./MappaPercorso";
import {
  Cella, ControlloCapienza, Filo, Icona, MicroEtichetta, Telaio, TestoAdattivo,
} from "./primitivi";
import { COLORI, FONT, FOTO, MARGINE, TELA, TESTO } from "./tokens";
import { iconaPerServizio, periodoBreve, periodoLeggibile, STATI_POSTI } from "../modello";

/**
 * Le otto slide del format.
 *
 * Stanno insieme di proposito: la coerenza fra slide è il valore del template,
 * e tenerle in un unico file rende immediato verificare che margini, etichette,
 * numerazione e gerarchie tipografiche siano davvero le stesse.
 *
 * Ogni slide riceve lo stesso oggetto `carosello` e legge solo ciò che le
 * serve. Nessuna slide inventa contenuti: se un dato manca, resta un trattino.
 */

const LARGHEZZA_UTILE = TELA.larghezza - MARGINE * 2;

/** Titolo grande della slide, uguale ovunque. */
function TitoloSezione({ children, chiave, size = TESTO.titoloM.size }) {
  return (
    <TestoAdattivo
      chiave={chiave}
      etichettaProblema="Titolo"
      size={size}
      minSize={Math.round(size * 0.62)}
      style={{
        fontFamily: FONT.titolo,
        lineHeight: TESTO.titoloM.lineHeight,
        letterSpacing: TESTO.titoloM.spacing,
        textTransform: "uppercase",
        maxHeight: size * 2.1,
      }}
    >
      {children}
    </TestoAdattivo>
  );
}

/* ================================================================== *
 * 01 — COVER
 * ================================================================== */

export function SlideCover({ carosello, immagini }) {
  const data = periodoBreve(carosello);
  return (
    <Telaio
      numero={1}
      etichetta={`Evento / ${carosello.categoria || "—"}`}
      isoipse={false}
      sfondo={
        <FotoSlide
          sorgente={immagini[carosello.foto.cover?.idImmagine]}
          crop={carosello.foto.cover}
          velo={FOTO.velo}
          etichettaVuoto="Foto di copertina"
        />
      }
    >
      <div
        style={{
          position: "absolute",
          left: MARGINE,
          right: MARGINE,
          bottom: MARGINE + 96,
          display: "flex",
          flexDirection: "column",
          gap: 26,
        }}
      >
        {data && <MicroEtichetta colore={COLORI.sabbia}>{data}</MicroEtichetta>}

        <TestoAdattivo
          chiave="cover-titolo"
          etichettaProblema="Nome evento (cover)"
          size={TESTO.titoloXL.size}
          minSize={64}
          style={{
            fontFamily: FONT.titolo,
            lineHeight: TESTO.titoloXL.lineHeight,
            letterSpacing: TESTO.titoloXL.spacing,
            textTransform: "uppercase",
            maxHeight: TESTO.titoloXL.size * 3.1,
          }}
        >
          {carosello.nome || "Nome evento"}
        </TestoAdattivo>

        {carosello.claim && (
          <>
            <Filo colore={COLORI.accento} style={{ width: 96, height: 2 }} />
            <TestoAdattivo
              chiave="cover-claim"
              etichettaProblema="Claim (cover)"
              size={TESTO.corpo.size}
              minSize={20}
              style={{
                lineHeight: TESTO.corpo.lineHeight,
                color: COLORI.testoTenue,
                maxWidth: 760,
                maxHeight: TESTO.corpo.size * TESTO.corpo.lineHeight * 3,
              }}
            >
              {carosello.claim}
            </TestoAdattivo>
          </>
        )}
      </div>
    </Telaio>
  );
}

/* ================================================================== *
 * 02 — L'EVENTO IN NUMERI
 * ================================================================== */

export function SlideNumeri({ carosello, immagini }) {
  const partecipanti =
    carosello.partecipantiMin && carosello.partecipantiMax
      ? `${carosello.partecipantiMin}–${carosello.partecipantiMax}`
      : carosello.partecipantiMax || carosello.partecipantiMin || "";

  const dati = [
    { valore: carosello.km, etichetta: "Chilometri" },
    { valore: carosello.sterrato, etichetta: "Sterrato" },
    { valore: carosello.durata, etichetta: "Durata" },
    { valore: carosello.livello, etichetta: "Livello" },
    { valore: partecipanti, etichetta: "Partecipanti" },
    { valore: carosello.mezzo || carosello.categoria, etichetta: "Mezzo" },
  ];

  return (
    <Telaio numero={2} etichetta="L'evento in numeri">
      {carosello.foto.sfondoNumeri?.idImmagine && (
        <FotoSlide
          sorgente={immagini[carosello.foto.sfondoNumeri.idImmagine]}
          crop={carosello.foto.sfondoNumeri}
          velo="linear-gradient(180deg, rgba(28,24,20,0.86) 0%, rgba(28,24,20,0.96) 100%)"
        />
      )}

      <div
        style={{
          position: "absolute",
          left: MARGINE,
          right: MARGINE,
          top: MARGINE + 78,
          bottom: MARGINE + 96,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <TitoloSezione chiave="numeri-titolo" size={TESTO.titoloL.size}>
          {carosello.nome || "Nome evento"}
        </TitoloSezione>

        <Filo style={{ margin: "44px 0 52px" }} />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "56px 48px",
          }}
        >
          {dati.map((d) => (
            <Cella key={d.etichetta} valore={d.valore} etichetta={d.etichetta} />
          ))}
        </div>

        <div style={{ marginTop: "auto" }}>
          <Filo style={{ marginBottom: 32 }} />
          <TestoAdattivo
            chiave="numeri-frase"
            etichettaProblema="Frase (slide numeri)"
            size={TESTO.corpo.size}
            minSize={19}
            style={{
              lineHeight: TESTO.corpo.lineHeight,
              color: COLORI.testoTenue,
              maxHeight: TESTO.corpo.size * TESTO.corpo.lineHeight * 4,
            }}
          >
            {carosello.fraseNumeri || carosello.claim || ""}
          </TestoAdattivo>
        </div>
      </div>
    </Telaio>
  );
}

/* ================================================================== *
 * 03 — IL PERCORSO
 * ================================================================== */

export function SlidePercorso({ carosello, traccia }) {
  const segmenti = traccia?.segmenti || [];
  const altezzaMappa = 780;
  const asfalto = (() => {
    const n = Number.parseFloat(String(carosello.sterrato).replace(",", "."));
    return Number.isFinite(n) ? `${Math.max(0, 100 - n)}%` : null;
  })();

  const localita = carosello.mappa.localita;

  return (
    <Telaio numero={3} etichetta="Il percorso">
      <div
        style={{
          position: "absolute",
          left: MARGINE,
          right: MARGINE,
          top: MARGINE + 78,
          bottom: MARGINE + 96,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 32 }}>
          <div style={{ minWidth: 0 }}>
            <TitoloSezione chiave="percorso-titolo" size={TESTO.titoloM.size}>
              Il percorso
            </TitoloSezione>
          </div>
          <div style={{ textAlign: "right", flex: "none" }}>
            <div
              style={{
                fontFamily: FONT.titolo,
                fontSize: TESTO.numeroXL.size,
                lineHeight: 0.85,
                color: COLORI.accento,
              }}
            >
              {carosello.km || "—"}
            </div>
            <MicroEtichetta colore={COLORI.testoDebole} style={{ display: "block", marginTop: 8 }}>
              Distanza totale
            </MicroEtichetta>
          </div>
        </div>

        <div style={{ marginTop: 30, position: "relative" }}>
          <MappaPercorso
            segmenti={segmenti}
            configurazione={carosello.mappa}
            larghezza={LARGHEZZA_UTILE}
            altezza={altezzaMappa}
          />
          {!segmenti.length && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span
                style={{
                  fontFamily: FONT.etichetta,
                  fontSize: 22,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: COLORI.testo,
                  background: "rgba(28,24,20,0.82)",
                  border: `1px solid ${COLORI.filo}`,
                  padding: "14px 24px",
                }}
              >
                Carica il file GPX
              </span>
            </div>
          )}
        </div>

        <div style={{ marginTop: "auto", paddingTop: 28 }}>
          <Filo style={{ marginBottom: 24 }} />
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 40 }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <MicroEtichetta colore={COLORI.testoDebole}>Località</MicroEtichetta>
              <TestoAdattivo
                chiave="percorso-localita"
                etichettaProblema="Località (slide percorso)"
                size={TESTO.corpoS.size}
                minSize={17}
                style={{
                  marginTop: 12,
                  lineHeight: 1.5,
                  color: COLORI.testo,
                  maxHeight: 74,
                }}
              >
                {localita.length
                  ? localita.map((l) => l.nome).join(" · ")
                  : carosello.puntiInteresse.join(" · ")}
              </TestoAdattivo>
            </div>
            <div style={{ flex: "none", textAlign: "right" }}>
              <MicroEtichetta colore={COLORI.testoDebole}>Sterrato / Asfalto</MicroEtichetta>
              <div
                style={{
                  marginTop: 10,
                  fontFamily: FONT.titolo,
                  fontSize: 46,
                  lineHeight: 1,
                  color: COLORI.testo,
                }}
              >
                {carosello.sterrato || "—"}
                {asfalto && <span style={{ color: COLORI.testoDebole }}> / {asfalto}</span>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Telaio>
  );
}

/* ================================================================== *
 * 04 — LE TAPPE
 * ================================================================== */

export function SlideTappe({ carosello, immagini }) {
  const tappe = carosello.tappe;
  // Sopra le cinque tappe si passa alla riga compatta: resta equilibrato
  // fino a otto giorni, oltre si segnala lo sforo.
  const compatto = tappe.length > 4;
  const conFoto = !compatto && tappe.length <= 3;

  return (
    <Telaio numero={4} etichetta="Le tappe">
      <div
        style={{
          position: "absolute",
          left: MARGINE,
          right: MARGINE,
          top: MARGINE + 78,
          bottom: MARGINE + 96,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <TitoloSezione chiave="tappe-titolo" size={TESTO.titoloM.size}>
          Le tappe
        </TitoloSezione>

        <ControlloCapienza chiave="tappe-numero" etichetta="Tappe" quante={tappe.length} massimo={8} />

        <div
          style={{
            marginTop: 40,
            display: "flex",
            flexDirection: "column",
            gap: compatto ? 0 : 22,
            flex: 1,
            minHeight: 0,
          }}
        >
          {!tappe.length && (
            <span style={{ color: COLORI.testoDebole, fontSize: TESTO.corpo.size }}>
              Nessuna tappa inserita.
            </span>
          )}

          {tappe.map((t, i) => (
            <div
              key={t.id}
              style={{
                display: "flex",
                gap: 26,
                alignItems: "stretch",
                borderTop: i === 0 ? `1px solid ${COLORI.filo}` : "none",
                borderBottom: `1px solid ${COLORI.filo}`,
                padding: compatto ? "20px 0" : "24px 0",
              }}
            >
              <div style={{ flex: "none", width: 92 }}>
                <div
                  style={{
                    fontFamily: FONT.titolo,
                    fontSize: compatto ? 44 : 56,
                    lineHeight: 0.9,
                    color: COLORI.accento,
                  }}
                >
                  {String(i + 1).padStart(2, "0")}
                </div>
                <MicroEtichetta colore={COLORI.testoDebole} style={{ display: "block", marginTop: 6, fontSize: 15 }}>
                  {t.giorno || `Giorno ${i + 1}`}
                </MicroEtichetta>
              </div>

              <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <div
                  style={{
                    fontFamily: FONT.titolo,
                    fontSize: compatto ? 38 : 46,
                    lineHeight: 1,
                    textTransform: "uppercase",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {t.partenza && t.arrivo ? `${t.partenza} → ${t.arrivo}` : t.arrivo || t.partenza || "—"}
                </div>
                {!compatto && t.descrizione && (
                  <TestoAdattivo
                    chiave={`tappa-desc-${t.id}`}
                    etichettaProblema={`Descrizione tappa ${i + 1}`}
                    size={TESTO.corpoS.size}
                    minSize={17}
                    style={{
                      marginTop: 10,
                      lineHeight: 1.45,
                      color: COLORI.testoTenue,
                      maxHeight: TESTO.corpoS.size * 1.45 * 2,
                    }}
                  >
                    {t.descrizione}
                  </TestoAdattivo>
                )}
              </div>

              {t.km && (
                <div style={{ flex: "none", textAlign: "right", alignSelf: "center" }}>
                  <div style={{ fontFamily: FONT.titolo, fontSize: compatto ? 36 : 44, lineHeight: 1 }}>
                    {t.km}
                  </div>
                  <MicroEtichetta colore={COLORI.testoDebole} style={{ fontSize: 14 }}>
                    km
                  </MicroEtichetta>
                </div>
              )}

              {conFoto && t.foto?.idImmagine && (
                <div style={{ flex: "none", width: 150, position: "relative", overflow: "hidden" }}>
                  <FotoSlide
                    sorgente={immagini[t.foto.idImmagine]}
                    crop={t.foto}
                    velo="linear-gradient(180deg, rgba(28,24,20,0.1) 0%, rgba(28,24,20,0.45) 100%)"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </Telaio>
  );
}

/* ================================================================== *
 * 05 — COSA VIVRAI
 * ================================================================== */

export function SlideEsperienza({ carosello, immagini }) {
  const foto = carosello.foto.esperienza.slice(0, 4);
  const quante = foto.filter(Boolean).length;
  const highlight = carosello.highlight.slice(0, 4);

  return (
    <Telaio numero={5} etichetta="Cosa vivrai">
      <div
        style={{
          position: "absolute",
          left: MARGINE,
          right: MARGINE,
          top: MARGINE + 78,
          bottom: MARGINE + 96,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <TitoloSezione chiave="esperienza-titolo" size={TESTO.titoloM.size}>
          Cosa vivrai
        </TitoloSezione>

        {/* Mosaico fotografico: due colonne, quattro riquadri. */}
        <div
          style={{
            marginTop: 36,
            display: "grid",
            gridTemplateColumns: quante <= 2 ? "1fr 1fr" : "1fr 1fr",
            gridTemplateRows: quante <= 2 ? "420px" : "260px 260px",
            gap: 12,
          }}
        >
          {(quante <= 2 ? foto.slice(0, 2) : foto).map((f, i) => (
            <div key={i} style={{ position: "relative", overflow: "hidden" }}>
              <FotoSlide
                sorgente={immagini[f?.idImmagine]}
                crop={f}
                velo="linear-gradient(180deg, rgba(28,24,20,0.05) 0%, rgba(28,24,20,0.4) 100%)"
                etichettaVuoto={`Foto ${i + 1}`}
              />
            </div>
          ))}
        </div>

        <ControlloCapienza
          chiave="esperienza-highlight"
          etichetta="Highlight"
          quante={carosello.highlight.length}
          massimo={4}
        />

        <div
          style={{
            marginTop: "auto",
            paddingTop: 34,
            display: "grid",
            gridTemplateColumns: highlight.length > 2 ? "1fr 1fr" : "1fr",
            gap: "24px 44px",
          }}
        >
          {highlight.map((h) => (
            <div key={h.id} style={{ borderTop: `1px solid ${COLORI.filo}`, paddingTop: 14 }}>
              <div
                style={{
                  fontFamily: FONT.titolo,
                  fontSize: 40,
                  lineHeight: 1,
                  textTransform: "uppercase",
                  color: COLORI.testo,
                }}
              >
                {h.titolo || "—"}
              </div>
              {h.descrizione && (
                <TestoAdattivo
                  chiave={`hl-${h.id}`}
                  etichettaProblema={`Highlight «${h.titolo || "senza titolo"}»`}
                  size={TESTO.didascalia.size}
                  minSize={15}
                  style={{
                    marginTop: 8,
                    lineHeight: 1.4,
                    color: COLORI.testoTenue,
                    maxHeight: TESTO.didascalia.size * 1.4 * 2,
                  }}
                >
                  {h.descrizione}
                </TestoAdattivo>
              )}
            </div>
          ))}
        </div>
      </div>
    </Telaio>
  );
}

/* ================================================================== *
 * 06 — COSA È INCLUSO
 * ================================================================== */

export function SlideIncluso({ carosello }) {
  const voci = carosello.inclusi;
  const dueColonne = voci.length > 5;

  return (
    <Telaio numero={6} etichetta="Cosa è incluso">
      <div
        style={{
          position: "absolute",
          left: MARGINE,
          right: MARGINE,
          top: MARGINE + 78,
          bottom: MARGINE + 96,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <TitoloSezione chiave="incluso-titolo" size={TESTO.titoloM.size}>
          Cosa è incluso
        </TitoloSezione>

        <ControlloCapienza chiave="incluso-numero" etichetta="Servizi inclusi" quante={voci.length} massimo={12} />

        <div
          style={{
            marginTop: 46,
            display: "grid",
            gridTemplateColumns: dueColonne ? "1fr 1fr" : "1fr",
            gap: dueColonne ? "26px 44px" : 26,
            alignContent: "start",
            flex: 1,
            minHeight: 0,
          }}
        >
          {!voci.length && (
            <span style={{ color: COLORI.testoDebole, fontSize: TESTO.corpo.size }}>
              Nessun servizio indicato.
            </span>
          )}
          {voci.map((v, i) => (
            <div
              key={`${v}-${i}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 20,
                borderBottom: `1px solid ${COLORI.filo}`,
                paddingBottom: 18,
                minWidth: 0,
              }}
            >
              <span style={{ flex: "none", display: "flex" }}>
                <Icona nome={iconaPerServizio(v)} size={dueColonne ? 28 : 34} />
              </span>
              <span
                style={{
                  fontSize: dueColonne ? 24 : 28,
                  lineHeight: 1.3,
                  color: COLORI.testo,
                  minWidth: 0,
                }}
              >
                {v}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Telaio>
  );
}

/* ================================================================== *
 * 07 — È IL TOUR GIUSTO PER TE?
 * ================================================================== */

function Riga({ etichetta, valore }) {
  if (!valore) return null;
  return (
    <div style={{ display: "flex", gap: 28, alignItems: "baseline", padding: "18px 0", borderBottom: `1px solid ${COLORI.filo}` }}>
      <span style={{ flex: "none", width: 250 }}>
        <MicroEtichetta colore={COLORI.testoDebole}>{etichetta}</MicroEtichetta>
      </span>
      <span style={{ flex: 1, minWidth: 0, fontSize: 25, lineHeight: 1.35, color: COLORI.testo }}>
        {valore}
      </span>
    </div>
  );
}

export function SlideRequisiti({ carosello }) {
  return (
    <Telaio numero={7} etichetta="Requisiti">
      <div
        style={{
          position: "absolute",
          left: MARGINE,
          right: MARGINE,
          top: MARGINE + 78,
          bottom: MARGINE + 96,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <TitoloSezione chiave="requisiti-titolo" size={TESTO.titoloM.size}>
          È il tour giusto per te?
        </TitoloSezione>

        <div style={{ marginTop: 34 }}>
          <Riga etichetta="Mezzo richiesto" valore={carosello.mezzo || carosello.categoria} />
          <Riga etichetta="Pneumatici" valore={carosello.pneumatici} />
          <Riga etichetta="Esperienza" valore={carosello.esperienza} />
          <Riga etichetta="Difficoltà" valore={carosello.livello} />
        </div>

        <ControlloCapienza
          chiave="requisiti-numero"
          etichetta="Requisiti"
          quante={carosello.requisiti.length}
          massimo={6}
        />

        {carosello.requisiti.length > 0 && (
          <div style={{ marginTop: 34 }}>
            <MicroEtichetta>Cosa serve</MicroEtichetta>
            <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 12 }}>
              {carosello.requisiti.map((r, i) => (
                <div key={`${r}-${i}`} style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                  <span style={{ flex: "none", marginTop: 3 }}>
                    <Icona nome="spunta" size={22} colore={COLORI.sabbia} />
                  </span>
                  <span style={{ fontSize: 23, lineHeight: 1.4, color: COLORI.testoTenue }}>{r}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {carosello.nonInclusi.length > 0 && (
          <div style={{ marginTop: "auto", paddingTop: 28 }}>
            <Filo style={{ marginBottom: 22 }} />
            <MicroEtichetta colore={COLORI.testoDebole}>Non incluso</MicroEtichetta>
            <TestoAdattivo
              chiave="requisiti-nonincluso"
              etichettaProblema="Non incluso"
              size={22}
              minSize={16}
              style={{ marginTop: 12, lineHeight: 1.45, color: COLORI.testoTenue, maxHeight: 96 }}
            >
              {carosello.nonInclusi.join(" · ")}
            </TestoAdattivo>
          </div>
        )}
      </div>
    </Telaio>
  );
}

/* ================================================================== *
 * 08 — PREZZO + CTA
 * ================================================================== */

export function SlideCta({ carosello, immagini }) {
  const stato = STATI_POSTI.find((s) => s.id === carosello.statoPosti);
  const soldOut = carosello.statoPosti === "soldout";
  const partecipanti =
    carosello.partecipantiMin && carosello.partecipantiMax
      ? `${carosello.partecipantiMin}–${carosello.partecipantiMax} partecipanti`
      : "";

  return (
    <Telaio
      numero={8}
      etichetta="Prenota"
      sfondo={
        carosello.foto.sfondoCta?.idImmagine ? (
          <FotoSlide
            sorgente={immagini[carosello.foto.sfondoCta.idImmagine]}
            crop={carosello.foto.sfondoCta}
            velo="linear-gradient(180deg, rgba(28,24,20,0.8) 0%, rgba(28,24,20,0.95) 100%)"
          />
        ) : null
      }
    >
      <div
        style={{
          position: "absolute",
          left: MARGINE,
          right: MARGINE,
          top: MARGINE + 78,
          bottom: MARGINE + 96,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <TestoAdattivo
          chiave="cta-nome"
          etichettaProblema="Nome evento (CTA)"
          size={TESTO.titoloL.size}
          minSize={52}
          style={{
            fontFamily: FONT.titolo,
            lineHeight: TESTO.titoloL.lineHeight,
            letterSpacing: TESTO.titoloL.spacing,
            textTransform: "uppercase",
            maxHeight: TESTO.titoloL.size * 2.7,
          }}
        >
          {carosello.nome || "Nome evento"}
        </TestoAdattivo>

        <div style={{ marginTop: 20 }}>
          <MicroEtichetta colore={COLORI.sabbia}>{periodoLeggibile(carosello)}</MicroEtichetta>
        </div>

        <Filo style={{ margin: "44px 0" }} />

        <div style={{ display: "flex", alignItems: "flex-end", gap: 28 }}>
          <span
            style={{
              fontFamily: FONT.titolo,
              fontSize: 148,
              lineHeight: 0.82,
              color: COLORI.accento,
            }}
          >
            {carosello.prezzo || "—"}
          </span>
          <span
            style={{
              fontFamily: FONT.etichetta,
              fontSize: 24,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: COLORI.testoDebole,
              paddingBottom: 12,
            }}
          >
            a persona
          </span>
        </div>

        {partecipanti && (
          <div style={{ marginTop: 22, fontSize: 24, color: COLORI.testoTenue }}>{partecipanti}</div>
        )}

        {stato && (
          <div style={{ marginTop: 30 }}>
            <span
              style={{
                display: "inline-block",
                fontFamily: FONT.etichetta,
                fontSize: 21,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                padding: "12px 24px",
                color: soldOut ? COLORI.testo : COLORI.fondo,
                background: soldOut ? "transparent" : COLORI.sabbia,
                border: soldOut ? `1px solid ${COLORI.filoForte}` : "none",
              }}
            >
              {stato.label}
            </span>
          </div>
        )}

        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 18 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 20,
              background: COLORI.verde,
              padding: "26px 32px",
            }}
          >
            <span
              style={{
                fontFamily: FONT.etichetta,
                fontSize: 30,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: COLORI.testo,
              }}
            >
              {carosello.cta || "Scrivici per prenotare"}
            </span>
            <ArrowRight size={34} color={COLORI.testo} strokeWidth={2} aria-hidden="true" />
          </div>

          {carosello.whatsapp && (
            <div style={{ display: "flex", alignItems: "center", gap: 14, color: COLORI.testoTenue }}>
              <MessageCircle size={24} color={COLORI.sabbia} aria-hidden="true" />
              <span style={{ fontSize: 24 }}>{carosello.whatsapp}</span>
            </div>
          )}

          {carosello.url && (
            <div
              style={{
                fontFamily: FONT.etichetta,
                fontSize: 22,
                letterSpacing: "0.1em",
                color: COLORI.sabbia,
                wordBreak: "break-all",
              }}
            >
              {carosello.url.replace(/^https?:\/\//, "")}
            </div>
          )}
        </div>
      </div>
    </Telaio>
  );
}

/* ================================================================== */

/** Disegna la slide richiesta. Unico punto di ingresso per anteprima ed export. */
export function Slide({ id, carosello, immagini, traccia }) {
  const props = { carosello, immagini, traccia };
  switch (id) {
    case "cover":
      return <SlideCover {...props} />;
    case "numeri":
      return <SlideNumeri {...props} />;
    case "percorso":
      return <SlidePercorso {...props} />;
    case "tappe":
      return <SlideTappe {...props} />;
    case "esperienza":
      return <SlideEsperienza {...props} />;
    case "incluso":
      return <SlideIncluso {...props} />;
    case "requisiti":
      return <SlideRequisiti {...props} />;
    case "cta":
      return <SlideCta {...props} />;
    default:
      return null;
  }
}
