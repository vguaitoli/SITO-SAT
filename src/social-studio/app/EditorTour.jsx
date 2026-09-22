import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Save, Trash2, X } from "lucide-react";
import { CODICI, useBozzaTour } from "./useBozzaTour";
import { ESITI, useRichiediTransizione } from "./transizione";
import MediaTour, { useUrlMedia } from "./MediaTour";
import GpxTour from "./GpxTour";
import FonteTour from "./FonteTour";
import CronologiaTour from "./CronologiaTour";
import AnteprimaBozzaTour from "./AnteprimaBozzaTour";
import ConfermaDueTempi from "./ConfermaDueTempi";

/**
 * L'editor TOUR — **diagnostico**.
 *
 * Da 6.3M copre il lavoro sulla bozza per intero: fonte e creazione, testi
 * editoriali, fotografie con i due ritagli, GPX locale, anteprima reale di Post
 * e Story, confronto e riallineamento con il sito, cronologia con ripristino,
 * eliminazione. Quel che resta fuori resta fuori davvero: non esporta
 * pacchetti, non produce PNG, non è nel registro degli editor.
 *
 * **Non abilita TOUR.** La rubrica resta `pianificata` e non selezionabile: ci
 * si arriva soltanto dall'apertura esplicita nel banco diagnostico, che gli dà
 * anche un archivio isolato.
 *
 * ## Il principio: l'hook è l'autorità
 *
 * Questo componente **traduce codici e mostra stati**. Non tiene un secondo
 * contenuto, non rianalizza GPX, non riscrive revisioni, non confronta la fonte
 * per conto proprio, non tocca l'archivio, non replica la scelta degli slot e
 * non inventa ripieghi diversi da quelli del motore. Ogni domanda sul contenuto
 * ha una sola risposta possibile, e la dà `useBozzaTour`.
 *
 * In particolare **non dichiara riuscita un'operazione perché la promessa è
 * terminata**: si guarda il codice restituito. `superata-da-modifiche`,
 * `rilettura-fallita`, `base-non-recuperata`, `eliminata-elenco-non-aggiornato`
 * e i vari `superata-da-*` dicono cose diverse fra loro, e nessuno di essi è un
 * generico «fatto».
 *
 * **Non tiene uno stato editoriale proprio.** Gli input leggono da
 * `contenuto.editoriale` e scrivono con `scriviEditoriale`: nessuna copia
 * locale da tenere allineata, quindi nessun modo di far divergere ciò che si
 * vede da ciò che verrà salvato.
 *
 * **Non traduce i fatti.** I campi fattuali restano in sola lettura e separati:
 * scriverli a mano li stacca dal sito, ed è un gesto che merita un capitolo suo.
 *
 * ## Le operazioni hanno un'identità
 *
 * Un solo `inCorso` globale era una verità fragile: due operazioni concorrenti
 * se lo sovrascrivevano, e la seconda a finire spegneva lo stato della prima —
 * o peggio, una risposta tardiva mostrava il proprio esito al posto di quello
 * corrente. Qui ogni operazione riceve un numero, entra e esce dall'elenco
 * **per numero**, e può scrivere un messaggio solo se è ancora la più recente.
 * I gesti si disabilitano per incompatibilità, non in blocco: confrontare con
 * la fonte non tocca niente e resta possibile anche mentre si salva.
 */

/**
 * I campi editoriali, nell'ordine in cui si scrivono.
 *
 * Sono esattamente quelli che l'adapter dichiara: non se ne aggiungono di
 * nuovi, e nessuno di questi viene riempito con un valore inventato. Solo
 * `titoloBreve` e `descrizione` arrivano compilati dal sito, e sono un punto
 * di partenza del testo, non un fatto.
 */
export const CAMPI_EDITORIALI = Object.freeze([
  { campo: "titoloBreve", etichetta: "Titolo breve", righe: 1 },
  { campo: "kicker", etichetta: "Kicker", righe: 1 },
  { campo: "claim", etichetta: "Claim", righe: 2 },
  { campo: "cta", etichetta: "CTA", righe: 1 },
  { campo: "fraseNumeri", etichetta: "Frase dei numeri", righe: 2 },
  { campo: "descrizione", etichetta: "Descrizione", righe: 5 },
]);

