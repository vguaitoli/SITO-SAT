import React from "react";
import { AlertTriangle } from "lucide-react";

/**
 * Una conferma in due tempi, **dentro** l'interfaccia.
 *
 * Serve a un gesto solo per ora — eliminare una bozza — e sta in un componente
 * suo perché la forma della conferma è una decisione, non un dettaglio del
 * punto in cui viene usata.
 *
 * ## Perché non `window.confirm`
 *
 * Perché non si può leggere, non si può provare e non dice **che cosa** si sta
 * per cancellare se non in una riga di testo di sistema. Un pannello nella
 * pagina nomina la bozza, resta sotto gli occhi mentre si decide, e una prova
 * può verificare che il primo gesto non abbia cancellato niente.
 *
 * ## Niente timer, e nessun automatismo
 *
 * Il pannello non si chiude da solo, non parte niente allo scadere di un
 * conto alla rovescia e non c'è nessun gesto che diventi distruttivo per il
 * solo passare del tempo. Ci sono due strade — annullare o confermare — e le
 * prende chi guarda.
 *
 * @param {object} props
 * @param {string} props.domanda  che cosa si sta per fare, nominando l'oggetto
 * @param {string} [props.nota]  la conseguenza, detta prima e non dopo
 * @param {string} props.etichettaConferma
 * @param {() => void} props.onConferma
 * @param {() => void} props.onAnnulla
 * @param {boolean} [props.disabilitato]
 */
export default function ConfermaDueTempi({
  domanda,
  nota,
  etichettaConferma,
  onConferma,
  onAnnulla,
  disabilitato = false,
}) {
  return (
    <div
      role="group"
      aria-label="Conferma"
      data-conferma="due-tempi"
      className="my-2 border-l-2 border-[#C0453B] bg-obsidian/30 py-2 pl-3"
    >
      <p className="inline-flex items-start gap-1.5 font-body text-xs text-granite-mist/85">
        <AlertTriangle size={13} aria-hidden="true" className="mt-0.5 shrink-0 text-[#E2857A]" />
        <span>{domanda}</span>
      </p>
      {nota && <p className="mt-1 font-body text-[11px] leading-snug text-granite-mist/50">{nota}</p>}
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          data-azione="annulla-conferma"
          onClick={onAnnulla}
          className="btn-mech border border-[var(--border-on-dark)] px-3 py-1.5 font-button text-[10px] uppercase tracking-[0.16em] text-granite-mist/80"
        >
          Annulla
        </button>
        <button
          type="button"
          data-azione="conferma"
          onClick={onConferma}
          disabled={disabilitato}
          className="btn-mech border border-[#C0453B] px-3 py-1.5 font-button text-[10px] uppercase tracking-[0.16em] text-[#E2857A] disabled:opacity-40"
        >
          {etichettaConferma}
        </button>
      </div>
    </div>
  );
}
