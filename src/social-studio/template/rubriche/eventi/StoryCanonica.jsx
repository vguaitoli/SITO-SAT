import React from "react";
import Foto from "../../Foto";
import Mappa from "../../Mappa";
import { AmbitoProblemi, TestoAdattivo } from "../../primitivi";
import { conRipiegoCover, slotPieno } from "../../../media/slot";
import { periodoBreve } from "./date";
import {
  ACCENTO, CAPIENZA, COLORE_PAYOFF, ETICHETTE, FILO, FILO_CHIARO, FILO_SCORRI,
  FONDO, FOTO_SCHERMATA, GRIGLIA_NUMERI, INCHIOSTRO, INCHIOSTRO_CHIARO,
  KICKER_STORY, MAPPA_STORY, MARCHIO_STORY, moodStory, PADDING, posti, SCHERMATE,
  SCORRI, TELA_STORY, TIPO_STORY, VELO, ZONA_STICKER,
} from "../../../design/eventi-story";

/**
 * Story EVENTI — sei schermate da 1080×1920.
 *
 * Traduzione di `Stories-Via-dei-Giganti.dc.html`. Non è un Post allungato:
 * ogni schermata ha fondo, velo, inquadratura e ritmo propri, e la sequenza è
 * il format.
 *
 * Niente dell'evento è scritto qui. I testi vengono dai campi editoriali, i
 * numeri dai dati del sito, le fotografie dalla Media Library, il percorso dal
 * GPX locale. Dove un campo manca, il blocco non si disegna: non si inventa.
 */

/**
 * Lo slot fotografico di ogni schermata.
 *
 * La lettura passa da `media/slot`: è la stessa funzione che usa l'editor, e
 * quindi ciò che si vede assegnato è ciò che il template disegna.
 */
export const SLOT_FOTO = {
  cover: "cover",
  numeri: "storyNumeri",
  incluso: "storyIncluso",
  prenota: "storyPrenota",
};

/**
 * La fotografia di una schermata, e se è la sua o quella presa in prestito.
 *
 * Il ripiego sulla cover vale solo quando la schermata non ha una fotografia
 * propria. Quando scatta, però, l'inquadratura non si eredita: il punto focale
 * della cover è stato scelto su una tela intera, e riusarlo dentro una fascia
 * alta 620 px inquadra un pezzo di cielo. Sulla foto in prestito comanda il
 * punto focale della schermata.
 */
function fotoDi(contenuto, schermata) {
  const chiave = SLOT_FOTO[schermata];
  if (!chiave) return { ritaglio: null, dedicata: false };
  const dedicata = slotPieno(contenuto.media, chiave);
  return { ritaglio: conRipiegoCover(contenuto.media, chiave), dedicata };
}

/** Le righe di un testo, come le ha scritte l'autore. */
const righe = (testo) => String(testo || "").split(/\r?\n/);

/** L'ultima parola in accento, come nel titolo del riferimento. */
function dividiTitolo(titolo) {
  const parole = String(titolo || "").trim().split(/\s+/).filter(Boolean);
  if (parole.length <= 1) return { prima: "", accento: parole[0] || "" };
  return { prima: parole.slice(0, -1).join(" "), accento: parole.at(-1) };
}

/* ================================================================== *
 * Cornice
 * ================================================================== */

function Tela({ fondo, riferimento, numero, children }) {
  return (
    <div
      ref={riferimento}
      data-slide={`eventi-story-${numero}`}
      style={{
        position: "relative",
        width: TELA_STORY.larghezza,
        height: TELA_STORY.altezza,
        background: fondo,
        overflow: "hidden",
        fontFamily: TIPO_STORY.corpo.famiglia,
        flex: "none",
      }}
    >
      {children}
    </div>
  );
}

/** Etichetta di sezione: Oswald spaziato, il registro delle didascalie. */
function Etichetta({ children, colore = INCHIOSTRO.secondario, stile = TIPO_STORY.etichettaSezione }) {
  return (
    <span style={{ fontFamily: stile.famiglia, fontSize: stile.corpo, letterSpacing: stile.tracking, color: colore }}>
      {children}
    </span>
  );
}

