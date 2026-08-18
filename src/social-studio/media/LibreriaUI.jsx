import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Image as Icona, Search, Tag, Trash2, Upload, X } from "lucide-react";
import { useArchivio } from "../app/ContestoArchivio";
import { cerca, dimensioniImmagine, SOGGETTI, tagVuoti, tipoAmmesso, valoriDistinti } from "./libreria";

/**
 * Media Library.
 *
 * Le immagini stanno nell'archivio come binari, i metadati a parte: qui si
 * caricano, si cercano, si descrivono e si assegnano. Il file originale non
 * viene mai riscritto — ritaglio, zoom e punto focale sono numeri che i
 * template applicano al momento del disegno.
 *
 * I metadati non sono un lusso. Con qualche centinaio di fotografie la ricerca
 * è l'unico modo di ritrovarne una, e la ricerca funziona su ciò che è stato
 * scritto: una foto senza tag esiste solo se ci si ricorda il nome del file.
 *
 * `onCambiata` avvisa chi ci sta sopra che la libreria si è mossa — un
 * caricamento, una rimozione, dei tag riscritti. Senza, l'editor terrebbe una
 * copia dell'elenco scattata al montaggio e le foto appena caricate
 * risulterebbero assegnate ma invisibili nell'anteprima.
 */
export default function LibreriaUI({ onSeleziona, selezionato, onCambiata }) {
  const { archivio, aggiornaStato } = useArchivio();
  const [voci, setVoci] = useState([]);
  const [url, setUrl] = useState({});
  const [query, setQuery] = useState("");
  const [filtroDisciplina, setFiltroDisciplina] = useState("");
  const [sopra, setSopra] = useState(false);
  const [errore, setErrore] = useState(null);
  const [inModifica, setInModifica] = useState(null);
  const input = useRef(null);

  const ricarica = useCallback(async () => {
    if (!archivio) return;
    // `elencaMedia`, non `esportaBackup`: leggere una griglia non deve
    // serializzare contenuti, planner e impostazioni.
    const elenco = await archivio.elencaMedia();
    setVoci(elenco);
    const mappa = {};
    for (const v of elenco) {
      const u = await archivio.urlTemporaneo(v.id);
      if (u) mappa[v.id] = u;
    }
    setUrl(mappa);
    onCambiata?.();
  }, [archivio, onCambiata]);

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
    if (inModifica === id) setInModifica(null);
    await ricarica();
    await aggiornaStato();
  };

  const salvaTag = async (id, tag) => {
    setErrore(null);
    try {
      await archivio.aggiornaTagMedia(id, tag);
      await ricarica();
    } catch (e) {
      setErrore(e.message);
    }
  };

  const discipline = useMemo(() => valoriDistinti(voci, "disciplina"), [voci]);
  const risultati = useMemo(
    () => cerca(voci, query, filtroDisciplina ? { disciplina: filtroDisciplina } : {}),
    [voci, query, filtroDisciplina],
  );
  const senzaTag = useMemo(
    () => voci.filter((v) => !v.tag?.evento && !v.tag?.luogo && !(v.tag?.soggetto || []).length).length,
    [voci],
  );
  const inLavorazione = voci.find((v) => v.id === inModifica) || null;

  return (
    <section className="border border-[var(--border-on-dark)] p-4">
      <h3 className="mb-3 flex items-center gap-2 font-button text-[10px] uppercase tracking-[0.22em] text-[var(--accent-soft)]">
        <Icona size={13} aria-hidden="true" />
        Media Library · {voci.length}
        {senzaTag > 0 && (
          <span className="ml-auto font-body text-[10px] normal-case tracking-normal text-granite-mist/40">
            {senzaTag} senza tag
          </span>
        )}
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
            const descritta = Boolean(v.tag?.evento || v.tag?.luogo || (v.tag?.soggetto || []).length);
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
                  onClick={() => setInModifica(v.id === inModifica ? null : v.id)}
                  title={descritta ? "Modifica i metadata" : "Nessun tag: descrivi la fotografia"}
                  className={`absolute left-1 top-1 bg-obsidian/80 p-1 transition-colors hover:text-[var(--accent)] ${
                    descritta ? "text-granite-mist/60" : "text-[var(--accent-soft)]"
                  }`}
                >
                  <Tag size={11} aria-hidden="true" />
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

      {inLavorazione && (
        <SchedaMetadata
          key={inLavorazione.id}
          voce={inLavorazione}
          sorgente={url[inLavorazione.id]}
          suggerimenti={{
            evento: valoriDistinti(voci, "evento"),
            luogo: valoriDistinti(voci, "luogo"),
            disciplina: valoriDistinti(voci, "disciplina"),
            mezzo: valoriDistinti(voci, "mezzo"),
            categoria: valoriDistinti(voci, "categoria"),
          }}
          onSalva={(tag) => salvaTag(inLavorazione.id, tag)}
          onChiudi={() => setInModifica(null)}
        />
      )}
    </section>
  );
}

/**
 * Scheda dei metadata di una fotografia.
 *
 * I campi sono quelli su cui si cerca davvero, non un elenco generico: evento,
 * luogo, data, categoria, soggetto, mezzo, disciplina e tag liberi. Le proposte
 * arrivano dai valori già usati nella libreria, così «Buddusò» non diventa
 * anche «buddusò» e «Budduso».
 */
