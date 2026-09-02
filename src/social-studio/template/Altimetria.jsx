import React, { useMemo } from "react";
import { profiloAltimetrico, proiettaProfilo } from "../motori/altimetria";
import { semplificaProiettato, tracciaPath } from "../motori/proiezione";
import { ALTIMETRIA, COLORI, FONT } from "../design/tokens";
import { PROFILO_ALTIMETRICO } from "./rubriche/eventi/zone";
import { useSegnalazione } from "./primitivi";

/**
 * Il profilo altimetrico del percorso, dal GPX.
 *
 * È opzionale per scelta editoriale, non per comodità: molti eventi hanno un
 * dislivello che non racconta niente, e un grafico piatto occupa spazio senza
 * aggiungere informazione. Quando serve, invece, è il dato che manca alla mappa
 * — la mappa dice *dove*, il profilo dice *quanto costa*.
 *
 * Tre cose che questo componente non fa, e sono tutte deliberate:
 *
 * - **non collega i tratti.** Due segmenti GPX, o due lati di un buco di quota,
 *   restano due path. Una linea di collegamento sarebbe un dato inventato
 *   indistinguibile da uno misurato.
 * - **non tace quando non può disegnare.** Se il profilo è stato chiesto e la
 *   traccia non lo permette, registra una segnalazione: finisce nel pre-flight e
 *   ferma l'esportazione. Un'opzione accesa che sparisce in silenzio è peggio di
 *   un errore, perché il PNG esce comunque e sembra giusto.
 * - **non riempie il fondo sotto un tratto interrotto.** L'area colorata si
 *   chiude sulla base solo dove la linea esiste davvero.
 *
 * Distanze e dislivelli qui dentro vengono dal file GPX e sono etichettati come
 * tali. I 550 km commerciali del sito sono un'altra cosa e non li tocca nessuno.
 */

const ETICHETTA = {
  fontFamily: FONT.etichetta,
  fontSize: 13,
  letterSpacing: "0.19em",
  textTransform: "uppercase",
  color: ALTIMETRIA.testo,
};

const VALORE = {
  fontFamily: FONT.titolo,
  fontSize: 28,
  lineHeight: 1,
  color: COLORI.testo,
};

/** Una lettura: etichetta piccola sopra, numero sotto. */
function Lettura({ etichetta, valore }) {
  return (
    <div style={{ textAlign: "right", flex: "none" }}>
      <div style={ETICHETTA}>{etichetta}</div>
      <div style={{ ...VALORE, marginTop: 4 }}>{valore}</div>
    </div>
  );
}

/**
 * @param {object} props
 * @param {{lon:number,lat:number,quota:number|null}[][]} props.segmenti  dal GPX
 * @param {number} props.larghezza  larghezza disponibile, in pixel
 * @param {object} [props.metriche] metriche già calcolate dal GPX (D+ e D−)
 */