function Titolo({ chiave, etichetta, children, stile, colore = INCHIOSTRO.primario, righeMax = 2 }) {
  return (
    <TestoAdattivo
      chiave={chiave}
      etichetta={etichetta}
      size={stile.corpo}
      minSize={Math.round(stile.corpo * 0.6)}
      altezzaMassima={stile.corpo * stile.interlinea * righeMax}
      style={{
        fontFamily: stile.famiglia,
        lineHeight: stile.interlinea,
        letterSpacing: stile.tracking,
        textTransform: "uppercase",
        color: colore,
        textShadow: stile.ombra,
      }}
    >
      {children}
    </TestoAdattivo>
  );
}

/** Lockup del marchio. Il logo è quello dell'app, non quello del progetto. */
function Marchio({ conPayoff = true, dimensione = MARCHIO_STORY.logo }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: MARCHIO_STORY.distanza }}>
      <img
        src="/media/logo-sardegna-trail-avventura.png"
        alt=""
        style={{ width: dimensione, height: dimensione, objectFit: "contain", flex: "none", filter: MARCHIO_STORY.ombra }}
      />
      <div style={{ display: "flex", flexDirection: "column", gap: MARCHIO_STORY.distanzaTesto }}>
        <div
          style={{
            fontFamily: TIPO_STORY.marchioNome.famiglia,
            fontSize: TIPO_STORY.marchioNome.corpo,
            letterSpacing: TIPO_STORY.marchioNome.tracking,
            lineHeight: TIPO_STORY.marchioNome.interlinea,
            textTransform: "uppercase",
            color: INCHIOSTRO.primario,
          }}
        >
          {MARCHIO_STORY.nome[0]}
          <br />
          {MARCHIO_STORY.nome[1]}
        </div>
        {conPayoff && (
          <Etichetta colore={COLORE_PAYOFF} stile={TIPO_STORY.marchioPayoff}>
            {MARCHIO_STORY.payoff}
          </Etichetta>
        )}
      </div>
    </div>
  );
}

/**
 * L'etichetta dello stato dei posti.
 *
 * Tre stati su quattro scrivono qualcosa, e con pesi diversi: «sold out» in
 * pieno accento, «lista d'attesa» a contorno, «posti limitati» come testo. Lo
 * stato `disponibili` non disegna nulla — inventare scarsità è l'unico modo di
 * mentire con un'etichetta vera.
 */
function EtichettaPosti({ stato }) {
  if (!stato.etichetta) return null;
  const base = {
    fontFamily: TIPO_STORY.posti.famiglia,
    fontWeight: TIPO_STORY.posti.peso,
    fontSize: TIPO_STORY.posti.corpo,
    letterSpacing: TIPO_STORY.posti.tracking,
    textTransform: "uppercase",
    alignSelf: "flex-start",
  };
  const risalto = {
    testo: { color: INCHIOSTRO.primario },
    pieno: { background: ACCENTO, color: FONDO.scuro, padding: "14px 26px" },
    contorno: { border: `2px solid ${ACCENTO}`, color: ACCENTO, padding: "12px 24px" },
  }[stato.risalto];

  return <span data-posti={stato.risalto} style={{ ...base, ...risalto }}>{stato.etichetta}</span>;
}

/**
 * La banda che Instagram copre con il Link Sticker.
 *
 * Il padding basso da 200 px la tiene libera su ogni schermata, ma finché non
 * si vedeva bisognava fidarsi. La guida la mostra a chi compone e sparisce dal
 * PNG: `data-solo-anteprima` è lo stesso segno che la cattura già spegne prima
 * di fotografare.
 */
