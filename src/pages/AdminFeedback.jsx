import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  ChevronRight,
  CircleAlert,
  ExternalLink,
  Gauge,
  MessageSquareText,
  RefreshCw,
  Route as RouteIcon,
  Search,
  ShieldCheck,
  UsersRound,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";

const ENDPOINT = "/admin/feedback/api/submissions";

const dateFormatter = new Intl.DateTimeFormat("it-IT", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatDate(value) {
  if (!value) return "Data non disponibile";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Data non disponibile" : dateFormatter.format(date);
}

function formatMetric(value, signed = false) {
  if (value == null) return "—";
  const formatted = new Intl.NumberFormat("it-IT", {
    maximumFractionDigits: 1,
    signDisplay: signed ? "always" : "auto",
  }).format(value);
  return formatted;
}

function npsCategory(value) {
  if (value == null) return "none";
  if (value >= 9) return "promoter";
  if (value >= 7) return "passive";
  return "detractor";
}

const NPS_LABELS = {
  promoter: "Promotore",
  passive: "Passivo",
  detractor: "Detrattore",
  none: "NPS non compilato",
};

const NPS_STYLES = {
  promoter: "border-[#72834a]/40 bg-[#72834a]/15 text-[#35431f]",
  passive: "border-[#b88a3f]/40 bg-[#b88a3f]/15 text-[#6b4715]",
  detractor: "border-[#a54c35]/35 bg-[#a54c35]/10 text-[#7e2f1c]",
  none: "border-obsidian/15 bg-obsidian/5 text-[var(--text-on-light-muted)]",
};

function KpiCard({ icon: Icon, eyebrow, value, detail, tone = "earth" }) {
  const toneClass = tone === "sage"
    ? "bg-[#6b7a3e]/12 text-[#465326]"
    : tone === "sand"
      ? "bg-[#c49450]/15 text-[#76501d]"
      : "bg-oxblood/10 text-[var(--accent)]";

  return (
    <article className="min-w-0 border border-obsidian/10 bg-white/55 p-5 shadow-[0_12px_38px_rgba(28,24,20,0.06)] sm:p-6">
      <div className={`flex h-10 w-10 items-center justify-center rounded-full ${toneClass}`}>
        <Icon size={19} aria-hidden="true" />
      </div>
      <p className="mt-5 font-button text-[0.68rem] uppercase tracking-[0.2em] text-[var(--text-on-light-muted)]">
        {eyebrow}
      </p>
      <p className="mt-2 font-heading text-5xl leading-none text-[var(--obsidian)] sm:text-6xl">
        {value}
      </p>
      <p className="mt-2 min-h-5 font-body text-xs leading-relaxed text-[var(--text-on-light-muted)]">
        {detail}
      </p>
    </article>
  );
}

function NpsBadge({ value }) {
  const category = npsCategory(value);
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-button text-[0.65rem] uppercase tracking-[0.12em] ${NPS_STYLES[category]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {value == null ? NPS_LABELS[category] : `NPS ${value} · ${NPS_LABELS[category]}`}
    </span>
  );
}

function EmptyState({ title, description }) {
  return (
    <div className="border border-dashed border-obsidian/20 bg-white/30 px-6 py-14 text-center sm:py-20">
      <MessageSquareText className="mx-auto text-[var(--accent)]" size={32} aria-hidden="true" />
      <h2 className="mt-5 font-heading text-3xl text-[var(--obsidian)]">{title}</h2>
      <p className="mx-auto mt-2 max-w-lg font-body text-sm leading-relaxed text-[var(--text-on-light-muted)]">
        {description}
      </p>
    </div>
  );
}

function ResponseDialog({ selected, onClose }) {
  const dialogRef = useRef(/** @type {HTMLDialogElement | null} */ (null));

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (selected && !dialog.open) dialog.showModal();
    if (!selected && dialog.open) dialog.close();
  }, [selected]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) event.currentTarget.close();
      }}
      aria-labelledby="feedback-detail-title"
      aria-describedby="feedback-detail-date"
      className="m-auto max-h-[92vh] w-[calc(100%-1.5rem)] max-w-3xl overflow-hidden border border-granite-mist/15 bg-[var(--carbon)] p-0 text-[var(--granite-mist)] shadow-2xl backdrop:bg-black/75 sm:w-[calc(100%-3rem)]"
    >
      {selected && (
        <div className="grid max-h-[92vh] grid-rows-[auto_minmax(0,1fr)]">
          <header className="relative border-b border-granite-mist/10 px-5 py-5 pr-14 text-left sm:px-7 sm:py-6">
            <div className="flex flex-wrap items-center gap-2">
              <NpsBadge value={selected.nps} />
              <span className="font-body text-[0.7rem] text-granite-mist/50">#{selected.id}</span>
            </div>
            <h2 id="feedback-detail-title" className="mt-3 font-heading text-4xl leading-none text-[var(--granite-mist)] sm:text-5xl">
              {selected.respondent}
            </h2>
            <p id="feedback-detail-date" className="mt-2 flex items-center gap-2 font-body text-xs text-granite-mist/60">
              <CalendarDays size={14} aria-hidden="true" />
              Inviata {formatDate(selected.submittedAt)}
            </p>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full text-granite-mist/65 transition-colors hover:bg-granite-mist/10 hover:text-[var(--granite-mist)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-soft)]"
              aria-label="Chiudi il dettaglio"
            >
              <X size={20} aria-hidden="true" />
            </button>
          </header>

          <div className="overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
            <dl className="space-y-5">
              {selected.answers.map((answer, index) => (
                <div key={`${answer.questionId}-${index}`} className="border-b border-granite-mist/10 pb-5 last:border-0 last:pb-0">
                  <dt className="font-button text-[0.67rem] uppercase tracking-[0.15em] text-[var(--accent-soft)]">
                    {answer.label}
                  </dt>
                  {answer.group !== answer.label && (
                    <dd className="mt-1 font-body text-[0.65rem] text-granite-mist/40">{answer.group}</dd>
                  )}
                  <dd className="mt-2 whitespace-pre-wrap font-body text-sm leading-relaxed text-granite-mist/90 sm:text-[0.95rem]">
                    {answer.value}
                  </dd>
                </div>
              ))}
            </dl>

            {selected.previewUrl && (
              <a
                href={selected.previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-7 inline-flex min-h-11 items-center gap-2 border border-granite-mist/20 px-4 font-button text-xs uppercase tracking-[0.14em] text-[var(--granite-mist)] transition-colors hover:border-[var(--accent-soft)] hover:text-[var(--accent-soft)]"
              >
                Apri la submission su Tally
                <ExternalLink size={15} aria-hidden="true" />
              </a>
            )}
          </div>
        </div>
      )}
    </dialog>
  );
}

