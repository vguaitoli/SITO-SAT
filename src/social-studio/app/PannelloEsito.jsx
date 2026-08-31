import React from "react";
import { AlertTriangle, RefreshCw, X, XOctagon } from "lucide-react";
import { COLORI } from "../design/tokens";

/**
 * Il pannello che riporta l'esito di un'esportazione.
 *
 * Sta in un componente proprio perché ha quattro rami e nessuno li verificava.
 * Uno di quei rami mancava del tutto: un errore di cattura non ha un campo
 * `controllo`, e cadendo nel ramo del pre-flight l'interfaccia leggeva
 * `controllo.errori.length` su `undefined` — un errore React proprio nel
 * momento in cui doveva mostrare un errore.
 *
 * **Riprovare e superare gli avvisi sono due gesti diversi**, e hanno due
 * callback diverse. Con una sola, «Riprova» dopo un guasto ripartiva con gli
 * avvisi già ignorati: se nel frattempo il pre-flight ne aveva trovati di
 * nuovi, li saltava senza che nessuno li avesse accettati. Un pulsante che dice
 * «Riprova» non può autorizzare in silenzio ciò che «Esporta comunque»
 * autorizza esplicitamente.
 *
 * @param {object} props
 * @param {object|null} props.daConfermare
 * @param {() => void} props.onRiprova          rami `errore`, `incompleto` e `nonPronto`
 * @param {() => void} props.onEsportaComunque  ramo `soloAvvisi`, e solo quello
 * @param {() => void} props.onChiudi
 */
/*
 * Le chiavi delle liste uniscono id e messaggio, non il solo id.
 *
 * Il pacchetto esegue il pre-flight una volta per formato e ne somma gli esiti:
 * senza GPX arrivano due voci con lo stesso id `gpx` e messaggi diversi — una
 * per il carosello, una per la Story. `deduplica` le tiene entrambe, ed è
 * giusto così, perché dicono due cose diverse. A rendere però React trovava
 * due figli con la stessa chiave e lo diceva in console; con chiavi duplicate
 * può anche omettere o duplicare elementi, cioè nascondere un errore proprio
 * nel pannello che deve mostrarli.
 */