function GuidaSticker() {
  return (
    <div
      data-solo-anteprima="true"
      style={{
        position: "absolute", left: 0, right: 0, bottom: 0, height: ZONA_STICKER,
        zIndex: 9, display: "flex", alignItems: "center", justifyContent: "center",
        border: `2px dashed ${ACCENTO}`, background: "rgba(224,138,60,.08)",
        fontFamily: TIPO_STORY.etichettaSezione.famiglia,
        fontSize: TIPO_STORY.etichettaSezione.corpo,
        letterSpacing: TIPO_STORY.etichettaSezione.tracking,
        textTransform: "uppercase", color: ACCENTO, boxSizing: "border-box",
      }}
    >
      Spazio per il Link Sticker
    </div>
  );
}

/** Fotografia con il suo velo: piena tela, o in una fascia di altezza data. */
function StratoFoto({ schermata, contenuto, immagini, mood, velo }) {
  const cfg = FOTO_SCHERMATA[schermata];
  if (!cfg) return null;
  const { ritaglio, dedicata } = fotoDi(contenuto, schermata);
  const filtro = cfg.filtro === "mood" ? moodStory(mood).filtroFoto : cfg.filtro;

  // Il punto focale del riferimento vale come predefinito: conta
  // l'inquadratura dell'utente solo dove l'utente l'ha davvero scelta, cioè
  // sulla fotografia assegnata a questa schermata.
  const conPosizione = dedicata
    ? ritaglio
    : { ...ritaglio, x: cfg.posizione.x, y: cfg.posizione.y };

  return (
    <>
      <Foto
        sorgente={immagini[ritaglio?.idBlob]}
        ritaglio={conPosizione}
        velo={null}
        filtro={filtro}
        etichettaVuoto="Fotografia della Story"
      />
      <div style={{ position: "absolute", inset: 0, background: velo }} />
    </>
  );
}

/* ================================================================== */

export default function StoryCanonica(props) {
  const meta = SCHERMATE.find((s) => s.id === props.id);
  if (!meta) return null;
  return (
    <AmbitoProblemi nome={`story/${String(meta.numero).padStart(2, "0")}`}>
      <Schermata {...props} meta={meta} />
    </AmbitoProblemi>
  );
}

