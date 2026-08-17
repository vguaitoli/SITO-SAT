import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Lock, XCircle } from "lucide-react";
import { useSiteContent } from "@/content/TinaContentProvider";
import { FornitoreArchivio } from "./ContestoArchivio";
import StatoArchivio from "./StatoArchivio";
import Anteprima from "./Anteprima";
import { ELENCO_CATEGORIE } from "../design/categorie";
import { contenutoVuoto } from "../fondamenta/schema";
import { brandLockAttivo } from "../fondamenta/brand-lock";
import { daEvento } from "../fondamenta/adapter-sito";
import { preflight } from "../motori/preflight";
import { FornitoreProblemi, useFontPronti } from "../template/primitivi";
import PostEvento from "../template/rubriche/eventi/PostEvento";
import { COLORI } from "../design/tokens";

/**
 * STA Social Studio — guscio dell'applicazione.
 *
 * Fase 4A: design system, Brand Lock, Template Engine, anteprima dal vivo e
 * pre-flight sono in piedi e collegati fra loro. L'editor completo, la Media
 * Library con l'interfaccia e il planner arrivano dopo; qui si vede che
 * l'impianto regge, con i dati veri del sito.
 */
export default function Studio() {
  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow, noarchive";
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);

  return (
    <FornitoreArchivio>
      <div className="min-h-screen bg-[var(--obsidian)] text-[var(--text-on-dark)]">
        <Intestazione />
        <main className="mx-auto max-w-6xl space-y-8 px-6 py-8 lg:px-10">
          <StatoArchivio />
          <Rubriche />
          <BancoDiProva />
        </main>
      </div>
    </FornitoreArchivio>
  );
}

function Intestazione() {
  const lucchetto = brandLockAttivo();
  return (
    <header className="border-b border-[var(--border-on-dark)] px-6 py-5 lg:px-10">
      <div className="mx-auto flex max-w-6xl items-baseline justify-between gap-4">
        <div>
          <p className="font-button text-[10px] uppercase tracking-[0.3em] text-[var(--accent-soft)]">
            Sardegna Trail Avventura
          </p>
          <h1 className="mt-1 font-heading text-3xl leading-none">STA Social Studio</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-2 font-button text-[10px] uppercase tracking-[0.2em] text-granite-mist/50">
            <Lock size={13} aria-hidden="true" />
            Brand Lock {lucchetto ? "attivo" : "disattivato"}
          </span>
          <span className="font-button text-[10px] uppercase tracking-[0.2em] text-granite-mist/35">
            Fase 4A
          </span>
        </div>
      </div>
    </header>
  );
}

