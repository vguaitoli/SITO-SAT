import React from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BadgeEuro,
  BedDouble,
  CalendarDays,
  CheckCircle2,
  CircleX,
  Clock3,
  Gauge,
  MapPin,
  MessageCircle,
  Percent,
  Send,
  ShieldCheck,
  TrendingUp,
  Users,
} from "lucide-react";
import { tinaField } from "tinacms/dist/react";
import SiteNav from "@/components/SiteNav";
import Footer from "@/components/Footer";
import MobileCta from "@/components/MobileCta";
import PageNotFound from "@/lib/PageNotFound";
import { typeColors } from "@/components/TourDetails";
import { useSiteContent } from "@/content/TinaContentProvider";
import { useI18n } from "@/i18n/I18nProvider";

const FALLBACK_IMAGES = {
  Maxienduro: "/media/reali/hero-maxienduro-panorama-1800.webp",
  Enduro: "/media/reali/hero-enduro-gruppo-1200.webp",
  Quad: "/media/reali/hero-quad-convoglio-1200.webp",
  "4x4": "/media/reali/hero-4x4-costa-1200.webp",
  "E-Bike": "/media/reali/ebike-costa-1200.webp",
  "Su Misura": "/media/reali/guida-sentiero-1200.webp",
};

function getLocalDate(value) {
  if (!value) return null;
  return new Date(value.includes("T") ? value : `${value}T00:00:00`);
}