function Schermata({ contenuto, immagini = {}, traccia, riferimento, meta }) {
  const dati = contenuto.fattuali || {};
  const testi = contenuto.editoriale || {};
  const mood = contenuto.visual?.moodStory;
  const p = PADDING[meta.id];
  const tappe = dati.tappe || [];

  /* ---------------- 01 COVER ---------------- */
  if (meta.id === "cover") {
    const { prima, accento } = dividiTitolo(testi.titoloBreve || dati.nome);
    return (
      <Tela fondo={FONDO.scuro} riferimento={riferimento} numero={meta.numero}>
        <StratoFoto schermata="cover" contenuto={contenuto} immagini={immagini} mood={mood} velo={VELO.cover} />
        <div
          style={{
            position: "absolute", inset: 0, zIndex: 3, boxSizing: "border-box",
            padding: `${p.alto}px ${p.laterale}px ${p.basso}px`,
            display: "flex", flexDirection: "column", justifyContent: "space-between",
          }}
        >
          <Marchio />

          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            {testi.kicker && (
              <div style={{ display: "flex", alignItems: "center", gap: KICKER_STORY.distanza }}>
                <span style={{ width: KICKER_STORY.barra.larghezza, height: KICKER_STORY.barra.altezza, background: ACCENTO, flex: "none" }} />
                <Etichetta colore={INCHIOSTRO.tenue} stile={TIPO_STORY.kicker}>{testi.kicker}</Etichetta>
              </div>
            )}

            <Titolo chiave="titolo" etichetta="Titolo della cover" stile={TIPO_STORY.titoloCover}>
              {prima}
              {prima && <br />}
              <span style={{ color: ACCENTO }}>{accento}</span>
            </Titolo>

            {testi.claim && (
              <TestoAdattivo
                chiave="claim" etichetta="Claim della Story"
                size={TIPO_STORY.claimCover.corpo} minSize={26}
                altezzaMassima={TIPO_STORY.claimCover.corpo * TIPO_STORY.claimCover.interlinea * 4}
                style={{
                  fontFamily: TIPO_STORY.claimCover.famiglia, fontWeight: TIPO_STORY.claimCover.peso,
                  lineHeight: TIPO_STORY.claimCover.interlinea, color: INCHIOSTRO.suVelo,
                  maxWidth: TIPO_STORY.claimCover.larghezzaMax,
                }}
              >
                {righe(testi.claim).map((r, i) => (
                  <React.Fragment key={i}>{i > 0 && <br />}{r}</React.Fragment>
                ))}
              </TestoAdattivo>
            )}

            <div style={{ display: "flex", alignItems: "center", gap: 18, paddingTop: 8 }}>
              {(dati.categoria || dati.mezzo) && (
                <span
                  style={{
                    display: "inline-flex", alignItems: "center", padding: TIPO_STORY.badge.padding,
                    border: `1px solid ${ACCENTO}`, fontFamily: TIPO_STORY.badge.famiglia,
                    fontSize: TIPO_STORY.badge.corpo, letterSpacing: TIPO_STORY.badge.tracking, color: ACCENTO,
                  }}
                >
                  {(dati.categoria || dati.mezzo).toUpperCase()}
                </span>
              )}
              <span
                style={{
                  fontFamily: TIPO_STORY.data.famiglia, fontSize: TIPO_STORY.data.corpo,
                  letterSpacing: TIPO_STORY.data.tracking, textTransform: "uppercase", color: INCHIOSTRO.primario,
                }}
              >
                {periodoBreve(dati)}
              </span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: SCORRI.distanza }}>
            <Etichetta colore={INCHIOSTRO.secondario} stile={TIPO_STORY.scorri}>{SCORRI.testo}</Etichetta>
            <span style={{ width: SCORRI.filo.larghezza, height: SCORRI.filo.altezza, background: FILO_SCORRI }} />
          </div>
        </div>
      </Tela>
    );
  }

  /* ---------------- 02 NUMERI ---------------- */
  if (meta.id === "numeri") {
    const celle = [
      { etichetta: ETICHETTE.durata, valore: dati.durata },
      { etichetta: ETICHETTE.sterrato, valore: dati.sterrato, accento: true },
      { etichetta: ETICHETTE.partenza, valore: dati.partenza },
      { etichetta: ETICHETTE.livello, valore: dati.livello },
    ];
    return (
      <Tela fondo={FONDO.scuro} riferimento={riferimento} numero={meta.numero}>
        <div style={{ position: "relative", height: FOTO_SCHERMATA.numeri.altezza, overflow: "hidden" }}>
          <StratoFoto schermata="numeri" contenuto={contenuto} immagini={immagini} mood={mood} velo={VELO.numeri} />
          <div style={{ position: "absolute", left: p.laterale, bottom: 56, right: p.laterale, display: "flex", flexDirection: "column", gap: 12 }}>
            <Etichetta colore={INCHIOSTRO.tenue}>{ETICHETTE.numeri}</Etichetta>
            <Titolo chiave="numeri-titolo" etichetta="Frase dei numeri" stile={TIPO_STORY.titoloSchermata}>
              {righe(testi.fraseNumeri || dati.km).map((r, i) => (
                <React.Fragment key={i}>{i > 0 && <br />}{r}</React.Fragment>
              ))}
            </Titolo>
          </div>
        </div>

        <div
          style={{
            position: "absolute", top: FOTO_SCHERMATA.numeri.altezza, left: 0, right: 0, bottom: 0,
            boxSizing: "border-box", padding: `0 ${p.laterale}px ${p.basso}px`,
            display: "flex", flexDirection: "column", justifyContent: "center", gap: 58,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${GRIGLIA_NUMERI.colonne}, 1fr)`,
              // Il filetto È lo spazio fra le celle: fondo chiaro sotto, gap di 1.
              gap: GRIGLIA_NUMERI.spessoreFilo,
              background: FILO,
            }}
          >
            {celle.map((c) => {
              const lungo = String(c.valore || "").length > 9;
              const stile = lungo ? TIPO_STORY.valoreDatoLungo : TIPO_STORY.valoreDato;
              return (
                <div
                  key={c.etichetta}
                  style={{
                    background: FONDO.scuro,
                    padding: `${GRIGLIA_NUMERI.padding.verticale}px ${GRIGLIA_NUMERI.padding.orizzontale}px`,
                    display: "flex", flexDirection: "column", gap: GRIGLIA_NUMERI.distanzaEtichettaValore,
                    minWidth: 0,
                  }}
                >
                  <Etichetta colore={INCHIOSTRO.secondario} stile={TIPO_STORY.etichettaDato}>{c.etichetta}</Etichetta>
                  <TestoAdattivo
                    chiave={`dato-${c.etichetta}`} etichetta={`Dato «${c.etichetta}»`}
                    size={stile.corpo} minSize={40} altezzaMassima={stile.corpo * stile.interlinea * 2}
                    style={{
                      fontFamily: stile.famiglia, lineHeight: stile.interlinea,
                      color: c.accento ? ACCENTO : INCHIOSTRO.primario, overflowWrap: "anywhere",
                    }}
                  >
                    {c.valore || "—"}
                  </TestoAdattivo>
                </div>
              );
            })}
          </div>

          {testi.descrizione && (
            <TestoAdattivo
              chiave="numeri-chiusura" etichetta="Chiusura dei numeri"
              size={TIPO_STORY.corpo.corpo} minSize={24}
              altezzaMassima={TIPO_STORY.corpo.corpo * TIPO_STORY.corpo.interlinea * 4}
              style={{
                fontFamily: TIPO_STORY.corpo.famiglia, fontWeight: TIPO_STORY.corpo.peso,
                lineHeight: TIPO_STORY.corpo.interlinea, color: INCHIOSTRO.secondario,
              }}
            >
              {testi.descrizione}
            </TestoAdattivo>
          )}
        </div>
      </Tela>
    );
  }

  /* ---------------- 03 MAPPA (su carta) ---------------- */
  if (meta.id === "mappa") {
    const percorso = tappe.length
      ? [tappe[0]?.partenza, ...tappe.map((t) => t.arrivo)].filter(Boolean)
      : dati.puntiInteresse || [];
    const numeri = [
      { etichetta: ETICHETTE.km, valore: (dati.km || "").replace(/\s*km/i, "") },
      { etichetta: ETICHETTE.sterrato, valore: dati.sterrato, accento: true },
      { etichetta: ETICHETTE.tappeConteggio, valore: tappe.length || "" },
    ].filter((n) => n.valore !== "");

    return (
      <Tela fondo={FONDO.chiaro} riferimento={riferimento} numero={meta.numero}>
        {/* La traccia dal GPX locale, nella geometria del riferimento. */}
        <div
          style={{
            position: "absolute",
            left: `${MAPPA_STORY.centro.x * 100}%`,
            top: `${MAPPA_STORY.centro.y * 100}%`,
            width: MAPPA_STORY.larghezza,
            height: MAPPA_STORY.altezza,
            transform: "translate(-50%, -50%)",
            zIndex: 0,
          }}
        >
          {/*
            Fondo trasparente: la mappa galleggia sulla carta invece di
            stenderci sopra il proprio rettangolo scuro. Il velo della
            schermata fa il resto.
          */}
          <Mappa
            segmenti={traccia?.segmenti || []}
            configurazione={contenuto.mappa}
            larghezza={MAPPA_STORY.larghezza}
            altezza={MAPPA_STORY.altezza}
            bordi={false}
            fondo={null}
          />
        </div>
        <div style={{ position: "absolute", inset: 0, zIndex: 1, background: VELO.mappa }} />

        <div
          style={{
            position: "absolute", inset: 0, zIndex: 2, boxSizing: "border-box",
            padding: `${p.alto}px ${p.laterale}px ${p.basso}px`,
            display: "flex", flexDirection: "column", justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Etichetta colore={INCHIOSTRO_CHIARO.etichetta}>{ETICHETTE.mappa}</Etichetta>
            <Titolo
              chiave="mappa-titolo" etichetta="Titolo della mappa"
              stile={TIPO_STORY.titoloSchermata} colore={INCHIOSTRO_CHIARO.primario}
            >
              {testi.titoloBreve || dati.nome}
            </Titolo>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            {percorso.length > 0 && (
              <TestoAdattivo
                chiave="mappa-itinerario" etichetta="Itinerario"
                size={TIPO_STORY.itinerario.corpo} minSize={24}
                altezzaMassima={TIPO_STORY.itinerario.corpo * TIPO_STORY.itinerario.interlinea * 3}
                style={{
                  fontFamily: TIPO_STORY.itinerario.famiglia, letterSpacing: TIPO_STORY.itinerario.tracking,
                  lineHeight: TIPO_STORY.itinerario.interlinea, textTransform: "uppercase",
                  color: INCHIOSTRO_CHIARO.primario,
                }}
              >
                {percorso.join(" · ")}
              </TestoAdattivo>
            )}

            {numeri.length > 0 && (
              <div style={{ display: "flex", gap: 44, borderTop: `1px solid ${FILO_CHIARO}`, paddingTop: 22 }}>
                {numeri.map((n) => (
                  <div key={n.etichetta} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <Etichetta colore={INCHIOSTRO_CHIARO.etichetta} stile={TIPO_STORY.etichettaMappa}>{n.etichetta}</Etichetta>
                    <span
                      style={{
                        fontFamily: TIPO_STORY.valoreMappa.famiglia, fontSize: TIPO_STORY.valoreMappa.corpo,
                        lineHeight: TIPO_STORY.valoreMappa.interlinea,
                        color: n.accento ? ACCENTO : INCHIOSTRO_CHIARO.primario,
                      }}
                    >
                      {n.valore}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {dati.puntiInteresse?.length > 0 && (
              <div
                style={{
                  fontFamily: TIPO_STORY.corpoMappa.famiglia, fontWeight: TIPO_STORY.corpoMappa.peso,
                  fontSize: TIPO_STORY.corpoMappa.corpo, lineHeight: TIPO_STORY.corpoMappa.interlinea,
                  color: INCHIOSTRO_CHIARO.corpo, maxWidth: TIPO_STORY.corpoMappa.larghezzaMax,
                }}
              >
                {dati.puntiInteresse.join(", ")}.
              </div>
            )}
          </div>
        </div>
      </Tela>
    );
  }

  /* ---------------- 04 TAPPE ---------------- */
  if (meta.id === "tappe") {
    // La capienza è quella dichiarata nei parametri. Ciò che non entra non
    // sparisce in silenzio: il pre-flight lo dice prima dell'esportazione.
    const mostrate = tappe.slice(0, CAPIENZA.tappe);
    const ultima = mostrate.length - 1;
    return (
      <Tela fondo={FONDO.scuroTappe} riferimento={riferimento} numero={meta.numero}>
        <div
          style={{
            position: "absolute", inset: 0, boxSizing: "border-box",
            padding: `${p.alto}px ${p.laterale}px ${p.basso}px`,
            display: "flex", flexDirection: "column", justifyContent: "center", gap: 48,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Etichetta colore={INCHIOSTRO.secondario}>{ETICHETTE.tappe}</Etichetta>
            <Titolo chiave="tappe-titolo" etichetta="Titolo delle tappe" stile={TIPO_STORY.titoloTappe} righeMax={1}>
              {tappe.length ? `${tappe.length} tappe` : "L'itinerario"}
            </Titolo>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
            {tappe.length === 0 && (
              <span style={{ fontSize: 28, color: INCHIOSTRO.secondario }}>Nessuna tappa inserita.</span>
            )}
            {mostrate.map((t, i) => (
              <div
                key={t.id || i}
                style={{
                  display: "flex", gap: 28, alignItems: "baseline",
                  borderTop: `1px solid ${FILO}`,
                  borderBottom: i === ultima ? `1px solid ${FILO}` : "none",
                  paddingTop: 26,
                  paddingBottom: i === ultima ? 26 : 0,
                }}
              >
                <span
                  style={{
                    fontFamily: TIPO_STORY.numeroTappa.famiglia, fontSize: TIPO_STORY.numeroTappa.corpo,
                    lineHeight: TIPO_STORY.numeroTappa.interlinea, color: ACCENTO,
                    flex: "none", width: TIPO_STORY.numeroTappa.larghezza,
                  }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
                  <TestoAdattivo
                    chiave={`tappa-${i}`} etichetta={`Tappa ${i + 1}`}
                    size={TIPO_STORY.titoloTappa.corpo} minSize={26}
                    altezzaMassima={TIPO_STORY.titoloTappa.corpo * 1.2 * 2}
                    style={{
                      fontFamily: TIPO_STORY.titoloTappa.famiglia, letterSpacing: TIPO_STORY.titoloTappa.tracking,
                      textTransform: "uppercase", color: INCHIOSTRO.primario,
                    }}
                  >
                    {t.partenza && t.arrivo ? `${t.partenza} — ${t.arrivo}` : t.arrivo || t.partenza || "—"}
                  </TestoAdattivo>
                  {t.descrizione && (
                    <span
                      style={{
                        fontFamily: TIPO_STORY.corpoTappa.famiglia, fontWeight: TIPO_STORY.corpoTappa.peso,
                        fontSize: TIPO_STORY.corpoTappa.corpo, lineHeight: TIPO_STORY.corpoTappa.interlinea,
                        color: INCHIOSTRO.secondario,
                      }}
                    >
                      {t.descrizione}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Tela>
    );
  }

  /* ---------------- 05 INCLUSO ---------------- */
  if (meta.id === "incluso") {
    return (
      <Tela fondo={FONDO.scuro} riferimento={riferimento} numero={meta.numero}>
        <div style={{ position: "relative", height: FOTO_SCHERMATA.incluso.altezza, overflow: "hidden" }}>
          <StratoFoto schermata="incluso" contenuto={contenuto} immagini={immagini} mood={mood} velo={VELO.incluso} />
          <div style={{ position: "absolute", left: p.laterale, bottom: 52, right: p.laterale, display: "flex", flexDirection: "column", gap: 12 }}>
            <Etichetta colore={INCHIOSTRO.incluso}>{ETICHETTE.incluso}</Etichetta>
            <Titolo chiave="incluso-titolo" etichetta="Titolo di «incluso»" stile={TIPO_STORY.titoloTappe}>
              Tutto
              <br />
              organizzato
            </Titolo>
          </div>
        </div>

        <div
          style={{
            position: "absolute", top: FOTO_SCHERMATA.incluso.altezza, left: 0, right: 0, bottom: 0,
            boxSizing: "border-box", padding: `0 ${p.laterale}px ${p.basso}px`,
            display: "flex", flexDirection: "column", justifyContent: "center", gap: 48,
          }}
        >
          {dati.inclusi?.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {dati.inclusi.slice(0, CAPIENZA.inclusi).map((v, i) => (
                <div
                  key={`${v}-${i}`}
                  style={{
                    display: "flex", gap: 20, alignItems: "baseline",
                    fontFamily: TIPO_STORY.voceInclusi.famiglia, fontSize: TIPO_STORY.voceInclusi.corpo,
                    color: INCHIOSTRO.incluso,
                  }}
                >
                  <span style={{ color: ACCENTO, flex: "none" }}>—</span>
                  <span style={{ minWidth: 0 }}>{v}</span>
                </div>
              ))}
            </div>
          )}

          {dati.requisiti?.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16, borderTop: `1px solid ${FILO}`, paddingTop: 32 }}>
              <Etichetta colore={INCHIOSTRO.secondario}>{ETICHETTE.requisiti}</Etichetta>
              <TestoAdattivo
                chiave="requisiti" etichetta="Requisiti"
                size={TIPO_STORY.corpoRequisiti.corpo} minSize={22}
                altezzaMassima={TIPO_STORY.corpoRequisiti.corpo * TIPO_STORY.corpoRequisiti.interlinea * 5}
                style={{
                  fontFamily: TIPO_STORY.corpoRequisiti.famiglia, fontWeight: TIPO_STORY.corpoRequisiti.peso,
                  lineHeight: TIPO_STORY.corpoRequisiti.interlinea, color: INCHIOSTRO.secondario,
                }}
              >
                {dati.requisiti.join(". ")}.
              </TestoAdattivo>
            </div>
          )}
        </div>
      </Tela>
    );
  }

  /* ---------------- 06 PRENOTA ---------------- */
  if (meta.id === "prenota") {
    const notaPrezzo = (dati.inclusi || []).slice(0, 3).join(", ");
    const statoPosti = posti(testi.statoPosti);
    return (
      <Tela fondo={FONDO.scuro} riferimento={riferimento} numero={meta.numero}>
        <StratoFoto schermata="prenota" contenuto={contenuto} immagini={immagini} mood={mood} velo={VELO.prenota} />
        <div
          style={{
            position: "absolute", inset: 0, zIndex: 2, boxSizing: "border-box",
            padding: `${p.alto}px ${p.laterale}px ${p.basso}px`,
            display: "flex", flexDirection: "column", justifyContent: "space-between",
          }}
        >
          <Marchio conPayoff={false} dimensione={MARCHIO_STORY.logoPrenota} />

          <div style={{ display: "flex", flexDirection: "column", gap: 34 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Etichetta colore={INCHIOSTRO.secondario}>{ETICHETTE.prezzo}</Etichetta>
              <span
                style={{
                  fontFamily: TIPO_STORY.prezzo.famiglia, fontSize: TIPO_STORY.prezzo.corpo,
                  lineHeight: TIPO_STORY.prezzo.interlinea, color: ACCENTO,
                }}
              >
                {dati.prezzo || "—"}
              </span>
              {notaPrezzo && (
                <span
                  style={{
                    fontFamily: TIPO_STORY.notaPrezzo.famiglia, fontWeight: TIPO_STORY.notaPrezzo.peso,
                    fontSize: TIPO_STORY.notaPrezzo.corpo, color: INCHIOSTRO.secondario,
                  }}
                >
                  {notaPrezzo}
                </span>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12, borderTop: `1px solid ${FILO}`, paddingTop: 34 }}>
              <EtichettaPosti stato={statoPosti} />
              {/* La CTA resta quella scritta dall'autore: lo stato dei posti
                  la accompagna, non la riscrive. */}
              {testi.cta && (
                <span
                  style={{
                    fontFamily: TIPO_STORY.notaPrezzo.famiglia, fontWeight: TIPO_STORY.notaPrezzo.peso,
                    fontSize: TIPO_STORY.notaPrezzo.corpo, color: INCHIOSTRO.suVelo,
                  }}
                >
                  {testi.cta}
                </span>
              )}
            </div>
          </div>

          <div
            style={{
              display: "flex", flexDirection: "column", gap: 8,
              fontFamily: TIPO_STORY.piede.famiglia, fontSize: TIPO_STORY.piede.corpo, color: INCHIOSTRO.secondario,
            }}
          >
            {testi.whatsapp && <span>{testi.whatsapp}</span>}
            <span style={{ color: INCHIOSTRO.primario, fontWeight: 500 }}>
              {(dati.url || "").replace(/^https?:\/\//, "").replace(/\/eventi\/.*$/, "")}
            </span>
          </div>
        </div>
        <GuidaSticker />
      </Tela>
    );
  }

  return null;
}
