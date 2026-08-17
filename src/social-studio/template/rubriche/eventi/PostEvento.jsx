import React from "react";
import Telaio from "../../Telaio";
import Foto from "../../Foto";
import { Cella, Filo, MicroEtichetta, TestoAdattivo } from "../../primitivi";
import { CATEGORIE } from "../../../design/categorie";
import { FORMATI } from "../../../design/formati";
import { COLORI, FONT, FOTO, TESTO } from "../../../design/tokens";

/**
 * Post evento — 1080×1350.
 *
 * ⚠️ GRAFICA PROVVISORIA. La struttura è ricavata dal raster della locandina
 * «La Via dei Giganti»: marchio in alto a sinistra, badge della categoria
 * riquadrato in alto a destra, eyebrow con filetto, titolo su due righe con la
 * seconda in accento, claim, fascia dati a quattro colonne, tappe e inclusi
 * affiancati, piede con contatti. Il trattamento definitivo attende il
 * sorgente `Locandina-Via-dei-Giganti.dc.html`: senza quello non si finalizza.
 *
 * Ciò che invece è già definitivo è l'impianto: cornice condivisa, primitivi
 * comuni, testo che si adatta e segnala gli sfori, dati che arrivano dal ramo
 * `fattuali` e testi dal ramo `editoriale`.
 */
