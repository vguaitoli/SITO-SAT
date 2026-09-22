import React, { useRef } from "react";
import { RefreshCw, Trash2, Upload } from "lucide-react";
import { CODICI } from "./useBozzaTour";

/**
 * La traccia GPX della bozza TOUR, letta e non reinventata.
 *
 * Qui non si analizza niente. L'analisi, la scrittura del binario, la
 * generazione del riferimento e la difesa contro le risposte tardive stanno
 * dentro `useBozzaTour`; questo pannello **traduce** i suoi codici e mostra le
 * tre cose che vanno tenute distinte, perché confonderle è il modo di
 * raccontare una cosa per un'altra:
 *
 * 1. il **riferimento persistibile** `{ nome, byte }`, l'unica parte che entra
 *    nel record, nelle revisioni e nei backup;
 * 2. la **geometria in memoria** — segmenti, punti, metriche — che non è mai
 *    stata nel contenuto e non ci va: una traccia di poche migliaia di punti
 *    pesa più di tutta la bozza, e verrebbe duplicata a ogni revisione;
 * 3. lo **stato della ricostruzione**, che è un fatto sul file e non sulla
 *    bozza: il riferimento può esserci e il binario no.
 *
 * ## Quello che non succede qui
 *
 * **Un riferimento senza binario non si cancella da solo.** `gpx-blob-assente`
 * lascia il riferimento dov'è — è l'unica traccia di che cosa ricaricare — e
 * offre «Riprova», che rilegge senza passare da una riapertura della bozza.
 *
 * **I waypoint non diventano fatti.** In EVENTI la prima versione del
 * caricamento copiava i primi dieci waypoint dentro `mappa.localita`: nomi
 * presi da un file diventavano dati della scheda senza che nessuno li avesse
 * scritti. Qui la geometria si guarda e basta.
 *
 * **«Conserva GPX» è un'intenzione, non una cancellazione.** Scrive un valore
 * su cui deciderà il capitolo dell'export: togliere la spunta non rimuove
 * niente adesso.
 *
 * **Il file resta locale.** Non entra nel repository, in `public/`, nel bundle
 * né in nessun export di questo capitolo.
 */

/** I codici del ciclo GPX, tradotti. Nessuno di questi è un successo generico. */
export const MESSAGGI_GPX = Object.freeze({
  [CODICI.gpxCaricato]: "Traccia caricata e analizzata. Non è ancora sul disco: salva la bozza.",
  [CODICI.gpxRicostruito]: "Traccia ricostruita dal file nell'archivio.",
  [CODICI.gpxRimosso]: "Riferimento rimosso dalla bozza. Il file resta nell'archivio.",
  [CODICI.gpxCaricamentoAnnullato]:
    "Caricamento annullato prima che arrivasse nella bozza: non c'era nessun riferimento da togliere.",
  [CODICI.nessunGpx]: "Nessun GPX in questa bozza.",
  [CODICI.fileGpxNonValido]: "Il file non è leggibile come file.",
  [CODICI.gpxIllegibile]: "XML malformato, oppure un XML che non è un GPX.",
  [CODICI.gpxSenzaTraccia]: "GPX legittimo ma senza un solo segmento utilizzabile: non c'è geometria.",
  [CODICI.gpxBlobAssente]:
    "Il riferimento c'è, il file nell'archivio no. Il riferimento resta: reimporta il backup con i GPX e riprova.",
  [CODICI.erroreArchivioGpx]: "L'archivio non ha risposto sul file. Riprova.",
  [CODICI.gpxOccupato]: "Un'altra operazione sul GPX è in corso: aspetta che finisca.",
  [CODICI.gpxSuperato]:
    "La risposta riguardava una traccia che non è più questa: non è stata applicata.",
  [CODICI.conservaGpxAggiornata]: "Scelta registrata. Non è ancora sul disco: salva la bozza.",
  [CODICI.conservaGpxNonValida]: "Valore non ammesso per «conserva GPX»: niente è cambiato.",
  [CODICI.nessunaBozza]: "Nessuna bozza aperta.",
});