/** I fatti che si mostrano, in sola lettura. Nessuno di questi è scrivibile qui. */
export const CAMPI_FATTUALI = Object.freeze([
  { campo: "categoria", etichetta: "Tipologia" },
  { campo: "nome", etichetta: "Nome" },
  { campo: "durata", etichetta: "Durata" },
  { campo: "km", etichetta: "Km" },
  { campo: "sterrato", etichetta: "Sterrato" },
  { campo: "livello", etichetta: "Livello" },
  { campo: "periodo", etichetta: "Periodo" },
  { campo: "prezzo", etichetta: "Prezzo" },
  { campo: "dataInizio", etichetta: "Data di inizio" },
  { campo: "area", etichetta: "Area" },
  { campo: "mezzo", etichetta: "Mezzo" },
  { campo: "url", etichetta: "URL sul sito" },
]);

/** I fatti che sono elenchi: si mostrano contati, non srotolati. */
const ELENCHI_FATTUALI = Object.freeze([
  { campo: "puntiInteresse", etichetta: "Punti di interesse" },
  { campo: "nonInclusi", etichetta: "Non inclusi" },
  { campo: "inclusi", etichetta: "Inclusi" },
  { campo: "tappe", etichetta: "Tappe" },
]);

/**
 * I codici dell'hook, tradotti.
 *
 * L'hook espone **codici** proprio perché che cosa si legge a schermo è una
 * decisione editoriale: la traduzione sta qui, dove l'interfaccia vive, e i
 * codici restano verificabili senza leggere testi.
 *
 * Nessuna di queste frasi trasforma un esito parziale in un successo. Una
 * scrittura riuscita su un lavoro già superato non è «salvata», perché ciò che
 * si ha davanti non è ciò che sta sul disco; una cancellazione con l'elenco
 * rimasto indietro **è** una cancellazione, e ripeterla sarebbe un gesto su un
 * record che non c'è più.
 */
export const MESSAGGI = Object.freeze({
  [CODICI.creata]: "Bozza creata dal tour scelto. Non è ancora sul disco: salvala.",
  [CODICI.aperta]: "Bozza aperta.",
  [CODICI.salvata]: "Salvata.",
  [CODICI.superataDaModifiche]:
    "Scrittura riuscita, ma nel frattempo hai modificato ancora: quello che vedi non è quello che sta sul disco. Salva di nuovo.",
  [CODICI.superataDaAltroContenuto]:
    "Scrittura riuscita, ma su una bozza che non è più quella aperta.",
  [CODICI.nonUnaBozzaTour]: "Quella non è una bozza TOUR: non è stata aperta.",
  [CODICI.erroreLettura]: "Non si è riusciti a leggere la bozza. Riprova.",
  [CODICI.erroreScrittura]:
    "Il salvataggio non è riuscito. Il lavoro è ancora qui e resta non salvato: riprova.",
  [CODICI.erroreElenco]: "Non si è riusciti a rileggere l'elenco delle bozze.",
  [CODICI.riletturaFallita]:
    "Scritta sul disco, ma non si è potuta rileggere per confermarla. Riapri la bozza per verificare.",
  [CODICI.baseNonRecuperata]:
    "Non si recupera la versione già sul disco: riscriverci sopra cancellerebbe uno stato che c'è. Riprova fra poco.",
  [CODICI.operazioneInConflitto]:
    "Un'altra operazione sta lavorando su questa bozza: riprova fra un istante.",
  [CODICI.nessunaBozza]: "Nessuna bozza aperta.",
  // Fotografie
  [CODICI.mediaAssegnato]: "Fotografia aggiornata. Non è ancora sul disco: salva.",
  [CODICI.slotMediaNonValido]: "Slot non previsto da TOUR: niente è stato scritto.",
  [CODICI.ritaglioMediaNonValido]:
    "Ritaglio rifiutato: il riferimento non è valido e la bozza non è stata toccata.",
  // Fonte
  [CODICI.fonteAccettata]: "Istantanea del sito accettata. Non è ancora sul disco: salva.",
  [CODICI.fonteAssente]: "Nessun tour corrispondente nel catalogo del sito.",
  [CODICI.fonteNonCorrispondente]: "Quel tour non è la fonte di questa bozza.",
  // Cronologia
  [CODICI.revisioneRipristinata]: "Revisione ripristinata e scritta sul disco.",
  [CODICI.revisioneInesistente]: "Quella revisione non esiste più: niente è stato ripristinato.",
  [CODICI.revisioneNonRipristinabile]:
    "Quella voce non porta uno stato con sé: non c'è dove tornare.",
  // Eliminazione
  [CODICI.eliminata]: "Bozza eliminata.",
  [CODICI.eliminataElencoNonAggiornato]:
    "Bozza eliminata. L'elenco non si è potuto rileggere: è l'elenco a essere rimasto indietro, non la cancellazione.",
  [CODICI.eliminazioneOccupata]:
    "Un'altra eliminazione è in corso: aspetta che finisca e riprova.",
  [CODICI.modificheNonSalvate]:
    "Ci sono modifiche non salvate su questa bozza: eliminarla le butterebbe via senza chiedertelo. Salva o scarta prima, deliberatamente.",
  [CODICI.erroreEliminazione]: "La cancellazione non è riuscita: la bozza è ancora lì.",
});

