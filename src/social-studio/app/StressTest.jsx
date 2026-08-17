import React, { useMemo, useRef, useState } from "react";
import { Play, Square, Upload } from "lucide-react";
import Telaio from "../template/Telaio";
import Foto from "../template/Foto";
import Mappa from "../template/Mappa";
import { Cella, Filo, FornitoreProblemi, Logo, MicroEtichetta, TestoAdattivo } from "../template/primitivi";
import { FORMATI } from "../design/formati";
import { COLORI, FONT, FOTO } from "../design/tokens";
import { catturaSequenza } from "../motori/export/cattura";
import { creaLavoroExport } from "../motori/export/esporta";
import { leggiMemoria } from "../motori/export/cattura";
import { analizzaGpx } from "../motori/gpx";
import { tracciaDiProva } from "./tracciaProva";

/**
 * Banco di prova dell'esportazione.
 *
 * Otto grafiche 1080×1350 con tutto ciò che il format usa davvero: fotografia
 * ad alta risoluzione, i tre webfont, SVG, isoipse, mappa della Sardegna con
 * traccia e marcatori, gradienti, logo, titoli grandi e microtesto.
 *
 * Serve a misurare, non a dimostrare: i numeri che produce sono il criterio con
 * cui si decide se html2canvas è adeguato.
 */

const FOTO_ALTA_RISOLUZIONE = "/media/reali/4x4-guado-1800.webp";

/** Le otto slide del banco: ognuna carica un elemento in più della precedente. */
const SLIDE = [
  { id: "01", nome: "01-cover.png", titolo: "La Via dei Giganti", conFoto: true, conMappa: false },
  { id: "02", nome: "02-numeri.png", titolo: "L'evento in numeri", conFoto: false, conMappa: false },
  { id: "03", nome: "03-percorso.png", titolo: "Il percorso", conFoto: false, conMappa: true },
  { id: "04", nome: "04-tappe.png", titolo: "Le tappe", conFoto: false, conMappa: false },
  { id: "05", nome: "05-esperienza.png", titolo: "Cosa vivrai", conFoto: true, conMappa: false },
  { id: "06", nome: "06-incluso.png", titolo: "Cosa è incluso", conFoto: false, conMappa: false },
  { id: "07", nome: "07-requisiti.png", titolo: "È il tour giusto per te?", conFoto: false, conMappa: false },
  { id: "08", nome: "08-cta.png", titolo: "Prenota", conFoto: true, conMappa: true },
];

