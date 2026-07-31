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

/**
 * "Tour in evidenza": un assaggio di itinerari reali direttamente in home.
 *
 * Mostra tre tour scelti per dare varietà di mezzo e di durata; il catalogo
 * completo (con filtro per formato) vive nella pagina dedicata /itinerari.
 * Non è un secondo sistema di navigazione: le categorie restano l'unica
 * porta d'ingresso, questa sezione è solo una vetrina.
 */
export default function TourInEvidenza() {
  const { homepage, tours, TOUR_GROUP } = useSiteContent();
  const { t, href, route } = useI18n();
  const content = homepage.featuredTours;
  const featured = content.tourNames
    .map((name) => tours.find((tour) => tour.name === name))
    .filter(Boolean);

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
            to={href("/itinerari")}
            className="btn-mech hidden shrink-0 items-center gap-2.5 bg-[var(--cta)] px-6 py-3.5 text-sm text-[var(--cta-text)] hover:bg-[var(--cta-hover)] lg:inline-flex"
          >
            {t("Vedi tutti gli itinerari")}
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {featured.map((tour, i) => (
            <Reveal key={tour.slug} delay={i * 0.08}>
              <TourCard
                tour={tour}
                color={typeColors[tour.type] || "var(--accent)"}
                detailPath={route("tourDetail", { slug: tour.slug })}
              />
            </Reveal>
          ))}
        </div>

        {/* CTA a piena larghezza per mobile/tablet, dove quella nell'header è nascosta. */}
        <div className="mt-10 lg:hidden">
          <Link
            to={href("/itinerari")}
            className="btn-mech flex items-center justify-center gap-2.5 bg-[var(--cta)] px-6 py-4 text-base text-[var(--cta-text)] hover:bg-[var(--cta-hover)]"
          >
            {t("Vedi tutti gli itinerari")}
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