const testoDi = (v) => (typeof v === "string" ? v : "");

/** Da dove viene un fatto, detto in chiaro. */
const provenienza = (contenuto, campo) => {
  const o = contenuto?.fattuali?.origine?.[campo];
  if (o === "sito") return "dal sito";
  if (o === "manuale") return "a mano";
  if (o === "gpx") return "dal GPX";
  return "non importato";
};

/**
 * Le operazioni asincrone in volo, ciascuna con la sua identità.
 *
 * Entrano e escono dall'elenco **per numero**: una risposta tardiva toglie la
 * propria voce e non quella di chi è arrivato dopo, che è il difetto di un
 * `inCorso` singolo. `ancoraLaPiuRecente` è ciò che impedisce a un esito
 * superato di comparire al posto di quello corrente.
 */
export function useOperazioni() {
  const [inVolo, setInVolo] = useState([]);
  const contatore = useRef(0);
  const ultima = useRef(0);
  const vivo = useRef(true);

  useEffect(() => {
    vivo.current = true;
    return () => {
      vivo.current = false;
    };
  }, []);

  const conOperazione = useCallback(async (nome, fn) => {
    const id = (contatore.current += 1);
    ultima.current = id;
    setInVolo((v) => [...v, { id, nome }]);
    try {
      return await fn({ id, nome, ancoraLaPiuRecente: () => ultima.current === id });
    } finally {
      // Sempre, anche in errore: un'interfaccia che resta bloccata su un
      // fallimento è un fallimento in più.
      if (vivo.current) setInVolo((v) => v.filter((o) => o.id !== id));
    }
  }, []);

  const attiva = useCallback((...nomi) => inVolo.some((o) => nomi.includes(o.nome)), [inVolo]);

  return { inVolo, conOperazione, attiva };
}

/** Che cosa si sta facendo, detto in italiano. */
const DESCRIZIONE_OPERAZIONE = Object.freeze({
  creazione: "Creazione della bozza in corso…",
  apertura: "Apertura in corso…",
  salvataggio: "Salvataggio in corso…",
  ripristino: "Ripristino in corso…",
  eliminazione: "Eliminazione in corso…",
  gpx: "Operazione sul GPX in corso…",
});

/**
 * @param {object} props
 * @param {Array<object>} [props.tours]  i tour del sito, già normalizzati
 * @param {string} [props.urlBase]  la base con cui l'adapter compone l'URL
 * @param {() => void} [props.onChiudi]  chiude l'editor, dopo la protezione
 */
