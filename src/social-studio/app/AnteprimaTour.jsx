import React, { useCallback, useMemo, useRef, useState } from "react";
import { Camera } from "lucide-react";
import Anteprima, { FuoriSchermo } from "./Anteprima";
import PostTour from "../template/rubriche/tour/PostTour";
import StoryTour from "../template/rubriche/tour/StoryTour";
import { AmbitoProblemi, FornitoreProblemi } from "../template/primitivi";
import { cattura, scarica } from "../motori/export/cattura";
import { preflightTour } from "../motori/preflight-tour";
import {
  PannelloPreflight,
  letturaSincrona,
  soloAmbito,
  useEsitiSorgenti,
  useRaccoglitori,
  useRegistroFormati,
} from "./anteprima-tour-nucleo";

/**
 * Banco visivo della rubrica TOUR.
 *
 * Serve a **guardare** il prototipo a misura reale e a produrne due PNG, non ad
 * abilitare TOUR: non c'è nessun `EditorTour`, i template non sono registrati e
 * la rubrica resta `pianificata`. Vive accanto al banco di prova dell'export
 * perché è la stessa cosa — uno strumento per chi costruisce — e non entra né
 * nel pacchetto né nell'esportazione normale.
 *
 * L'anteprima ridotta e la cattura montano **lo stesso componente con le stesse
 * prop**: `Anteprima` lo scala con una trasformazione CSS per mostrarlo,
 * `FuoriSchermo` lo tiene a misura reale perché html2canvas fotograferebbe
 * anche la trasformazione. Nessuna seconda versione della grafica da tenere
 * allineata.
 *
 * Da 6.3K il cancello è il **pre-flight TOUR** (`motori/preflight-tour.js`), e
 * non più una guardia locale: errori che bloccano, avvisi che si superano solo
 * dichiarandolo. Il pre-flight generale continua a rispondere
 * `template-non-implementato` per la rubrica; qui si usa direttamente quello
 * specifico, sui prototipi montati, senza nessun interruttore che aggiri il
 * registro.
 */

/** I due formati del prototipo. Nessun carosello. */
const FORMATI = Object.freeze(["post", "story"]);

/** La fotografia è già nel repository: si usa, non si copia. */
const FOTO_DI_PROVA = "/media/reali/4x4-guado-1800.webp";

/** Ambito delle segnalazioni della copia che viene davvero fotografata. */
const AMBITO_CATTURA = "cattura";

/**
 * Contenuto **sintetico**. Non è un tour reale e non deve sembrarlo: i numeri
 * sono inventati, il nome dichiara sé stesso, e nessuno di questi valori viene
 * dal sito. Serve a riempire la composizione, non a raccontare qualcosa.
 */
const FIXTURE = Object.freeze({
  categoria: "tour",
  formato: "post",
  fattuali: Object.freeze({
    nome: "Percorso Di Prova",
    // La fotografia di prova è una Jeep: la tipologia sintetica la segue.
    categoria: "4×4",
    durata: "3 Giorni",
    km: "240 km",
    livello: "Medio",
    periodo: "Aprile – Ottobre",
    prezzo: "890 €",
    // Volutamente presente: serve a dimostrare che il template non lo disegna.
    url: "https://esempio.test/tour/percorso-di-prova",
  }),
  editoriale: Object.freeze({
    titoloBreve: "Percorso Di Prova",
    claim: "Tre giorni di prova per guardare la composizione, non un itinerario.",
    cta: "Scopri il tour",
  }),
  /*
   * Due ritagli **distinti** sullo stesso file: è il contratto 6.3H. Il Post è
   * 4:5 e la Story 9:16, e la stessa fotografia vuole due inquadrature.
   */
  media: Object.freeze({
    cover: Object.freeze({ idBlob: "prova-cover", zoom: 1.1, x: 0.5, y: 0.45, specchiata: false }),
    esperienza: Object.freeze([]),
    sfondi: Object.freeze({
      tourStory: Object.freeze({ idBlob: "prova-story", zoom: 1.35, x: 0.52, y: 0.38, specchiata: false }),
    }),
  }),
});

