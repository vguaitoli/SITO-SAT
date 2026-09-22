import React, { useCallback, useEffect, useRef, useState } from "react";

/**
 * Il nucleo condiviso delle due anteprime TOUR.
 *
 * Ce ne sono due, e devono restare due: il **banco visivo sintetico**
 * (`AnteprimaTour`), che monta una fixture a misura reale e ne produce i PNG
 * diagnostici, e l'**anteprima della bozza** (`AnteprimaBozzaTour`), che
 * disegna il lavoro vero dentro l'editor. Quello che non deve diventare due è
 * il modo in cui si osserva il renderer: il conteggio delle misure in sospeso,
 * l'esito del caricamento di una fotografia, il filtro sull'ambito del registro
 * e la forma del pannello del pre-flight.
 *
 * Riscriverli nel secondo posto sarebbe la premessa della divergenza: due
 * implementazioni dello stesso giudizio, libere di dire cose diverse sulla
 * stessa grafica. Qui stanno una volta sola, e i due banchi le usano.
 *
 * Nessuna di queste funzioni decide **se** si può esportare: quella è una
 * domanda del pre-flight, e resta in `motori/preflight-tour.js`.
 */

/**
 * Le segnalazioni di un **solo** ambito del registro.
 *
 * Due copie dello stesso template — l'anteprima ridotta e quella fuori schermo
 * che viene fotografata — vivono sotto lo stesso fornitore e scrivono nello
 * stesso registro. Senza `AmbitoProblemi` si sovrascriverebbero a vicenda; con
 * gli ambiti le chiavi sono distinte, e qui si legge quella che riguarda la
 * copia di cui si sta decidendo.
 *
 * `null` in ingresso resta `null`: un registro che non è stato letto non è un
 * registro vuoto, ed è il pre-flight a doverlo sapere.
 */
export function soloAmbito(problemi, ambito) {
  if (!Array.isArray(problemi)) return null;
  const prefisso = `${ambito}/`;
  return problemi.filter((p) => String(p?.chiave ?? "").startsWith(prefisso));
}

/**
 * Che cosa è successo davvero caricando una sorgente.
 *
 * È l'evidenza che nessun dato della bozza può sostituire: un `idBlob` dimostra
 * che qualcuno ha scelto una fotografia, non che il file esista o si carichi.
 * Finché non si sa, lo stato è `in-corso` — mai `caricata` per omissione — e il
 * pre-flight non autorizza.
 *
 * L'esito si porta dietro la **propria sorgente**, così una risposta tardiva di
 * un indirizzo superato non può essere scambiata per la misura di quello
 * corrente: chi legge cerca per sorgente, e il pre-flight rifiuta comunque
 * un'evidenza che non parli di quella disegnata adesso.
 *
 * @param {Array<string|null|undefined>} sorgenti
 * @returns {Record<string, {sorgente: string, stato: string, larghezza?: number, altezza?: number}>}
 */
export function useEsitiSorgenti(sorgenti) {
  const chiave = sorgenti.filter(Boolean).join("\u0000");
  const [esiti, setEsiti] = useState({});

  useEffect(() => {
    if (!chiave) return undefined;
    let vivo = true;
    for (const sorgente of chiave.split("\u0000")) {
      const img = new Image();
      const prendi = () => {
        if (!vivo || !img.naturalWidth || !img.naturalHeight) return;
        setEsiti((p) => ({
          ...p,
          [sorgente]: {
            sorgente,
            stato: "caricata",
            larghezza: img.naturalWidth,
            altezza: img.naturalHeight,
          },
        }));
      };
      img.onload = prendi;
      img.onerror = () => {
        if (vivo) setEsiti((p) => ({ ...p, [sorgente]: { sorgente, stato: "fallita" } }));
      };
      img.src = sorgente;
      // Una sorgente già in cache è `complete` subito e `onload` non scatta.
      if (img.complete) prendi();
    }
    return () => {
      vivo = false;
    };
  }, [chiave]);

  return esiti;
}

/**
 * Un registro per formato, non uno solo.
 *
 * Il conteggio delle misure in sospeso è per fornitore: con un registro
 * condiviso, una Story ancora in caricamento bloccherebbe il Post e viceversa,
 * e non si saprebbe nemmeno quale dei due sta aspettando.
 *
 * I riferimenti sono **stabili per tutta la vita del componente**: il fornitore
 * ci deposita dentro le proprie funzioni e le ritira allo smontaggio, e un
 * oggetto nuovo a ogni render li farebbe rifare a ogni giro.
 */
