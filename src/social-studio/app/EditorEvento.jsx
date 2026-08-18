import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Download, Lock, Unlock, Wand2, XCircle } from "lucide-react";
import { useSiteContent } from "@/content/TinaContentProvider";
import { useArchivio } from "./ContestoArchivio";
import Anteprima from "./Anteprima";
import LibreriaUI from "../media/LibreriaUI";
import Ritaglio from "../media/Ritaglio";
import { contenutoVuoto } from "../fondamenta/schema";
import { confrontaConLaFonte, daEvento } from "../fondamenta/adapter-sito";
import { FornitoreProblemi, useFontPronti } from "../template/primitivi";
import PostEvento from "../template/rubriche/eventi/PostEvento";
import StoryEvento from "../template/rubriche/eventi/StoryEvento";
import SlideCarosello, { SLIDE_CAROSELLO } from "../template/rubriche/eventi/CaroselloEvento";
import { preflight } from "../motori/preflight";
import { analizzaGpx } from "../motori/gpx";
import { estraiFattuali, paragrafi, verificaFattuale } from "../motori/caption/fact-lock";
import { creaProviderManuale } from "../motori/caption/provider";
import { creaLavoroExport, esporta } from "../motori/export/esporta";
import { COLORI } from "../design/tokens";

/**
 * Editor della rubrica EVENTI.
 *
 * Una sola scheda alimenta Post, Story, carosello e caption: i dati fattuali
 * arrivano dal sito e non si riscrivono qui, i testi editoriali sì.
 *
 * Il flusso è quello dichiarato: si sceglie l'evento, si controllano i dati, si
 * carica il GPX, si assegnano le fotografie, si scrive la caption, si guarda il
 * pre-flight, si esporta.
 */

const SLOT = [
  { id: "cover", nome: "Cover" },
  { id: "esperienza-0", nome: "Vivrai 1" },
  { id: "esperienza-1", nome: "Vivrai 2" },
  { id: "esperienza-2", nome: "Vivrai 3" },
  { id: "esperienza-3", nome: "Vivrai 4" },
  { id: "cta", nome: "Sfondo CTA" },
];

