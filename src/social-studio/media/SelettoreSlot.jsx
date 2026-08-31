import React from "react";
import { SLOT_MEDIA, slotPieno } from "./slot";

/**
 * I pulsanti degli slot fotografici, con il segno di quelli già pieni.
 *
 * Sta in un componente suo perché è la parte dell'editor che mentiva: i tre
 * slot della Story mostravano il pallino spento anche subito dopo aver
 * assegnato una fotografia, e l'unico modo di accorgersene era guardare
 * l'interfaccia. Isolato, lo si può montare in un test e leggere davvero.
 *
 * `data-slot` e `data-piena` non sono decorazione: sono il modo in cui il test
 * interroga l'indicatore senza dipendere dalle classi di stile.
 */
export default function SelettoreSlot({ media, attivo, onSceglie }) {
  return (
    <div className="mb-3 flex flex-wrap gap-1.5">
      {SLOT_MEDIA.map((s) => {
        const piena = slotPieno(media, s.id);
        return (
          <button
            key={s.id}
            type="button"
            data-slot={s.id}
            data-piena={piena ? "si" : "no"}
            onClick={() => onSceglie(s.id)}
            className={`border px-2 py-1 font-button text-[9px] uppercase tracking-[0.14em] transition-colors ${
              attivo === s.id
                ? "border-[var(--accent)] text-[var(--accent-soft)]"
                : "border-[var(--border-on-dark)] text-granite-mist/55"
            }`}
          >
            {s.nome}
            {piena && <span className="ml-1 text-[var(--wild-sage-bright)]">•</span>}
          </button>
        );
      })}
    </div>
  );
}