const SENZA_STORY = Object.freeze({
  ...FIXTURE,
  media: Object.freeze({ ...FIXTURE.media, sfondi: Object.freeze({}) }),
});

/** Le sole segnalazioni della copia che verrà fotografata. */
const soloCattura = (problemi) => soloAmbito(problemi, AMBITO_CATTURA);

export default function AnteprimaTour() {
  const [ripiegoStory, setRipiegoStory] = useState(false);
  const { problemi, raccoglitori } = useRaccoglitori(FORMATI);
  const [stato, setStato] = useState(null);
  const [daConfermare, setDaConfermare] = useState(null);
  const [inCattura, setInCattura] = useState(null);
  const nodoPost = useRef(null);
  const nodoStory = useRef(null);

  /*
   * Il blocco della cattura, in un ref e non solo in uno stato.
   *
   * Lo stato arriva al render successivo; il ref vale subito, e serve perché la
   * casella del ripiego non cambi la grafica **mentre** html2canvas la sta
   * leggendo. Un PNG catturato a cavallo di un cambio non è né la grafica di
   * prima né quella di dopo, e nessuno se ne accorge finché non apre il file.
   */
  const catturaInCorso = useRef(false);

  /* Un registro per formato, non uno solo: vedi `anteprima-tour-nucleo`. */
  const registro = useRegistroFormati(FORMATI);

  const contenutoStory = ripiegoStory ? SENZA_STORY : FIXTURE;
  const sorgenteStory = ripiegoStory ? null : FOTO_DI_PROVA;
  const esitiSorgenti = useEsitiSorgenti([FOTO_DI_PROVA]);

  /** Le stesse prop per l'anteprima e per la cattura: costruite una volta. */
  const propPost = useMemo(() => ({ contenuto: FIXTURE, sorgenteCover: FOTO_DI_PROVA }), []);
  const propStory = useMemo(
    () => ({ contenuto: contenutoStory, sorgenteStory, sorgenteCover: FOTO_DI_PROVA }),
    [contenutoStory, sorgenteStory],
  );

  /** Contenuto, formato e sorgenti risolte di un formato: una definizione sola. */
  const ingredienti = useCallback(
    (quale) => ({
      contenuto: quale === "post" ? FIXTURE : contenutoStory,
      formato: quale,
      sorgenti: { cover: FOTO_DI_PROVA, story: quale === "post" ? null : sorgenteStory },
    }),
    [contenutoStory, sorgenteStory],
  );

  /** L'evidenza sulla fotografia che quel formato disegna davvero. */
  const esitoFoto = useCallback(
    (quale) => {
      // La scelta la fa `design/tour.js`, attraverso il pre-flight: qui non si
      // riscrive quale fotografia va su quale formato.
      const scelta = preflightTour(ingredienti(quale)).selezione;
      const sorgente = scelta?.sorgente;
      if (!sorgente) return null;
      return esitiSorgenti[sorgente] || { sorgente, stato: "in-corso" };
    },
    [ingredienti, esitiSorgenti],
  );

  /**
   * Il controllo, sulla lettura **sincrona** del registro.
   *
   * `onProblemi` raggruppa a 80 ms e va benissimo per ridisegnare un pannello;
   * per decidere adesso se si può fotografare serve il registro com'è adesso.
   * Se il fornitore non ha depositato lettore e misure non si inventa uno zero:
   * si passa `null`, e il pre-flight tratta l'evidenza come assente.
   */
  const verifica = useCallback(
    (quale, conferma = null) => {
      const lettura = letturaSincrona(registro, quale, AMBITO_CATTURA);
      return preflightTour({
        ...ingredienti(quale),
        problemi: lettura.problemi,
        evidenze:
          lettura.misureInSospeso === null
            ? null
            : {
                formato: quale,
                misureInSospeso: lettura.misureInSospeso,
                foto: esitoFoto(quale),
              },
        conferma,
      });
    },
    [registro, ingredienti, esitoFoto],
  );

  /**
   * Il pannello, sul canale raggruppato.
   *
   * Stessa funzione pura del cancello, ingressi più lenti: qui l'aggiornamento
   * a 80 ms è un pregio, perché il pannello si ridisegna quando il registro si
   * è assestato invece che a ogni singola misura. Le misure in sospeso non
   * entrano nel rapporto: sono una condizione istantanea della cattura, non un
   * problema del contenuto da mostrare in elenco.
   */
  const rapporto = useMemo(
    () =>
      FORMATI.map((quale) => ({
        quale,
        esito: preflightTour({
          ...ingredienti(quale),
          problemi: soloCattura(problemi[quale]),
          evidenze: { formato: quale, misureInSospeso: 0, foto: esitoFoto(quale) },
        }),
      })),
    [ingredienti, esitoFoto, problemi],
  );

  const fotografa = useCallback(
    async (quale, conferma = null) => {
      // Una cattura alla volta: la seconda leggerebbe un DOM in movimento.
      if (catturaInCorso.current) return;

      const controllo = verifica(quale, conferma);
      if (!controllo.puoiCatturare) {
        if (controllo.richiedeConferma) {
          setDaConfermare({ quale, avvisi: controllo.avvisi, impronta: controllo.impronta });
          setStato(null);
        } else {
          setDaConfermare(null);
          setStato({
            tipo: "bloccata",
            quale,
            nota: `${controllo.errori.length} ${controllo.errori.length === 1 ? "controllo non passato" : "controlli non passati"}: ${controllo.errori[0].messaggio}`,
          });
        }
        return;
      }

      setDaConfermare(null);
      catturaInCorso.current = true;
      setInCattura(quale);
      setStato({ tipo: "in-corso", quale });
      try {
        const nodo = quale === "post" ? nodoPost.current : nodoStory.current;
        const esito = await cattura(nodo, { formato: quale });
        scarica(esito.blob, `tour-prova-${quale}.png`);
        setStato({
          tipo: "fatto",
          quale,
          nota: `${esito.larghezza}×${esito.altezza} · ${Math.round(esito.blob.size / 1024)} kB · ${esito.ms} ms`,
        });
      } catch (e) {
        setStato({ tipo: "errore", quale, nota: `${e.name}: ${e.message}` });
      } finally {
        // Anche in errore: il blocco lo libera chi l'ha preso, sempre.
        catturaInCorso.current = false;
        setInCattura(null);
      }
    },
    [verifica],
  );

  /** La configurazione non si tocca finché la cattura non è conclusa. */
  const bloccato = inCattura !== null;
  const cambiaRipiego = (valore) => {
    if (catturaInCorso.current) return;
    // Cambiare la configurazione annulla una conferma data su quella di prima.
    setDaConfermare(null);
    setRipiegoStory(valore);
  };

  const buono = stato?.tipo === "fatto" || stato?.tipo === "in-corso";

  return (
    <section className="border border-[var(--border-on-dark)] p-5">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="font-button text-xs uppercase tracking-[0.2em] text-[var(--accent-soft)]">
          Banco visivo · TOUR post e story
        </h2>
        <span className="font-button text-[10px] uppercase tracking-[0.2em] text-[var(--accent)]">
          Prova visiva — contenuto non pubblicabile
        </span>
      </div>

      <p className="mb-5 font-body text-xs leading-relaxed text-granite-mist/60">
        Prototipo della rubrica 01 / TOUR, variante <strong>standard</strong>. I template non sono
        registrati e la rubrica resta pianificata: da qui non si esporta un pacchetto e non si apre
        nessun editor. Testi e numeri sono sintetici.
      </p>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        {FORMATI.map((quale) => (
          <button
            key={quale}
            type="button"
            onClick={() => fotografa(quale)}
            disabled={bloccato}
            className="btn-mech inline-flex items-center gap-2 bg-[var(--cta)] px-4 py-2.5 text-sm text-[var(--cta-text)] transition-colors hover:bg-[var(--cta-hover)] disabled:opacity-50"
          >
            <Camera size={15} aria-hidden="true" />
            tour-prova-{quale}.png
          </button>
        ))}

        <label className="inline-flex cursor-pointer items-center gap-2 font-body text-xs text-granite-mist/70">
          <input
            type="checkbox"
            checked={ripiegoStory}
            disabled={bloccato}
            onChange={(e) => cambiaRipiego(e.target.checked)}
          />
          Story senza slot proprio (ripiego sulla cover)
        </label>
      </div>

      {daConfermare && (
        <div className="mb-4 border-l-2 border-[var(--accent)] pl-3">
          <p className="font-body text-sm text-granite-mist/80">
            {daConfermare.quale === "post" ? "Post" : "Story"}: nessun errore, ma{" "}
            {daConfermare.avvisi.length === 1
              ? "un avviso"
              : `${daConfermare.avvisi.length} avvisi`}{" "}
            da leggere prima di esportare.
          </p>
          <ul className="mt-1 space-y-0.5 font-body text-xs text-granite-mist/65">
            {daConfermare.avvisi.map((a) => (
              <li key={a.id}>· {a.messaggio}</li>
            ))}
          </ul>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => fotografa(daConfermare.quale, { impronta: daConfermare.impronta })}
              className="btn-mech border border-[var(--border-on-dark)] px-3 py-1.5 font-button text-[11px] uppercase tracking-[0.15em] text-granite-mist/80"
            >
              Esporta comunque
            </button>
            {/* «Riprova» rifà i controlli **tutti**, senza portarsi dietro la
                conferma: un avviso superato non vale per la volta dopo. */}
            <button
              type="button"
              onClick={() => fotografa(daConfermare.quale)}
              className="btn-mech border border-[var(--border-on-dark)] px-3 py-1.5 font-button text-[11px] uppercase tracking-[0.15em] text-granite-mist/80"
            >
              Riprova
            </button>
          </div>
        </div>
      )}

      {stato && (
        <p
          className="mb-4 border-l-2 pl-3 font-body text-sm"
          style={{
            borderColor: buono ? "var(--accent)" : "#C0453B",
            color: buono ? "rgba(245,235,217,0.8)" : "#E2857A",
          }}
        >
          {stato.tipo === "in-corso" && `Cattura ${stato.quale} in corso…`}
          {stato.tipo === "fatto" && `tour-prova-${stato.quale}.png · ${stato.nota}`}
          {(stato.tipo === "errore" || stato.tipo === "bloccata") && stato.nota}
        </p>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <FornitoreProblemi
          onProblemi={raccoglitori.post}
          lettore={registro.post.lettore}
          misure={registro.post.misure}
        >
          <div>
            <p className="mb-2 font-button text-[10px] uppercase tracking-[0.2em] text-granite-mist/45">
              Post 1080×1350
            </p>
            {/* Due ambiti: l'anteprima e la copia fotografata non condividono
                nessuna voce del registro. */}
            <AmbitoProblemi nome="vista">
              <Anteprima formato="post" massimaAltezza={520}>
                <PostTour {...propPost} />
              </Anteprima>
            </AmbitoProblemi>
          </div>
          <AmbitoProblemi nome="cattura">
            <FuoriSchermo formato="post" riferimento={nodoPost}>
              <PostTour {...propPost} />
            </FuoriSchermo>
          </AmbitoProblemi>
        </FornitoreProblemi>

        <FornitoreProblemi
          onProblemi={raccoglitori.story}
          lettore={registro.story.lettore}
          misure={registro.story.misure}
        >
          <div>
            <p className="mb-2 font-button text-[10px] uppercase tracking-[0.2em] text-granite-mist/45">
              Story 1080×1920 {ripiegoStory ? "· ripiego cover" : ""}
            </p>
            <AmbitoProblemi nome="vista">
              <Anteprima formato="story" massimaAltezza={520}>
                <StoryTour {...propStory} />
              </Anteprima>
            </AmbitoProblemi>
          </div>
          <AmbitoProblemi nome="cattura">
            <FuoriSchermo formato="story" riferimento={nodoStory}>
              <StoryTour {...propStory} />
            </FuoriSchermo>
          </AmbitoProblemi>
        </FornitoreProblemi>
      </div>

      <PannelloPreflight rapporto={rapporto} />
    </section>
  );
}
