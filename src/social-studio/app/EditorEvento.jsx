import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle, CheckCircle2, Database, Download, FilePlus2, FolderOpen, History,
  Lock, Package, Pencil, RotateCcw, Save, Trash2, Unlock, Wand2, XCircle,
} from "lucide-react";
import { useSiteContent } from "@/content/TinaContentProvider";
import { useArchivio } from "./ContestoArchivio";
import Anteprima, { FuoriSchermo } from "./Anteprima";
import LibreriaUI from "../media/LibreriaUI";
import Ritaglio from "../media/Ritaglio";
import { contenutoVuoto, LUNGHEZZE_CAPTION, STATI, STATI_POSTI } from "../fondamenta/schema";
import { ELENCO_MOOD, MOOD } from "../design/eventi";
import { confrontaConLaFonte, daEvento } from "../fondamenta/adapter-sito";
import { haPreset, highlightIniziali, kickerIniziale } from "../fondamenta/preset-eventi";
import { elencoRevisioni, registraRevisione, ripristinaRevisione } from "../fondamenta/versioni";
import { AmbitoProblemi, FornitoreProblemi, useFontPronti } from "../template/primitivi";
import PostEvento from "../template/rubriche/eventi/PostEvento";
import StoryEvento from "../template/rubriche/eventi/StoryEvento";
import SlideCarosello, { SLIDE_CAROSELLO } from "../template/rubriche/eventi/CaroselloEvento";
import { zonePerSlot } from "../template/rubriche/eventi/zone";
import { preflight } from "../motori/preflight";
import { analizzaGpx } from "../motori/gpx";
import { estraiFattuali, paragrafi, verificaFattuale } from "../motori/caption/fact-lock";
import { rigeneraCaption } from "../motori/caption/rigenera";
import { creaProviderManuale } from "../motori/caption/provider";
import { esporta, esportaPacchetto } from "../motori/export/esporta";
import EsitoExport from "./EsitoExport";
import { useLavoroExport } from "./useLavoroExport";
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
 *
 * **Il lavoro vive nell'archivio, non nello stato del componente.** Una bozza si
 * salva, si chiude lo studio, si riapre e si ritrova com'era: caption,
 * assegnazioni, ritagli, GPX, mappa e stato editoriale. Il GPX in particolare
 * non si ricarica a mano — il file è nell'archivio e la traccia si ricostruisce
 * da lì. Senza questo, tutto il resto è una demo.
 */

const SLOT = [
  { id: "cover", nome: "Cover" },
  { id: "esperienza-0", nome: "Vivrai 1" },
  { id: "esperienza-1", nome: "Vivrai 2" },
  { id: "esperienza-2", nome: "Vivrai 3" },
  { id: "esperienza-3", nome: "Vivrai 4" },
  { id: "cta", nome: "Sfondo CTA" },
];

/** I file del pacchetto evento. L'ordine è quello in cui si pubblica. */
const PACCHETTO = [
  { id: "post", nome: "post-1080x1350.png", formato: "post" },
  { id: "story", nome: "story-1080x1920.png", formato: "story" },
  ...SLIDE_CAROSELLO.map((s) => ({ id: s.id, nome: `carosello/${s.file}`, formato: "post" })),
];