export default function StressTest() {
  const [traccia, setTraccia] = useState(() => tracciaDiProva());
  const [origineTraccia, setOrigineTraccia] = useState("sintetica");
  const [stato, setStato] = useState("pronto");
  const [avanzamento, setAvanzamento] = useState(null);
  const [rapporto, setRapporto] = useState(null);
  const [errore, setErrore] = useState(null);
  const nodi = useRef(new Map());
  const lavoro = useRef(null);

  const configurazioneMappa = useMemo(
    () => ({
      zoom: 1, spostamento: { x: 0, y: 0 }, rotazione: 0, margine: 0.12,
      spessoreTraccia: 7, mostraMarker: true, mostraNomi: true, mostraIsola: true,
      localita: traccia.localita,
    }),
    [traccia],
  );

  const caricaGpx = async (file) => {
    try {
      const analisi = analizzaGpx(await file.text(), file.name);
      if (!analisi.segmenti.length) throw new Error("Il file non contiene una traccia.");
      setTraccia({
        segmenti: analisi.segmenti,
        localita: analisi.waypoint.slice(0, 12).map((w, i) => ({ id: `w-${i}`, ...w })),
        punti: analisi.metriche.punti,
      });
      setOrigineTraccia(`file reale · ${file.name}`);
      setErrore(null);
    } catch (e) {
      setErrore(e.message);
    }
  };

  const avvia = async () => {
    setStato("in-corso");
    setRapporto(null);
    setErrore(null);
    setAvanzamento({ fatti: 0, totale: SLIDE.length, corrente: "", ms: 0 });
    lavoro.current = creaLavoroExport();

    const elementi = SLIDE.map((s) => ({
      id: s.id, nome: s.nome, formato: "post", nodo: nodi.current.get(s.id),
    })).filter((e) => e.nodo);

    const memoriaPrima = leggiMemoria();
    try {
      const esito = await catturaSequenza(elementi, {
        segnale: lavoro.current.segnale,
        onAvanzamento: setAvanzamento,
      });

      // Determinismo: la prima slide si rifotografa e i due PNG devono
      // coincidere byte per byte. È la verifica che «preview = export» non
      // dipenda dal momento in cui si scatta.
      const bis = await catturaSequenza([elementi[0]], { segnale: lavoro.current.segnale });
      const a = new Uint8Array(await esito.file[0].blob.arrayBuffer());
      const b = new Uint8Array(await bis.file[0].blob.arrayBuffer());
      const identiche = a.length === b.length && a.every((v, i) => v === b[i]);

      setRapporto({
        origineTraccia,
        puntiTraccia: traccia.punti,
        perSlide: esito.file.map((f) => ({ nome: f.nome, ms: f.ms, byte: f.blob.size })),
        msTotale: esito.msTotale,
        msMedio: Math.round(esito.msTotale / esito.file.length),
        memoria: esito.memoria || (memoriaPrima ? { nota: "non confrontabile" } : null),
        deterministica: identiche,
        dimensioni: `${FORMATI.post.larghezza}×${FORMATI.post.altezza}`,
      });
      setStato("fatto");
    } catch (e) {
      if (e.name === "Annullato") {
        setStato("annullato");
        return;
      }
      setErrore(`${e.name}: ${e.message}`);
      setStato("errore");
    }
  };

  return (
    <section className="border border-[var(--border-on-dark)] p-5">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="font-button text-xs uppercase tracking-[0.2em] text-[var(--accent-soft)]">
          Banco di prova · export 8 × 1080×1350
        </h2>
        <span className="font-body text-xs text-granite-mist/45">
          traccia: {origineTraccia} · {traccia.punti.toLocaleString("it-IT")} punti
        </span>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={avvia}
          disabled={stato === "in-corso"}
          className="btn-mech inline-flex items-center gap-2 bg-[var(--cta)] px-4 py-2.5 text-sm text-[var(--cta-text)] transition-colors hover:bg-[var(--cta-hover)] disabled:opacity-50"
        >
          <Play size={15} aria-hidden="true" />
          Avvia le otto catture
        </button>

        <button
          type="button"
          onClick={() => lavoro.current?.annulla()}
          disabled={stato !== "in-corso"}
          className="btn-mech inline-flex items-center gap-2 border border-[var(--border-on-dark)] px-4 py-2.5 text-sm transition-colors hover:border-[var(--accent)] disabled:opacity-40"
        >
          <Square size={14} aria-hidden="true" />
          Annulla
        </button>

        <label className="btn-mech inline-flex cursor-pointer items-center gap-2 border border-[var(--border-on-dark)] px-4 py-2.5 text-sm transition-colors hover:border-[var(--accent)]">
          <Upload size={15} aria-hidden="true" />
          Carica un GPX reale
          <input
            type="file"
            accept=".gpx"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && caricaGpx(e.target.files[0])}
          />
        </label>
      </div>

      {avanzamento && stato === "in-corso" && (
        <div className="mb-4">
          <div className="h-1.5 w-full bg-[var(--carbon)]">
            <div
              className="h-full bg-[var(--accent)] transition-all"
              style={{ width: `${(avanzamento.fatti / avanzamento.totale) * 100}%` }}
            />
          </div>
          <p className="mt-2 font-body text-xs text-granite-mist/60">
            {avanzamento.fatti} di {avanzamento.totale} · {avanzamento.corrente}
            {avanzamento.ms ? ` · ${avanzamento.ms} ms` : ""}
          </p>
        </div>
      )}

      {stato === "annullato" && (
        <p className="mb-4 border-l-2 border-[var(--accent)] pl-3 font-body text-sm text-granite-mist/80">
          Annullata a metà: l'interfaccia è rimasta reattiva e nessun file è stato scritto.
        </p>
      )}

      {errore && (
        <p className="mb-4 border-l-2 pl-3 font-body text-sm" style={{ borderColor: "#C0453B", color: "#E2857A" }}>
          {errore}
        </p>
      )}

      {rapporto && <Rapporto dati={rapporto} />}

      {/* Le otto grafiche, fuori dalla vista ma a misura reale: è il nodo che
          viene fotografato, lo stesso che l'anteprima mostrerebbe. */}
      <div aria-hidden="true" style={{ position: "fixed", left: -99999, top: 0, opacity: 0, pointerEvents: "none" }}>
        <FornitoreProblemi onProblemi={() => {}}>
          {SLIDE.map((s, i) => (
            <SlideDiProva
              key={s.id}
              indice={i}
              slide={s}
              traccia={traccia}
              configurazioneMappa={configurazioneMappa}
              riferimento={(el) => {
                if (el) nodi.current.set(s.id, el);
                else nodi.current.delete(s.id);
              }}
            />
          ))}
        </FornitoreProblemi>
      </div>
    </section>
  );
}

