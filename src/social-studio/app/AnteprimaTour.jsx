import React, { useCallback, useMemo, useRef, useState } from "react";
import { Camera } from "lucide-react";
import Anteprima, { FuoriSchermo } from "./Anteprima";
import PostTour from "../template/rubriche/tour/PostTour";
import StoryTour from "../template/rubriche/tour/StoryTour";
import { AmbitoProblemi, FornitoreProblemi } from "../template/primitivi";
import { cattura, scarica } from "../motori/export/cattura";

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
 */

/** La fotografia è già nel repository: si usa, non si copia. */
const FOTO_DI_PROVA = "/media/reali/4x4-guado-1800.webp";

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

export default function AnteprimaTour() {
  const [ripiegoStory, setRipiegoStory] = useState(false);
  const [problemi, setProblemi] = useState({ post: [], story: [] });
  const [stato, setStato] = useState(null);
  const nodoPost = useRef(null);
  const nodoStory = useRef(null);

  /*
   * Un registro per formato, non uno solo.
   *
   * Il conteggio delle misure in sospeso è per fornitore: con un registro
   * condiviso, una Story ancora in caricamento bloccherebbe il Post e
   * viceversa, e non si saprebbe nemmeno quale dei due sta aspettando.
   */
  const lettorePost = useRef(null);
  const misurePost = useRef(null);
  const lettoreStory = useRef(null);
  const misureStory = useRef(null);
  const registro = {
    post: { lettore: lettorePost, misure: misurePost },
    story: { lettore: lettoreStory, misure: misureStory },
  };

  /*
   * Due callback **stabili**, una per formato.
   *
   * Una fabbrica memoizzata non basta: `raccogli("post")` restituiva una
   * funzione nuova a ogni render, e con essa cambiava `segnala` dentro il
   * fornitore. Ogni effetto di segnalazione si ritirava e si riscriveva, il
   * raggruppamento notificava, il genitore aggiornava lo stato e si
   * ricominciava — con un errore persistente il banco si ridisegnava una volta
   * al secondo, per sempre. Quel che dev'essere stabile è la funzione che il
   * fornitore riceve, non quella che la costruisce.
   */
  const raccogliPost = useCallback((elenco) => setProblemi((p) => ({ ...p, post: elenco })), []);
  const raccogliStory = useCallback((elenco) => setProblemi((p) => ({ ...p, story: elenco })), []);

  const contenutoStory = ripiegoStory ? SENZA_STORY : FIXTURE;

  /** Le stesse prop per l'anteprima e per la cattura: costruite una volta. */
  const propPost = useMemo(
    () => ({ contenuto: FIXTURE, sorgenteCover: FOTO_DI_PROVA }),
    [],
  );
  const propStory = useMemo(
    () => ({
      contenuto: contenutoStory,
      sorgenteStory: ripiegoStory ? null : FOTO_DI_PROVA,
      sorgenteCover: FOTO_DI_PROVA,
    }),
    [contenutoStory, ripiegoStory],
  );

  /**
   * Perché **non** si può fotografare adesso, o `null` se si può.
   *
   * Fail-closed: un registro che non risponde è motivo sufficiente per non
   * scattare. La geometria della fotografia dipende dalle dimensioni del file,
   * e un clic nella finestra sbagliata produceva un PNG senza fotografia,
   * scaricato e annunciato come riuscito — il modo più costoso di sbagliare,
   * perché nessuno se ne accorge finché non apre il file.
   *
   * Non è il pre-flight TOUR, che non esiste: è il cancello di uno strumento.
   */
  const perchePronta = (quale) => {
    const { lettore, misure } = registro[quale];
    if (typeof misure.current !== "function" || typeof lettore.current !== "function") {
      return "Il registro delle misure non risponde: non si fotografa alla cieca.";
    }
    const inSospeso = misure.current();
    if (inSospeso > 0) {
      return `La grafica non è ancora pronta: ${inSospeso} misura${inSospeso === 1 ? "" : "e"} in sospeso, di solito le fotografie che stanno caricando. Riprova fra un istante.`;
    }
    const errori = lettore.current().filter((p) => p.livello === "errore");
    if (errori.length) {
      return `La grafica ha ${errori.length} problema${errori.length === 1 ? "" : "i"} da chiudere prima: ${errori[0].messaggio}`;
    }
    return null;
  };

  const fotografa = async (quale) => {
    const nodo = quale === "post" ? nodoPost.current : nodoStory.current;
    const ostacolo = perchePronta(quale);
    if (ostacolo) {
      // Nessuna cattura, nessun download, nessun falso esito riuscito.
      setStato({ tipo: "non-pronta", quale, nota: ostacolo });
      return;
    }
    setStato({ tipo: "in-corso", quale });
    try {
      const esito = await cattura(nodo, { formato: quale });
      scarica(esito.blob, `tour-prova-${quale}.png`);
      setStato({
        tipo: "fatto",
        quale,
        nota: `${esito.larghezza}×${esito.altezza} · ${Math.round(esito.blob.size / 1024)} kB · ${esito.ms} ms`,
      });
    } catch (e) {
      setStato({ tipo: "errore", quale, nota: `${e.name}: ${e.message}` });
    }
  };

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
        <button
          type="button"
          onClick={() => fotografa("post")}
          disabled={stato?.tipo === "in-corso"}
          className="btn-mech inline-flex items-center gap-2 bg-[var(--cta)] px-4 py-2.5 text-sm text-[var(--cta-text)] transition-colors hover:bg-[var(--cta-hover)] disabled:opacity-50"
        >
          <Camera size={15} aria-hidden="true" />
          tour-prova-post.png
        </button>

        <button
          type="button"
          onClick={() => fotografa("story")}
          disabled={stato?.tipo === "in-corso"}
          className="btn-mech inline-flex items-center gap-2 bg-[var(--cta)] px-4 py-2.5 text-sm text-[var(--cta-text)] transition-colors hover:bg-[var(--cta-hover)] disabled:opacity-50"
        >
          <Camera size={15} aria-hidden="true" />
          tour-prova-story.png
        </button>

        <label className="inline-flex cursor-pointer items-center gap-2 font-body text-xs text-granite-mist/70">
          <input
            type="checkbox"
            checked={ripiegoStory}
            onChange={(e) => setRipiegoStory(e.target.checked)}
          />
          Story senza slot proprio (ripiego sulla cover)
        </label>
      </div>

      {stato && (
        <p
          className="mb-4 border-l-2 pl-3 font-body text-sm"
          style={{
            borderColor: stato.tipo === "fatto" || stato.tipo === "in-corso" ? "var(--accent)" : "#C0453B",
            color: stato.tipo === "fatto" || stato.tipo === "in-corso" ? "rgba(245,235,217,0.8)" : "#E2857A",
          }}
        >
          {stato.tipo === "in-corso" && `Cattura ${stato.quale} in corso…`}
          {stato.tipo === "fatto" && `tour-prova-${stato.quale}.png · ${stato.nota}`}
          {(stato.tipo === "errore" || stato.tipo === "non-pronta") && stato.nota}
        </p>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <FornitoreProblemi
          onProblemi={raccogliPost}
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
          onProblemi={raccogliStory}
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

      {[...problemi.post, ...problemi.story].length > 0 && (
        <ul className="mt-5 space-y-1 font-body text-xs text-granite-mist/70">
          {[...problemi.post, ...problemi.story].map((p) => (
            <li key={p.chiave}>
              <span className="text-[var(--accent)]">{p.livello}</span> · {p.chiave} · {p.messaggio}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
