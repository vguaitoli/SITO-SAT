import React from "react";
import { Bed, Check, Coffee, Compass, Fuel, Gift, Luggage, Satellite, ShieldCheck, Truck, Utensils, Wrench } from "lucide-react";
import Telaio from "../../Telaio";
import Foto from "../../Foto";
import Mappa from "../../Mappa";
import { Cella, ControlloCapienza, Filo, TestoAdattivo } from "../../primitivi";
import { FORMATI } from "../../../design/formati";
import { COLORI, FONT, FOTO } from "../../../design/tokens";
import {
  ACCENTO, BadgeData, BadgeDisciplina, FasciaFoto, MarchioSuFoto, Percorso, Piede, Prezzo, SOFT, Stats, StatoPosti,
} from "./parti";
import { periodoBreve, periodoLeggibile } from "./date";

/**
 * Carosello evento — otto slide da 1080×1350, struttura fissa.
 *
 * L'ordine non è negoziabile e non cambia da evento a evento: è il format.
 * Cambiano i dati, le fotografie e il GPX.
 *
 *   01 cover · 02 numeri · 03 percorso · 04 tappe
 *   05 cosa vivrai · 06 cosa è incluso · 07 è il tour giusto · 08 prezzo e CTA
 *
 * Tutte le slide condividono la cornice della locandina: gutter di 60, marchio
 * e numerazione al loro posto, tipografia e filetti identici.
 */

export const SLIDE_CAROSELLO = [
  { id: "cover", numero: 1, file: "01-cover.png", titolo: "Cover" },
  { id: "numeri", numero: 2, file: "02-numeri.png", titolo: "L'evento in numeri" },
  { id: "percorso", numero: 3, file: "03-percorso.png", titolo: "Il percorso" },
  { id: "tappe", numero: 4, file: "04-tappe.png", titolo: "Le tappe" },
  { id: "esperienza", numero: 5, file: "05-esperienza.png", titolo: "Cosa vivrai" },
  { id: "incluso", numero: 6, file: "06-incluso.png", titolo: "Cosa è incluso" },
  { id: "requisiti", numero: 7, file: "07-requisiti.png", titolo: "È il tour giusto per te?" },
  { id: "cta", numero: 8, file: "08-cta.png", titolo: "Prezzo e CTA" },
];

const f = FORMATI.post;
const G = 60;
const UTILE = f.larghezza - G * 2;
const TOTALE = SLIDE_CAROSELLO.length;

