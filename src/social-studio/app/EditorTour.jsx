import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Save, X } from "lucide-react";
import { CODICI, useBozzaTour } from "./useBozzaTour";
import { ESITI, useRichiediTransizione } from "./transizione";

/**
 * Il primo nucleo dell'editor TOUR — **diagnostico**.
 *
 * Fa quattro cose e nessun'altra: sceglie un tour vero dalla fonte del sito,
 * ne crea la bozza, apre quelle già salvate, scrive i campi editoriali e
 * salva. Media, GPX, cronologia, eliminazione, confronto con la fonte,
 * anteprima ed export **non ci sono**: arriveranno a passi separati, e ognuno
 * porta con sé difese proprie che vanno aggiunte con le loro prove.
 *
 * **Non abilita TOUR.** Non è nel registro degli editor, la rubrica resta
 * `pianificata` e non selezionabile: ci si arriva soltanto dall'apertura
 * esplicita nel banco diagnostico, che gli dà anche un archivio isolato.
 *
 * ## Quello che questo componente deliberatamente non fa
 *
 * **Non tiene uno stato editoriale proprio.** Gli input leggono da
 * `contenuto.editoriale` e scrivono con `scriviEditoriale`: nessuna copia
 * locale da tenere allineata, quindi nessun modo di far divergere ciò che si
 * vede da ciò che verrà salvato — e «non salvato» resta veritiero perché passa
 * dall'unico punto che lo aggiorna.
 *
 * **Non riscrive la protezione del lavoro non salvato.** `creaDaTour` e `apri`
 * passano già dal sistema di transizioni dentro l'hook; qui si protegge solo
 * l'uscita, che è l'unica transizione che nasce in questo componente.
 *
 * **Non traduce i fatti.** I campi fattuali sono in sola lettura e separati:
 * scriverli a mano li stacca dal sito, ed è un gesto che merita un capitolo
 * suo. Qui si vedono, con la loro provenienza, e basta.
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
 * Tre di questi non sono successi, e non vanno raccontati come tali: una
 * scrittura riuscita su un lavoro già superato non è «salvata», perché ciò che
 * si ha davanti non è ciò che sta sul disco.
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
  } = useBozzaTour({ urlBase });

  const richiedi = useRichiediTransizione();

  const [slugScelto, setSlugScelto] = useState("");
  /*
   * Lo stato delle **operazioni**, non del contenuto: quale gesto è in volo e
   * come è finita l'ultima transizione. Non duplica niente dell'hook — il
   * contenuto, «sporco» e l'esito restano suoi — e serve a non lasciare
   * l'interfaccia muta mentre l'archivio sta lavorando.
   */
  const [inCorso, setInCorso] = useState(null);
  const [notaTransizione, setNotaTransizione] = useState(null);

  const tourScelto = useMemo(
    () => tours.find((t) => String(t?.slug ?? "") === slugScelto) || null,
    [tours, slugScelto],
  );

  /*
   * L'avviso del browser prima di lasciare la pagina, come in EVENTI: solo con
   * lavoro non salvato, perché un avviso che compare sempre è un avviso che si
   * impara a ignorare. Copre chiusura della scheda, ricarico e navigazione
   * fuori dall'applicazione; non la navigazione interna del router.
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

  /** Riporta come è finita una transizione, che è un fatto diverso dall'esito. */
  const registraTransizione = useCallback((risposta) => {
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

  const conOperazione = useCallback(async (nome, fn) => {
    setInCorso(nome);
    try {
      return await fn();
    } finally {
      setInCorso(null);
    }
  }, []);

  const crea = useCallback(async () => {
    if (!tourScelto) return;
    // `creaDaTour` passa già dal sistema di transizioni: qui non si riprotegge.
    await conOperazione("creazione", () => creaDaTour(tourScelto).then(registraTransizione));
  }, [tourScelto, creaDaTour, conOperazione, registraTransizione]);

  const apriBozza = useCallback(
    async (id) => {
      await conOperazione("apertura", () => apri(id).then(registraTransizione));
    },
    [apri, conOperazione, registraTransizione],
  );

  const salvaOra = useCallback(async () => {
    setNotaTransizione(null);
    await conOperazione("salvataggio", () => salva());
  }, [salva, conOperazione]);

  /**
   * Uscire è una transizione come le altre.
   *
   * È l'unica che nasce qui — creare e aprire sono già protette dentro l'hook —
   * e senza questa il lavoro non salvato se ne andrebbe con lo smontaggio,
   * senza che nessuno lo chieda.
   */
  const chiudi = useCallback(async () => {
    if (!onChiudi) return;
    const risposta = await richiedi(() => onChiudi(), { etichetta: "Chiudere l'editor TOUR" });
    registraTransizione(risposta);
  }, [onChiudi, richiedi, registraTransizione]);

  const messaggio = esito?.codice ? MESSAGGI[esito.codice] || esito.codice : null;
  const occupato = inCorso !== null;

  return (
    <section className="border border-[var(--border-on-dark)] p-5" data-editor="tour">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <h3 className="font-button text-xs uppercase tracking-[0.2em] text-[var(--accent-soft)]">
          Editor TOUR · nucleo diagnostico
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
              disabled={occupato}
              className="btn-mech inline-flex items-center gap-1.5 border border-[var(--border-on-dark)] px-2.5 py-1.5 font-button text-[10px] uppercase tracking-[0.16em] text-granite-mist/70 disabled:opacity-40"
            >
              <X size={12} aria-hidden="true" />
              Chiudi
            </button>
          )}
        </div>
      </div>

      <p className="mb-5 font-body text-xs leading-relaxed text-granite-mist/60">
        Nucleo diagnostico: fonte, creazione, apertura, campi editoriali e salvataggio. Media, GPX,
        cronologia, confronto con il sito, anteprima ed export non sono ancora collegati. La rubrica
        resta pianificata e non selezionabile dallo Studio.
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
            disabled={occupato}
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
          disabled={!tourScelto || occupato}
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
              <li key={b.id} className="flex items-baseline gap-2 font-body text-xs">
                <button
                  type="button"
                  onClick={() => apriBozza(b.id)}
                  disabled={occupato}
                  className="btn-mech border border-[var(--border-on-dark)] px-2 py-1 font-button text-[10px] uppercase tracking-[0.16em] disabled:opacity-40"
                >
                  Apri
                </button>
                <span className="text-granite-mist/75">{b.titolo || "(senza titolo)"}</span>
                {contenuto?.id === b.id && (
                  <span className="font-button text-[10px] uppercase tracking-[0.16em] text-[var(--accent)]">
                    aperta
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {(messaggio || notaTransizione || occupato) && (
        <div className="mb-5 border-l-2 border-[var(--border-on-dark)] pl-3" role="status">
          {occupato && (
            <p className="font-body text-sm text-granite-mist/70">
              {inCorso === "salvataggio" && "Salvataggio in corso…"}
              {inCorso === "creazione" && "Creazione della bozza in corso…"}
              {inCorso === "apertura" && "Apertura in corso…"}
            </p>
          )}
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
        <div className="grid gap-6 lg:grid-cols-2">
          <Fattuali contenuto={contenuto} />
          <Editoriale
            contenuto={contenuto}
            scrivi={scriviEditoriale}
            disabilitato={inCorso === "salvataggio"}
          />
        </div>
      )}

      {contenuto && (
        <div className="mt-5 flex items-center gap-3">
          <button
            type="button"
            onClick={salvaOra}
            disabled={occupato}
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