function Rapporto({ dati }) {
  return (
    <div className="border border-[var(--border-on-dark)] bg-[var(--carbon)] p-4">
      <h3 className="mb-3 font-button text-[10px] uppercase tracking-[0.22em] text-[var(--accent-soft)]">
        Rapporto
      </h3>

      <dl className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Voce etichetta="Tempo totale" valore={`${(dati.msTotale / 1000).toFixed(1)} s`} />
        <Voce etichetta="Media per slide" valore={`${dati.msMedio} ms`} />
        <Voce etichetta="Dimensioni" valore={dati.dimensioni} />
        <Voce
          etichetta="Deterministica"
          valore={dati.deterministica ? "sì" : "NO"}
        />
      </dl>

      <table className="w-full font-body text-xs">
        <thead>
          <tr className="text-left text-granite-mist/45">
            <th className="pb-2 font-normal">Slide</th>
            <th className="pb-2 text-right font-normal">Tempo</th>
            <th className="pb-2 text-right font-normal">Peso PNG</th>
          </tr>
        </thead>
        <tbody>
          {dati.perSlide.map((s) => (
            <tr key={s.nome} className="border-t border-[var(--border-on-dark)]">
              <td className="py-1.5">{s.nome}</td>
              <td className="py-1.5 text-right">{s.ms} ms</td>
              <td className="py-1.5 text-right text-granite-mist/55">
                {(s.byte / 1024).toFixed(0)} KB
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="mt-3 font-body text-xs leading-relaxed text-granite-mist/50">
        Traccia: {dati.origineTraccia} · {dati.puntiTraccia.toLocaleString("it-IT")} punti.
        {dati.memoria?.delta !== undefined
          ? ` Memoria: ${(dati.memoria.delta / 1024 / 1024).toFixed(1)} MB di variazione dopo otto catture.`
          : " Memoria non misurabile in questo browser."}
      </p>
    </div>
  );
}

function Voce({ etichetta, valore }) {
  return (
    <div>
      <dt className="font-button text-[10px] uppercase tracking-[0.2em] text-granite-mist/45">
        {etichetta}
      </dt>
      <dd className="mt-1 font-heading text-2xl leading-none">{valore}</dd>
    </div>
  );
}

/**
 * Una grafica del banco. Non è un template di produzione: è deliberatamente
 * carica di tutti gli elementi costosi insieme, per misurare il caso peggiore.
 */
function SlideDiProva({ indice, slide, traccia, configurazioneMappa, riferimento }) {
  const f = FORMATI.post;
  const m = f.margine.sinistro;

  return (
    <Telaio
      categoria="eventi"
      formato="post"
      numero={indice + 1}
      totale={SLIDE.length}
      etichetta={slide.titolo}
      riferimento={riferimento}
      sfondo={
        slide.conFoto ? (
          <Foto sorgente={FOTO_ALTA_RISOLUZIONE} ritaglio={{ zoom: 1.1, x: 0.5, y: 0.45 }} velo={FOTO.velo.medio} />
        ) : null
      }
    >
      <div style={{ position: "absolute", left: m, right: m, top: 190 }}>
        <TestoAdattivo
          chiave={`prova-titolo-${slide.id}`}
          etichetta="Titolo"
          size={104}
          minSize={56}
          altezzaMassima={104 * 2}
          style={{
            fontFamily: FONT.titolo,
            lineHeight: 0.88,
            textTransform: "uppercase",
            letterSpacing: "0.01em",
          }}
        >
          {slide.titolo}
        </TestoAdattivo>

        {/* Microtesto: il caso critico per la fedeltà dei glifi piccoli. */}
        <p style={{ marginTop: 18, fontSize: 15, lineHeight: 1.5, color: COLORI.testoDebole, maxWidth: 620 }}>
          Microtesto di controllo a 15 px con accenti à è ì ò ù, cifre 0123456789 e
          punteggiatura — per verificare che i glifi piccoli non degradino nella cattura.
        </p>
      </div>

      {slide.conMappa && (
        <div style={{ position: "absolute", left: m, right: m, top: 470 }}>
          <Mappa
            segmenti={traccia.segmenti}
            configurazione={configurazioneMappa}
            larghezza={f.larghezza - m * 2}
            altezza={560}
          />
        </div>
      )}

      {!slide.conMappa && (
        <div
          style={{
            position: "absolute",
            left: m,
            right: m,
            top: 470,
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: "40px 30px",
          }}
        >
          {[
            ["550 km", "Distanza"], ["85%", "Sterrato"], ["4 giorni", "Durata"],
            ["Medio-Avanzato", "Livello"], ["5–10", "Partecipanti"], ["Maxienduro", "Mezzo"],
          ].map(([v, e]) => (
            <Cella key={e} valore={v} etichetta={e} size={40} />
          ))}
        </div>
      )}

      {/* Gradiente e SVG decorativo: entrambi nella lista da verificare. */}
      <div
        style={{
          position: "absolute",
          left: m,
          right: m,
          bottom: m + 150,
          height: 8,
          background: `linear-gradient(90deg, ${COLORI.accentoEventi} 0%, ${COLORI.verde} 50%, transparent 100%)`,
        }}
      />
      <svg
        width={220}
        height={70}
        viewBox="0 0 220 70"
        style={{ position: "absolute", right: m, bottom: m + 40 }}
        aria-hidden="true"
      >
        <path d="M4 60 C40 10, 80 62, 120 24 S190 40, 216 12" fill="none" stroke={COLORI.accentoEventi} strokeWidth={4} strokeLinecap="round" />
        <circle cx="4" cy="60" r="6" fill={COLORI.verde} stroke={COLORI.testo} strokeWidth={2} />
        <text x="18" y="20" fontFamily={FONT.etichetta} fontSize="14" letterSpacing="2" fill={COLORI.testoDebole}>
          ALTIMETRIA
        </text>
      </svg>

      <Filo style={{ position: "absolute", left: m, right: m, bottom: m + 120 }} />

      <div style={{ position: "absolute", left: m, bottom: m - 16 }}>
        <Logo accento={COLORI.accentoEventi} />
      </div>
      <div style={{ position: "absolute", right: m, bottom: m + 4 }}>
        <MicroEtichetta colore={COLORI.testoDebole}>
          {String(indice + 1).padStart(2, "0")} / 08
        </MicroEtichetta>
      </div>
    </Telaio>
  );
}