const numero = (v) => (typeof v === "number" && Number.isFinite(v) ? v.toLocaleString("it-IT") : "—");
const quota = (v) => (typeof v === "number" && Number.isFinite(v) ? `${Math.round(v)}` : "—");

/**
 * @param {object} props
 * @param {object} props.contenuto  la bozza aperta
 * @param {object|null} props.traccia  la geometria in memoria, da `tracciaGpx`
 * @param {{codice: string}|null} props.esito  l'esito del ciclo GPX
 * @param {(file: Blob) => Promise<object>} props.onCarica
 * @param {() => Promise<object>} props.onRicarica
 * @param {() => object} props.onRimuovi
 * @param {(valore: boolean) => object} props.onConserva
 * @param {boolean} [props.disabilitato]  una scrittura della bozza è in volo
 * @param {boolean} [props.occupato]  un'operazione GPX è già in volo
 */
export default function GpxTour({
  contenuto,
  traccia,
  esito,
  onCarica,
  onRicarica,
  onRimuovi,
  onConserva,
  disabilitato = false,
  occupato = false,
}) {
  const input = useRef(null);
  const rif = contenuto.mappa?.gpx || null;
  const conserva = contenuto.mappa?.conservaGpx;
  const codice = esito?.codice || null;
  const m = traccia?.metriche || null;
  /*
   * **Togliere non si disabilita quando una lettura è in volo**, e non è una
   * svista: il contratto dice che chi toglie vince. Il caricamento partito
   * prima viene invalidato e il suo risultato diventa innocuo; disabilitare il
   * pulsante lascerebbe invece arrivare quel risultato su una bozza da cui si
   * stava cercando di togliere il file, che è esattamente il difetto contro cui
   * quella difesa esiste. Quel che si blocca è **partire di nuovo**: un secondo
   * caricamento mentre il primo è in volo.
   */
  const nuovaOperazione = disabilitato || occupato;

  return (
    <section className="border border-[var(--border-on-dark)] p-4" data-parte="gpx">
      <h4 className="mb-3 font-button text-[10px] uppercase tracking-[0.22em] text-[var(--accent-soft)]">
        Traccia GPX · locale e privata
      </h4>
      <p className="mb-3 font-body text-[11px] leading-snug text-granite-mist/40">
        Il file resta nell&apos;archivio del browser. Non entra nel repository, non viene pubblicato
        e non compare in nessun export di questo capitolo. I prototipi Post e Story non disegnano
        né mappa né profilo altimetrico: qui i dati si collegano, non si disegnano.
      </p>

      <div className="mb-3 flex flex-wrap gap-2">
        <label
          className={`btn-mech inline-flex cursor-pointer items-center gap-1.5 border border-[var(--border-on-dark)] px-3 py-2 font-button text-[10px] uppercase tracking-[0.16em] ${
            nuovaOperazione ? "pointer-events-none opacity-40" : ""
          }`}
        >
          <Upload size={12} aria-hidden="true" />
          {rif ? "Sostituisci il file .gpx" : "Carica un file .gpx"}
          <input
            ref={input}
            type="file"
            accept=".gpx"
            aria-label="File GPX"
            disabled={nuovaOperazione}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              // Il campo si svuota: ricaricare lo stesso file dopo un errore
              // deve poter riemettere `change`.
              e.target.value = "";
              if (file) onCarica(file);
            }}
          />
        </label>

        <button
          type="button"
          data-azione="ricarica-gpx"
          onClick={onRicarica}
          disabled={nuovaOperazione || !rif}
          className="btn-mech inline-flex items-center gap-1.5 border border-[var(--border-on-dark)] px-3 py-2 font-button text-[10px] uppercase tracking-[0.16em] disabled:opacity-40"
        >
          <RefreshCw size={12} aria-hidden="true" />
          Riprova la lettura
        </button>

        <button
          type="button"
          data-azione="rimuovi-gpx"
          onClick={() => onRimuovi()}
          disabled={disabilitato}
          className="btn-mech inline-flex items-center gap-1.5 border border-[var(--border-on-dark)] px-3 py-2 font-button text-[10px] uppercase tracking-[0.16em] disabled:opacity-40"
        >
          <Trash2 size={12} aria-hidden="true" />
          Togli il GPX
        </button>
      </div>

      {codice && (
        <p className="mb-3 font-body text-xs" data-esito-gpx={codice}>
          {MESSAGGI_GPX[codice] || codice}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {/* ---- il riferimento: questo sì che si salva ---- */}
        <div data-gpx="riferimento">
          <p className="mb-1 font-button text-[9px] uppercase tracking-[0.2em] text-granite-mist/40">
            Riferimento nella bozza
          </p>
          {rif ? (
            <dl className="space-y-0.5 font-body text-[11px] text-granite-mist/70">
              <div>
                <dt className="inline text-granite-mist/40">nome: </dt>
                <dd className="inline" data-gpx-nome>{rif.nome || "—"}</dd>
              </div>
              <div>
                <dt className="inline text-granite-mist/40">byte: </dt>
                <dd className="inline" data-gpx-byte>{numero(rif.byte)}</dd>
              </div>
            </dl>
          ) : (
            <p className="font-body text-[11px] text-granite-mist/45">
              Nessun riferimento: la bozza non cita nessun file.
            </p>
          )}
        </div>

        {/* ---- la geometria: questa no, e non ci va ---- */}
        <div data-gpx="geometria">
          <p className="mb-1 font-button text-[9px] uppercase tracking-[0.2em] text-granite-mist/40">
            Geometria in memoria
          </p>
          {traccia ? (
            <dl className="grid grid-cols-2 gap-1 font-body text-[11px] text-granite-mist/70">
              <div><dt className="inline text-granite-mist/40">segmenti: </dt><dd className="inline">{traccia.segmenti.length}</dd></div>
              <div><dt className="inline text-granite-mist/40">punti: </dt><dd className="inline">{numero(m?.punti)}</dd></div>
              <div><dt className="inline text-granite-mist/40">distanza: </dt><dd className="inline">{typeof m?.distanzaKm === "number" ? `${m.distanzaKm.toFixed(1)} km` : "—"}</dd></div>
              <div><dt className="inline text-granite-mist/40">D+ / D−: </dt><dd className="inline">{quota(m?.dislivelloPositivo)} / {quota(m?.dislivelloNegativo)} m</dd></div>
              <div><dt className="inline text-granite-mist/40">quote: </dt><dd className="inline">{quota(m?.quotaMin)}–{quota(m?.quotaMax)} m</dd></div>
              <div><dt className="inline text-granite-mist/40">waypoint: </dt><dd className="inline">{traccia.waypoint?.length ?? 0}</dd></div>
            </dl>
          ) : (
            <p className="font-body text-[11px] text-granite-mist/45">
              {rif
                ? "Nessuna geometria ricostruita: il riferimento c'è, la traccia no."
                : "Nessuna geometria: non c'è nessun file da ricostruire."}
            </p>
          )}
          <p className="mt-1 font-body text-[10px] leading-snug text-granite-mist/30">
            Vive solo qui. Non entra nel contenuto, nelle revisioni né nei backup, e i waypoint non
            diventano tappe o località.
          </p>
        </div>
      </div>

      <label className="mt-3 flex items-start gap-2 font-body text-xs text-granite-mist/65">
        <input
          type="checkbox"
          aria-label="Conserva il GPX dopo l'export"
          checked={Boolean(conserva)}
          disabled={disabilitato || !contenuto}
          onChange={(e) => onConserva(e.target.checked)}
          className="mt-0.5 accent-[var(--accent)]"
        />
        <span>
          Conserva il file dopo l&apos;export.{" "}
          <span className="text-granite-mist/40">
            È un&apos;intenzione registrata nella bozza: togliere la spunta non cancella niente
            adesso.
          </span>
        </span>
      </label>
    </section>
  );
}
