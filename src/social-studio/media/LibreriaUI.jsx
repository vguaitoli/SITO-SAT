import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Image as Icona, Search, Trash2, Upload } from "lucide-react";
import { useArchivio } from "../app/ContestoArchivio";
import { cerca, dimensioniImmagine, tagVuoti, tipoAmmesso, valoriDistinti } from "./libreria";

/**
 * Media Library.
 *
 * Le immagini stanno nell'archivio come binari, i metadati a parte: qui si
 * caricano, si cercano e si assegnano. Il file originale non viene mai
 * riscritto — ritaglio, zoom e punto focale sono numeri che i template
 * applicano al momento del disegno.
 */
export default function LibreriaUI({ onSeleziona, selezionato }) {
  const { archivio, aggiornaStato } = useArchivio();
  const [voci, setVoci] = useState([]);
  const [url, setUrl] = useState({});
  const [query, setQuery] = useState("");
  const [filtroDisciplina, setFiltroDisciplina] = useState("");
  const [sopra, setSopra] = useState(false);
  const [errore, setErrore] = useState(null);
  const input = useRef(null);

  const ricarica = useCallback(async () => {
    if (!archivio) return;
    const pacco = await archivio.esportaBackup();
    const elenco = pacco.media || [];
    setVoci(elenco);
    const mappa = {};
    for (const v of elenco) {
      const u = await archivio.urlTemporaneo(v.id);
      if (u) mappa[v.id] = u;
    }
    setUrl(mappa);
  }, [archivio]);

  useEffect(() => {
    ricarica();
  }, [ricarica]);

  const carica = async (files) => {
    setErrore(null);
    const scartati = [];
    for (const file of files) {
      if (!tipoAmmesso(file)) {
        scartati.push(file.name);
        continue;
      }
      let dim = { larghezza: 0, altezza: 0 };
      try {
        dim = await dimensioniImmagine(file);
      } catch {
        // Dimensioni non leggibili: si carica comunque, il pre-flight avviserà.
      }
      await archivio.salvaBlob("immagine", file, {
        nome: file.name,
        tipoMime: file.type,
        larghezza: dim.larghezza,
        altezza: dim.altezza,
        tag: tagVuoti(),
      });
    }
    if (scartati.length) setErrore(`Non caricati (formato non ammesso): ${scartati.join(", ")}`);
    await ricarica();
    await aggiornaStato();
  };

  const elimina = async (id) => {
    await archivio.eliminaBlob(id);
    if (selezionato === id) onSeleziona?.(null);
    await ricarica();
    await aggiornaStato();
  };

  const discipline = useMemo(() => valoriDistinti(voci, "disciplina"), [voci]);
  const risultati = useMemo(
    () => cerca(voci, query, filtroDisciplina ? { disciplina: filtroDisciplina } : {}),
    [voci, query, filtroDisciplina],
  );

  return (
    <section className="border border-[var(--border-on-dark)] p-4">
      <h3 className="mb-3 flex items-center gap-2 font-button text-[10px] uppercase tracking-[0.22em] text-[var(--accent-soft)]">
        <Icona size={13} aria-hidden="true" />
        Media Library · {voci.length}
      </h3>

      {/* Area di caricamento con trascinamento. */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setSopra(true);
        }}
        onDragLeave={() => setSopra(false)}
        onDrop={(e) => {
          e.preventDefault();
          setSopra(false);
          carica([...e.dataTransfer.files]);
        }}
        onClick={() => input.current?.click()}
        className={`mb-3 cursor-pointer border border-dashed p-4 text-center transition-colors ${
          sopra ? "border-[var(--accent)] bg-[var(--carbon)]" : "border-[var(--border-on-dark)]"
        }`}
      >
        <Upload size={18} aria-hidden="true" className="mx-auto mb-2 text-granite-mist/45" />
        <p className="font-body text-xs text-granite-mist/60">
          Trascina qui le fotografie, o fai clic per scegliere
        </p>
        <p className="mt-1 font-body text-[10px] text-granite-mist/35">JPG · PNG · WEBP</p>
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
          multiple
          className="hidden"
          onChange={(e) => carica([...e.target.files])}
        />
      </div>

      {errore && <p className="mb-3 font-body text-xs" style={{ color: "#E2857A" }}>{errore}</p>}

      {voci.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <label className="flex flex-1 items-center gap-2 border border-[var(--border-on-dark)] px-2 py-1.5">
            <Search size={13} aria-hidden="true" className="text-granite-mist/40" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buddusò Maxienduro 2026"
              className="w-full bg-transparent font-body text-xs text-[var(--text-on-dark)] outline-none placeholder:text-granite-mist/30"
            />
          </label>
          {discipline.length > 0 && (
            <select
              value={filtroDisciplina}
              onChange={(e) => setFiltroDisciplina(e.target.value)}
              className="border border-[var(--border-on-dark)] bg-[var(--obsidian)] px-2 py-1.5 font-body text-xs text-[var(--text-on-dark)]"
            >
              <option value="">tutte le discipline</option>
              {discipline.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          )}
        </div>
      )}

      {!voci.length ? (
        <p className="font-body text-xs text-granite-mist/45">
          Nessuna fotografia. Le immagini restano nel tuo browser: non vengono caricate su alcun server.
        </p>
      ) : (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {risultati.map((v) => {
            const attiva = selezionato === v.id;
            return (
              <li key={v.id} className="relative">
                <button
                  type="button"
                  onClick={() => onSeleziona?.(attiva ? null : v.id)}
                  className={`block w-full overflow-hidden border transition-colors ${
                    attiva ? "border-[var(--accent)]" : "border-[var(--border-on-dark)] hover:border-granite-mist/40"
                  }`}
                  style={{ aspectRatio: "1" }}
                  title={`${v.nome} · ${v.larghezza || "?"}×${v.altezza || "?"}`}
                >
                  {url[v.id] ? (
                    <img src={url[v.id]} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="block h-full w-full bg-[var(--carbon)]" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => elimina(v.id)}
                  title="Rimuovi dalla libreria"
                  className="absolute right-1 top-1 bg-obsidian/80 p-1 text-granite-mist/60 transition-colors hover:text-[#E2857A]"
                >
                  <Trash2 size={11} aria-hidden="true" />
                </button>
                {v.larghezza > 0 && v.larghezza < 1080 && (
                  <span className="absolute bottom-1 left-1 bg-obsidian/85 px-1 font-button text-[8px] uppercase tracking-[0.14em] text-[#E2857A]">
                    {v.larghezza}px
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