function isConcluded(item) {
  const endDate = getLocalDate(item.endDate || item.date);
  if (!endDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return endDate < today;
}

function Stat({ icon: Icon, label, value, color }) {
  if (!value) return null;
  return (
    <div className="border-b border-obsidian/10 px-5 py-5 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
      {/* Testo piccolo su fondo chiaro: il token al 70% tiene il contrasto
          sopra la soglia AA, cosa che il 55% di prima non faceva. */}
      <span className="font-button flex items-center gap-2 text-[10px] uppercase tracking-[0.17em] text-[var(--text-on-light-muted)]">
        <Icon size={14} style={{ color }} aria-hidden="true" />
        {label}
      </span>
      <span className="mt-2 block font-heading text-xl leading-tight text-[var(--obsidian)] sm:text-2xl">
        {value}
      </span>
    </div>
  );
}

function BulletList({ items, color }) {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item} className="flex gap-3 font-body text-sm leading-relaxed text-granite-mist/75">
          <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full" style={{ backgroundColor: color }} />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default function CatalogDetailPage({ kind }) {
  const { slug } = useParams();
  const { tours, events, homepage, CTA_LABELS, SITE, TOUR_GROUP } = useSiteContent();
  const { t, route } = useI18n();
  const isEvent = kind === "event";
  const item = (isEvent ? events : tours).find((entry) => entry.slug === slug);

  if (!item) return <PageNotFound />;

  const color = typeColors[item.type] || "#A0612A";
  const firstStageWithImage = item.tappe?.find((stage) => stage.foto);
  const heroImage = firstStageWithImage?.foto || FALLBACK_IMAGES[item.type] || FALLBACK_IMAGES["Su Misura"];
  const heroAlt = firstStageWithImage?.fotoAlt || `${item.name} — ${item.interesse}`;
  const backRoute = isEvent ? "events" : "tours";
  const concluded = isEvent && isConcluded(item);
  const includedItems = isEvent
    ? item.incluso || []
    : (homepage.included?.items || []).map((entry) => entry.label);
  const includedIntro = isEvent ? null : homepage.included?.intro;
  const includedNote = isEvent ? null : homepage.included?.note;
  const equipment = item.equipaggiamento || [];
  const stages = item.tappe || [];

  const stats = [
    ...(isEvent ? [{ icon: MapPin, label: t("Partenza"), value: item.partenza }] : []),
    { icon: Clock3, label: t("Durata"), value: item.durata },
    { icon: Gauge, label: t("Distanza"), value: item.km },
    { icon: TrendingUp, label: t("Livello"), value: item.livello },
    // L'etichetta segue la forma del dato, non il tipo di scheda: una
    // percentuale ("88%") è sterrato, un testo descrittivo ("Off-road") è il
    // tipo di percorso. Negli eventi il campo può essere l'uno o l'altro.
    {
      icon: Percent,
      label: /%/.test(item.sterrato || "") ? t("Sterrato") : t("Tipo di percorso"),
      value: item.sterrato,
    },
    { icon: CalendarDays, label: t("Periodo"), value: item.periodo },
    { icon: Users, label: t("Partecipanti"), value: TOUR_GROUP.label },
  ];

  return (
    <div className="min-h-screen bg-[var(--obsidian)] topo-dark">
      <SiteNav />
      <main>
        <header className="relative isolate min-h-[680px] overflow-hidden">
          <img
            src={heroImage}
            alt={heroAlt}
            width={1800}
            height={1200}
            loading="eager"
            decoding="async"
            {...{ fetchpriority: "high" }}
            className="absolute inset-0 h-full w-full object-cover"
          />
          {/* 80 e non 82: la scala di opacità di Tailwind procede a passi di
              cinque e un valore fuori scala non genera alcuna regola. */}
          <div className="absolute inset-0 bg-gradient-to-r from-obsidian via-obsidian/80 to-obsidian/20" />
          <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-transparent to-obsidian/45" />

          <div className="relative mx-auto flex min-h-[680px] max-w-7xl flex-col justify-end px-5 pb-16 pt-36 lg:px-8 lg:pb-24">
            <Link
              to={route(backRoute)}
              className="font-button mb-10 inline-flex w-fit items-center gap-2 text-xs uppercase tracking-[0.16em] text-granite-mist/75 transition-colors hover:text-[var(--accent-soft)]"
            >
              <ArrowLeft size={16} aria-hidden="true" />
              {t(isEvent ? "Torna agli eventi" : "Torna agli itinerari")}
            </Link>

            <div className="max-w-4xl">
              <div className="mb-5 flex flex-wrap items-center gap-3">
                <span
                  className="font-button inline-flex px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-[var(--obsidian)]"
                  style={{ backgroundColor: color }}
                >
                  {item.type}
                </span>
                <span className="font-button text-xs uppercase tracking-[0.2em] text-granite-mist/70">
                  {isEvent ? t(concluded ? "Evento concluso" : "Evento programmato") : t("Tour guidato")}
                </span>
              </div>

              <h1
                className="max-w-4xl font-heading text-5xl leading-[0.92] text-[var(--granite-mist)] sm:text-6xl lg:text-8xl"
                data-tina-field={tinaField(item, "name")}
              >
                {item.name}
              </h1>
              {item.subtitle && (
                <p
                  className="mt-4 font-button text-sm uppercase tracking-[0.22em] text-[var(--accent-soft)]"
                  data-tina-field={tinaField(item, "subtitle")}
                >
                  {item.subtitle}
                </p>
              )}
              <p
                className="mt-7 max-w-3xl whitespace-pre-line font-body text-base leading-relaxed text-granite-mist/85 sm:text-lg lg:text-xl"
                data-tina-field={tinaField(item, "description")}
              >
                {item.descrizione}
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link
                  to={`${route("home")}#contatti`}
                  className="btn-mech inline-flex items-center justify-center gap-2.5 bg-[var(--cta)] px-8 py-4 text-base text-[var(--cta-text)] hover:bg-[var(--cta-hover)]"
                >
                  {CTA_LABELS.primary}
                  <Send size={17} aria-hidden="true" />
                </Link>
                {SITE.contattiVerificati && (
                  <a
                    href={SITE.whatsapp.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-mech inline-flex items-center justify-center gap-2.5 bg-[var(--wild-sage)] px-8 py-4 text-base text-[var(--granite-mist)] hover:bg-[var(--wild-sage-bright)]"
                  >
                    <MessageCircle size={18} aria-hidden="true" />
                    {CTA_LABELS.whatsapp}
                  </a>
                )}
              </div>
            </div>
          </div>
        </header>

        <section className="bg-[var(--surface-light)] topo-bg py-20 lg:py-28">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <p className="font-button text-xs uppercase tracking-[0.3em] text-[var(--accent)]">
              {t("Informazioni essenziali")}
            </p>
            <div className="mt-7 grid overflow-hidden border border-obsidian/15 bg-white/30 sm:grid-cols-2 lg:grid-cols-3">
              {stats.map((stat) => (
                <Stat key={stat.label} {...stat} color={color} />
              ))}
            </div>

            <div className="mt-16 grid gap-14 lg:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.75fr)] lg:gap-20">
              <article>
                <p className="font-button text-xs uppercase tracking-[0.3em] text-[var(--accent)]">
                  {t("Programma")}
                </p>
                <h2 className="mt-4 font-heading text-4xl leading-none text-[var(--obsidian)] sm:text-5xl lg:text-6xl">
                  {t("Programma del tour")}
                </h2>

                {/* La nota sul programma accompagna le tappe quando ci sono, e le
                    sostituisce quando l'itinerario è ancora da definire. */}
                {stages.length > 0 && item.programmaNote && (
                  <p className="mt-8 border-l-2 pl-6 font-body leading-relaxed text-[var(--text-on-light-muted)]" style={{ borderColor: color }}>
                    {item.programmaNote}
                  </p>
                )}

                {stages.length > 0 ? (
                  <div className="mt-10 space-y-10">
                    {stages.map((stage, index) => (
                      <section
                        key={`${stage.title}-${index}`}
                        className="grid gap-5 border-t border-obsidian/15 pt-8 first:border-t-0 first:pt-0 sm:grid-cols-[180px_1fr]"
                        data-tina-field={tinaField(stage)}
                      >
                        {stage.foto ? (
                          <img
                            src={stage.foto}
                            alt={stage.fotoAlt || stage.title}
                            width={720}
                            height={540}
                            loading="lazy"
                            decoding="async"
                            className="aspect-[4/3] h-auto w-full object-cover"
                          />
                        ) : (
                          <div className="flex aspect-[4/3] items-center justify-center bg-obsidian/5">
                            <span className="font-heading text-5xl" style={{ color }}>
                              {String(index + 1).padStart(2, "0")}
                            </span>
                          </div>
                        )}
                        <div>
                          <span className="font-button text-[10px] uppercase tracking-[0.18em]" style={{ color }}>
                            {t("Giorno")} {index + 1}
                          </span>
                          <h3
                            className="mt-2 font-heading text-2xl leading-tight text-[var(--obsidian)] sm:text-3xl"
                            data-tina-field={tinaField(stage, "title")}
                          >
                            {stage.title}
                          </h3>
                          <p
                            className="mt-3 whitespace-pre-line font-body text-sm leading-relaxed text-[var(--text-on-light-muted)] sm:text-base"
                            data-tina-field={tinaField(stage, "description")}
                          >
                            {stage.desc}
                          </p>
                        </div>
                      </section>
                    ))}
                  </div>
                ) : (
                  <div className="mt-10 border-l-2 pl-6" style={{ borderColor: color }}>
                    <p className="font-body text-lg leading-relaxed text-[var(--text-on-light-muted)]">
                      {item.programmaNote || t("Itinerario giornaliero personalizzato, da definire insieme a te.")}
                    </p>
                  </div>
                )}
              </article>

              <aside className="space-y-6 lg:sticky lg:top-28 lg:self-start">
                <div className="border border-obsidian/15 bg-[var(--obsidian)] px-6 py-7 text-[var(--granite-mist)]">
                  <h2 className="font-heading text-3xl leading-none">{t("Scheda Tecnica")}</h2>
                  <dl className="mt-6 space-y-4">
                    <div>
                      <dt className="font-button text-[10px] uppercase tracking-[0.17em] text-granite-mist/45">
                        {t("Punti di interesse")}
                      </dt>
                      <dd className="mt-1 flex gap-2 font-body text-sm leading-relaxed text-granite-mist/80">
                        <MapPin size={15} className="mt-0.5 flex-none" style={{ color }} aria-hidden="true" />
                        {item.interesse}
                      </dd>
                    </div>
                    {item.soggiorno && (
                      <div>
                        <dt className="font-button text-[10px] uppercase tracking-[0.17em] text-granite-mist/45">
                          {t("Pernottamento")}
                        </dt>
                        <dd className="mt-1 flex gap-2 font-body text-sm leading-relaxed text-granite-mist/80">
                          <BedDouble size={15} className="mt-0.5 flex-none" style={{ color }} aria-hidden="true" />
                          {item.soggiorno}
                        </dd>
                      </div>
                    )}
                    {item.price && (
                      <div>
                        <dt className="font-button text-[10px] uppercase tracking-[0.17em] text-granite-mist/45">
                          {t("Prezzo")}
                        </dt>
                        <dd className="mt-1 flex gap-2 font-body text-sm leading-relaxed text-granite-mist/80">
                          <BadgeEuro size={15} className="mt-0.5 flex-none" style={{ color }} aria-hidden="true" />
                          {item.price}
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>

                <div className="border border-obsidian/15 px-6 py-7">
                  <h2 className="flex items-center gap-2 font-heading text-2xl text-[var(--obsidian)]">
                    <ShieldCheck size={20} style={{ color }} aria-hidden="true" />
                    {t("Preparazione e sicurezza")}
                  </h2>
                  <p className="mt-4 font-body text-sm leading-relaxed text-[var(--text-on-light-muted)]">
                    {t("Ogni tour è personalizzabile per il tuo gruppo.")} {TOUR_GROUP.sentence}
                  </p>
                </div>
              </aside>
            </div>
          </div>
        </section>

        <section className="bg-[var(--obsidian)] py-20 lg:py-28">
          <div className="mx-auto grid max-w-7xl gap-12 px-5 lg:grid-cols-2 lg:px-8 lg:gap-20">
            <div>
              <h2 className="flex items-center gap-3 font-heading text-4xl text-[var(--granite-mist)] sm:text-5xl">
                <CheckCircle2 size={26} style={{ color }} aria-hidden="true" />
                {t("Cosa comprende")}
              </h2>
              {includedIntro && (
                <p className="mt-5 font-body text-sm leading-relaxed text-granite-mist/65 sm:text-base">
                  {includedIntro}
                </p>
              )}
              {includedItems.length > 0 && (
                <div className="mt-7">
                  <BulletList items={includedItems} color={color} />
                </div>
              )}
              {includedNote && (
                <p className="mt-7 border-l-2 pl-5 font-body text-sm leading-relaxed text-granite-mist/60" style={{ borderColor: color }}>
                  {includedNote}
                </p>
              )}
            </div>

            <div className="space-y-10">
              {item.esclusioni?.length > 0 && (
                <div>
                  <h2 className="flex items-center gap-3 font-heading text-3xl text-[var(--granite-mist)] sm:text-4xl">
                    <CircleX size={24} style={{ color }} aria-hidden="true" />
                    {t("Cosa non comprende")}
                  </h2>
                  <div className="mt-7">
                    <BulletList items={item.esclusioni} color={color} />
                  </div>
                </div>
              )}

              {equipment.length > 0 && (
                <div>
                  <h2 className="flex items-center gap-3 font-heading text-3xl text-[var(--granite-mist)] sm:text-4xl">
                    <ShieldCheck size={24} style={{ color }} aria-hidden="true" />
                    {t("Come equipaggiarsi")}
                  </h2>
                  <div className="mt-7">
                    <BulletList items={equipment} color={color} />
                  </div>
                </div>
              )}

              {!item.esclusioni?.length && !equipment.length && (
                <div className="border border-granite-mist/15 px-6 py-7">
                  <p className="font-body text-sm leading-relaxed text-granite-mist/65 sm:text-base">
                    {t("Dicci quando vorresti venire: verifichiamo la disponibilità e ti diciamo qual è il percorso giusto per te.")}
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="border-t border-granite-mist/10 bg-[var(--obsidian)] pb-24 pt-4 lg:pb-32">
          <div className="mx-auto max-w-5xl px-5 text-center lg:px-8">
            <p className="font-button text-xs uppercase tracking-[0.3em]" style={{ color }}>
              {item.type} · Sardegna
            </p>
            <h2 className="mt-5 font-heading text-4xl leading-none text-[var(--granite-mist)] sm:text-6xl">
              {t("Pronto a partire in")} {item.type}?
            </h2>
            <p className="mx-auto mt-6 max-w-2xl font-body text-base leading-relaxed text-granite-mist/65">
              {t("Dicci quando vorresti venire: verifichiamo la disponibilità e ti diciamo qual è il percorso giusto per te.")}
            </p>
            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                to={`${route("home")}#contatti`}
                className="btn-mech inline-flex items-center justify-center gap-2.5 bg-[var(--cta)] px-8 py-4 text-base text-[var(--cta-text)] hover:bg-[var(--cta-hover)]"
              >
                {CTA_LABELS.primary}
                <Send size={17} aria-hidden="true" />
              </Link>
              {SITE.contattiVerificati && (
                <a
                  href={SITE.whatsapp.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-mech inline-flex items-center justify-center gap-2.5 bg-[var(--wild-sage)] px-8 py-4 text-base text-[var(--granite-mist)] hover:bg-[var(--wild-sage-bright)]"
                >
                  <MessageCircle size={18} aria-hidden="true" />
                  {CTA_LABELS.whatsapp}
                </a>
              )}
            </div>
          </div>
        </section>
      </main>
      <Footer />
      <MobileCta />
    </div>
  );
}
