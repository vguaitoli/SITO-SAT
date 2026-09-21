import React, { useState } from "react";
import { PenLine } from "lucide-react";
import { useSiteContent } from "../../content/TinaContentProvider";
import { creaArchivioMemoria } from "../fondamenta/archivio";
import { FornitoreArchivio } from "./ContestoArchivio";
import { FornitoreTransizione } from "./transizione";
import EditorTour from "./EditorTour";

/**
 * Il guscio diagnostico dell'editor TOUR.
 *
 * Esiste per una ragione sola: dare a `EditorTour` un posto dove girare che
 * **non sia** quello dello Studio. Ci si arriva soltanto premendo un pulsante
 * nel banco di prova, e quel che ci si fa dentro non tocca niente di reale.
 *
 * ## Perché fornitori propri, e non quelli dello Studio
 *
 * **L'archivio è in memoria, e dura quanto la scheda.** Il fornitore dello
 * Studio serve l'archivio locale su IndexedDB, dov'è il lavoro vero: una bozza
 * di prova finirebbe lì in mezzo, e cancellarla sarebbe un gesto che nessuno
 * dovrebbe dover fare.
 *
 * La durata è **della scheda, non del guscio**, ed è cambiata in 6.3L.2 per una
 * ragione precisa. Quando si lascia la pagina con lavoro non salvato la
 * sentinella offre «Salva e continua»; se l'archivio morisse insieme al
 * componente, quel salvataggio scriverebbe in un registro che sta per essere
 * distrutto — cioè prometterebbe di aver messo al sicuro qualcosa che un
 * istante dopo non esiste più. Tenendolo a livello di modulo, chiudere e
 * riaprire il banco, o uscire e tornare su `/admin/social`, ritrova le bozze di
 * prova dov'erano. Ricaricare la pagina o chiudere la scheda le cancella, ed è
 * detto nell'interfaccia invece che lasciato intendere.
 *
 * **Le transizioni hanno un fornitore proprio.** Quello delle transizioni tiene
 * **una guardia sola** (§18.6): `EditorEvento` ne registra una e `useBozzaTour`
 * un'altra, e sotto lo stesso fornitore la seconda registrazione cancellerebbe
 * la prima — cioè il lavoro non salvato di EVENTI smetterebbe di essere
 * protetto per il solo fatto di aver aperto questo banco. Finché quel limite
 * non è risolto i due mondi restano separati, ed è una separazione dichiarata,
 * non un effetto collaterale.
 *
 * Nessuna registrazione, nessun editor nel registro: TOUR resta `pianificata` e
 * lo Studio non la apre.
 */
/**
 * L'archivio diagnostico: uno per scheda, creato alla prima apertura.
 *
 * Sta a livello di modulo e non in un `useRef` perché deve sopravvivere allo
 * smontaggio del banco: vedi sopra. `archivioDiagnostico()` lo crea pigramente,
 * così chi non apre mai il banco non paga niente.
 */
let archivioDelBanco = null;
function archivioDiagnostico() {
  if (!archivioDelBanco) archivioDelBanco = creaArchivioMemoria();
  return archivioDelBanco;
}

/** Ricomincia da un archivio vuoto. Serve alle prove, non all'applicazione. */
export function dimenticaArchivioDiagnostico() {
  archivioDelBanco = null;
}

export default function BancoTour({ tours = [], onChiudi }) {
  const archivio = archivioDiagnostico();

  return (
    <FornitoreArchivio archivio={archivio}>
      <FornitoreTransizione>
        <div className="space-y-3">
          <p className="font-body text-[11px] leading-snug text-granite-mist/40">
            Archivio <strong>in memoria</strong>, separato da quello dello Studio: le bozze create
            qui non finiscono fra le tue. Il salvataggio è <strong>diagnostico</strong> e dura
            quanto questa scheda del browser: chiudendo il banco o uscendo dallo Studio le ritrovi,
            ricaricando la pagina o chiudendo la scheda spariscono.
          </p>
          <EditorTour
            tours={tours}
            urlBase={typeof window === "undefined" ? "" : window.location.origin}
            onChiudi={onChiudi}
          />
        </div>
      </FornitoreTransizione>
    </FornitoreArchivio>
  );
}

/**
 * L'accesso esplicito, da montare nel banco di prova.
 *
 * **La fonte è il sito, non una copia.** I tour arrivano da `useSiteContent`,
 * lo stesso contesto che alimenta le pagine pubbliche: lo Studio vive dentro
 * `TinaContentProvider`, quindi qui il catalogo è quello vero, normalizzato e
 * localizzato come lo vede chi naviga. Tenerne una copia dentro Social Studio
 * significherebbe avere due cataloghi liberi di divergere.
 *
 * Aprire è un gesto; **chiudere no**, e non da qui. Il pulsante di chiusura sta
 * dentro `EditorTour`, dove passa dal sistema di transizioni: se lo smontaggio
 * lo comandasse questo componente, il lavoro non salvato se ne andrebbe senza
 * che nessuno lo chieda — che è esattamente ciò contro cui la protezione esiste.
 */
export function AccessoEditorTour() {
  const [aperto, setAperto] = useState(false);
  const tours = useSiteContent()?.tours || [];

  if (aperto) return <BancoTour tours={tours} onChiudi={() => setAperto(false)} />;

  return (
    <div className="border border-[var(--border-on-dark)] p-5">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="font-button text-xs uppercase tracking-[0.2em] text-[var(--accent-soft)]">
          Editor TOUR · nucleo diagnostico
        </h2>
        <span className="font-button text-[10px] uppercase tracking-[0.2em] text-[var(--accent)]">
          Archivio isolato — non è lo Studio
        </span>
      </div>
      <p className="mb-4 font-body text-xs leading-relaxed text-granite-mist/60">
        Apre il primo nucleo dell&apos;editor TOUR su un archivio in memoria: fonte del sito, creazione
        della bozza, campi editoriali e salvataggio. La rubrica resta pianificata e non
        selezionabile.
      </p>
      <button
        type="button"
        onClick={() => setAperto(true)}
        className="btn-mech inline-flex items-center gap-2 border border-[var(--border-on-dark)] px-3 py-2 font-button text-[10px] uppercase tracking-[0.16em]"
      >
        <PenLine size={13} aria-hidden="true" />
        Apri l&apos;editor TOUR
      </button>
    </div>
  );
}
