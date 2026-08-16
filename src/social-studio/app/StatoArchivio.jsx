import React, { useState } from "react";
import { AlertTriangle, CheckCircle2, Database, Download, HardDrive, ShieldAlert } from "lucide-react";
import { chiediPersistenza, formattaByte } from "../fondamenta/persistenza";
import { useArchivio } from "./ContestoArchivio";

/**
 * Stato dell'archivio locale: persistenza, quota, spazio usato.
 *
 * Sta in vista perché IndexedDB è una libreria di lavoro, non un archivio
 * permanente: chi usa lo studio deve sapere in ogni momento quanto spazio
 * resta e se il browser sta garantendo la conservazione dei dati.
 */
export default function StatoArchivio() {
  const { archivio, disponibile, spazio, persistenza, diagnosi, aggiornaStato } = useArchivio();
  const [inCorso, setInCorso] = useState(false);
  const [esito, setEsito] = useState(null);

  if (!disponibile) {
    return (
      <Riquadro livello="errore">
        <ShieldAlert size={18} aria-hidden="true" />
        <span>Questo browser non offre IndexedDB: Social Studio non può conservare i contenuti.</span>
      </Riquadro>
    );
  }

  const percentuale = spazio?.quota ? (spazio.byte / spazio.quota) * 100 : null;

  const attivaPersistenza = async () => {
    setInCorso(true);
    const risultato = await chiediPersistenza();
    setEsito(risultato.motivo);
    await aggiornaStato();
    setInCorso(false);
  };

  const scaricaBackup = async () => {
    const pacco = await archivio.esportaBackup();
    const blob = new Blob([JSON.stringify(pacco, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `social-studio-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  };

  return (
    <section className="border border-[var(--border-on-dark)] bg-[var(--carbon)] p-5">
      <h2 className="mb-4 flex items-center gap-2 font-button text-xs uppercase tracking-[0.2em] text-[var(--accent-soft)]">
        <Database size={15} aria-hidden="true" />
        Archivio locale
      </h2>

      <dl className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Dato etichetta="Spazio usato" valore={spazio ? formattaByte(spazio.byte) : "—"} />
        <Dato
          etichetta="Quota del browser"
          valore={spazio?.quota ? formattaByte(spazio.quota) : "non dichiarata"}
        />
        <Dato
          etichetta="Persistenza"
          valore={persistenza?.persistente ? "attiva" : "non attiva"}
        />
      </dl>

      {percentuale !== null && (
        <div className="mb-4">
          <div className="h-1.5 w-full bg-[var(--obsidian)]">
            <div
              className="h-full bg-[var(--accent)]"
              style={{ width: `${Math.min(100, Math.max(1, percentuale)).toFixed(1)}%` }}
            />
          </div>
          <p className="mt-2 font-body text-xs text-granite-mist/55">
            {percentuale < 1 ? "meno dell'1%" : `${percentuale.toFixed(1)}%`} della quota disponibile
          </p>
        </div>
      )}

      {diagnosi && (
        <Riquadro livello={diagnosi.livello}>
          {diagnosi.livello === "ok" ? (
            <CheckCircle2 size={18} aria-hidden="true" />
          ) : (
            <AlertTriangle size={18} aria-hidden="true" />
          )}
          <span>{diagnosi.messaggio}</span>
        </Riquadro>
      )}

      {esito && <p className="mt-3 font-body text-xs text-granite-mist/60">{esito}</p>}

      <div className="mt-5 flex flex-wrap gap-3">
        {!persistenza?.persistente && persistenza?.supportata && (
          <button
            type="button"
            onClick={attivaPersistenza}
            disabled={inCorso}
            className="btn-mech inline-flex items-center gap-2 bg-[var(--cta)] px-4 py-2.5 text-sm text-[var(--cta-text)] transition-colors hover:bg-[var(--cta-hover)] disabled:opacity-60"
          >
            <HardDrive size={16} aria-hidden="true" />
            {inCorso ? "Richiesta in corso…" : "Attiva persistenza"}
          </button>
        )}
        <button
          type="button"
          onClick={scaricaBackup}
          className="btn-mech inline-flex items-center gap-2 border border-[var(--border-on-dark)] px-4 py-2.5 text-sm text-[var(--text-on-dark)] transition-colors hover:border-[var(--accent)]"
        >
          <Download size={16} aria-hidden="true" />
          Esporta backup
        </button>
      </div>
    </section>
  );
}

function Dato({ etichetta, valore }) {
  return (
    <div>
      <dt className="font-button text-[10px] uppercase tracking-[0.2em] text-granite-mist/50">
        {etichetta}
      </dt>
      <dd className="mt-1 font-heading text-2xl leading-none text-[var(--text-on-dark)]">{valore}</dd>
    </div>
  );
}

function Riquadro({ livello, children }) {
  const colori = {
    ok: "border-[var(--wild-sage)] text-granite-mist/80",
    avviso: "border-[var(--accent)] text-granite-mist/85",
    errore: "border-[#C0453B] text-granite-mist/90",
  };
  return (
    <p className={`flex items-start gap-3 border-l-2 py-2 pl-3 font-body text-sm ${colori[livello] || colori.avviso}`}>
      {children}
    </p>
  );
}
