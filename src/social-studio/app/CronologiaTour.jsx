import React from "react";
import { History } from "lucide-react";

/**
 * La cronologia della bozza, e il ritorno a una revisione.
 *
 * L'elenco arriva da `revisioni()` già dalla più recente: qui non si riordina e
 * non si ricalcola niente. Ogni voce dice se è **ripristinabile**, e non è una
 * decorazione: il punto di creazione esiste nella storia ma non porta con sé
 * uno stato, quindi non c'è dove tornare. Offrire il pulsante lo farebbe
 * scoprire soltanto dopo il clic — e, senza il controllo che l'hook fa prima
 * del dialogo, dopo aver chiesto se salvare o scartare per un gesto che non
 * poteva riuscire.
 *
 * Il ripristino **passa dalle transizioni**: sostituisce il lavoro in corso
 * esattamente come aprire un'altra bozza, e la stessa protezione vale. Non è
 * questo componente a deciderlo: chiama `onRipristina`, che è `ripristina`
 * dell'hook, e quello fa il resto.
 *
 * Un gesto, **una** revisione: la voce «stato prima del ripristino» la registra
 * il motore delle versioni, e il salvataggio che segue sa di non doverne
 * aggiungere un'altra.
 */

/** La data di una revisione, se c'è. Una data inventata sarebbe peggio di «—». */
function quando(v) {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("it-IT");
}

/**
 * @param {object} props
 * @param {Array<{n: number, quando?: string, etichetta?: string, ripristinabile: boolean}>} props.revisioni
 * @param {(n: number) => void} props.onRipristina
 * @param {boolean} [props.disabilitato]
 */
export default function CronologiaTour({ revisioni, onRipristina, disabilitato = false }) {
  return (
    <section className="border border-[var(--border-on-dark)] p-4" data-parte="cronologia">
      <h4 className="mb-3 inline-flex items-center gap-1.5 font-button text-[10px] uppercase tracking-[0.22em] text-[var(--accent-soft)]">
        <History size={12} aria-hidden="true" />
        Cronologia ({revisioni.length})
      </h4>

      {revisioni.length === 0 ? (
        <p className="font-body text-xs text-granite-mist/45">
          Nessuna revisione: la cronologia nasce con il primo salvataggio.
        </p>
      ) : (
        <ul className="space-y-1" data-elenco="revisioni">
          {revisioni.map((r) => (
            <li
              key={r.n}
              data-revisione={r.n}
              data-ripristinabile={r.ripristinabile ? "si" : "no"}
              className="flex flex-wrap items-baseline gap-2 font-body text-xs text-granite-mist/70"
            >
              <span className="font-button text-[10px] uppercase tracking-[0.16em] text-granite-mist/40">
                v{r.n}
              </span>
              <span className="flex-1">{r.etichetta || "—"}</span>
              <span className="text-granite-mist/35">{quando(r.quando)}</span>
              {r.ripristinabile ? (
                <button
                  type="button"
                  onClick={() => onRipristina(r.n)}
                  disabled={disabilitato}
                  className="btn-mech border border-[var(--border-on-dark)] px-2 py-1 font-button text-[10px] uppercase tracking-[0.16em] disabled:opacity-40"
                >
                  Ripristina v{r.n}
                </button>
              ) : (
                <span className="font-button text-[10px] uppercase tracking-[0.16em] text-granite-mist/30">
                  non ripristinabile
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