export default function EditorEvento() {
  const { events, SITE, TOUR_GROUP } = useSiteContent();
  const { archivio } = useArchivio();
  const fontPronti = useFontPronti();

  const [slugScelto, setSlugScelto] = useState(null);
  const [contenuto, setContenuto] = useState(null);
  const [problemi, setProblemi] = useState([]);
  const [immagini, setImmagini] = useState({});
  const [vociMedia, setVociMedia] = useState([]);
  const [selezionata, setSelezionata] = useState(null);
  const [slotAttivo, setSlotAttivo] = useState("cover");
  const [traccia, setTraccia] = useState(null);
  const [erroreGpx, setErroreGpx] = useState(null);
  const [vista, setVista] = useState("post");
  const [avanzamento, setAvanzamento] = useState(null);
  const lavoro = useRef(null);
  const nodi = useRef(new Map());

  const evento = useMemo(
    () => events?.find((e) => e.slug === slugScelto) || null,
    [events, slugScelto],
  );

  /* ---- import dal sito: i dati fattuali non si scrivono a mano ---- */
  useEffect(() => {
    if (!evento) return;
    const base = contenutoVuoto({ categoria: "eventi", formato: "post" });
    const importato = daEvento(evento, {
      tourGroup: TOUR_GROUP?.label,
      urlBase: "https://www.sardegnatrailavventura.it",
      whatsapp: SITE?.telefono?.display,
    });
    setContenuto({
      ...base,
      titolo: importato.fattuali.nome,
      fonte: importato.fonte,
      fattuali: { ...base.fattuali, ...importato.fattuali },
      editoriale: {
        ...base.editoriale,
        ...importato.editoriale,
        highlight: [
          { id: "h1", titolo: "Granito", descrizione: "Le rocce della Gallura e del Limbara." },
          { id: "h2", titolo: "Mare", descrizione: "Coste e spiagge fra una pista e l'altra." },
          { id: "h3", titolo: "Borghi", descrizione: "Tempio, Buddusò, Pattada." },
          { id: "h4", titolo: "Altopiani", descrizione: "Sterrati aperti e panorami larghi." },
        ],
      },
      media: { cover: null, esperienza: [null, null, null, null], sfondi: {} },
    });
  }, [evento, TOUR_GROUP, SITE]);

  const scostamenti = useMemo(
    () => (contenuto && evento ? confrontaConLaFonte(contenuto, evento) : { allineato: true, scostamenti: [] }),
    [contenuto, evento],
  );

  /* ---- immagini: url temporanei dall'archivio ---- */
  const ricaricaMedia = useCallback(async () => {
    if (!archivio) return;
    const pacco = await archivio.esportaBackup();
    setVociMedia(pacco.media || []);
    const mappa = {};
    for (const v of pacco.media || []) {
      const u = await archivio.urlTemporaneo(v.id);
      if (u) mappa[v.id] = u;
    }
    setImmagini(mappa);
  }, [archivio]);

  useEffect(() => {
    ricaricaMedia();
  }, [ricaricaMedia]);

  const assegna = () => {
    if (!selezionata || !contenuto) return;
    const rif = { idBlob: selezionata, zoom: 1, x: 0.5, y: 0.5 };
    setContenuto((c) => {
      const media = { ...c.media };
      if (slotAttivo === "cover") media.cover = rif;
      else if (slotAttivo === "cta") media.sfondi = { ...media.sfondi, cta: rif };
      else {
        const i = Number(slotAttivo.split("-")[1]);
        const esperienza = [...(media.esperienza || [])];
        esperienza[i] = rif;
        media.esperienza = esperienza;
      }
      return { ...c, media };
    });
    ricaricaMedia();
  };

  const ritaglioAttivo = useMemo(() => {
    if (!contenuto) return null;
    if (slotAttivo === "cover") return contenuto.media.cover;
    if (slotAttivo === "cta") return contenuto.media.sfondi?.cta || null;
    return contenuto.media.esperienza?.[Number(slotAttivo.split("-")[1])] || null;
  }, [contenuto, slotAttivo]);

  const cambiaRitaglio = (nuovo) => {
    setContenuto((c) => {
      const media = { ...c.media };
      if (slotAttivo === "cover") media.cover = nuovo;
      else if (slotAttivo === "cta") media.sfondi = { ...media.sfondi, cta: nuovo };
      else {
        const i = Number(slotAttivo.split("-")[1]);
        const esperienza = [...media.esperienza];
        esperienza[i] = nuovo;
        media.esperienza = esperienza;
      }
      return { ...c, media };
    });
  };

  /* ---- GPX: la geometria viene solo dal file ---- */
  const caricaGpx = async (file) => {
    setErroreGpx(null);
    try {
      const a = analizzaGpx(await file.text(), file.name);
      if (!a.segmenti.length) throw new Error("Il file non contiene una traccia.");
      const idBlob = await archivio.salvaBlob("gpx", file, { nome: file.name });
      setTraccia({ ...a, nomeFile: file.name });
      setContenuto((c) => ({
        ...c,
        mappa: {
          ...c.mappa,
          gpx: { idBlob, nome: file.name, byte: file.size },
          localita: a.waypoint.slice(0, 10).map((w, i) => ({ id: `w-${i}`, ...w })),
        },
      }));
    } catch (e) {
      setErroreGpx(e.message);
    }
  };

  /* ---- caption ---- */
  const provider = useMemo(() => creaProviderManuale(), []);
  const fatti = useMemo(() => (contenuto ? estraiFattuali(contenuto) : null), [contenuto]);
  const discordanze = useMemo(
    () => (contenuto && fatti ? verificaFattuale(contenuto.editoriale.caption.testo, fatti) : []),
    [contenuto, fatti],
  );

  const generaCaption = async () => {
    const esito = await provider.genera({ rubrica: "eventi", lunghezza: contenuto.editoriale.caption.lunghezza });
    setContenuto((c) => ({
      ...c,
      editoriale: { ...c.editoriale, caption: { ...c.editoriale.caption, testo: esito.testo } },
    }));
  };

  const bloccaParagrafo = (i) => {
    setContenuto((c) => {
      const b = c.editoriale.caption.paragrafiBloccati || [];
      const nuovi = b.includes(i) ? b.filter((x) => x !== i) : [...b, i];
      return { ...c, editoriale: { ...c.editoriale, caption: { ...c.editoriale.caption, paragrafiBloccati: nuovi } } };
    });
  };

  /* ---- pre-flight ---- */
  const controllo = useMemo(() => {
    if (!contenuto) return null;
    const formato = vista === "story" ? "story" : vista === "carosello" ? "carosello" : "post";
    return preflight({
      contenuto: { ...contenuto, formato },
      vociMedia,
      problemi,
      formato,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contenuto, vociMedia, problemi, vista, fontPronti]);

  /* ---- export ---- */
  const esportaTutto = async () => {
    lavoro.current = creaLavoroExport();
    setAvanzamento({ fatti: 0, totale: 0, corrente: "avvio" });
    const elementi =
      vista === "carosello"
        ? SLIDE_CAROSELLO.map((s) => ({ id: s.id, nome: s.file, formato: "post", nodo: nodi.current.get(s.id) }))
        : [{ id: vista, nome: `${vista}.png`, formato: vista === "story" ? "story" : "post", nodo: nodi.current.get(vista) }];

    const esito = await esporta({
      elementi: elementi.filter((e) => e.nodo),
      contenuto: { ...contenuto, formato: vista === "carosello" ? "carosello" : vista },
      vociMedia,
      problemi,
      ignoraAvvisi: true,
      caption: contenuto.editoriale.caption.testo,
      lavoro: lavoro.current,
      onAvanzamento: setAvanzamento,
    });
    setAvanzamento(esito.esito === "fatto" ? null : { errore: esito.esito });
  };

  if (!events?.length) {
    return <p className="font-body text-sm text-granite-mist/60">Nessun evento disponibile dal sito.</p>;
  }

  return (
    <div className="space-y-6">
      {/* Scelta dell'evento. */}
      <section className="border border-[var(--border-on-dark)] p-4">
        <h3 className="mb-3 font-button text-[10px] uppercase tracking-[0.22em] text-[var(--accent-soft)]">
          Carica da evento del sito
        </h3>
        <div className="flex flex-wrap gap-2">
          {events.map((e) => (
            <button
              key={e.slug}
              type="button"
              onClick={() => setSlugScelto(e.slug)}
              className={`border px-3 py-2 font-body text-xs transition-colors ${
                slugScelto === e.slug
                  ? "border-[var(--accent)] text-[var(--accent-soft)]"
                  : "border-[var(--border-on-dark)] text-granite-mist/70 hover:border-granite-mist/40"
              }`}
            >
              {e.name}
            </button>
          ))}
        </div>
        {contenuto && (
          <p className="mt-3 font-body text-xs text-granite-mist/50">
            Dati fattuali importati dal sito · {contenuto.fonte.slug}
            {!scostamenti.allineato && (
              <span style={{ color: COLORI.accentoEventi }}>
                {" "}· il sito è cambiato: {scostamenti.scostamenti.map((s) => s.nome).join(", ")}
              </span>
            )}
          </p>
        )}
      </section>

      {!contenuto ? (
        <p className="font-body text-sm text-granite-mist/55">Scegli un evento per cominciare.</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          {/* ---- colonna sinistra: media, GPX, caption ---- */}
          <div className="space-y-5">
            <LibreriaUI onSeleziona={setSelezionata} selezionato={selezionata} />

            <section className="border border-[var(--border-on-dark)] p-4">
              <h3 className="mb-3 font-button text-[10px] uppercase tracking-[0.22em] text-[var(--accent-soft)]">
                Assegna e inquadra
              </h3>
              <div className="mb-3 flex flex-wrap gap-1.5">
                {SLOT.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSlotAttivo(s.id)}
                    className={`border px-2 py-1 font-button text-[9px] uppercase tracking-[0.14em] transition-colors ${
                      slotAttivo === s.id
                        ? "border-[var(--accent)] text-[var(--accent-soft)]"
                        : "border-[var(--border-on-dark)] text-granite-mist/55"
                    }`}
                  >
                    {s.nome}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={assegna}
                disabled={!selezionata}
                className="btn-mech mb-3 w-full bg-[var(--cta)] px-3 py-2 text-xs text-[var(--cta-text)] disabled:opacity-40"
              >
                Assegna la foto selezionata
              </button>
              <Ritaglio
                sorgente={immagini[ritaglioAttivo?.idBlob]}
                valore={ritaglioAttivo}
                onCambia={cambiaRitaglio}
              />
            </section>

            <section className="border border-[var(--border-on-dark)] p-4">
              <h3 className="mb-3 font-button text-[10px] uppercase tracking-[0.22em] text-[var(--accent-soft)]">
                Traccia GPX
              </h3>
              <label className="btn-mech mb-2 block cursor-pointer border border-[var(--border-on-dark)] px-3 py-2 text-center text-xs transition-colors hover:border-[var(--accent)]">
                Carica un file .gpx
                <input type="file" accept=".gpx" className="hidden" onChange={(e) => e.target.files?.[0] && caricaGpx(e.target.files[0])} />
              </label>
              {erroreGpx && <p className="font-body text-xs" style={{ color: "#E2857A" }}>{erroreGpx}</p>}
              {traccia && (
                <dl className="grid grid-cols-2 gap-2 font-body text-[11px] text-granite-mist/65">
                  <div><dt className="text-granite-mist/40">segmenti</dt><dd>{traccia.segmenti.length}</dd></div>
                  <div><dt className="text-granite-mist/40">punti</dt><dd>{traccia.metriche.punti.toLocaleString("it-IT")}</dd></div>
                  <div><dt className="text-granite-mist/40">distanza</dt><dd>{traccia.metriche.distanzaKm.toFixed(1)} km</dd></div>
                  <div><dt className="text-granite-mist/40">D+ / D−</dt><dd>{traccia.metriche.dislivelloPositivo ?? "—"} / {traccia.metriche.dislivelloNegativo ?? "—"} m</dd></div>
                  <div><dt className="text-granite-mist/40">quota</dt><dd>{traccia.metriche.quotaMin ?? "—"}–{traccia.metriche.quotaMax ?? "—"} m</dd></div>
                  <div><dt className="text-granite-mist/40">waypoint</dt><dd>{traccia.waypoint.length}</dd></div>
                  <p className="col-span-2 text-granite-mist/40">
                    Suggerimenti dal file: non sovrascrivono i dati dell'evento.
                  </p>
                </dl>
              )}
            </section>

            <section className="border border-[var(--border-on-dark)] p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="font-button text-[10px] uppercase tracking-[0.22em] text-[var(--accent-soft)]">
                  Caption
                </h3>
                <button
                  type="button"
                  onClick={generaCaption}
                  className="inline-flex items-center gap-1.5 border border-[var(--border-on-dark)] px-2 py-1 font-button text-[9px] uppercase tracking-[0.14em] transition-colors hover:border-[var(--accent)]"
                >
                  <Wand2 size={11} aria-hidden="true" />
                  Traccia
                </button>
              </div>
              <textarea
                value={contenuto.editoriale.caption.testo}
                onChange={(e) =>
                  setContenuto((c) => ({
                    ...c,
                    editoriale: { ...c.editoriale, caption: { ...c.editoriale.caption, testo: e.target.value } },
                  }))
                }
                rows={8}
                placeholder="Scrivi la caption. La traccia dà la struttura, le parole sono tue."
                className="w-full border border-[var(--border-on-dark)] bg-[var(--obsidian)] p-2 font-body text-xs leading-relaxed text-[var(--text-on-dark)] outline-none placeholder:text-granite-mist/30 focus:border-[var(--accent)]"
              />

              {paragrafi(contenuto.editoriale.caption.testo).filter((p) => p.testo.trim()).length > 1 && (
                <ul className="mt-2 space-y-1">
                  {paragrafi(contenuto.editoriale.caption.testo).map((p) => {
                    if (!p.testo.trim()) return null;
                    const bloccato = contenuto.editoriale.caption.paragrafiBloccati.includes(p.i);
                    return (
                      <li key={p.i}>
                        <button
                          type="button"
                          onClick={() => bloccaParagrafo(p.i)}
                          className="flex w-full items-start gap-2 text-left font-body text-[10px] text-granite-mist/50 transition-colors hover:text-granite-mist/80"
                        >
                          {bloccato ? <Lock size={11} className="mt-0.5 flex-none text-[var(--accent-soft)]" /> : <Unlock size={11} className="mt-0.5 flex-none" />}
                          <span className="truncate">{p.testo.slice(0, 60)}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}

              {discordanze.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {discordanze.map((d, i) => (
                    <li key={i} className="font-body text-[11px]" style={{ color: "#E2857A" }}>
                      Il {d.nome} nel testo ({d.trovato.join(", ")}) non coincide con {d.atteso}.
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          {/* ---- colonna destra: anteprima e pre-flight ---- */}
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              {["post", "story", "carosello"].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVista(v)}
                  className={`border px-3 py-2 font-button text-[10px] uppercase tracking-[0.16em] transition-colors ${
                    vista === v ? "border-[var(--accent)] text-[var(--accent-soft)]" : "border-[var(--border-on-dark)] text-granite-mist/60"
                  }`}
                >
                  {v}
                </button>
              ))}
              <button
                type="button"
                onClick={esportaTutto}
                disabled={!controllo?.puoiEsportare}
                className="btn-mech ml-auto inline-flex items-center gap-2 bg-[var(--cta)] px-4 py-2 text-xs text-[var(--cta-text)] disabled:opacity-40"
              >
                <Download size={13} aria-hidden="true" />
                Esporta {vista}
              </button>
              {avanzamento && (
                <button type="button" onClick={() => lavoro.current?.annulla()} className="border border-[var(--border-on-dark)] px-3 py-2 font-button text-[10px] uppercase">
                  Annulla
                </button>
              )}
            </div>

            {avanzamento?.totale > 0 && (
              <p className="font-body text-xs text-granite-mist/60">
                {avanzamento.fatti} di {avanzamento.totale} · {avanzamento.corrente}
              </p>
            )}

            <FornitoreProblemi onProblemi={setProblemi}>
              {vista === "post" && (
                <Anteprima formato="post" massimaAltezza={700}>
                  <PostEvento contenuto={contenuto} immagini={immagini} riferimento={(el) => el && nodi.current.set("post", el)} />
                </Anteprima>
              )}
              {vista === "story" && (
                <Anteprima formato="story" massimaAltezza={700}>
                  <StoryEvento contenuto={contenuto} immagini={immagini} riferimento={(el) => el && nodi.current.set("story", el)} />
                </Anteprima>
              )}
              {vista === "carosello" && (
                <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
                  {SLIDE_CAROSELLO.map((s) => (
                    <div key={s.id}>
                      <p className="mb-1 font-button text-[9px] uppercase tracking-[0.16em] text-granite-mist/40">
                        {String(s.numero).padStart(2, "0")} · {s.titolo}
                      </p>
                      <Anteprima formato="post" massimaAltezza={340}>
                        <SlideCarosello
                          id={s.id}
                          contenuto={contenuto}
                          immagini={immagini}
                          traccia={traccia}
                          riferimento={(el) => el && nodi.current.set(s.id, el)}
                        />
                      </Anteprima>
                    </div>
                  ))}
                </div>
              )}
            </FornitoreProblemi>

            {controllo && (
              <section className="border border-[var(--border-on-dark)] p-4">
                <h3 className="mb-3 font-button text-[10px] uppercase tracking-[0.22em] text-[var(--accent-soft)]">
                  Pre-flight · {vista}
                </h3>
                <ul className="space-y-1.5">
                  {controllo.esiti.map((e) => (
                    <li key={e.id} className="flex items-start gap-2 font-body text-xs leading-snug">
                      {e.livello === "ok" ? (
                        <CheckCircle2 size={13} className="mt-0.5 flex-none text-[var(--wild-sage-bright)]" />
                      ) : e.livello === "avviso" ? (
                        <AlertTriangle size={13} className="mt-0.5 flex-none" style={{ color: COLORI.accentoEventi }} />
                      ) : (
                        <XCircle size={13} className="mt-0.5 flex-none" style={{ color: "#E2857A" }} />
                      )}
                      <span className="text-granite-mist/70">{e.messaggio}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