export function useRegistroFormati(formati) {
  const registro = useRef(null);
  if (!registro.current) {
    registro.current = Object.fromEntries(
      formati.map((f) => [f, { lettore: { current: null }, misure: { current: null } }]),
    );
  }
  return registro.current;
}

/**
 * La lettura **sincrona** del registro di un formato.
 *
 * `onProblemi` raggruppa a 80 ms e va benissimo per ridisegnare un pannello;
 * per decidere adesso se si può fotografare serve il registro com'è adesso. Se
 * il fornitore non ha depositato lettore e misure non si inventa uno zero: si
 * restituisce `null`, e il pre-flight tratta l'evidenza come assente.
 *
 * @returns {{problemi: object[]|null, misureInSospeso: number|null}}
 */
export function letturaSincrona(registro, quale, ambito) {
  const voce = registro[quale];
  const rispondono =
    typeof voce?.lettore.current === "function" && typeof voce?.misure.current === "function";
  if (!rispondono) return { problemi: null, misureInSospeso: null };
  return {
    problemi: soloAmbito(voce.lettore.current(), ambito),
    misureInSospeso: voce.misure.current(),
  };
}

/**
 * Callback **stabili** per il canale raggruppato, una per formato.
 *
 * Una fabbrica memoizzata non basta: `raccogli("post")` restituiva una funzione
 * nuova a ogni render, e con essa cambiava `segnala` dentro il fornitore. Ogni
 * effetto di segnalazione si ritirava e si riscriveva, il raggruppamento
 * notificava, il genitore aggiornava lo stato e si ricominciava — con un errore
 * persistente il banco si ridisegnava una volta al secondo, per sempre. Quel
 * che dev'essere stabile è la funzione che il fornitore riceve, non quella che
 * la costruisce.
 */
export function useRaccoglitori(formati) {
  const [problemi, setProblemi] = useState(() =>
    Object.fromEntries(formati.map((f) => [f, []])),
  );
  const riferimenti = useRef(null);
  const aggiorna = useCallback(
    (quale, elenco) => setProblemi((p) => ({ ...p, [quale]: elenco })),
    [],
  );
  if (!riferimenti.current) {
    riferimenti.current = Object.fromEntries(
      formati.map((f) => [f, (elenco) => aggiorna(f, elenco)]),
    );
  }
  return { problemi, raccoglitori: riferimenti.current };
}

/**
 * Il rapporto del pre-flight, per formato.
 *
 * **La riga porta il formato.** I due registri sono separati e le chiavi
 * nascono uguali — la fotografia del Post è `foto` e quella della Story è
 * `foto` — quindi concatenare i due elenchi e usare la chiave come key di React
 * significava due righe diverse con la stessa identità: React protestava, e la
 * lista poteva riusare la riga sbagliata quando l'elenco cambiava. Il registro
 * condiviso resta com'è; l'identità del formato si aggiunge **qui**, dove la
 * lista si costruisce.
 */
export function PannelloPreflight({ rapporto }) {
  const righe = rapporto.flatMap(({ quale, esito }) =>
    esito.esiti
      .filter((e) => e.livello !== "ok")
      // Lo spread sta **prima**: la chiave composta deve vincere su `e.id`.
      .map((e) => ({ ...e, quale, chiave: `${quale}/${e.id}` })),
  );
  const passati = rapporto.reduce(
    (n, { esito }) => n + esito.esiti.filter((e) => e.livello === "ok").length,
    0,
  );

  return (
    <div className="mt-5 font-body text-xs text-granite-mist/70" data-pannello="preflight-tour">
      {righe.length === 0 ? (
        <p>Pre-flight TOUR: {passati} controlli passati, nessun problema.</p>
      ) : (
        <ul className="space-y-1">
          {righe.map((r) => (
            <li key={r.chiave} data-riga={r.chiave}>
              <span className="text-[var(--accent)]">{r.livello}</span> ·{" "}
              <span className="uppercase tracking-[0.12em]">{r.quale}</span> · {r.messaggio}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