function SchedaMetadata({ voce, sorgente, suggerimenti, onSalva, onChiudi }) {
  const [tag, setTag] = useState(() => ({ ...tagVuoti(), ...(voce.tag || {}) }));
  const [libera, setLibera] = useState("");

  const campo = (chiave, valore) => setTag((t) => ({ ...t, [chiave]: valore }));

  const commutaSoggetto = (s) =>
    setTag((t) => ({
      ...t,
      soggetto: t.soggetto.includes(s) ? t.soggetto.filter((x) => x !== s) : [...t.soggetto, s],
    }));

  const aggiungiLibera = () => {
    const pulita = libera.trim();
    if (!pulita || tag.libere.includes(pulita)) return setLibera("");
    setTag((t) => ({ ...t, libere: [...t.libere, pulita] }));
    return setLibera("");
  };

  const testo = (chiave, etichetta, elenco = []) => (
    <label className="block">
      <span className="mb-1 block font-button text-[9px] uppercase tracking-[0.18em] text-granite-mist/45">
        {etichetta}
      </span>
      <input
        value={tag[chiave]}
        onChange={(e) => campo(chiave, e.target.value)}
        list={elenco.length ? `sugg-${chiave}` : undefined}
        className="w-full border border-[var(--border-on-dark)] bg-[var(--obsidian)] px-2 py-1.5 font-body text-xs text-[var(--text-on-dark)] outline-none focus:border-[var(--accent)]"
      />
      {elenco.length > 0 && (
        <datalist id={`sugg-${chiave}`}>
          {elenco.map((v) => <option key={v} value={v} />)}
        </datalist>
      )}
    </label>
  );

  return (
    <div className="mt-4 border border-[var(--accent)] p-3">
      <div className="mb-3 flex items-start gap-3">
        {sorgente && (
          <img src={sorgente} alt="" className="h-16 w-16 flex-none border border-[var(--border-on-dark)] object-cover" />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-body text-xs text-[var(--text-on-dark)]">{voce.nome}</p>
          <p className="font-body text-[10px] text-granite-mist/40">
            {voce.larghezza || "?"}×{voce.altezza || "?"} · {Math.round((voce.byte || 0) / 1024)} KB
          </p>
        </div>
        <button
          type="button"
          onClick={onChiudi}
          title="Chiudi"
          className="p-1 text-granite-mist/50 transition-colors hover:text-[var(--accent)]"
        >
          <X size={14} aria-hidden="true" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {testo("evento", "Evento", suggerimenti.evento)}
        {testo("luogo", "Luogo", suggerimenti.luogo)}
        <label className="block">
          <span className="mb-1 block font-button text-[9px] uppercase tracking-[0.18em] text-granite-mist/45">
            Data
          </span>
          <input
            type="date"
            value={tag.data}
            onChange={(e) => campo("data", e.target.value)}
            className="w-full border border-[var(--border-on-dark)] bg-[var(--obsidian)] px-2 py-1.5 font-body text-xs text-[var(--text-on-dark)] outline-none focus:border-[var(--accent)]"
          />
        </label>
        {testo("categoria", "Categoria", suggerimenti.categoria)}
        {testo("mezzo", "Mezzo", suggerimenti.mezzo)}
        {testo("disciplina", "Disciplina", suggerimenti.disciplina)}
      </div>

      <div className="mt-3">
        <span className="mb-1.5 block font-button text-[9px] uppercase tracking-[0.18em] text-granite-mist/45">
          Soggetto
        </span>
        <div className="flex flex-wrap gap-1.5">
          {SOGGETTI.map((s) => {
            const attivo = tag.soggetto.includes(s);
            return (
              <button
                key={s}
                type="button"
                onClick={() => commutaSoggetto(s)}
                className={`border px-2 py-1 font-body text-[10px] transition-colors ${
                  attivo
                    ? "border-[var(--accent)] text-[var(--accent-soft)]"
                    : "border-[var(--border-on-dark)] text-granite-mist/55 hover:border-granite-mist/40"
                }`}
              >
                {s}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-3">
        <span className="mb-1.5 block font-button text-[9px] uppercase tracking-[0.18em] text-granite-mist/45">
          Tag liberi
        </span>
        <div className="mb-2 flex flex-wrap gap-1.5">
          {tag.libere.map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setTag((t) => ({ ...t, libere: t.libere.filter((x) => x !== l) }))}
              title="Rimuovi"
              className="inline-flex items-center gap-1 border border-[var(--border-on-dark)] px-2 py-1 font-body text-[10px] text-granite-mist/65 hover:border-[#E2857A]"
            >
              {l}
              <X size={9} aria-hidden="true" />
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={libera}
            onChange={(e) => setLibera(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                aggiungiLibera();
              }
            }}
            placeholder="alba, guado, crew…"
            className="flex-1 border border-[var(--border-on-dark)] bg-[var(--obsidian)] px-2 py-1.5 font-body text-xs text-[var(--text-on-dark)] outline-none placeholder:text-granite-mist/30 focus:border-[var(--accent)]"
          />
          <button
            type="button"
            onClick={aggiungiLibera}
            className="border border-[var(--border-on-dark)] px-3 font-button text-[10px] uppercase tracking-[0.14em] text-granite-mist/60 transition-colors hover:border-[var(--accent)]"
          >
            Aggiungi
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onSalva(tag)}
        className="btn-mech mt-3 w-full bg-[var(--cta)] px-3 py-2 text-xs text-[var(--cta-text)]"
      >
        Salva i metadata
      </button>
    </div>
  );
}
