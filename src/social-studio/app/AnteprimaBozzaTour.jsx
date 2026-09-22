import React, { useCallback, useEffect, useMemo, useState } from "react";
import Anteprima from "./Anteprima";
import PostTour from "../template/rubriche/tour/PostTour";
import StoryTour from "../template/rubriche/tour/StoryTour";
import { AmbitoProblemi, FornitoreProblemi } from "../template/primitivi";
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
 * L'anteprima della **bozza aperta**, non di una fixture.
 *
 * È la differenza che conta rispetto al banco visivo di 6.3J: lì si guarda un
 * contenuto sintetico per giudicare la grafica, qui si guarda il proprio
 * lavoro. Un'anteprima che disegnasse la fixture mentre si scrive il titolo
 * sarebbe peggio di nessuna anteprima: mostrerebbe con precisione qualcosa che
 * non è il proprio contenuto, e nessuno se ne accorgerebbe finché il PNG non
 * esce diverso da quel che si era visto.
 *
 * ## Stessi template, stesso pre-flight, stesso nucleo di osservazione
 *
 * `PostTour` e `StoryTour` sono quelli già approvati, montati con le prop che
 * ricevono ovunque: nessuna seconda versione della grafica. Il giudizio è
 * `preflightTour`, lo stesso del banco. Il modo di osservare il renderer —
 * esito del caricamento di una sorgente, filtro per ambito del registro, forma
 * del pannello — sta in `anteprima-tour-nucleo` e lo usano tutti e due.
 *
 * ## La scelta della fotografia non si rifà qui
 *
 * Quale immagine disegni ciascun formato — e se la Story stia ripiegando sulla
 * cover — lo decide `design/tour.js`, che i template già interrogano, e qui lo
 * si **chiede** al pre-flight (`selezione`) invece di ricalcolarlo. Due
 * implementazioni della stessa regola finirebbero per dire cose diverse sulla
 * stessa bozza.
 *
 * ## Nessun pulsante di export
 *
 * Questo capitolo collega l'anteprima, non l'esportazione: qui non si
 * fotografa. Per la stessa ragione le **misure tipografiche in sospeso** non
 * entrano nel rapporto: sono una condizione istantanea della cattura, non un
 * problema del contenuto da elencare — è la stessa scelta che il banco
 * sintetico fa già per il proprio pannello. Il cancello che le legge in modo
 * sincrono resta dove serve, cioè davanti a uno scatto.
 *
 * Quel che invece si dichiara è la **prontezza della fotografia**: finché il
 * file non è stato osservato lo stato è «in corso» — mai «pronta» per
 * omissione — e se il registro del renderer non ha ancora depositato i propri
 * lettori si dice che manca, invece di inventare uno zero.
 */

const FORMATI = Object.freeze(["post", "story"]);

/** L'ambito del registro: qui c'è una sola copia per formato, quella visibile. */
const AMBITO = "vista";

const ETICHETTA = Object.freeze({ post: "Post 1080×1350", story: "Story 1080×1920" });

/**
 * @param {object} props
 * @param {object} props.contenuto  la bozza aperta, dall'hook
 * @param {{cover?: string|null, story?: string|null}} props.sorgenti
 *   le URL temporanee dell'archivio, già risolte
 */