export default function EditorEvento() {
  const { events, SITE, TOUR_GROUP } = useSiteContent();
  const { archivio, aggiornaStato } = useArchivio();
  const fontPronti = useFontPronti();

  const [bozze, setBozze] = useState([]);
  const [contenuto, setContenuto] = useState(null);
  const [sporco, setSporco] = useState(false);
  const [statoSalvataggio, setStatoSalvataggio] = useState(null);
  const [problemi, setProblemi] = useState([]);
  const [immagini, setImmagini] = useState({});
  const [vociMedia, setVociMedia] = useState([]);
  const [selezionata, setSelezionata] = useState(null);
  const [slotAttivo, setSlotAttivo] = useState("cover");
  const [traccia, setTraccia] = useState(null);
  const [erroreGpx, setErroreGpx] = useState(null);
  const [vista, setVista] = useState("post");
  const [mostraRevisioni, setMostraRevisioni] = useState(false);

  const nodi = useRef(new Map());
  const riferimenti = useRef(new Map());
  /** Lo stato come sta nell'archivio: serve a calcolare la revisione. */
  const salvato = useRef(null);

  /** Callback ref stabili: senza la cache il nodo si staccherebbe a ogni render. */
  const registra = (chiave) => {
    if (!riferimenti.current.has(chiave)) {
      riferimenti.current.set(chiave, (el) => {
        if (el) nodi.current.set(chiave, el);
        else nodi.current.delete(chiave);
      });
    }
    return riferimenti.current.get(chiave);
  };

  const evento = useMemo(
    () => events?.find((e) => e.slug === contenuto?.fonte?.slug) || null,
    [events, contenuto],
  );

  /** Ogni modifica passa da qui: è così che «non salvato» resta veritiero. */
  const aggiorna = useCallback((fn) => {
    setContenuto((c) => (c ? fn(c) : c));
    setSporco(true);
    setStatoSalvataggio(null);
  }, []);

  /* ================================================================ *
   * Bozze: elenco, apertura, salvataggio
   * ================================================================ */

  const ricaricaBozze = useCallback(async () => {
    if (!archivio) return;
    setBozze(await archivio.elenca({ categoria: "eventi" }));
  }, [archivio]);

  useEffect(() => {
    ricaricaBozze();
  }, [ricaricaBozze]);

  /**
   * Ricostruisce la traccia dal GPX già nell'archivio.
   *
   * È il punto che rende la persistenza utilizzabile: riaprendo una bozza il
   * file non si ricarica a mano. Se il blob non c'è più — un backup importato
   * senza GPX, o l'archivio ripulito dal browser — lo si dice, invece di
   * mostrare una mappa vuota senza spiegazioni.
   */
  const ricostruisciTraccia = useCallback(async (c) => {
    setErroreGpx(null);
    const rif = c?.mappa?.gpx;
    if (!rif?.idBlob) {
      setTraccia(null);
      return;
    }
    try {
      const blob = await archivio.leggiBlob(rif.idBlob);
      if (!blob) {
        setTraccia(null);
        setErroreGpx(
          `Il file «${rif.nome || rif.idBlob}» non è più nell'archivio: ricaricalo per rifare la mappa.`,
        );
        return;
      }
      const a = analizzaGpx(await blob.text(), rif.nome);
      setTraccia({ ...a, nomeFile: rif.nome });
    } catch (e) {
      setTraccia(null);
      setErroreGpx(`GPX illeggibile: ${e.message}`);
    }
  }, [archivio]);

  /**
   * Scrive nell'archivio, registrando una revisione.
   *
   * `giaRegistrata` serve al ripristino: `ripristinaRevisione()` mette già in
   * cronologia lo stato precedente, e registrarne un'altra qui produceva due
   * voci per un solo gesto — la seconda identica alla prima, con un'etichetta
   * diversa.
   */
  const scriviNellArchivio = useCallback(
    async (daSalvare, { etichetta, giaRegistrata = false } = {}) => {
      setStatoSalvataggio("in corso");
      try {
        const conStoria = giaRegistrata
          ? daSalvare
          : registraRevisione(daSalvare, salvato.current, { etichetta });
        const id = await archivio.salva(conStoria);
        // Si rilegge: ciò che si vede è ciò che è sul disco, convalidato.
        const riletto = await archivio.leggi(id);
        setContenuto(riletto);
        salvato.current = riletto;
        setSporco(false);
        setStatoSalvataggio(`salvato alle ${new Date().toLocaleTimeString("it-IT")}`);
        await ricaricaBozze();
        await aggiornaStato();
        return riletto;
      } catch (e) {
        setStatoSalvataggio(`non salvato: ${e.message}`);
        return null;
      }
    },
    [archivio, ricaricaBozze, aggiornaStato],
  );

  const apriBozza = useCallback(
    async (id) => {
      const c = await archivio.leggi(id);
      if (!c) return;
      setContenuto(c);
      salvato.current = c;
      setSporco(false);
      setStatoSalvataggio(null);
      setProblemi([]);
      setMostraRevisioni(false);
      await ricostruisciTraccia(c);
    },
    [archivio, ricostruisciTraccia],
  );

  const nuovoDaEvento = (ev) => {
    const base = contenutoVuoto({ categoria: "eventi", formato: "post" });
    const importato = daEvento(ev, {
      tourGroup: TOUR_GROUP?.label,
      urlBase: "https://www.sardegnatrailavventura.it",
      whatsapp: SITE?.telefono?.display,
    });
    const nuovo = {
      ...base,
      titolo: importato.fattuali.nome,
      fonte: importato.fonte,
      fattuali: { ...base.fattuali, ...importato.fattuali },
      editoriale: {
        ...base.editoriale,
        ...importato.editoriale,
        // Niente highlight generici: preset per l'evento che ne ha uno, oppure
        // i punti di interesse che il sito dichiara. Mai testi di un altro tour.
        highlight: highlightIniziali(importato.fattuali, importato.fonte.slug),
        // Vuoto se l'evento non ha un preset: il pre-flight lo segnalerà.
        kicker: kickerIniziale(importato.fonte.slug),
      },
      media: { cover: null, esperienza: [null, null, null, null], sfondi: {} },
    };
    setContenuto(nuovo);
    salvato.current = null;
    setSporco(true);
    setStatoSalvataggio(null);
    setTraccia(null);
    setErroreGpx(null);
    setProblemi([]);
    setMostraRevisioni(false);
  };

  const eliminaBozza = async (id) => {
    await archivio.elimina(id);
    if (contenuto?.id === id) {
      setContenuto(null);
      salvato.current = null;
      setTraccia(null);
    }
    await ricaricaBozze();
  };

  const ripristina = async (n) => {
    // La revisione la mette `ripristinaRevisione`, con l'etichetta giusta:
    // qui si salva soltanto.
    const r = ripristinaRevisione(contenuto, n);
    const riletto = await scriviNellArchivio(r, { giaRegistrata: true });
    if (riletto) await ricostruisciTraccia(riletto);
    setMostraRevisioni(false);
  };

  const scostamenti = useMemo(
    () => (contenuto && evento ? confrontaConLaFonte(contenuto, evento) : { allineato: true, scostamenti: [] }),
    [contenuto, evento],
  );

  /* ================================================================ *
   * Media
   * ================================================================ */

  const ricaricaMedia = useCallback(async () => {
    if (!archivio) return;
    const elenco = await archivio.elencaMedia();
    setVociMedia(elenco);
    const mappa = {};
    for (const v of elenco) {
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
    aggiorna((c) => ({ ...c, media: conRitaglio(c.media, slotAttivo, rif) }));
  };

  const ritaglioAttivo = useMemo(() => {
    if (!contenuto) return null;
    if (slotAttivo === "cover") return contenuto.media.cover;
    if (slotAttivo === "cta") return contenuto.media.sfondi?.cta || null;
    return contenuto.media.esperienza?.[Number(slotAttivo.split("-")[1])] || null;
  }, [contenuto, slotAttivo]);

  const cambiaRitaglio = (nuovo) =>
    aggiorna((c) => ({ ...c, media: conRitaglio(c.media, slotAttivo, nuovo) }));

  /* ================================================================ *
   * GPX: la geometria viene solo dal file
   * ================================================================ */

  const caricaGpx = async (file) => {
    setErroreGpx(null);
    try {
      const a = analizzaGpx(await file.text(), file.name);
      if (!a.segmenti.length) throw new Error("Il file non contiene una traccia.");
      const idBlob = await archivio.salvaBlob("gpx", file, { nome: file.name });
      setTraccia({ ...a, nomeFile: file.name });
      aggiorna((c) => ({
        ...c,
        mappa: {
          ...c.mappa,
          gpx: { idBlob, nome: file.name, byte: file.size },
          localita: a.waypoint.slice(0, 10).map((w, i) => ({ id: `w-${i}`, ...w })),
        },
      }));
      await aggiornaStato();
    } catch (e) {
      setErroreGpx(e.message);
    }
  };

  /**
   * La traccia caricata e i chilometri dichiarati devono somigliarsi.
   *
   * Una traccia da 93 km non rappresenta un evento da 550: la slide del
   * percorso mostrerebbe un pezzo di viaggio spacciato per il viaggio. È un
   * avviso, non una correzione: il dato del sito non si tocca e la traccia non
   * si allunga.
   */
  const avvisiTraccia = useMemo(() => {
    if (!traccia || !contenuto) return [];
    const dichiarati = Number.parseFloat(String(contenuto.fattuali?.km || "").replace(",", "."));
    const misurati = traccia.metriche?.distanzaKm;
    if (!Number.isFinite(dichiarati) || !Number.isFinite(misurati) || !dichiarati) return [];
    const scarto = Math.abs(misurati - dichiarati) / dichiarati;
    if (scarto <= 0.1) return [];
    return [{
      chiave: "gpx-distanza",
      livello: "avviso",
      messaggio:
        `La traccia misura ${misurati.toFixed(1)} km, l'evento dichiara ${contenuto.fattuali.km}: ` +
        "la slide del percorso mostrerebbe un tracciato che non corrisponde al viaggio.",
    }];
  }, [traccia, contenuto]);

  /* ================================================================ *
   * Caption
   * ================================================================ */

  const provider = useMemo(() => creaProviderManuale(), []);
  const fatti = useMemo(() => (contenuto ? estraiFattuali(contenuto) : null), [contenuto]);
  const discordanze = useMemo(
    () => (contenuto && fatti ? verificaFattuale(contenuto.editoriale.caption.testo, fatti) : []),
    [contenuto, fatti],
  );
  const [erroreCaption, setErroreCaption] = useState(null);

  /**
   * Genera o rigenera la caption.
   *
   * Il lavoro vero sta in `motori/caption/rigenera.js`: qui si chiama e si
   * scrive il risultato. Al provider vanno i fatti congelati, i dati editoriali
   * e i paragrafi bloccati — e al ritorno i bloccati sono di nuovo al loro
   * posto, qualunque cosa il provider abbia risposto.
   */
  const generaCaption = async () => {
    setErroreCaption(null);
    try {
      const esito = await rigeneraCaption({ provider, contenuto });
      aggiorna((c) => ({
        ...c,
        editoriale: {
          ...c.editoriale,
          caption: { ...c.editoriale.caption, testo: esito.testo },
        },
      }));
    } catch (e) {
      setErroreCaption(e.message);
    }
  };

  /** Scrive un campo del ramo editoriale. Passa da `aggiorna`, quindi sporca. */
  const scriviEditoriale = (campo, valore) =>
    aggiorna((c) => ({ ...c, editoriale: { ...c.editoriale, [campo]: valore } }));

  /** Scrive un campo di primo livello: stato del contenuto, data prevista. */
  const scriviRadice = (campo, valore) => aggiorna((c) => ({ ...c, [campo]: valore }));

  /**
   * Modifica un highlight.
   *
   * Toccando titolo o descrizione l'origine diventa «manuale»: una voce
   * derivata dai punti di interesse del sito, una volta riscritta, non è più
   * derivata — e sapere quali voci sono ancora da rileggere è il motivo per cui
   * l'origine esiste.
   */
  const scriviHighlight = (indice, campo, valore) =>
    aggiorna((c) => {
      const highlight = [...(c.editoriale.highlight || [])];
      const voce = highlight[indice];
      if (!voce) return c;
      highlight[indice] = { ...voce, [campo]: valore, origine: "manuale" };
      return { ...c, editoriale: { ...c.editoriale, highlight } };
    });

  const aggiungiHighlight = () =>
    aggiorna((c) => {
      const highlight = [...(c.editoriale.highlight || [])];
      if (highlight.length >= 4) return c;
      highlight.push({ id: `h-${Date.now()}`, titolo: "", descrizione: "", origine: "manuale" });
      return { ...c, editoriale: { ...c.editoriale, highlight } };
    });

  const togliHighlight = (indice) =>
    aggiorna((c) => ({
      ...c,
      editoriale: {
        ...c.editoriale,
        highlight: (c.editoriale.highlight || []).filter((_, i) => i !== indice),
      },
    }));

  const bloccaParagrafo = (i) =>
    aggiorna((c) => {
      const b = c.editoriale.caption.paragrafiBloccati || [];
      const nuovi = b.includes(i) ? b.filter((x) => x !== i) : [...b, i];
      return {
        ...c,
        editoriale: { ...c.editoriale, caption: { ...c.editoriale.caption, paragrafiBloccati: nuovi } },
      };
    });

  /* ================================================================ *
   * Pre-flight
   * ================================================================ */

  const tuttiIProblemi = useMemo(() => [...problemi, ...avvisiTraccia], [problemi, avvisiTraccia]);

  const controllo = useMemo(() => {
    if (!contenuto) return null;
    const formato = vista === "story" ? "story" : vista === "carosello" ? "carosello" : "post";
    return preflight({
      contenuto: { ...contenuto, formato },
      vociMedia,
      problemi: tuttiIProblemi,
      formato,
    });
    // fontPronti non è usato nel corpo ma cambia l'esito del controllo font.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contenuto, vociMedia, tuttiIProblemi, vista, fontPronti]);

  /* ================================================================ *
   * Esportazione
   * ================================================================ */

  /**
   * Gli elementi della vista corrente, presi dai nodi **fuori schermo**.
   *
   * Non dal nodo dell'anteprima: quello sta dentro un antenato con
   * `transform: scale()`, e html2canvas lo fotografa applicando quella scala —
   * il PNG usciva col contenuto disegnato al 40% nell'angolo, su una tela
   * corretta di 1080×1350. Il difetto non si vedeva perché l'anteprima è
   * giusta: si vede solo aprendo il file esportato.
   *
   * L'esportazione del pacchetto usava già i nodi fuori schermo, ed è per
   * questo che le sue grafiche erano corrette. Ora ci passano entrambe: un solo
   * percorso di cattura, nessuna differenza da tenere allineata.
   */
  const elementiVista = useCallback(() =>
    vista === "carosello"
      ? SLIDE_CAROSELLO.map((s) => ({
          id: s.id, nome: s.file, formato: "post", nodo: nodi.current.get(`pacco-${s.id}`),
        }))
      : [{
          id: vista,
          nome: `${vista}.png`,
          formato: vista === "story" ? "story" : "post",
          nodo: nodi.current.get(`pacco-${vista}`),
        }], [vista]);

  /**
   * Il pacchetto ha bisogno che tutte e dieci le grafiche esistano nel DOM alla
   * loro misura reale. Si montano fuori schermo, si aspetta che il browser
   * abbia disegnato, poi si fotografa: due fasi, perché lo stato React non è
   * disponibile nello stesso giro in cui lo si imposta.
   */
  /**
   * Il coordinamento del lavoro vive in `useLavoroExport`.
   *
   * Qui resta solo ciò che è dell'editor: quali nodi montare e come catturarli.
   * `esegui` viene chiamato quando le grafiche fuori schermo sono montate e
   * disegnate, e legge lo stato al momento dell'uso — non alla creazione della
   * richiesta.
   */
  const esegui = useCallback(
    async ({ cosa, ignoraAvvisi, lavoro, onAvanzamento }) => {
      const elementi = cosa === "pacchetto"
        ? PACCHETTO.map((p) => ({ ...p, nodo: nodi.current.get(`pacco-${p.id}`) }))
        : elementiVista();
      onAvanzamento({ fatti: 0, totale: elementi.length, corrente: "avvio" });

      const comune = {
        elementi,
        vociMedia,
        problemi: tuttiIProblemi,
        ignoraAvvisi,
        caption: contenuto.editoriale.caption.testo,
        lavoro,
        onAvanzamento,
      };

      return cosa === "pacchetto"
        ? esportaPacchetto({ ...comune, contenuto })
        : esporta({
            ...comune,
            elementi: elementi.filter((e) => e.nodo),
            contenuto: { ...contenuto, formato: vista === "carosello" ? "carosello" : vista },
          });
    },
    [contenuto, vociMedia, tuttiIProblemi, vista, elementiVista],
  );

  const {
    richiesta, avanzamento, daConfermare, occupato, chiedi: chiediExport, annulla, chiudiConferma,
  } = useLavoroExport({ esegui });

  /**
   * Quali grafiche montare fuori schermo.
   *
   * Per il pacchetto tutte e dieci; per la vista corrente solo quelle che
   * servono, così un singolo PNG non paga il montaggio degli altri nove.
   */
  const daMontare = useMemo(() => {
    if (!richiesta) return [];
    if (richiesta.cosa === "pacchetto") return PACCHETTO.map((p) => p.id);
    if (vista === "carosello") return SLIDE_CAROSELLO.map((s) => s.id);
    return [vista];
  }, [richiesta, vista]);

  /* ================================================================ */

  if (!events?.length) {
    return <p className="font-body text-sm text-granite-mist/60">Nessun evento disponibile dal sito.</p>;
  }

  return (
    <div className="space-y-6">
      {/* ---- bozze salvate e creazione ---- */}
      <section className="border border-[var(--border-on-dark)] p-4">
        <h3 className="mb-3 flex items-center gap-2 font-button text-[10px] uppercase tracking-[0.22em] text-[var(--accent-soft)]">
          <FolderOpen size={13} aria-hidden="true" />
          Bozze nell'archivio · {bozze.length}
        </h3>
        {bozze.length === 0 ? (
          <p className="mb-4 font-body text-xs text-granite-mist/45">
            Nessuna bozza salvata. Ne resta una nell'archivio del browser appena premi «Salva».
          </p>
        ) : (
          <ul className="mb-4 divide-y divide-[var(--border-on-dark)]">
            {bozze.map((b) => (
              <li key={b.id} className="flex items-center gap-3 py-2">
                <button
                  type="button"
                  onClick={() => apriBozza(b.id)}
                  className={`min-w-0 flex-1 text-left font-body text-xs transition-colors hover:text-[var(--accent-soft)] ${
                    contenuto?.id === b.id ? "text-[var(--accent-soft)]" : "text-granite-mist/70"
                  }`}
                >
                  <span className="block truncate">{b.titolo}</span>
                  <span className="block font-body text-[10px] text-granite-mist/40">
                    {b.stato} · {new Date(b.modificato).toLocaleString("it-IT")}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => eliminaBozza(b.id)}
                  title="Elimina la bozza"
                  className="flex-none p-1 text-granite-mist/40 transition-colors hover:text-[#E2857A]"
                >
                  <Trash2 size={12} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <h4 className="mb-2 flex items-center gap-2 font-button text-[10px] uppercase tracking-[0.22em] text-granite-mist/45">
          <FilePlus2 size={12} aria-hidden="true" />
          Nuova bozza da un evento del sito
        </h4>
        <div className="flex flex-wrap gap-2">
          {events.map((e) => (
            <button
              key={e.slug}
              type="button"
              onClick={() => nuovoDaEvento(e)}
              className="border border-[var(--border-on-dark)] px-3 py-2 font-body text-xs text-granite-mist/70 transition-colors hover:border-[var(--accent)] hover:text-[var(--accent-soft)]"
            >
              {e.name}
              {haPreset(e.slug) && <span className="ml-1.5 text-[var(--accent-soft)]" title="Ha un preset editoriale">·</span>}
            </button>
          ))}
        </div>

        {contenuto && (
          <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-[var(--border-on-dark)] pt-3">
            <button
              type="button"
              onClick={() => scriviNellArchivio(contenuto)}
              disabled={statoSalvataggio === "in corso"}
              className="btn-mech inline-flex items-center gap-2 bg-[var(--cta)] px-4 py-2 text-xs text-[var(--cta-text)] disabled:opacity-40"
            >
              <Save size={13} aria-hidden="true" />
              Salva la bozza
            </button>
            <span className="font-body text-[11px] text-granite-mist/50">
              {sporco ? (
                <span style={{ color: COLORI.accentoEventi }}>modifiche non salvate</span>
              ) : (
                statoSalvataggio || "allineata all'archivio"
              )}
            </span>
            {contenuto.versioni?.length > 0 && (
              <button
                type="button"
                onClick={() => setMostraRevisioni((v) => !v)}
                className="ml-auto inline-flex items-center gap-1.5 border border-[var(--border-on-dark)] px-2 py-1 font-button text-[9px] uppercase tracking-[0.14em] text-granite-mist/60 transition-colors hover:border-[var(--accent)]"
              >
                <History size={11} aria-hidden="true" />
                {contenuto.versioni.length} revisioni
              </button>
            )}
          </div>
        )}

        {mostraRevisioni && contenuto && (
          <ul className="mt-3 divide-y divide-[var(--border-on-dark)] border border-[var(--border-on-dark)]">
            {elencoRevisioni(contenuto).map((r) => (
              <li key={r.n} className="flex items-center gap-3 px-3 py-2">
                <span className="font-button text-[10px] uppercase tracking-[0.16em] text-granite-mist/40">
                  v{r.n}
                </span>
                <span className="min-w-0 flex-1 truncate font-body text-xs text-granite-mist/65">
                  {r.etichetta}
                  <span className="ml-2 text-granite-mist/35">
                    {new Date(r.quando).toLocaleString("it-IT")}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => ripristina(r.n)}
                  disabled={!r.ripristinabile}
                  title={r.ripristinabile ? "Torna a questo stato" : "Punto di creazione: non contiene uno stato"}
                  className="inline-flex flex-none items-center gap-1.5 border border-[var(--border-on-dark)] px-2 py-1 font-button text-[9px] uppercase tracking-[0.14em] text-granite-mist/60 transition-colors hover:border-[var(--accent)] disabled:opacity-30"
                >
                  <RotateCcw size={10} aria-hidden="true" />
                  Ripristina
                </button>
              </li>
            ))}
          </ul>
        )}

        {contenuto && (
          <p className="mt-3 font-body text-xs text-granite-mist/50">
            Dati fattuali dal sito · {contenuto.fonte.slug}
            {!scostamenti.allineato && (
              <span style={{ color: COLORI.accentoEventi }}>
                {" "}· il sito è cambiato: {scostamenti.scostamenti.map((s) => s.nome).join(", ")}
              </span>
            )}
          </p>
        )}
      </section>

      {!contenuto ? (
        <p className="font-body text-sm text-granite-mist/55">
          Apri una bozza o creane una da un evento per cominciare.
        </p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          {/* ---- colonna sinistra: media, GPX, caption ---- */}
          <div className="space-y-5">
            {/* ---- dati fattuali: si leggono, non si scrivono ---- */}
            <section className="border border-[var(--border-on-dark)] p-4">
              <h3 className="mb-1 flex items-center gap-2 font-button text-[10px] uppercase tracking-[0.22em] text-[var(--accent-soft)]">
                <Database size={13} aria-hidden="true" />
                Dati dal sito
              </h3>
              <p className="mb-3 font-body text-[10px] leading-snug text-granite-mist/40">
                Sola lettura. Si cambiano su TinaCMS: qui una seconda copia
                modificabile diventerebbe una seconda verità.
              </p>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 font-body text-[11px]">
                {[
                  ["Nome", contenuto.fattuali.nome],
                  ["Prezzo", contenuto.fattuali.prezzo],
                  ["Percorso", contenuto.fattuali.km],
                  ["Sterrato", contenuto.fattuali.sterrato],
                  ["Durata", contenuto.fattuali.durata],
                  ["Livello", contenuto.fattuali.livello],
                  ["Partenza", contenuto.fattuali.partenza],
                  ["Dal", contenuto.fattuali.dataInizio],
                  ["Al", contenuto.fattuali.dataFine],
                  ["Gruppo", contenuto.fattuali.partecipantiMin && `${contenuto.fattuali.partecipantiMin}–${contenuto.fattuali.partecipantiMax}`],
                ].map(([etichetta, valore]) => (
                  <div key={etichetta} className="min-w-0">
                    <dt className="font-button text-[9px] uppercase tracking-[0.16em] text-granite-mist/35">
                      {etichetta}
                    </dt>
                    <dd className="truncate text-granite-mist/70" title={valore || "—"}>
                      {valore || "—"}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>

            {/* ---- testi editoriali: qui si scrive ---- */}
            <section className="border border-[var(--border-on-dark)] p-4">
              <h3 className="mb-3 flex items-center gap-2 font-button text-[10px] uppercase tracking-[0.22em] text-[var(--accent-soft)]">
                <Pencil size={13} aria-hidden="true" />
                Testi editoriali
              </h3>
              <div className="space-y-3">
                <Campo etichetta="Titolo breve" aiuto="Quello che entra nella grafica: il nome del sito è spesso troppo lungo.">
                  <input
                    type="text"
                    value={contenuto.editoriale.titoloBreve}
                    onChange={(e) => scriviEditoriale("titoloBreve", e.target.value)}
                    className={CLASSE_CAMPO}
                  />
                </Campo>

                <Campo etichetta="Kicker" aiuto="La riga spaziata sopra il titolo, accanto alla barra in accento. Vuota: il blocco non compare.">
                  <input
                    type="text"
                    value={contenuto.editoriale.kicker}
                    onChange={(e) => scriviEditoriale("kicker", e.target.value)}
                    placeholder="NORD SARDEGNA · GALLURA"
                    className={CLASSE_CAMPO}
                  />
                </Campo>

                <Campo etichetta="Claim" aiuto="Una riga sotto il titolo, in maiuscoletto spaziato.">
                  <textarea
                    rows={2}
                    value={contenuto.editoriale.claim}
                    onChange={(e) => scriviEditoriale("claim", e.target.value)}
                    className={CLASSE_CAMPO}
                  />
                </Campo>

                <Campo etichetta="Frase dei numeri" aiuto="Chiude la slide 02 del carosello.">
                  <textarea
                    rows={2}
                    value={contenuto.editoriale.fraseNumeri}
                    onChange={(e) => scriviEditoriale("fraseNumeri", e.target.value)}
                    className={CLASSE_CAMPO}
                  />
                </Campo>

                <Campo etichetta="Descrizione" aiuto="Non finisce nella grafica: fa da contesto alla caption.">
                  <textarea
                    rows={3}
                    value={contenuto.editoriale.descrizione}
                    onChange={(e) => scriviEditoriale("descrizione", e.target.value)}
                    className={CLASSE_CAMPO}
                  />
                </Campo>

                <div className="grid grid-cols-2 gap-3">
                  <Campo etichetta="CTA">
                    <input
                      type="text"
                      value={contenuto.editoriale.cta}
                      onChange={(e) => scriviEditoriale("cta", e.target.value)}
                      className={CLASSE_CAMPO}
                    />
                  </Campo>
                  <Campo etichetta="Posti">
                    <select
                      value={contenuto.editoriale.statoPosti}
                      onChange={(e) => scriviEditoriale("statoPosti", e.target.value)}
                      className={CLASSE_CAMPO}
                    >
                      {STATI_POSTI.map((v) => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </Campo>
                </div>

                <Campo etichetta="WhatsApp" aiuto="Compare nella fascia CTA della slide 08.">
                  <input
                    type="text"
                    value={contenuto.editoriale.whatsapp}
                    onChange={(e) => scriviEditoriale("whatsapp", e.target.value)}
                    className={CLASSE_CAMPO}
                  />
                </Campo>
              </div>
            </section>

            {/* ---- highlight della slide 05 ---- */}
            <section className="border border-[var(--border-on-dark)] p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="font-button text-[10px] uppercase tracking-[0.22em] text-[var(--accent-soft)]">
                  Highlight · {(contenuto.editoriale.highlight || []).length} di 4
                </h3>
                {(contenuto.editoriale.highlight || []).length < 4 && (
                  <button
                    type="button"
                    onClick={aggiungiHighlight}
                    className="border border-[var(--border-on-dark)] px-2 py-1 font-button text-[9px] uppercase tracking-[0.14em] text-granite-mist/60 transition-colors hover:border-[var(--accent)]"
                  >
                    Aggiungi
                  </button>
                )}
              </div>
              {(contenuto.editoriale.highlight || []).length === 0 ? (
                <p className="font-body text-[11px] text-granite-mist/45">
                  Nessun highlight. Il sito non dichiara punti di interesse per questo evento:
                  scrivili qui o lascia la slide 05 alle sole fotografie.
                </p>
              ) : (
                <ul className="space-y-3">
                  {contenuto.editoriale.highlight.map((h, i) => (
                    <li key={h.id} className="border border-[var(--border-on-dark)] p-2.5">
                      <div className="mb-2 flex items-center gap-2">
                        <span className="font-button text-[9px] uppercase tracking-[0.16em] text-granite-mist/35">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span
                          className="font-body text-[9px] text-granite-mist/40"
                          title="Da dove viene questa voce"
                        >
                          {h.origine === "punti-interesse"
                            ? "dai punti di interesse del sito · descrizione da scrivere"
                            : h.origine === "preset"
                              ? "preset dell'evento"
                              : h.origine === "manuale"
                                ? "scritta a mano"
                                : "origine non indicata"}
                        </span>
                        <button
                          type="button"
                          onClick={() => togliHighlight(i)}
                          title="Togli la voce"
                          className="ml-auto p-0.5 text-granite-mist/40 transition-colors hover:text-[#E2857A]"
                        >
                          <Trash2 size={11} aria-hidden="true" />
                        </button>
                      </div>
                      <input
                        type="text"
                        value={h.titolo}
                        placeholder="Titolo"
                        onChange={(e) => scriviHighlight(i, "titolo", e.target.value)}
                        className={`${CLASSE_CAMPO} mb-1.5`}
                      />
                      <textarea
                        rows={2}
                        value={h.descrizione}
                        placeholder="Descrizione"
                        onChange={(e) => scriviHighlight(i, "descrizione", e.target.value)}
                        className={CLASSE_CAMPO}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* ---- impostazioni visuali: separate dai dati editoriali ---- */}
            <section className="border border-[var(--border-on-dark)] p-4">
              <h3 className="mb-1 font-button text-[10px] uppercase tracking-[0.22em] text-[var(--accent-soft)]">
                Aspetto
              </h3>
              <p className="mb-3 font-body text-[10px] leading-snug text-granite-mist/40">
                Il mood cambia insieme filtro fotografico, velo e contrasto. Non tocca l'accento.
              </p>
              <div className="mb-3 flex flex-wrap gap-1.5">
                {ELENCO_MOOD.map((m) => {
                  const attivo = (contenuto.visual?.mood || "Notte") === m;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => aggiorna((c) => ({ ...c, visual: { ...c.visual, mood: m } }))}
                      title={MOOD[m].filtroFoto}
                      className={`border px-2.5 py-1.5 font-body text-[11px] transition-colors ${
                        attivo
                          ? "border-[var(--accent)] text-[var(--accent-soft)]"
                          : "border-[var(--border-on-dark)] text-granite-mist/55 hover:border-granite-mist/40"
                      }`}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
              <label className="flex items-center gap-2 font-body text-xs text-granite-mist/65">
                <input
                  type="checkbox"
                  checked={Boolean(ritaglioAttivo?.specchiata)}
                  disabled={!ritaglioAttivo}
                  onChange={(e) => cambiaRitaglio({ ...ritaglioAttivo, specchiata: e.target.checked })}
                  className="accent-[var(--accent)]"
                />
                Rifletti la fotografia di «{SLOT.find((x) => x.id === slotAttivo)?.nome}»
              </label>
            </section>

            {/* ---- stato editoriale del contenuto ---- */}
            <section className="border border-[var(--border-on-dark)] p-4">
              <h3 className="mb-3 font-button text-[10px] uppercase tracking-[0.22em] text-[var(--accent-soft)]">
                Stato del contenuto
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <Campo etichetta="Stato">
                  <select
                    value={contenuto.stato}
                    onChange={(e) => scriviRadice("stato", e.target.value)}
                    className={CLASSE_CAMPO}
                  >
                    {STATI.map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </Campo>
                <Campo etichetta="Data prevista">
                  <input
                    type="date"
                    value={contenuto.dataPrevista}
                    onChange={(e) => scriviRadice("dataPrevista", e.target.value)}
                    className={CLASSE_CAMPO}
                  />
                </Campo>
              </div>
            </section>

            <LibreriaUI onSeleziona={setSelezionata} selezionato={selezionata} onCambiata={ricaricaMedia} />

            <section className="border border-[var(--border-on-dark)] p-4">
              <h3 className="mb-3 font-button text-[10px] uppercase tracking-[0.22em] text-[var(--accent-soft)]">
                Assegna e inquadra
              </h3>
              <div className="mb-3 flex flex-wrap gap-1.5">
                {SLOT.map((s) => {
                  const piena = Boolean(riferimentoSlot(contenuto.media, s.id)?.idBlob);
                  return (
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
                      {piena && <span className="ml-1 text-[var(--wild-sage-bright)]">•</span>}
                    </button>
                  );
                })}
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
                zone={zonePerSlot(slotAttivo)}
              />
            </section>

            <section className="border border-[var(--border-on-dark)] p-4">
              <h3 className="mb-3 font-button text-[10px] uppercase tracking-[0.22em] text-[var(--accent-soft)]">
                Traccia GPX
              </h3>
              <label className="btn-mech mb-2 block cursor-pointer border border-[var(--border-on-dark)] px-3 py-2 text-center text-xs transition-colors hover:border-[var(--accent)]">
                {contenuto.mappa?.gpx?.idBlob ? "Sostituisci il file .gpx" : "Carica un file .gpx"}
                <input type="file" accept=".gpx" className="hidden" onChange={(e) => e.target.files?.[0] && caricaGpx(e.target.files[0])} />
              </label>
              {erroreGpx && <p className="mb-2 font-body text-xs" style={{ color: "#E2857A" }}>{erroreGpx}</p>}
              {traccia && (
                <>
                  <p className="mb-2 font-body text-[11px] text-granite-mist/50">
                    {traccia.nomeFile} · dall'archivio, non serve ricaricarlo
                  </p>
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
                </>
              )}
            </section>

            <section className="border border-[var(--border-on-dark)] p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="font-button text-[10px] uppercase tracking-[0.22em] text-[var(--accent-soft)]">
                  Caption · {provider.nome}
                </h3>
                <div className="flex items-center gap-2">
                  <select
                    value={contenuto.editoriale.caption.lunghezza}
                    onChange={(e) =>
                      aggiorna((c) => ({
                        ...c,
                        editoriale: {
                          ...c.editoriale,
                          caption: { ...c.editoriale.caption, lunghezza: e.target.value },
                        },
                      }))
                    }
                    title="Taglia della caption: parte nella richiesta al provider"
                    className="border border-[var(--border-on-dark)] bg-[var(--obsidian)] px-1.5 py-1 font-body text-[10px] text-[var(--text-on-dark)] outline-none focus:border-[var(--accent)]"
                  >
                    {LUNGHEZZE_CAPTION.map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                  <button
                    type="button"
                    onClick={generaCaption}
                    className="inline-flex items-center gap-1.5 border border-[var(--border-on-dark)] px-2 py-1 font-button text-[9px] uppercase tracking-[0.14em] transition-colors hover:border-[var(--accent)]"
                  >
                    <Wand2 size={11} aria-hidden="true" />
                    {contenuto.editoriale.caption.testo.trim() ? "Rigenera" : "Genera"}
                  </button>
                </div>
              </div>
              <textarea
                value={contenuto.editoriale.caption.testo}
                onChange={(e) =>
                  aggiorna((c) => ({
                    ...c,
                    editoriale: { ...c.editoriale, caption: { ...c.editoriale.caption, testo: e.target.value } },
                  }))
                }
                rows={8}
                placeholder="Scrivi la caption. La traccia dà la struttura, le parole sono tue."
                className="w-full border border-[var(--border-on-dark)] bg-[var(--obsidian)] p-2 font-body text-xs leading-relaxed text-[var(--text-on-dark)] outline-none placeholder:text-granite-mist/30 focus:border-[var(--accent)]"
              />
              {erroreCaption && <p className="mt-1 font-body text-xs" style={{ color: "#E2857A" }}>{erroreCaption}</p>}

              {paragrafi(contenuto.editoriale.caption.testo).filter((p) => p.testo.trim()).length > 1 && (
                <>
                  <p className="mt-2 font-body text-[10px] text-granite-mist/35">
                    Il lucchetto tiene un paragrafo fuori dalla rigenerazione.
                  </p>
                  <ul className="mt-1 space-y-1">
                    {paragrafi(contenuto.editoriale.caption.testo).map((p) => {
                      if (!p.testo.trim()) return null;
                      const bloccato = contenuto.editoriale.caption.paragrafiBloccati.includes(p.i);
                      return (
                        <li key={p.i}>
                          <button
                            type="button"
                            onClick={() => bloccaParagrafo(p.i)}
                            className={`flex w-full items-start gap-2 text-left font-body text-[10px] transition-colors hover:text-granite-mist/80 ${
                              bloccato ? "text-[var(--accent-soft)]" : "text-granite-mist/50"
                            }`}
                          >
                            {bloccato ? <Lock size={11} className="mt-0.5 flex-none" /> : <Unlock size={11} className="mt-0.5 flex-none" />}
                            <span className="truncate">{p.testo.slice(0, 60)}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </>
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
                onClick={() => chiediExport("vista")}
                disabled={occupato}
                className="ml-auto inline-flex items-center gap-2 border border-[var(--border-on-dark)] px-3 py-2 font-button text-[10px] uppercase tracking-[0.14em] text-granite-mist/70 transition-colors hover:border-[var(--accent)] disabled:opacity-40"
              >
                <Download size={13} aria-hidden="true" />
                Esporta {vista}
              </button>
              <button
                type="button"
                onClick={() => chiediExport("pacchetto")}
                disabled={occupato}
                className="btn-mech inline-flex items-center gap-2 bg-[var(--cta)] px-4 py-2 text-xs text-[var(--cta-text)] disabled:opacity-40"
              >
                <Package size={14} aria-hidden="true" />
                Esporta pacchetto evento
              </button>
              {occupato && (
                <button type="button" onClick={annulla} className="border border-[var(--border-on-dark)] px-3 py-2 font-button text-[10px] uppercase">
                  Annulla
                </button>
              )}
            </div>

            {avanzamento?.totale > 0 && !avanzamento.pacchetto && (
              <p className="font-body text-xs text-granite-mist/60">
                {avanzamento.fatti} di {avanzamento.totale} · {avanzamento.corrente}
              </p>
            )}
            {avanzamento?.pacchetto && (
              <p className="font-body text-xs" style={{ color: COLORI.verdeChiaro }}>
                {avanzamento.pacchetto.nome} · {avanzamento.pacchetto.quanti} file ·{" "}
                {(avanzamento.pacchetto.byte / 1024 / 1024).toFixed(1)} MB · {(avanzamento.ms / 1000).toFixed(1)} s
              </p>
            )}

            {/*
              L'esito dell'esportazione: errori del pre-flight che bloccano,
              avvisi da superare consapevolmente, o un guasto della cattura.
            */}
            <EsitoExport
              daConfermare={daConfermare}
              chiedi={chiediExport}
              onChiudi={chiudiConferma}
            />

            <FornitoreProblemi onProblemi={setProblemi}>
              {vista === "post" && (
                <Anteprima formato="post" massimaAltezza={700}>
                  <PostEvento contenuto={contenuto} immagini={immagini} traccia={traccia} riferimento={registra("post")} />
                </Anteprima>
              )}
              {vista === "story" && (
                <Anteprima formato="story" massimaAltezza={700}>
                  <StoryEvento contenuto={contenuto} immagini={immagini} riferimento={registra("story")} />
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
                          riferimento={registra(s.id)}
                        />
                      </Anteprima>
                    </div>
                  ))}
                </div>
              )}

              {/*
                Le dieci grafiche del pacchetto, a misura reale e fuori vista.
                Sotto l'ambito «pacco»: sono copie degli stessi template già
                visibili, e senza un ambito proprio le loro segnalazioni si
                confonderebbero con quelle dell'anteprima.
              */}
              {daMontare.length > 0 && (
                <AmbitoProblemi nome="pacco">
                  {daMontare.includes("post") && (
                    <FuoriSchermo formato="post" riferimento={registra("pacco-post")}>
                      <PostEvento contenuto={contenuto} immagini={immagini} traccia={traccia} />
                    </FuoriSchermo>
                  )}
                  {daMontare.includes("story") && (
                    <FuoriSchermo formato="story" riferimento={registra("pacco-story")}>
                      <StoryEvento contenuto={contenuto} immagini={immagini} />
                    </FuoriSchermo>
                  )}
                  {SLIDE_CAROSELLO.filter((s) => daMontare.includes(s.id)).map((s) => (
                    <FuoriSchermo key={s.id} formato="post" riferimento={registra(`pacco-${s.id}`)}>
                      <SlideCarosello id={s.id} contenuto={contenuto} immagini={immagini} traccia={traccia} />
                    </FuoriSchermo>
                  ))}
                </AmbitoProblemi>
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

/* ================================================================== *
 * Aiutanti
 * ================================================================== */

/** Lo stile dei campi di testo, scritto una volta. */
const CLASSE_CAMPO =
  "w-full border border-[var(--border-on-dark)] bg-[var(--obsidian)] px-2 py-1.5 " +
  "font-body text-xs leading-relaxed text-[var(--text-on-dark)] outline-none " +
  "placeholder:text-granite-mist/30 focus:border-[var(--accent)]";

/** Etichetta, campo e nota: la nota spiega dove finisce il testo. */
function Campo({ etichetta, aiuto, children }) {
  return (
    <label className="block">
      <span className="mb-1 block font-button text-[9px] uppercase tracking-[0.18em] text-granite-mist/45">
        {etichetta}
      </span>
      {children}
      {aiuto && (
        <span className="mt-1 block font-body text-[10px] leading-snug text-granite-mist/35">
          {aiuto}
        </span>
      )}
    </label>
  );
}

/** Il riferimento del ritaglio di uno slot. */
function riferimentoSlot(media, slot) {
  if (slot === "cover") return media?.cover || null;
  if (slot === "cta") return media?.sfondi?.cta || null;
  return media?.esperienza?.[Number(slot.split("-")[1])] || null;
}

/** Media con il ritaglio di uno slot sostituito. Non muta l'originale. */
function conRitaglio(media, slot, nuovo) {
  const copia = { ...media };
  if (slot === "cover") {
    copia.cover = nuovo;
  } else if (slot === "cta") {
    copia.sfondi = { ...copia.sfondi, cta: nuovo };
  } else {
    const i = Number(slot.split("-")[1]);
    const esperienza = [...(copia.esperienza || [])];
    esperienza[i] = nuovo;
    copia.esperienza = esperienza;
  }
  return copia;
}