export default function AdminFeedback() {
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [search, setSearch] = useState("");
  const [npsFilter, setNpsFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [sort, setSort] = useState("newest");
  const [selected, setSelected] = useState(null);
  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    async function loadFeedback() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(ENDPOINT, {
          method: "GET",
          credentials: "same-origin",
          headers: { Accept: "application/json" },
          cache: "no-store",
          signal: controller.signal,
        });
        const isJson = response.headers.get("content-type")?.includes("application/json");
        const body = isJson ? await response.json() : { error: await response.text() };
        if (!response.ok) throw new Error(body.error || "Impossibile caricare le risposte.");
        if (active) setPayload(body);
      } catch (loadError) {
        if (loadError.name !== "AbortError" && active) {
          setError(loadError.message || "Impossibile caricare le risposte.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadFeedback();
    return () => {
      active = false;
      controller.abort();
    };
  }, [reloadKey]);

  const filteredSubmissions = useMemo(() => {
    const submissions = payload?.submissions || [];
    const query = deferredSearch.trim().toLocaleLowerCase("it");
    const days = dateFilter === "30" ? 30 : dateFilter === "90" ? 90 : null;
    const cutoff = days ? Date.now() - days * 24 * 60 * 60 * 1000 : null;

    return submissions
      .filter((submission) => {
        if (npsFilter !== "all" && npsCategory(submission.nps) !== npsFilter) return false;
        if (cutoff && (!submission.submittedAt || Date.parse(submission.submittedAt) < cutoff)) return false;
        if (!query) return true;
        const haystack = [
          submission.respondent,
          submission.id,
          ...submission.answers.flatMap((answer) => [answer.label, answer.group, answer.value]),
        ].join(" ").toLocaleLowerCase("it");
        return haystack.includes(query);
      })
      .sort((a, b) => {
        const first = Date.parse(a.submittedAt || "") || 0;
        const second = Date.parse(b.submittedAt || "") || 0;
        return sort === "oldest" ? first - second : second - first;
      });
  }, [dateFilter, deferredSearch, npsFilter, payload, sort]);

  const kpis = payload?.kpis;
  const totalNps = kpis?.nps?.responses || 0;
  const npsParts = [
    { key: "promoter", label: "Promotori", value: kpis?.nps?.promoters || 0, color: "bg-[#6b7a3e]" },
    { key: "passive", label: "Passivi", value: kpis?.nps?.passives || 0, color: "bg-[#c49450]" },
    { key: "detractor", label: "Detrattori", value: kpis?.nps?.detractors || 0, color: "bg-[#a54c35]" },
  ];

  return (
    <div className="min-h-screen bg-[var(--obsidian)] text-[var(--granite-mist)]">
      <a
        href="#contenuto-feedback"
        className="sr-only z-[60] bg-[var(--surface-light)] px-4 py-3 text-[var(--obsidian)] focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        Vai alle risposte
      </a>

      <header className="border-b border-granite-mist/10 bg-[var(--obsidian)]">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <img
              src="/media/logo-sardegna-trail-avventura.png"
              alt=""
              width="56"
              height="56"
              className="h-11 w-11 shrink-0 object-contain sm:h-12 sm:w-12"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="truncate font-heading text-2xl leading-none tracking-wide sm:text-3xl">FEEDBACK HUB</p>
                <span className="hidden items-center gap-1 rounded-full border border-granite-mist/15 px-2 py-1 font-button text-[0.58rem] uppercase tracking-[0.14em] text-granite-mist/60 sm:inline-flex">
                  <ShieldCheck size={12} aria-hidden="true" />
                  Area riservata
                </span>
              </div>
              <p className="mt-1 truncate font-body text-[0.65rem] text-granite-mist/55 sm:text-xs">
                Questionario post-tour · Tally {payload?.formId || "Xx600V"}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Link
              to="/"
              className="inline-flex min-h-11 items-center gap-2 px-2 font-button text-[0.68rem] uppercase tracking-[0.14em] text-granite-mist/70 transition-colors hover:text-[var(--accent-soft)] sm:px-3"
            >
              <ArrowLeft size={16} aria-hidden="true" />
              <span className="hidden sm:inline">Sito</span>
            </Link>
            <button
              type="button"
              onClick={() => setReloadKey((value) => value + 1)}
              disabled={loading}
              className="inline-flex min-h-11 items-center gap-2 bg-[var(--cta)] px-3 font-button text-[0.68rem] uppercase tracking-[0.14em] text-[var(--cta-text)] transition-colors hover:bg-[var(--cta-hover)] disabled:cursor-wait disabled:opacity-60 sm:px-4"
            >
              <RefreshCw className={loading ? "animate-spin motion-reduce:animate-none" : ""} size={16} aria-hidden="true" />
              <span className="hidden sm:inline">Aggiorna</span>
              <span className="sr-only sm:hidden">Aggiorna le risposte</span>
            </button>
          </div>
        </div>
      </header>

      <main id="contenuto-feedback" className="bg-[var(--surface-light)] text-[var(--obsidian)]">
        <section className="border-b border-obsidian/10 bg-[linear-gradient(135deg,#efe2c8_0%,#f5ebd9_55%,#ead9b8_100%)]">
          <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-14">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <p className="font-button text-[0.68rem] uppercase tracking-[0.28em] text-[var(--accent)]">Voce dei partecipanti</p>
                <h1 className="mt-3 max-w-4xl font-heading text-5xl leading-[0.9] sm:text-6xl lg:text-7xl">
                  IL TRAIL, VISTO DA CHI L’HA VISSUTO
                </h1>
              </div>
              <p className="max-w-md font-body text-sm leading-relaxed text-[var(--text-on-light-muted)] md:text-right">
                Valutazioni e commenti raccolti dal questionario post-tour. I dati vengono letti in tempo reale e non sono memorizzati nel browser.
              </p>
            </div>

            {error && (
              <div className="mt-7 flex items-start gap-3 border border-[#a54c35]/30 bg-[#a54c35]/10 p-4" role="alert">
                <CircleAlert className="mt-0.5 shrink-0 text-[#8a3824]" size={20} aria-hidden="true" />
                <div>
                  <p className="font-button text-xs uppercase tracking-[0.14em] text-[#722b1b]">Dati non aggiornati</p>
                  <p className="mt-1 font-body text-sm leading-relaxed text-[#722b1b]">{error}</p>
                </div>
              </div>
            )}

            <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-5 lg:gap-4" aria-busy={loading && !payload}>
              <KpiCard
                icon={MessageSquareText}
                eyebrow="Risposte"
                value={loading && !payload ? "…" : formatMetric(kpis?.responses)}
                detail="Questionari completati"
              />
              <KpiCard
                icon={Gauge}
                eyebrow="NPS"
                value={loading && !payload ? "…" : formatMetric(kpis?.nps?.value, true)}
                detail={kpis?.nps?.responses ? `${kpis.nps.responses} valutazioni` : "Nessuna valutazione"}
                tone="sage"
              />
              <KpiCard
                icon={RouteIcon}
                eyebrow="Percorso"
                value={loading && !payload ? "…" : formatMetric(kpis?.averages?.route?.value)}
                detail={kpis?.averages?.route?.responses ? `Media su ${kpis.averages.route.responses} risposte` : "Media non disponibile"}
                tone="sand"
              />
              <KpiCard
                icon={UsersRound}
                eyebrow="Guida"
                value={loading && !payload ? "…" : formatMetric(kpis?.averages?.guide?.value)}
                detail={kpis?.averages?.guide?.responses ? `Media su ${kpis.averages.guide.responses} risposte` : "Media non disponibile"}
                tone="sage"
              />
              <KpiCard
                icon={ShieldCheck}
                eyebrow="Organizzazione"
                value={loading && !payload ? "…" : formatMetric(kpis?.averages?.organization?.value)}
                detail={kpis?.averages?.organization?.responses ? `Media su ${kpis.averages.organization.responses} risposte` : "Media non disponibile"}
                tone="sand"
              />
            </div>

            {totalNps > 0 && (
              <div className="mt-4 border border-obsidian/10 bg-white/45 px-4 py-4 sm:px-5" aria-label="Distribuzione NPS">
                <div className="flex h-2 overflow-hidden rounded-full bg-obsidian/10" aria-hidden="true">
                  {npsParts.map((part) => (
                    <span
                      key={part.key}
                      className={part.color}
                      style={{ width: `${(part.value / totalNps) * 100}%` }}
                    />
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
                  {npsParts.map((part) => (
                    <span key={part.key} className="inline-flex items-center gap-2 font-body text-xs text-[var(--text-on-light-muted)]">
                      <span className={`h-2 w-2 rounded-full ${part.color}`} aria-hidden="true" />
                      {part.label}: <strong className="text-[var(--obsidian)]">{part.value}</strong>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12" aria-labelledby="responses-title">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="font-button text-[0.65rem] uppercase tracking-[0.25em] text-[var(--accent)]">Archivio risposte</p>
              <h2 id="responses-title" className="mt-2 font-heading text-4xl sm:text-5xl">LE ULTIME ESPERIENZE</h2>
            </div>
            <p className="font-body text-xs text-[var(--text-on-light-muted)]" aria-live="polite" aria-atomic="true">
              {payload ? `${filteredSubmissions.length} di ${payload.submissions.length} risposte` : "Caricamento risposte"}
              {payload?.fetchedAt ? ` · Aggiornate ${formatDate(payload.fetchedAt)}` : ""}
            </p>
          </div>

          <div className="mt-6 grid gap-3 border border-obsidian/10 bg-white/45 p-3 sm:grid-cols-2 sm:p-4 lg:grid-cols-[minmax(280px,1fr)_180px_180px_180px]">
            <label className="relative block sm:col-span-2 lg:col-span-1">
              <span className="sr-only">Cerca nelle risposte</span>
              <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-obsidian/45" size={17} aria-hidden="true" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cerca nome, tour o commento…"
                className="min-h-12 w-full border border-obsidian/15 bg-[var(--surface-light)] py-3 pl-10 pr-4 font-body text-sm text-[var(--obsidian)] placeholder:text-obsidian/40 focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-oxblood/20"
              />
            </label>

            <label>
              <span className="sr-only">Filtra per fascia NPS</span>
              <select
                value={npsFilter}
                onChange={(event) => setNpsFilter(event.target.value)}
                className="min-h-12 w-full border border-obsidian/15 bg-[var(--surface-light)] px-3 font-body text-sm focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-oxblood/20"
              >
                <option value="all">Tutto l’NPS</option>
                <option value="promoter">Promotori · 9–10</option>
                <option value="passive">Passivi · 7–8</option>
                <option value="detractor">Detrattori · 0–6</option>
                <option value="none">Senza NPS</option>
              </select>
            </label>

            <label>
              <span className="sr-only">Filtra per periodo</span>
              <select
                value={dateFilter}
                onChange={(event) => setDateFilter(event.target.value)}
                className="min-h-12 w-full border border-obsidian/15 bg-[var(--surface-light)] px-3 font-body text-sm focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-oxblood/20"
              >
                <option value="all">Tutto il periodo</option>
                <option value="30">Ultimi 30 giorni</option>
                <option value="90">Ultimi 90 giorni</option>
              </select>
            </label>

            <label>
              <span className="sr-only">Ordina le risposte</span>
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value)}
                className="min-h-12 w-full border border-obsidian/15 bg-[var(--surface-light)] px-3 font-body text-sm focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-oxblood/20"
              >
                <option value="newest">Più recenti</option>
                <option value="oldest">Meno recenti</option>
              </select>
            </label>
          </div>

          <div className="mt-5">
            {loading && !payload ? (
              <div className="flex min-h-64 items-center justify-center border border-obsidian/10 bg-white/35" role="status">
                <div className="text-center">
                  <RefreshCw className="mx-auto animate-spin text-[var(--accent)] motion-reduce:animate-none" size={26} aria-hidden="true" />
                  <p className="mt-4 font-button text-xs uppercase tracking-[0.16em] text-[var(--text-on-light-muted)]">Lettura risposte Tally</p>
                </div>
              </div>
            ) : !payload ? (
              <EmptyState title="RISPOSTE NON DISPONIBILI" description="Configura la chiave Tally per leggere i questionari in questa area riservata." />
            ) : filteredSubmissions.length === 0 ? (
              <EmptyState title="NESSUNA RISPOSTA TROVATA" description="Prova a cambiare ricerca, periodo o fascia NPS." />
            ) : (
              <ol className="space-y-3">
                {filteredSubmissions.map((submission) => (
                  <li key={submission.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(submission)}
                      className="group grid min-h-24 w-full grid-cols-[1fr_auto] items-center gap-4 border border-obsidian/10 bg-white/55 px-4 py-4 text-left shadow-[0_8px_28px_rgba(28,24,20,0.04)] transition hover:border-oxblood/35 hover:bg-white/80 focus-visible:border-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-oxblood/25 sm:grid-cols-[minmax(180px,0.7fr)_minmax(230px,1.3fr)_auto] sm:px-5"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-heading text-2xl leading-none text-[var(--obsidian)]">{submission.respondent}</span>
                        <span className="mt-1.5 flex items-center gap-1.5 font-body text-[0.7rem] text-[var(--text-on-light-muted)]">
                          <CalendarDays size={13} aria-hidden="true" />
                          {formatDate(submission.submittedAt)}
                        </span>
                      </span>

                      <span className="hidden min-w-0 sm:block">
                        <NpsBadge value={submission.nps} />
                        <span className="mt-2 block truncate font-body text-xs text-[var(--text-on-light-muted)]">
                          {submission.answers.length} risposte nel questionario
                        </span>
                      </span>

                      <span className="flex items-center gap-2">
                        <span className={`flex h-10 min-w-10 items-center justify-center rounded-full border px-2 font-button text-xs ${NPS_STYLES[npsCategory(submission.nps)]} sm:hidden`}>
                          {submission.nps == null ? "—" : submission.nps}
                          <span className="sr-only"> · {NPS_LABELS[npsCategory(submission.nps)]}</span>
                        </span>
                        <span className="flex h-10 w-10 items-center justify-center rounded-full border border-obsidian/10 text-[var(--accent)] transition group-hover:border-oxblood/30 group-hover:bg-oxblood/10">
                          <ChevronRight size={18} aria-hidden="true" />
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </section>
      </main>

      <ResponseDialog selected={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