export default function AnteprimaBozzaTour({ contenuto, sorgenti }) {
  const { problemi, raccoglitori } = useRaccoglitori(FORMATI);
  const registro = useRegistroFormati(FORMATI);

  const cover = sorgenti?.cover || null;
  const story = sorgenti?.story || null;
  const esitiSorgenti = useEsitiSorgenti(useMemo(() => [cover, story], [cover, story]));

  /**
   * Se il registro del renderer ha già depositato i propri lettori.
   *
   * Prima di quel momento non si sa niente di come la grafica si stia
   * assestando, e dirlo è meglio che dedurre un via libera dal silenzio.
   */
  const [registroPronto, setRegistroPronto] = useState(false);

  /** Contenuto, formato e sorgenti risolte di un formato: una definizione sola. */
  const ingredienti = useCallback(
    (quale) => ({
      contenuto,
      formato: quale,
      sorgenti: { cover, story: quale === "post" ? null : story },
    }),
    [contenuto, cover, story],
  );

  /**
   * L'evidenza sulla fotografia che quel formato disegna davvero.
   *
   * La cerca **per sorgente**: cambiando immagine si guarda l'esito della
   * nuova, e quello della precedente resta un fatto vero su un altro file
   * senza poter essere scambiato per questo. Il pre-flight lo ricontrolla
   * comunque e rifiuta un'evidenza che parli di un'altra sorgente.
   */
  const esitoFoto = useCallback(
    (quale) => {
      const scelta = preflightTour(ingredienti(quale)).selezione;
      const sorgente = scelta?.sorgente;
      if (!sorgente) return null;
      return esitiSorgenti[sorgente] || { sorgente, stato: "in-corso" };
    },
    [ingredienti, esitiSorgenti],
  );

  /*
   * Si rilegge al montaggio e ogni volta che il registro si è mosso, cioè
   * quando arriva una notifica raggruppata: sono i due momenti in cui la
   * risposta può cambiare. `problemi` non si usa nel corpo dell'effetto — è il
   * segnale che qualcosa è successo — e lo stato si riscrive solo se il valore
   * è diverso, così non nasce nessuna catena di aggiornamenti.
   */
  useEffect(() => {
    const pronto = FORMATI.every(
      (f) => letturaSincrona(registro, f, AMBITO).misureInSospeso !== null,
    );
    setRegistroPronto((p) => (p === pronto ? p : pronto));
  }, [registro, problemi]);

  const rapporto = useMemo(
    () =>
      FORMATI.map((quale) => ({
        quale,
        esito: preflightTour({
          ...ingredienti(quale),
          problemi: soloAmbito(problemi[quale], AMBITO),
          evidenze: { formato: quale, misureInSospeso: 0, foto: esitoFoto(quale) },
        }),
      })),
    [ingredienti, esitoFoto, problemi],
  );

  const perFormato = useMemo(
    () => Object.fromEntries(rapporto.map((r) => [r.quale, r.esito])),
    [rapporto],
  );

  const propPost = useMemo(() => ({ contenuto, sorgenteCover: cover }), [contenuto, cover]);
  const propStory = useMemo(
    () => ({ contenuto, sorgenteStory: story, sorgenteCover: cover }),
    [contenuto, story, cover],
  );

  return (
    <section className="border border-[var(--border-on-dark)] p-4" data-parte="anteprima-bozza">
      <h4 className="mb-3 font-button text-[10px] uppercase tracking-[0.22em] text-[var(--accent-soft)]">
        Anteprima della bozza · Post e Story
      </h4>
      <p className="mb-4 font-body text-[11px] leading-snug text-granite-mist/40">
        Sono i template approvati, con il contenuto e le fotografie di questa bozza. Da qui non si
        esporta niente: il pannello dice che cosa il pre-flight troverebbe, formato per formato.
      </p>

      <div className="grid gap-6 md:grid-cols-2">
        {FORMATI.map((quale) => {
          const esito = perFormato[quale];
          const selezione = esito.selezione;
          const foto = esitoFoto(quale);
          return (
            <FornitoreProblemi
              key={quale}
              onProblemi={raccoglitori[quale]}
              lettore={registro[quale].lettore}
              misure={registro[quale].misure}
            >
              <div data-formato={quale}>
                <p className="mb-1 font-button text-[10px] uppercase tracking-[0.2em] text-granite-mist/45">
                  {ETICHETTA[quale]}
                  {selezione?.ripiego ? " · ripiego cover" : ""}
                </p>
                <p
                  className="mb-2 font-body text-[10px] uppercase tracking-[0.14em] text-granite-mist/35"
                  data-prontezza={prontezza(registroPronto, foto)}
                >
                  {descriviProntezza(registroPronto, foto)}
                </p>
                {selezione?.ripiego && (
                  <p className="mb-2 font-body text-[11px] leading-snug text-granite-mist/55" data-ripiego="story">
                    La Story non ha una fotografia propria: sta usando la cover, con
                    l&apos;inquadratura della cover.
                  </p>
                )}
                <AmbitoProblemi nome={AMBITO}>
                  <Anteprima formato={quale} massimaAltezza={420}>
                    {quale === "post" ? <PostTour {...propPost} /> : <StoryTour {...propStory} />}
                  </Anteprima>
                </AmbitoProblemi>
                <PannelloPreflight rapporto={[{ quale, esito }]} />
              </div>
            </FornitoreProblemi>
          );
        })}
      </div>
    </section>
  );
}

/** Lo stato della prontezza, in una parola che una prova può leggere. */
function prontezza(registroPronto, foto) {
  if (!registroPronto) return "registro-assente";
  if (!foto) return "senza-fotografia";
  if (foto.stato === "in-corso") return "in-corso";
  if (foto.stato === "fallita") return "fallita";
  return "pronta";
}

function descriviProntezza(registroPronto, foto) {
  switch (prontezza(registroPronto, foto)) {
    case "registro-assente":
      return "Renderer non ancora osservato";
    case "senza-fotografia":
      return "Nessuna fotografia da disegnare";
    case "in-corso":
      return "Fotografia in caricamento";
    case "fallita":
      return "Fotografia non caricata";
    default:
      return "Fotografia pronta";
  }
}