export default function Altimetria({ segmenti = [], larghezza, metriche }) {
  const { profilo, path, riempimenti } = useMemo(() => {
    const p = profiloAltimetrico(segmenti);
    // Si disegna dentro un riquadro rientrato e poi si trasla: così il tratto
    // alla quota minima e quello alla massima restano interi dentro il blocco.
    const h = PROFILO_ALTIMETRICO.grafico - PROFILO_ALTIMETRICO.rientro * 2;
    const { tratti } = proiettaProfilo(p, { larghezza, altezza: h });

    /*
     * Si proietta prima e si semplifica dopo, in pixel, come per la traccia
     * della mappa: la tolleranza **è** l'errore che si vuole garantire, e
     * `tracciaPath` scrive le coordinate per intero, quindi il limite vale sul
     * path davvero serializzato e non solo sui valori che lo precedono.
     */
    const ridotti = tratti
      .map((t) => semplificaProiettato(t, PROFILO_ALTIMETRICO.tolleranzaPx))
      .filter((t) => t.length > 1);

    return {
      profilo: p,
      path: ridotti.map(tracciaPath),
      // Il riempimento chiude sul fondo solo agli estremi del proprio tratto.
      riempimenti: ridotti.map(
        (t) => `${tracciaPath(t)} L${t.at(-1)[0]} ${h} L${t[0][0]} ${h} Z`,
      ),
    };
  }, [segmenti, larghezza]);

  /*
   * Il profilo è stato chiesto: se non si può disegnare bisogna dirlo, e dirlo
   * dove ferma l'esportazione. `useSegnalazione` ritira la voce da sé quando il
   * componente si smonta, così non resta appesa dopo un cambio di formato.
   */
  useSegnalazione(
    "altimetria",
    !profilo.utilizzabile
      ? {
          livello: "errore",
          messaggio:
            "Profilo altimetrico richiesto, ma la traccia GPX non contiene un tratto di almeno due punti consecutivi con quota. Carica un GPX con le quote o spegni l'opzione.",
        }
      : profilo.parziale
        ? {
            livello: "avviso",
            messaggio: `Profilo altimetrico: ${profilo.puntiSenzaQuota} punti della traccia non hanno quota, il grafico avrà ${profilo.tratti.length} tratti interrotti. Le interruzioni sono reali, non un difetto di disegno.`,
          }
        : profilo.interrotto
          ? {
              livello: "avviso",
              messaggio: `Profilo altimetrico: la traccia ha ${profilo.segmenti} segmenti distinti, il grafico li mostra separati senza collegarli.`,
            }
          : null,
  );

  if (!profilo.utilizzabile) return null;

  const km = profilo.distanzaTotale / 1000;
  const rientro = PROFILO_ALTIMETRICO.rientro;
  const h = PROFILO_ALTIMETRICO.grafico - rientro * 2;

  return (
    <div style={{ height: PROFILO_ALTIMETRICO.blocco, display: "flex", flexDirection: "column" }}>
      {/*
        Altezze dichiarate, non risultanti: l'intestazione non può crescere a
        spese del grafico né appoggiarcisi sopra. Prima le due parti si
        dividevano il blocco per conto loro e il picco finiva sotto la lettura
        della quota massima.
      */}
      <div style={{ height: PROFILO_ALTIMETRICO.intestazione, flex: "none", display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 28 }}>
        <div style={{ ...ETICHETTA, paddingBottom: 4 }}>
          Profilo altimetrico · dati GPX
        </div>
        <div style={{ display: "flex", gap: 28 }}>
          <Lettura etichetta="Quota min" valore={`${Math.round(profilo.quotaMin)} m`} />
          <Lettura etichetta="Quota max" valore={`${Math.round(profilo.quotaMax)} m`} />
          {Number.isFinite(metriche?.dislivelloPositivo) && (
            <Lettura etichetta="D+ GPX" valore={`${metriche.dislivelloPositivo} m`} />
          )}
          {Number.isFinite(metriche?.dislivelloNegativo) && (
            <Lettura etichetta="D− GPX" valore={`${metriche.dislivelloNegativo} m`} />
          )}
          <Lettura etichetta="Traccia GPX" valore={`${km.toFixed(1)} km`} />
        </div>
      </div>

      <svg
        width={larghezza}
        height={PROFILO_ALTIMETRICO.grafico}
        viewBox={`0 0 ${larghezza} ${PROFILO_ALTIMETRICO.grafico}`}
        style={{ display: "block", marginTop: PROFILO_ALTIMETRICO.distanzaIntestazione, flex: "none" }}
        aria-hidden="true"
      >
        <g transform={`translate(0 ${rientro})`}>
          {/* Tre righe di riferimento: minimo, metà, massimo. */}
          {[0, h / 2, h].map((y, i) => (
            <line key={i} x1={0} y1={y} x2={larghezza} y2={y} stroke={ALTIMETRIA.griglia} strokeWidth={1} />
          ))}
          {riempimenti.map((d, i) => (
            <path key={`area-${i}`} d={d} fill={ALTIMETRIA.riempimento} stroke="none" />
          ))}
          {path.map((d, i) => (
            <path
              key={`linea-${i}`}
              d={d}
              fill="none"
              stroke={ALTIMETRIA.linea}
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </g>
      </svg>
    </div>
  );
}
