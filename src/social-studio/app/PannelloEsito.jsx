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
 * @param {() => void} props.onRiprova          rami `errore` e `incompleto`
 * @param {() => void} props.onEsportaComunque  ramo `soloAvvisi`, e solo quello
 * @param {() => void} props.onChiudi
 */
export default function PannelloEsito({ daConfermare, onRiprova, onEsportaComunque, onChiudi }) {
  if (!daConfermare) return null;

  const bordo = daConfermare.esito === "errore" ? "#E2857A" : COLORI.accentoEventi;

  return (
    <section className="border p-4" style={{ borderColor: bordo }}>
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
              <li key={a.id} className="font-body text-[11px] text-granite-mist/60">· {a.messaggio}</li>
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
              <li key={e.id} className="font-body text-[11px] text-granite-mist/65">· {e.messaggio}</li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