/** Cornice interna comune alle slide che non hanno la fascia fotografica. */
function Corpo({ children, titolo, sottotitolo }) {
  return (
    <div
      style={{
        position: "absolute",
        top: 150,
        left: G,
        right: G,
        bottom: 56,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {titolo && (
        <TestoAdattivo
          chiave={`car-titolo-${titolo}`}
          etichetta={`Titolo «${titolo}»`}
          size={80}
          minSize={48}
          altezzaMassima={80 * 0.9 * 2}
          style={{
            fontFamily: FONT.titolo,
            lineHeight: 0.9,
            letterSpacing: "0.012em",
            textTransform: "uppercase",
            color: COLORI.testo,
          }}
        >
          {titolo}
        </TestoAdattivo>
      )}
      {sottotitolo && (
        <div
          style={{
            marginTop: 14,
            fontFamily: FONT.etichetta,
            fontSize: 20,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: SOFT,
          }}
        >
          {sottotitolo}
        </div>
      )}
      <div style={{ marginTop: 34, flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        {children}
      </div>
    </div>
  );
}

const ICONE = {
  pernottamento: Bed, mezza: Utensils, colazione: Coffee, cena: Utensils, pranzo: Utensils,
  guida: Compass, assistenza: Wrench, bagagl: Luggage, gps: Satellite, assicurazione: ShieldCheck,
  carburante: Fuel, trasporto: Truck, gadget: Gift, agriturismo: Bed,
};

function iconaPer(testo) {
  const t = String(testo || "").toLowerCase();
  const chiave = Object.keys(ICONE).find((k) => t.includes(k));
  return chiave ? ICONE[chiave] : Check;
}

/* ================================================================== */

export default function SlideCarosello({ id, contenuto, immagini = {}, traccia, riferimento }) {
  const dati = contenuto.fattuali || {};
  const testi = contenuto.editoriale || {};
  const meta = SLIDE_CAROSELLO.find((s) => s.id === id);
  if (!meta) return null;

  const comuni = { categoria: "eventi", formato: "post", numero: meta.numero, totale: TOTALE, riferimento };

  /* ---- 01 COVER: la locandina, identica al Post ---- */
  if (id === "cover") {
    return (
      <Telaio {...comuni} conLogo={false} conIsoipse={false}>
        <FasciaFoto
          altezza={700}
          sorgente={immagini[contenuto.media?.cover?.idBlob]}
          ritaglio={contenuto.media?.cover}
        >
          <div style={{ position: "absolute", top: 52, left: G }}>
            <MarchioSuFoto />
          </div>
          <div style={{ position: "absolute", top: 52, right: G }}>
            <BadgeDisciplina>{dati.categoria || dati.mezzo}</BadgeDisciplina>
          </div>
          <div style={{ position: "absolute", left: G, bottom: 34, display: "flex", gap: 16, alignItems: "center" }}>
            <BadgeData>{periodoBreve(dati)}</BadgeData>
            <StatoPosti stato={testi.statoPosti} />
          </div>
        </FasciaFoto>

        <div style={{ position: "absolute", top: 700, left: 0, right: 0, bottom: 0, padding: `38px ${G}px 52px`, display: "flex", flexDirection: "column" }}>
          <TestoAdattivo
            chiave="car-cover-titolo" etichetta="Titolo della cover"
            size={112} minSize={64} altezzaMassima={112 * 0.85 * 2}
            style={{ fontFamily: FONT.titolo, lineHeight: 0.85, letterSpacing: "0.012em", textTransform: "uppercase" }}
          >
            {testi.titoloBreve || dati.nome}
          </TestoAdattivo>

          {testi.claim && (
            <TestoAdattivo
              chiave="car-cover-claim" etichetta="Claim della cover"
              size={25} minSize={18} altezzaMassima={25 * 1.5 * 3}
              style={{ marginTop: 16, fontFamily: FONT.etichetta, letterSpacing: "0.18em", lineHeight: 1.5, textTransform: "uppercase", color: SOFT }}
            >
              {testi.claim}
            </TestoAdattivo>
          )}

          <div style={{ marginTop: "auto" }}>
            <Piede nota={periodoLeggibile(dati)} />
          </div>
        </div>
      </Telaio>
    );
  }

  /* ---- 02 L'EVENTO IN NUMERI ---- */
  if (id === "numeri") {
    const partecipanti =
      dati.partecipantiMin && dati.partecipantiMax ? `${dati.partecipantiMin}–${dati.partecipantiMax}` : "";
    const celle = [
      { v: dati.km, e: "Chilometri" }, { v: dati.sterrato, e: "Sterrato" },
      { v: dati.durata, e: "Durata" }, { v: dati.livello, e: "Livello" },
      { v: partecipanti, e: "Partecipanti" }, { v: dati.mezzo || dati.categoria, e: "Mezzo" },
    ];
    return (
      <Telaio {...comuni} etichetta={meta.titolo}>
        <Corpo titolo="L'evento in numeri" sottotitolo={periodoBreve(dati)}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "48px 40px" }}>
            {celle.map((c) => (
              <Cella key={c.e} valore={c.v} etichetta={c.e} size={62} colore={SOFT} />
            ))}
          </div>
          <div style={{ marginTop: "auto" }}>
            <Filo style={{ marginBottom: 26 }} />
            <TestoAdattivo
              chiave="car-numeri-frase" etichetta="Frase (slide numeri)"
              size={25} minSize={18} altezzaMassima={25 * 1.55 * 4}
              style={{ lineHeight: 1.55, color: "rgba(245,235,217,0.78)" }}
            >
              {testi.fraseNumeri || testi.claim || ""}
            </TestoAdattivo>
          </div>
        </Corpo>
      </Telaio>
    );
  }

  /* ---- 03 IL PERCORSO: la mappa dal GPX ---- */
  if (id === "percorso") {
    const segmenti = traccia?.segmenti || [];
    const asfalto = (() => {
      const n = Number.parseFloat(String(dati.sterrato).replace(",", "."));
      return Number.isFinite(n) ? `${Math.max(0, 100 - n)}%` : null;
    })();

    return (
      <Telaio {...comuni} etichetta={meta.titolo}>
        <Corpo titolo="Il percorso" sottotitolo={dati.km ? `${dati.km} · ${dati.sterrato || ""}`.trim() : ""}>
          <div style={{ position: "relative" }}>
            <Mappa
              segmenti={segmenti}
              configurazione={contenuto.mappa}
              larghezza={UTILE}
              altezza={720}
            />
            {!segmenti.length && (
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontFamily: FONT.etichetta, fontSize: 22, letterSpacing: "0.22em", textTransform: "uppercase", background: "rgba(28,24,20,0.85)", border: `1px solid ${COLORI.filo}`, padding: "14px 24px" }}>
                  Carica il file GPX
                </span>
              </div>
            )}
          </div>

          <div style={{ marginTop: "auto", paddingTop: 24 }}>
            <Filo style={{ marginBottom: 20 }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 32 }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <Percorso tappe={dati.tappe} puntiInteresse={dati.puntiInteresse} />
              </div>
              {asfalto && (
                <div style={{ flex: "none", textAlign: "right" }}>
                  <span style={{ fontFamily: FONT.etichetta, fontSize: 13, letterSpacing: "0.19em", textTransform: "uppercase", color: "rgba(245,235,217,0.55)" }}>
                    Sterrato / Asfalto
                  </span>
                  <div style={{ fontFamily: FONT.titolo, fontSize: 42, lineHeight: 1, color: SOFT }}>
                    {dati.sterrato} <span style={{ color: "rgba(245,235,217,0.4)" }}>/ {asfalto}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Corpo>
      </Telaio>
    );
  }

  /* ---- 04 LE TAPPE ---- */
  if (id === "tappe") {
    const tappe = dati.tappe || [];
    const compatto = tappe.length > 4;
    return (
      <Telaio {...comuni} etichetta={meta.titolo}>
        <Corpo titolo="Le tappe" sottotitolo={dati.durata}>
          <ControlloCapienza chiave="car-tappe" etichetta="Tappe" quante={tappe.length} massimo={8} />
          <div style={{ display: "flex", flexDirection: "column" }}>
            {!tappe.length && (
              <span style={{ color: COLORI.testoDebole, fontSize: 24 }}>Nessuna tappa inserita.</span>
            )}
            {tappe.map((t, i) => (
              <div
                key={t.id || i}
                style={{
                  display: "flex", gap: 24, alignItems: "center",
                  borderTop: i === 0 ? `1px solid ${COLORI.filo}` : "none",
                  borderBottom: `1px solid ${COLORI.filo}`,
                  padding: compatto ? "18px 0" : "26px 0",
                }}
              >
                <div style={{ flex: "none", width: 78 }}>
                  <div style={{ fontFamily: FONT.titolo, fontSize: compatto ? 44 : 54, lineHeight: 0.9, color: ACCENTO }}>
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <div style={{ fontFamily: FONT.etichetta, fontSize: 13, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(245,235,217,0.5)", marginTop: 4 }}>
                    {t.giorno || `Giorno ${i + 1}`}
                  </div>
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <TestoAdattivo
                    chiave={`car-tappa-${i}`} etichetta={`Tappa ${i + 1}`}
                    size={compatto ? 38 : 46} minSize={26}
                    altezzaMassima={(compatto ? 38 : 46) * 1.1 * 2}
                    style={{ fontFamily: FONT.titolo, lineHeight: 1.05, textTransform: "uppercase", color: COLORI.testo }}
                  >
                    {t.partenza && t.arrivo ? `${t.partenza} → ${t.arrivo}` : t.arrivo || t.partenza || "—"}
                  </TestoAdattivo>
                  {!compatto && t.descrizione && (
                    <TestoAdattivo
                      chiave={`car-tappa-desc-${i}`} etichetta={`Descrizione tappa ${i + 1}`}
                      size={20} minSize={16} altezzaMassima={20 * 1.45 * 2}
                      style={{ marginTop: 8, lineHeight: 1.45, color: "rgba(245,235,217,0.68)" }}
                    >
                      {t.descrizione}
                    </TestoAdattivo>
                  )}
                </div>

                {t.km && (
                  <div style={{ flex: "none", textAlign: "right" }}>
                    <div style={{ fontFamily: FONT.titolo, fontSize: compatto ? 34 : 40, lineHeight: 1, color: SOFT }}>{t.km}</div>
                    <div style={{ fontFamily: FONT.etichetta, fontSize: 12, letterSpacing: "0.18em", color: "rgba(245,235,217,0.45)" }}>KM</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Corpo>
      </Telaio>
    );
  }

  /* ---- 05 COSA VIVRAI ---- */
  if (id === "esperienza") {
    const foto = (contenuto.media?.esperienza || []).slice(0, 4);
    const quante = foto.filter((x) => x?.idBlob).length;
    const highlight = (testi.highlight || []).slice(0, 4);
    return (
      <Telaio {...comuni} etichetta={meta.titolo}>
        <Corpo titolo="Cosa vivrai">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gridTemplateRows: quante <= 2 ? "420px" : "250px 250px",
              gap: 10,
            }}
          >
            {(quante <= 2 ? foto.slice(0, 2) : foto).map((r, i) => (
              <div key={i} style={{ position: "relative", overflow: "hidden" }}>
                <Foto
                  sorgente={immagini[r?.idBlob]}
                  ritaglio={r}
                  velo={FOTO.velo.leggero}
                  etichettaVuoto={`Foto ${i + 1}`}
                />
              </div>
            ))}
          </div>

          <ControlloCapienza chiave="car-highlight" etichetta="Highlight" quante={(testi.highlight || []).length} massimo={4} />

          <div style={{ marginTop: "auto", paddingTop: 30, display: "grid", gridTemplateColumns: highlight.length > 2 ? "1fr 1fr" : "1fr", gap: "22px 40px" }}>
            {highlight.map((h) => (
              <div key={h.id} style={{ borderTop: `1px solid ${COLORI.filo}`, paddingTop: 12 }}>
                <div style={{ fontFamily: FONT.titolo, fontSize: 38, lineHeight: 1, textTransform: "uppercase", color: SOFT }}>
                  {h.titolo || "—"}
                </div>
                {h.descrizione && (
                  <div style={{ marginTop: 6, fontSize: 17, lineHeight: 1.4, color: "rgba(245,235,217,0.65)" }}>
                    {h.descrizione}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Corpo>
      </Telaio>
    );
  }

  /* ---- 06 COSA È INCLUSO ---- */
  if (id === "incluso") {
    const voci = dati.inclusi || [];
    const due = voci.length > 5;
    return (
      <Telaio {...comuni} etichetta={meta.titolo}>
        <Corpo titolo="Cosa è incluso">
          <ControlloCapienza chiave="car-inclusi" etichetta="Servizi inclusi" quante={voci.length} massimo={12} />
          <div style={{ display: "grid", gridTemplateColumns: due ? "1fr 1fr" : "1fr", gap: due ? "22px 40px" : 22, alignContent: "start" }}>
            {!voci.length && <span style={{ color: COLORI.testoDebole, fontSize: 24 }}>Nessun servizio indicato.</span>}
            {voci.map((v, i) => {
              const Icona = iconaPer(v);
              return (
                <div key={`${v}-${i}`} style={{ display: "flex", alignItems: "center", gap: 18, borderBottom: `1px solid ${COLORI.filo}`, paddingBottom: 16, minWidth: 0 }}>
                  <Icona size={due ? 26 : 32} color={ACCENTO} strokeWidth={1.6} aria-hidden="true" />
                  <span style={{ fontSize: due ? 23 : 27, lineHeight: 1.3, color: COLORI.testo, minWidth: 0 }}>{v}</span>
                </div>
              );
            })}
          </div>

          {dati.nonInclusi?.length > 0 && (
            <div style={{ marginTop: "auto", paddingTop: 26 }}>
              <Filo style={{ marginBottom: 18 }} />
              <span style={{ fontFamily: FONT.etichetta, fontSize: 13, letterSpacing: "0.19em", textTransform: "uppercase", color: "rgba(245,235,217,0.55)" }}>
                Non incluso
              </span>
              <TestoAdattivo
                chiave="car-nonincluso" etichetta="Non incluso"
                size={21} minSize={16} altezzaMassima={21 * 1.45 * 2}
                style={{ marginTop: 10, lineHeight: 1.45, color: "rgba(245,235,217,0.68)" }}
              >
                {dati.nonInclusi.join(" · ")}
              </TestoAdattivo>
            </div>
          )}
        </Corpo>
      </Telaio>
    );
  }

  /* ---- 07 È IL TOUR GIUSTO PER TE? ---- */
  if (id === "requisiti") {
    const righe = [
      ["Mezzo richiesto", dati.mezzo || dati.categoria],
      ["Pneumatici", dati.pneumatici],
      ["Esperienza", dati.esperienza],
      ["Difficoltà", dati.livello],
    ].filter(([, v]) => v);

    return (
      <Telaio {...comuni} etichetta="Requisiti">
        <Corpo titolo="È il tour giusto per te?">
          <div>
            {righe.map(([k, v]) => (
              <div key={k} style={{ display: "flex", gap: 24, alignItems: "baseline", padding: "16px 0", borderBottom: `1px solid ${COLORI.filo}` }}>
                <span style={{ flex: "none", width: 250, fontFamily: FONT.etichetta, fontSize: 13, letterSpacing: "0.19em", textTransform: "uppercase", color: "rgba(245,235,217,0.55)" }}>
                  {k}
                </span>
                <span style={{ flex: 1, minWidth: 0, fontSize: 24, lineHeight: 1.35, color: COLORI.testo }}>{v}</span>
              </div>
            ))}
          </div>

          <ControlloCapienza chiave="car-requisiti" etichetta="Requisiti" quante={(dati.requisiti || []).length} massimo={6} />

          {dati.requisiti?.length > 0 && (
            <div style={{ marginTop: 30 }}>
              <span style={{ fontFamily: FONT.etichetta, fontSize: 13, letterSpacing: "0.19em", textTransform: "uppercase", color: ACCENTO }}>
                Cosa serve
              </span>
              <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                {dati.requisiti.map((r, i) => (
                  <div key={`${r}-${i}`} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                    <Check size={20} color={SOFT} strokeWidth={2} style={{ marginTop: 3, flex: "none" }} aria-hidden="true" />
                    <span style={{ fontSize: 22, lineHeight: 1.4, color: "rgba(245,235,217,0.78)" }}>{r}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ marginTop: "auto" }}>
            <Piede nota={dati.partecipantiMin ? `Gruppi da ${dati.partecipantiMin} a ${dati.partecipantiMax} partecipanti` : ""} />
          </div>
        </Corpo>
      </Telaio>
    );
  }

  /* ---- 08 PREZZO E CTA ---- */
  if (id === "cta") {
    return (
      <Telaio {...comuni} etichetta={meta.titolo} conLogo={false} conIsoipse={false}>
        <FasciaFoto
          altezza={560}
          sorgente={immagini[contenuto.media?.sfondi?.cta?.idBlob || contenuto.media?.cover?.idBlob]}
          ritaglio={contenuto.media?.sfondi?.cta || contenuto.media?.cover}
        >
          <div style={{ position: "absolute", top: 52, left: G }}>
            <MarchioSuFoto />
          </div>
          <div style={{ position: "absolute", left: G, bottom: 30, display: "flex", gap: 16, alignItems: "center" }}>
            <BadgeData>{periodoBreve(dati)}</BadgeData>
            <StatoPosti stato={testi.statoPosti} />
          </div>
        </FasciaFoto>

        <div style={{ position: "absolute", top: 560, left: 0, right: 0, bottom: 0, padding: `36px ${G}px 52px`, display: "flex", flexDirection: "column" }}>
          <TestoAdattivo
            chiave="car-cta-titolo" etichetta="Titolo (CTA)"
            size={86} minSize={52} altezzaMassima={86 * 0.88 * 2}
            style={{ fontFamily: FONT.titolo, lineHeight: 0.88, textTransform: "uppercase", letterSpacing: "0.012em" }}
          >
            {testi.titoloBreve || dati.nome}
          </TestoAdattivo>

          <div style={{ marginTop: 12, fontFamily: FONT.etichetta, fontSize: 20, letterSpacing: "0.2em", textTransform: "uppercase", color: SOFT }}>
            {periodoLeggibile(dati)}
          </div>

          <div style={{ marginTop: "auto" }}>
            <Stats
              colonne={[
                { etichetta: "Prezzo", valore: dati.prezzo },
                { etichetta: "Partecipanti", valore: dati.partecipantiMin ? `${dati.partecipantiMin}–${dati.partecipantiMax}` : "" },
                { etichetta: "Durata", valore: dati.durata },
              ]}
            />

            <div style={{ marginTop: 24 }}>
              <Prezzo valore={dati.prezzo} corpo={96} />
            </div>

            {testi.cta && (
              <div style={{ marginTop: 24, background: COLORI.verde, padding: "24px 28px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20 }}>
                <span style={{ fontFamily: FONT.etichetta, fontSize: 28, letterSpacing: "0.12em", textTransform: "uppercase", color: COLORI.testo }}>
                  {testi.cta}
                </span>
                {testi.whatsapp && (
                  <span style={{ fontFamily: FONT.etichetta, fontSize: 20, letterSpacing: "0.1em", color: "rgba(245,235,217,0.85)" }}>
                    {testi.whatsapp}
                  </span>
                )}
              </div>
            )}

            <div style={{ marginTop: 20 }}>
              <Piede nota={(dati.url || "").replace(/^https?:\/\//, "")} />
            </div>
          </div>
        </div>
      </Telaio>
    );
  }

  return null;
}
