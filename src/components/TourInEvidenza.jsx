import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import Reveal from "@/components/Reveal";
import SectionHeading from "@/components/SectionHeading";
import TourCard from "@/components/TourCard.jsx";
import { typeColors } from "@/components/TourDetails.jsx";
import { tinaField } from "tinacms/dist/react";
import { useSiteContent } from "@/content/TinaContentProvider";
import { useI18n } from "@/i18n/I18nProvider";

const IN_EVIDENZA = 3;

function dataEvento(value) {
  if (!value) return null;
  return new Date(value.includes("T") ? value : `${value}T00:00:00`);
}

/**
 * "Prossime partenze": la vetrina della home.
 *
 * Mostra per prime le partenze con data confermata, perché sono l'unica cosa
 * su cui una persona può agire subito. Gli eventi però scadono: quando i
 * futuri non bastano a riempire la vetrina, la completano gli itinerari
 * selezionati del catalogo, così la sezione non resta mai vuota.
 * Non è un secondo sistema di navigazione: le categorie restano la porta
 * d'ingresso, questa è solo una vetrina.
 */
export default function TourInEvidenza() {
  const { homepage, tours, events, TOUR_GROUP } = useSiteContent();
  const { t, href, route } = useI18n();
  const content = homepage.featuredTours;

  const oggi = new Date();
  oggi.setHours(0, 0, 0, 0);
  const inProgramma = events
    .filter((evento) => {
      const fine = dataEvento(evento.endDate || evento.date);
      return !fine || fine >= oggi;
    })
    .sort((a, b) => (dataEvento(a.date)?.getTime() || 0) - (dataEvento(b.date)?.getTime() || 0))
    .map((evento) => ({ item: evento, kind: "event" }));

  const itinerari = content.tourNames
    .map((name) => tours.find((tour) => tour.name === name))
    .filter(Boolean)
    .map((tour) => ({ item: tour, kind: "tour" }));

  const featured = [...inProgramma, ...itinerari].slice(0, IN_EVIDENZA);
  const ciSonoEventi = featured.some((voce) => voce.kind === "event");
  const ctaHref = ciSonoEventi ? "/eventi" : "/itinerari";
  const ctaLabel = ciSonoEventi ? t("Vedi il calendario") : t("Vedi tutti gli itinerari");

  return (
    <section id="tour-in-evidenza" className="bg-[var(--surface-light)] topo-bg py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="mb-14 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div data-tina-field={tinaField(content)}>
            <SectionHeading
              eyebrow={content.eyebrow}
              title={content.title}
              accent={content.accent}
              intro={`${content.intro} ${TOUR_GROUP.sentence}`}
              tone="light"
              className="mb-0"
            />
          </div>
          <Link
            to={href(ctaHref)}
            className="btn-mech hidden shrink-0 items-center gap-2.5 bg-[var(--cta)] px-6 py-3.5 text-sm text-[var(--cta-text)] hover:bg-[var(--cta-hover)] lg:inline-flex"
          >
            {ctaLabel}
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>

        <div className="grid items-stretch gap-6 md:grid-cols-2 xl:grid-cols-3">
          {featured.map(({ item, kind }, i) => (
            <Reveal key={`${kind}-${item.slug}`} delay={i * 0.08} className="h-full">
              <TourCard
                tour={item}
                color={typeColors[item.type] || "var(--accent)"}
                detailPath={route(kind === "event" ? "eventDetail" : "tourDetail", {
                  slug: item.slug,
                })}
              />
            </Reveal>
          ))}
        </div>

        {/* CTA a piena larghezza per mobile/tablet, dove quella nell'header è nascosta. */}
        <div className="mt-10 lg:hidden">
          <Link
            to={href(ctaHref)}
            className="btn-mech flex items-center justify-center gap-2.5 bg-[var(--cta)] px-6 py-4 text-base text-[var(--cta-text)] hover:bg-[var(--cta-hover)]"
          >
            {ctaLabel}
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