export default function PostEvento({ contenuto, immagini = {}, riferimento }) {
  const f = FORMATI.post;
  const rubrica = CATEGORIE.eventi;
  const dati = contenuto.fattuali || {};
  const testi = contenuto.editoriale || {};

  const margine = f.margine.sinistro;
  const larghezzaUtile = f.larghezza - margine * 2;

  // Il titolo si spezza sull'ultima parola: è il taglio della locandina,
  // dove «GIGANTI» sta da solo in accento.
  const parole = String(testi.titoloBreve || dati.nome || "").trim().split(/\s+/);
  const ultima = parole.length > 1 ? parole.pop() : "";
  const primaParte = parole.join(" ");

  const partecipanti =
    dati.partecipantiMin && dati.partecipantiMax
      ? `${dati.partecipantiMin}–${dati.partecipantiMax}`
      : dati.partecipantiMax || dati.partecipantiMin || "";

  const colonne = [
    { etichetta: "Date", valore: dati.periodo || dati.dataInizio },
    { etichetta: "Partenza", valore: dati.partenza || dati.puntiInteresse?.[0] },
    { etichetta: "Sterrato", valore: dati.sterrato },
    { etichetta: "Livello", valore: dati.livello },
  ];

  return (
    <Telaio
      categoria="eventi"
      formato="post"
      riferimento={riferimento}
      conLogo={false}
      sfondo={
        contenuto.media?.cover?.idBlob ? (
          <Foto
            sorgente={immagini[contenuto.media.cover.idBlob]}
            ritaglio={contenuto.media.cover}
            velo={FOTO.velo.denso}
          />
        ) : null
      }
    >
      {/* Testa: marchio a sinistra, badge della disciplina a destra. */}
      <div
        style={{
          position: "absolute",
          top: margine,
          left: margine,
          right: margine,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 32,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: FONT.etichetta,
              fontWeight: 600,
              fontSize: 30,
              lineHeight: 1.2,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            Sardegna Trail
            <br />
            Avventura
          </div>
          <div
            style={{
              marginTop: 10,
              fontFamily: FONT.etichetta,
              fontSize: 15,
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              color: COLORI.testoDebole,
            }}
          >
            La Sardegna che non ti aspetti
          </div>
        </div>

        <div style={{ textAlign: "right", flex: "none" }}>
          <span
            style={{
              display: "inline-block",
              border: `2px solid ${rubrica.accento}`,
              color: rubrica.accento,
              fontFamily: FONT.etichetta,
              fontWeight: 500,
              fontSize: 26,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              padding: "14px 26px",
            }}
          >
            {dati.categoria || dati.mezzo || "Evento"}
          </span>
          {testi.statoPosti === "ultimi" && (
            <div
              style={{
                marginTop: 12,
                fontFamily: FONT.etichetta,
                fontSize: 15,
                letterSpacing: "0.24em",
                textTransform: "uppercase",
                color: COLORI.testoDebole,
              }}
            >
              Ultimi posti
            </div>
          )}
        </div>
      </div>

      {/* Centro: eyebrow, titolo, claim. */}
      <div style={{ position: "absolute", top: 370, left: margine, right: margine, height: 430, overflow: "hidden" }}>
        {dati.puntiInteresse?.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 22, marginBottom: 26 }}>
            <span style={{ width: 74, height: 5, background: rubrica.accento, flex: "none" }} />
            <MicroEtichetta colore={COLORI.testo} style={{ fontSize: 24, letterSpacing: "0.3em" }}>
              {dati.zona || dati.puntiInteresse[0]}
            </MicroEtichetta>
          </div>
        )}

        <TestoAdattivo
          chiave="post-evento-titolo"
          etichetta="Titolo del post"
          size={116}
          minSize={64}
          altezzaMassima={116 * 1.95}
          style={{
            fontFamily: FONT.etichetta,
            fontWeight: 700,
            lineHeight: 0.92,
            textTransform: "uppercase",
            letterSpacing: "-0.005em",
          }}
        >
          {primaParte}
          {ultima && (
            <span style={{ color: rubrica.accento, display: "block" }}>{ultima}</span>
          )}
        </TestoAdattivo>

        {testi.claim && (
          <TestoAdattivo
            chiave="post-evento-claim"
            etichetta="Claim"
            size={30}
            minSize={22}
            altezzaMassima={30 * 1.45 * 3}
            style={{
              marginTop: 34,
              fontWeight: 300,
              lineHeight: 1.45,
              color: COLORI.testoTenue,
              maxWidth: 640,
            }}
          >
            {testi.claim}
          </TestoAdattivo>
        )}
      </div>

      {/* Fascia dati a quattro colonne. */}
      <div
        style={{
          position: "absolute",
          left: margine,
          right: margine,
          bottom: margine + 246,
          borderTop: `1px solid ${COLORI.filo}`,
          borderBottom: `1px solid ${COLORI.filo}`,
          padding: "34px 0",
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 20,
        }}
      >
        {colonne.map((c) => (
          <Cella
            key={c.etichetta}
            etichetta={c.etichetta}
            valore={c.valore}
            size={34}
            colore={COLORI.testo}
          />
        ))}
      </div>

      {/* Tappe e inclusi, affiancati. */}
      <div
        style={{
          position: "absolute",
          left: margine,
          right: margine,
          bottom: margine + 96,
          display: "flex",
          gap: 40,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <MicroEtichetta colore={COLORI.testoDebole} style={{ fontSize: 17 }}>
            {dati.tappe?.length ? `L'anello in ${dati.tappe.length} tappe` : "Percorso"}
          </MicroEtichetta>
          <TestoAdattivo
            chiave="post-evento-tappe"
            etichetta="Elenco tappe"
            size={30}
            minSize={20}
            altezzaMassima={30 * 1.35 * 2}
            style={{
              marginTop: 14,
              fontFamily: FONT.etichetta,
              fontWeight: 600,
              lineHeight: 1.35,
              textTransform: "uppercase",
            }}
          >
            {dati.tappe?.length
              ? [dati.tappe[0]?.partenza, ...dati.tappe.map((t) => t.arrivo)].filter(Boolean).join(" · ")
              : dati.puntiInteresse.join(" · ")}
          </TestoAdattivo>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <TestoAdattivo
            chiave="post-evento-inclusi"
            etichetta="Servizi inclusi"
            size={24}
            minSize={17}
            altezzaMassima={24 * 1.7 * 4}
            style={{ fontWeight: 300, lineHeight: 1.7, color: COLORI.testoTenue }}
          >
            {(dati.inclusi || []).slice(0, 4).map((v) => (
              <div key={v}>
                <span style={{ color: rubrica.accento, marginRight: 12 }}>•</span>
                {v}
              </div>
            ))}
          </TestoAdattivo>
        </div>
      </div>

      {/* Piede: contatti e sito. */}
      <div
        style={{
          position: "absolute",
          left: margine,
          right: margine,
          bottom: margine - 20,
          paddingTop: 26,
          borderTop: `1px solid ${COLORI.filo}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: 24,
          fontFamily: FONT.etichetta,
          fontSize: 20,
          letterSpacing: "0.1em",
          color: COLORI.testoDebole,
        }}
      >
        <span>+39 348 79 81 591 · @sardegnatrailavventura</span>
        <span style={{ color: COLORI.testo }}>
          {(dati.url || "www.sardegnatrailavventura.it").replace(/^https?:\/\//, "")}
        </span>
      </div>

      {/* Prezzo, quando c'è: sta sopra la fascia dati, a destra. */}
      {dati.prezzo && (
        <div
          style={{
            position: "absolute",
            right: margine,
            top: 838,
            textAlign: "right",
          }}
        >
          <span
            style={{
              fontFamily: FONT.titolo,
              fontSize: TESTO.numeroXL.size,
              lineHeight: 0.85,
              color: rubrica.accento,
            }}
          >
            {dati.prezzo}
          </span>
          <Filo colore={COLORI.filo} style={{ marginTop: 10, width: 120, marginLeft: "auto" }} />
          <div
            style={{
              marginTop: 8,
              fontFamily: FONT.etichetta,
              fontSize: 16,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: COLORI.testoDebole,
            }}
          >
            a persona
          </div>
        </div>
      )}

      <span style={{ position: "absolute", width: larghezzaUtile, height: 0, overflow: "hidden" }} />
    </Telaio>
  );
}