export default function PannelloEsito({ daConfermare, onRiprova, onEsportaComunque, onChiudi }) {
  if (!daConfermare) return null;

  const bordo = daConfermare.esito === "errore" ? "#E2857A" : COLORI.accentoEventi;

  return (
    // `data-esito` è il modo in cui i test distinguono ciò che dice **questo**
    // pannello da ciò che dice il pannello sempre acceso del pre-flight: sono
    // due cose diverse, e confonderle rende un test cieco.
    <section data-esito={daConfermare.soloAvvisi ? "avvisi" : daConfermare.esito} className="border p-4" style={{ borderColor: bordo }}>
      {/* --- guasto durante la cattura: non ha `controllo`, e non lo si tocca --- */}
      {daConfermare.esito === "errore" ? (
        <>
          <p className="mb-2 flex items-start gap-2 font-body text-xs" style={{ color: "#E2857A" }}>
            <XOctagon size={14} className="mt-0.5 flex-none" aria-hidden="true" />
            <span>
              <strong className="font-semibold">L&apos;esportazione non è riuscita.</strong>{" "}
              Non è stato prodotto nessun file.
            </span>
          </p>
          <p className="mb-3 font-body text-[11px] leading-snug text-granite-mist/70">
            {daConfermare.messaggio || "Errore non specificato."}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onRiprova}
              className="btn-mech inline-flex items-center gap-2 bg-[var(--cta)] px-4 py-2 text-xs text-[var(--cta-text)]"
            >
              <RefreshCw size={13} aria-hidden="true" />
              Riprova
            </button>
            <button
              type="button"
              onClick={onChiudi}
              className="inline-flex items-center gap-1.5 border border-[var(--border-on-dark)] px-4 py-2 font-button text-[10px] uppercase tracking-[0.14em] text-granite-mist/60"
            >
              <X size={12} aria-hidden="true" />
              Chiudi
            </button>
          </div>
        </>
      ) : daConfermare.esito === "nonPronto" ? (
        <>
          {/*
            Le grafiche non sono arrivate a uno stato dimostrabile: senza,
            il pre-flight deciderebbe su dati incompleti. Non è stato prodotto
            nessun file, ed è la scelta giusta — un PNG che non sappiamo cosa
            contenga è peggio di un PNG mancante.
          */}
          <p className="mb-2 flex items-start gap-2 font-body text-xs text-granite-mist/80">
            <AlertTriangle size={14} className="mt-0.5 flex-none" style={{ color: COLORI.accentoEventi }} aria-hidden="true" />
            <span>
              <strong className="font-semibold">Le grafiche non erano pronte in tempo.</strong>{" "}
              {daConfermare.messaggio
                || "Il pre-flight non avrebbe visto tutto, quindi non è stato prodotto nessun file."}
            </span>
          </p>
          <ul className="mb-3 space-y-1 font-body text-[11px] leading-snug text-granite-mist/65">
            {daConfermare.mancanti?.length > 0 && (
              <li>· Grafiche non ancora montate: {daConfermare.mancanti.join(", ")}.</li>
            )}
            {daConfermare.misureInSospeso > 0 && (
              <li>
                · {daConfermare.misureInSospeso} misure di testo non ancora eseguite: probabilmente i
                caratteri non erano ancora caricati.
              </li>
            )}
            {daConfermare.registroInMovimento && (
              <li>· Le segnalazioni stavano ancora cambiando dopo {daConfermare.frame} frame.</li>
            )}
            {/*
              Nessun motivo da elencare perché il controllo non ne ha dati: ha
              risposto con qualcosa che non è un esito. Si dice così invece di
              lasciare un elenco vuoto, che sembrerebbe «non è mancato niente».
            */}
            {daConfermare.malformato && (
              <li>
                · Il controllo di prontezza ha restituito {daConfermare.malformato} invece di un
                esito. È un difetto del programma, non della scheda: segnalalo.
              </li>
            )}
          </ul>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onRiprova}
              className="btn-mech inline-flex items-center gap-2 bg-[var(--cta)] px-4 py-2 text-xs text-[var(--cta-text)]"
            >
              <RefreshCw size={13} aria-hidden="true" />
              Riprova
            </button>
            <button
              type="button"
              onClick={onChiudi}
              className="border border-[var(--border-on-dark)] px-4 py-2 font-button text-[10px] uppercase tracking-[0.14em] text-granite-mist/60"
            >
              Chiudi
            </button>
          </div>
        </>
      ) : daConfermare.esito === "incompleto" ? (
        <>
          <p className="mb-3 font-body text-xs text-granite-mist/75">
            Alcune grafiche non erano pronte ({(daConfermare.mancanti || []).join(", ")}): riprova.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onRiprova}
              className="btn-mech bg-[var(--cta)] px-4 py-2 text-xs text-[var(--cta-text)]"
            >
              Riprova
            </button>
            <button
              type="button"
              onClick={onChiudi}
              className="border border-[var(--border-on-dark)] px-4 py-2 font-button text-[10px] uppercase tracking-[0.14em] text-granite-mist/60"
            >
              Chiudi
            </button>
          </div>
        </>
      ) : daConfermare.soloAvvisi ? (
        <>
          <p className="mb-2 flex items-start gap-2 font-body text-xs text-granite-mist/80">
            <AlertTriangle size={14} className="mt-0.5 flex-none" style={{ color: COLORI.accentoEventi }} aria-hidden="true" />
            <span>
              Il pre-flight segnala {daConfermare.controllo.avvisi.length} avvisi. Non bloccano
              l&apos;esportazione, ma vanno superati consapevolmente.
            </span>
          </p>
          <ul className="mb-3 space-y-1">
            {daConfermare.controllo.avvisi.map((a) => (
              <li key={`${a.id}-${a.messaggio}`} className="font-body text-[11px] text-granite-mist/60">· {a.messaggio}</li>
            ))}
          </ul>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onEsportaComunque}
              className="btn-mech bg-[var(--cta)] px-4 py-2 text-xs text-[var(--cta-text)]"
            >
              Esporta comunque
            </button>
            <button
              type="button"
              onClick={onChiudi}
              className="border border-[var(--border-on-dark)] px-4 py-2 font-button text-[10px] uppercase tracking-[0.14em] text-granite-mist/60"
            >
              Torna a correggere
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="mb-2 font-body text-xs" style={{ color: "#E2857A" }}>
            Esportazione bloccata: {(daConfermare.controllo?.errori || []).length} errori.
          </p>
          <ul className="space-y-1">
            {(daConfermare.controllo?.errori || []).map((e) => (
              <li key={`${e.id}-${e.messaggio}`} className="font-body text-[11px] text-granite-mist/65">· {e.messaggio}</li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