export default function EditorTour({ tours = [], urlBase = "", onChiudi }) {
  const {
    contenuto,
    sporco,
    bozze,
    esito,
    creaDaTour,
    apri,
    salva,
    scriviEditoriale,
    leggiMedia,
    scriviMedia,
    tracciaGpx,
    esitoGpx,
    caricaGpx,
    ricaricaGpx,
    rimuoviGpx,
    impostaConservaGpx,
    confrontaConLaFonte,
    riallineaAllaFonte,
    revisioni,
    ripristina,
    elimina,
  } = useBozzaTour({ urlBase });

  const richiedi = useRichiediTransizione();
  const { inVolo, conOperazione, attiva } = useOperazioni();
  const { url, ricarica: ricaricaMedia } = useUrlMedia();

  const [slugScelto, setSlugScelto] = useState("");
  const [notaTransizione, setNotaTransizione] = useState(null);
  /** L'esito dell'eliminazione, su un canale suo: non è un esito della bozza aperta. */
  const [esitoEliminazione, setEsitoEliminazione] = useState(null);
  /** La bozza per cui è aperto il pannello di conferma, o `null`. */
  const [daEliminare, setDaEliminare] = useState(null);

  const tourScelto = useMemo(
    () => tours.find((t) => String(t?.slug ?? "") === slugScelto) || null,
    [tours, slugScelto],
  );

  /** Il tour del sito da cui viene la bozza aperta, cercato per slug. */
  const tourDellaFonte = useMemo(() => {
    const slug = contenuto?.fonte?.slug;
    if (!slug) return null;
    return tours.find((t) => String(t?.slug ?? "") === String(slug)) || null;
  }, [tours, contenuto]);

  /*
   * Le sorgenti che i template riceveranno: **URL temporanee dell'archivio**,
   * mai l'`idBlob`, che è una chiave opaca e come `src` non disegnerebbe nulla.
   * Uno slot vuoto resta `null`, ed è da lì che il ripiego della Story nasce
   * dentro `design/tour.js` — non qui.
   */
  const sorgenti = useMemo(() => {
    if (!contenuto) return { cover: null, story: null };
    const idCover = leggiMedia("cover")?.idBlob;
    const idStory = leggiMedia("story")?.idBlob;
    return {
      cover: (idCover && url[idCover]) || null,
      story: (idStory && url[idStory]) || null,
    };
  }, [contenuto, leggiMedia, url]);

  /*
   * L'avviso del browser prima di lasciare la pagina, come in EVENTI: solo con
   * lavoro non salvato, perché un avviso che compare sempre è un avviso che si
   * impara a ignorare. Copre chiusura della scheda, ricarico e navigazione
   * fuori dall'applicazione; la navigazione interna del router la copre
   * `SentinellaNavigazione`.
   */
  useEffect(() => {
    if (!sporco) return undefined;
    const avvisa = (e) => {
      e.preventDefault();
      e.returnValue = "";
      return "";
    };
    window.addEventListener("beforeunload", avvisa);
    return () => window.removeEventListener("beforeunload", avvisa);
  }, [sporco]);

  /**
   * I messaggi dell'**ultimo gesto** lasciano il posto al gesto successivo.
   *
   * Non sono stati della bozza — quelli li tiene l'hook — ma resoconti di una
   * cosa appena fatta, e valgono finché non se ne fa un'altra. L'esito
   * dell'eliminazione in particolare non passa dalle transizioni, di proposito
   * (§19.15.6): senza questo azzeramento restava sotto l'elenco mentre si
   * creava o si apriva altro, come se riguardasse quel gesto.
   */
  const azzeraMessaggiDelGesto = useCallback(() => {
    setNotaTransizione(null);
    setEsitoEliminazione(null);
  }, []);

  /** Riporta come è finita una transizione, che è un fatto diverso dall'esito. */
  const registraTransizione = useCallback((risposta, op) => {
    if (op && !op.ancoraLaPiuRecente()) return risposta;
    if (risposta?.esito === ESITI.annullato) {
      setNotaTransizione("Annullato: il lavoro non salvato è ancora qui.");
    } else if (risposta?.esito === ESITI.occupato) {
      setNotaTransizione("Un'altra transizione è in corso: riprova fra un istante.");
    } else if (risposta?.esito === ESITI.fallito) {
      setNotaTransizione(`Non riuscita: ${risposta.errore?.message || "motivo sconosciuto"}.`);
    } else {
      setNotaTransizione(null);
    }
    return risposta;
  }, []);

  /* ---------------------------------------------------------------- *
   * I gesti
   * ---------------------------------------------------------------- */

  const crea = useCallback(async () => {
    if (!tourScelto) return;
    azzeraMessaggiDelGesto();
    // `creaDaTour` passa già dal sistema di transizioni: qui non si riprotegge.
    await conOperazione("creazione", (op) =>
      creaDaTour(tourScelto).then((r) => registraTransizione(r, op)),
    );
  }, [tourScelto, creaDaTour, conOperazione, registraTransizione, azzeraMessaggiDelGesto]);

  const apriBozza = useCallback(
    async (id) => {
      azzeraMessaggiDelGesto();
      await conOperazione("apertura", (op) => apri(id).then((r) => registraTransizione(r, op)));
    },
    [apri, conOperazione, registraTransizione, azzeraMessaggiDelGesto],
  );

  const salvaOra = useCallback(async () => {
    azzeraMessaggiDelGesto();
    await conOperazione("salvataggio", () => salva());
  }, [salva, conOperazione, azzeraMessaggiDelGesto]);

  const ripristinaRevisione = useCallback(
    async (n) => {
      azzeraMessaggiDelGesto();
      await conOperazione("ripristino", (op) =>
        ripristina(n).then((r) => registraTransizione(r, op)),
      );
    },
    [ripristina, conOperazione, registraTransizione, azzeraMessaggiDelGesto],
  );

  /**
   * L'eliminazione, dopo la conferma in due tempi.
   *
   * **Non passa dal dialogo delle transizioni**, e non è una dimenticanza:
   * quel dialogo offre «Salva e continua», che qui significherebbe salvare
   * proprio la bozza che si sta cancellando. Con lavoro non salvato *su quella*
   * bozza l'hook rifiuta con `modifiche-non-salvate`, e si salva o si scarta
   * prima, deliberatamente. Una bozza diversa resta eliminabile.
   */
  const eliminaOra = useCallback(
    async (id) => {
      azzeraMessaggiDelGesto();
      setDaEliminare(null);
      await conOperazione("eliminazione", async (op) => {
        const risposta = await elimina(id);
        if (op.ancoraLaPiuRecente()) setEsitoEliminazione(risposta.codice);
        return risposta;
      });
      // L'elenco può essere cambiato: le miniature non c'entrano, ma le
      // fotografie restano nell'archivio e nessuno le tocca qui.
    },
    [elimina, conOperazione, azzeraMessaggiDelGesto],
  );

  const chiudi = useCallback(async () => {
    if (!onChiudi) return;
    await conOperazione("chiusura", async (op) => {
      const risposta = await richiedi(() => onChiudi(), { etichetta: "Chiudere l'editor TOUR" });
      registraTransizione(risposta, op);
      return risposta;
    });
  }, [onChiudi, richiedi, conOperazione, registraTransizione]);

  /* ---- GPX: ogni gesto è un'operazione, e l'hook resta l'autorità ---- */

  const gpxCarica = useCallback(
    (file) => conOperazione("gpx", () => caricaGpx(file)),
    [caricaGpx, conOperazione],
  );
  const gpxRicarica = useCallback(
    () => conOperazione("gpx", () => ricaricaGpx()),
    [ricaricaGpx, conOperazione],
  );

  /* ---------------------------------------------------------------- *
   * Che cosa si può fare adesso
   * ---------------------------------------------------------------- */

  /** Una scrittura in volo: modificare il contenuto adesso la supererebbe. */
  const inScrittura = attiva("salvataggio", "ripristino");
  /** Una transizione in volo: un secondo gesto che sostituisce il lavoro no. */
  const inTransizione = attiva(
    "salvataggio",
    "creazione",
    "apertura",
    "ripristino",
    "eliminazione",
    "chiusura",
  );
  const inGpx = attiva("gpx");
  const descrizioni = inVolo.map((o) => DESCRIZIONE_OPERAZIONE[o.nome]).filter(Boolean);

  const messaggio = esito?.codice ? MESSAGGI[esito.codice] || esito.codice : null;
  const elenco = revisioni();

  return (
    <section className="border border-[var(--border-on-dark)] p-5" data-editor="tour">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <h3 className="font-button text-xs uppercase tracking-[0.2em] text-[var(--accent-soft)]">
          Editor TOUR · diagnostico
        </h3>
        <div className="flex items-center gap-3">
          <span
            className="font-button text-[10px] uppercase tracking-[0.2em]"
            data-stato-lavoro={sporco ? "non-salvato" : "salvato"}
            style={{ color: sporco ? "#E2857A" : "rgba(245,235,217,0.35)" }}
          >
            {sporco ? "Lavoro non salvato" : "Nessuna modifica in sospeso"}
          </span>
          {onChiudi && (
            <button
              type="button"
              onClick={chiudi}
              disabled={inTransizione}
              className="btn-mech inline-flex items-center gap-1.5 border border-[var(--border-on-dark)] px-2.5 py-1.5 font-button text-[10px] uppercase tracking-[0.16em] text-granite-mist/70 disabled:opacity-40"
            >
              <X size={12} aria-hidden="true" />
              Chiudi
            </button>
          )}
        </div>
      </div>

      <p className="mb-5 font-body text-xs leading-relaxed text-granite-mist/60">
        Editor diagnostico: fonte, testi, fotografie, GPX, anteprima, confronto con il sito,
        cronologia ed eliminazione. Non esporta pacchetti e non produce PNG. La rubrica resta
        pianificata e non selezionabile dallo Studio.
      </p>

      {/* ---------------------------------------------------------- *
          La fonte: tour veri del sito, nessuno inventato
       * ---------------------------------------------------------- */}
      <div className="mb-5 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="font-button text-[10px] uppercase tracking-[0.2em] text-granite-mist/45">
            Tour dal sito ({tours.length})
          </span>
          <select
            aria-label="Tour dal sito"
            value={slugScelto}
            disabled={inTransizione}
            onChange={(e) => setSlugScelto(e.target.value)}
            className="min-w-[16rem] border border-[var(--border-on-dark)] bg-transparent px-2 py-1.5 font-body text-sm"
          >
            <option value="">— scegli un tour —</option>
            {tours.map((t) => (
              <option key={t.slug} value={t.slug}>
                {t.name || t.slug}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={crea}
          disabled={!tourScelto || inTransizione}
          className="btn-mech border border-[var(--border-on-dark)] px-3 py-2 font-button text-[10px] uppercase tracking-[0.16em] disabled:opacity-40"
        >
          Crea bozza dal tour
        </button>
      </div>

      {/* ---------------------------------------------------------- *
          Le bozze TOUR già salvate
       * ---------------------------------------------------------- */}
      <div className="mb-5">
        <p className="mb-2 font-button text-[10px] uppercase tracking-[0.2em] text-granite-mist/45">
          Bozze TOUR salvate ({bozze.length})
        </p>
        {bozze.length === 0 ? (
          <p className="font-body text-xs text-granite-mist/45">Nessuna bozza TOUR nell&apos;archivio.</p>
        ) : (
          <ul className="space-y-1" data-elenco="bozze-tour">
            {bozze.map((b) => (
              <li key={b.id} data-bozza={b.id} className="font-body text-xs">
                <div className="flex flex-wrap items-baseline gap-2">
                  <button
                    type="button"
                    onClick={() => apriBozza(b.id)}
                    disabled={inTransizione}
                    className="btn-mech border border-[var(--border-on-dark)] px-2 py-1 font-button text-[10px] uppercase tracking-[0.16em] disabled:opacity-40"
                  >
                    Apri
                  </button>
                  <button
                    type="button"
                    data-azione="elimina"
                    onClick={() => {
                      setEsitoEliminazione(null);
                      setDaEliminare(b.id);
                    }}
                    disabled={inTransizione}
                    className="btn-mech inline-flex items-center gap-1 border border-[var(--border-on-dark)] px-2 py-1 font-button text-[10px] uppercase tracking-[0.16em] text-granite-mist/60 disabled:opacity-40"
                  >
                    <Trash2 size={11} aria-hidden="true" />
                    Elimina
                  </button>
                  <span className="text-granite-mist/75">{b.titolo || "(senza titolo)"}</span>
                  {contenuto?.id === b.id && (
                    <span className="font-button text-[10px] uppercase tracking-[0.16em] text-[var(--accent)]">
                      aperta
                    </span>
                  )}
                </div>
                {daEliminare === b.id && (
                  <ConfermaDueTempi
                    domanda={`Eliminare «${b.titolo || "(senza titolo)"}»?`}
                    nota="La cancellazione è definitiva. Le fotografie e il file GPX restano nell'archivio: eliminare una bozza non li tocca."
                    etichettaConferma="Conferma eliminazione"
                    onConferma={() => eliminaOra(b.id)}
                    onAnnulla={() => setDaEliminare(null)}
                    disabilitato={inTransizione}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
        {esitoEliminazione && (
          <p className="mt-2 font-body text-xs" data-esito-eliminazione={esitoEliminazione}>
            {MESSAGGI[esitoEliminazione] || esitoEliminazione}
          </p>
        )}
      </div>

      {(messaggio || notaTransizione || descrizioni.length > 0) && (
        <div className="mb-5 border-l-2 border-[var(--border-on-dark)] pl-3" role="status">
          {descrizioni.map((d) => (
            <p key={d} className="font-body text-sm text-granite-mist/70">
              {d}
            </p>
          ))}
          {messaggio && (
            <p className="font-body text-sm" data-esito={esito.codice}>
              {messaggio}
            </p>
          )}
          {notaTransizione && (
            <p className="font-body text-sm text-granite-mist/70">{notaTransizione}</p>
          )}
        </div>
      )}

      {!contenuto ? (
        <p className="font-body text-xs text-granite-mist/45">
          Nessuna bozza aperta: scegli un tour e creane una, oppure aprine una salvata.
        </p>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Fattuali contenuto={contenuto} />
            <Editoriale contenuto={contenuto} scrivi={scriviEditoriale} disabilitato={inScrittura} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <MediaTour
              contenuto={contenuto}
              leggiMedia={leggiMedia}
              scriviMedia={scriviMedia}
              url={url}
              onLibreriaCambiata={ricaricaMedia}
              disabilitato={inScrittura}
            />
            <div className="space-y-6">
              <GpxTour
                contenuto={contenuto}
                traccia={tracciaGpx}
                esito={esitoGpx}
                onCarica={gpxCarica}
                onRicarica={gpxRicarica}
                onRimuovi={rimuoviGpx}
                onConserva={impostaConservaGpx}
                disabilitato={inScrittura}
                occupato={inGpx}
              />
              <FonteTour
                contenuto={contenuto}
                tourAttuale={tourDellaFonte}
                onConfronta={confrontaConLaFonte}
                onRiallinea={riallineaAllaFonte}
                disabilitato={inScrittura}
              />
              <CronologiaTour
                revisioni={elenco}
                onRipristina={ripristinaRevisione}
                disabilitato={inTransizione}
              />
            </div>
          </div>

          <AnteprimaBozzaTour contenuto={contenuto} sorgenti={sorgenti} />
        </div>
      )}

      {contenuto && (
        <div className="mt-5 flex items-center gap-3">
          <button
            type="button"
            onClick={salvaOra}
            disabled={inTransizione}
            className="btn-mech inline-flex items-center gap-2 bg-[var(--cta)] px-4 py-2.5 text-sm text-[var(--cta-text)] disabled:opacity-50"
          >
            <Save size={15} aria-hidden="true" />
            Salva
          </button>
          {sporco && (
            <span className="inline-flex items-center gap-1.5 font-body text-xs text-[#E2857A]">
              <AlertTriangle size={13} aria-hidden="true" />
              Ci sono modifiche non salvate.
            </span>
          )}
        </div>
      )}
    </section>
  );
}

/**
 * I fatti, in sola lettura e visivamente staccati dall'editoriale.
 *
 * Non è una scelta estetica. Un campo fattuale scritto a mano si stacca dal
 * sito — `origine` diventa `manuale` e il confronto con la fonte smette di
 * riguardarlo — ed è una conseguenza che non deve capitare per aver cliccato
 * nel riquadro sbagliato. Qui si leggono, con la loro provenienza dichiarata;
 * scriverli avrà il suo capitolo e le sue difese.
 */
function Fattuali({ contenuto }) {
  const f = contenuto.fattuali || {};
  return (
    <div className="border border-[var(--border-on-dark)] p-4" data-parte="fattuali">
      <p className="mb-1 font-button text-[10px] uppercase tracking-[0.2em] text-granite-mist/45">
        Fatti · sola lettura
      </p>
      <p className="mb-3 font-body text-[11px] leading-snug text-granite-mist/40">
        Importati dal sito. Non si modificano da qui: scriverli a mano li staccherebbe dalla fonte.
      </p>
      <dl className="space-y-1.5">
        {CAMPI_FATTUALI.map(({ campo, etichetta }) => (
          <div key={campo} className="flex items-baseline justify-between gap-3" data-fatto={campo}>
            <dt className="font-button text-[10px] uppercase tracking-[0.16em] text-granite-mist/40">
              {etichetta}
            </dt>
            <dd className="text-right font-body text-xs text-granite-mist/75">
              {testoDi(f[campo]) || <span className="text-granite-mist/30">vuoto</span>}
              <span className="ml-2 font-button text-[9px] uppercase tracking-[0.14em] text-granite-mist/30">
                {provenienza(contenuto, campo)}
              </span>
            </dd>
          </div>
        ))}
        {ELENCHI_FATTUALI.map(({ campo, etichetta }) => (
          <div key={campo} className="flex items-baseline justify-between gap-3" data-fatto={campo}>
            <dt className="font-button text-[10px] uppercase tracking-[0.16em] text-granite-mist/40">
              {etichetta}
            </dt>
            <dd className="text-right font-body text-xs text-granite-mist/75">
              {(f[campo] || []).length} voci
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/**
 * I campi editoriali.
 *
 * Ogni input è **controllato dall'hook**: legge da `contenuto.editoriale` e
 * scrive con `scriviEditoriale`. Nessuno stato locale che rispecchi il testo —
 * sarebbe una seconda verità, libera di divergere da quella che finisce
 * sull'archivio, e renderebbe «non salvato» una bugia proprio nel momento in
 * cui serve.
 */
function Editoriale({ contenuto, scrivi, disabilitato }) {
  const e = contenuto.editoriale || {};
  return (
    <div className="border border-[var(--border-on-dark)] p-4" data-parte="editoriale">
      <p className="mb-1 font-button text-[10px] uppercase tracking-[0.2em] text-[var(--accent-soft)]">
        Editoriale · scrivibile
      </p>
      <p className="mb-3 font-body text-[11px] leading-snug text-granite-mist/40">
        Testi di chi scrive. Titolo e descrizione arrivano dal sito come punto di partenza, non come
        fatti.
      </p>
      <div className="space-y-3">
        {CAMPI_EDITORIALI.map(({ campo, etichetta, righe }) => (
          <label key={campo} className="block">
            <span className="mb-1 block font-button text-[10px] uppercase tracking-[0.16em] text-granite-mist/40">
              {etichetta}
            </span>
            {righe > 1 ? (
              <textarea
                aria-label={etichetta}
                rows={righe}
                value={testoDi(e[campo])}
                disabled={disabilitato}
                onChange={(ev) => scrivi(campo, ev.target.value)}
                className="w-full border border-[var(--border-on-dark)] bg-transparent px-2 py-1.5 font-body text-sm disabled:opacity-50"
              />
            ) : (
              <input
                type="text"
                aria-label={etichetta}
                value={testoDi(e[campo])}
                disabled={disabilitato}
                onChange={(ev) => scrivi(campo, ev.target.value)}
                className="w-full border border-[var(--border-on-dark)] bg-transparent px-2 py-1.5 font-body text-sm disabled:opacity-50"
              />
            )}
          </label>
        ))}
      </div>
    </div>
  );
}
