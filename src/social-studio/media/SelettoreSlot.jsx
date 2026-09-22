import React from "react";
import { slotDellaRubrica, slotDellaRubricaPieno } from "./slot";

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
 *
 * ## La rubrica è un parametro, e il difetto è lo stesso di prima
 *
 * Da 6.3M questo componente serve anche TOUR, che ha due slot invece di nove.
 * Il registro lo legge **per rubrica**, e `eventi` resta il valore predefinito
 * così nessuna chiamata esistente cambia comportamento.
 *
 * Importare `SLOT_MEDIA` e disegnare quelli per chiunque sarebbe la stessa
 * classe di difetto che `slot.js` esiste per eliminare: TOUR mostrerebbe «Vivrai
 * 1…4» e le tre schermate Story di EVENTI, e ogni clic scriverebbe in un ramo
 * che la bozza TOUR non ha. Una rubrica che il registro non dichiara non ha
 * slot e **non ne eredita**: qui si traduce in nessun pulsante, che è il modo
 * visibile di non fare danni silenziosi.
 *
 * @param {object} props
 * @param {object} props.media  il ramo `media` della bozza
 * @param {string} props.attivo  lo slot attualmente scelto
 * @param {(slot: string) => void} props.onSceglie
 * @param {string} [props.rubrica]  la rubrica di cui mostrare gli slot
 */
export default function SelettoreSlot({ media, attivo, onSceglie, rubrica = "eventi" }) {
  const slot = slotDellaRubrica(rubrica);

  return (
    <div className="mb-3 flex flex-wrap gap-1.5" data-rubrica-slot={rubrica}>
      {slot.map((s) => {
        const piena = slotDellaRubricaPieno(rubrica, media, s.id);
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