function Rubriche() {
  return (
    <section className="border border-[var(--border-on-dark)] p-5">
      <h2 className="mb-4 font-button text-xs uppercase tracking-[0.2em] text-[var(--accent-soft)]">
        Le otto rubriche
      </h2>
      <ol className="grid grid-cols-2 gap-px bg-[var(--border-on-dark)] sm:grid-cols-4">
        {ELENCO_CATEGORIE.map((c) => (
          <li key={c.id} className="bg-[var(--obsidian)] p-4">
            <div className="flex items-baseline justify-between">
              <span className="font-button text-[10px] uppercase tracking-[0.2em] text-granite-mist/40">
                {c.numero}
              </span>
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: c.accento }}
                title={`Accento ${c.accento}`}
              />
            </div>
            <span className="mt-1 block font-heading text-xl leading-none">{c.nome}</span>
            <span className="mt-2 block font-body text-[11px] leading-snug text-granite-mist/50">
              {c.pesoFoto}% foto · {c.pesoGrafica}% grafica
            </span>
            <span className="mt-1 block font-body text-[11px] text-granite-mist/35">
              {c.varianti.length} varianti
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/**
 * Banco di prova: il template EVENTI con i dati reali del sito.
 *
 * Serve a verificare l'impianto — adapter, cornice, testo adattivo, pre-flight —
 * su un contenuto vero invece che su dati inventati.
 */
function BancoDiProva() {
  const { events, SITE, TOUR_GROUP } = useSiteContent();
  const [problemi, setProblemi] = useState([]);

  const evento = useMemo(
    () => events?.find((e) => /giganti/i.test(e.name || "")) || events?.[0] || null,
    [events],
  );

  const contenuto = useMemo(() => {
    if (!evento) return null;
    const base = contenutoVuoto({ categoria: "eventi", formato: "post" });
    const importato = daEvento(evento, {
      tourGroup: TOUR_GROUP?.label,
      urlBase: "https://www.sardegnatrailavventura.it",
      whatsapp: SITE?.telefono?.display,
    });
    return {
      ...base,
      titolo: importato.fattuali.nome,
      fonte: importato.fonte,
      fattuali: { ...base.fattuali, ...importato.fattuali },
      editoriale: { ...base.editoriale, ...importato.editoriale },
    };
  }, [evento, TOUR_GROUP, SITE]);

  // Il controllo sui font va rifatto quando i font arrivano, altrimenti
  // segnalerebbe per sempre un'assenza momentanea.
  const fontPronti = useFontPronti();

  const controllo = useMemo(
    () => (contenuto ? preflight({ contenuto, vociMedia: [], formato: "post", problemi }) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [contenuto, problemi, fontPronti],
  );

  if (!contenuto) {
    return (
      <section className="border border-[var(--border-on-dark)] p-5">
        <p className="font-body text-sm text-granite-mist/60">Nessun evento disponibile dal sito.</p>
      </section>
    );
  }

  return (
    <section className="border border-[var(--border-on-dark)] p-5">
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="font-button text-xs uppercase tracking-[0.2em] text-[var(--accent-soft)]">
          Anteprima · Post evento
        </h2>
        <span className="font-body text-xs text-granite-mist/45">
          dati importati dal sito · {contenuto.fonte.slug}
        </span>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <FornitoreProblemi onProblemi={setProblemi}>
          <Anteprima formato="post" massimaAltezza={680}>
            <PostEvento contenuto={contenuto} immagini={{}} />
          </Anteprima>
        </FornitoreProblemi>

        <div>
          <h3 className="mb-3 font-button text-[10px] uppercase tracking-[0.22em] text-granite-mist/50">
            Pre-flight
          </h3>
          <ul className="space-y-2">
            {controllo.esiti.map((e) => (
              <li key={e.id} className="flex items-start gap-2 font-body text-xs leading-snug">
                <Segno livello={e.livello} />
                <span
                  style={{
                    color:
                      e.livello === "errore"
                        ? "#E2857A"
                        : e.livello === "avviso"
                          ? COLORI.accentoEventi
                          : "rgba(245,235,217,0.6)",
                  }}
                >
                  {e.messaggio}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-4 border-t border-[var(--border-on-dark)] pt-3 font-button text-[10px] uppercase tracking-[0.2em]">
            {controllo.puoiEsportare ? (
              <span className="text-[var(--wild-sage-bright)]">Esportabile</span>
            ) : (
              <span style={{ color: "#E2857A" }}>
                Bloccato · {controllo.errori.length} error{controllo.errori.length === 1 ? "e" : "i"}
              </span>
            )}
          </p>
        </div>
      </div>
    </section>
  );
}

function Segno({ livello }) {
  if (livello === "errore") return <XCircle size={14} className="mt-0.5 shrink-0" style={{ color: "#E2857A" }} aria-hidden="true" />;
  if (livello === "avviso") return <AlertTriangle size={14} className="mt-0.5 shrink-0" style={{ color: COLORI.accentoEventi }} aria-hidden="true" />;
  return <CheckCircle2 size={14} className="mt-0.5 shrink-0" style={{ color: COLORI.verdeChiaro }} aria-hidden="true" />;
}
