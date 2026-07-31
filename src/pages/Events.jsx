import React from "react";
import { Link } from "react-router-dom";
import { CalendarDays, MessageCircle } from "lucide-react";
import SiteNav from "@/components/SiteNav";
import Footer from "@/components/Footer";
import TourCard from "@/components/TourCard.jsx";
import { typeColors } from "@/components/TourDetails.jsx";
import { useSiteContent } from "@/content/TinaContentProvider";
import { useI18n } from "@/i18n/I18nProvider";

function getLocalTourDate(date) {
  if (!date) return null;
  return new Date(date.includes("T") ? date : `${date}T00:00:00`);
}

function formatTourDate(tour, dateLocale, fallback) {
  const startDate = getLocalTourDate(tour.date);
  if (!startDate) return fallback;

  if (!tour.endDate) {
    return startDate.toLocaleDateString(dateLocale, {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  const endDate = getLocalTourDate(tour.endDate);
  const startLabel = startDate.toLocaleDateString(dateLocale, {
    day: "numeric",
    month: "long",
  });
  const endLabel = endDate.toLocaleDateString(dateLocale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return `${startLabel} – ${endLabel}`;
}

export default function Events() {
  const { events, CTA_LABELS, SITE, TOUR_GROUP } = useSiteContent();
  const { t, href, route, localeMeta } = useI18n();
  const sortedTours = [...events].sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingTours = sortedTours.filter((tour) => {
    const tourDate = getLocalTourDate(tour.endDate || tour.date);
    return !tourDate || tourDate >= today;
  });
  const concludedTours = sortedTours
    .filter((tour) => {
      const tourDate = getLocalTourDate(tour.endDate || tour.date);
      return tourDate && tourDate < today;
    })
    .reverse();

  const sections = [
    {
      id: "upcoming",
      label: t("Prossime partenze"),
      tours: upcomingTours,
      concluded: false,
    },
    {
      id: "concluded",
      label: t("Conclusi"),
      tours: concludedTours,
      concluded: true,
    },
  ];

  return (
    <div className="bg-[#1C1814] min-h-screen topo-dark">
      <SiteNav />
      <div className="max-w-7xl mx-auto px-5 lg:px-8 pt-32 lg:pt-40 pb-16 lg:pb-24">
        <p className="font-button text-[#A0612A] text-xs tracking-[0.3em] uppercase mb-4">{t("Calendario")}</p>
        <h1 className="font-heading text-5xl lg:text-7xl text-[#F5EBD9] leading-none mb-4">
          {t("EVENTI")} <span className="text-[#A0612A]">{t("& USCITE")}</span>
        </h1>
        <p className="font-body text-[#F5EBD9]/60 text-sm max-w-2xl mb-14">
          {t("Date indicative, da confermare in base alla disponibilità.")} {TOUR_GROUP.sentence} {t("Contattaci per verificare i prossimi posti liberi.")}
        </p>

        <div className="space-y-20">
          {sections
            .filter((section) => section.tours.length > 0)
            .map((section) => (
              <section key={section.id} aria-labelledby={`${section.id}-title`}>
                <div className="mb-8 flex items-center gap-4">
                  <h2
                    id={`${section.id}-title`}
                    className="font-heading text-3xl uppercase tracking-wide text-[#F5EBD9] lg:text-4xl"
                  >
                    {section.label}
                  </h2>
                  <span className="font-button text-xs tracking-[0.15em] text-[#A0612A]">
                    {section.tours.length}
                  </span>
                </div>

                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {section.tours.map((tour) => (
                    <article key={tour.slug}>
                      <div className="mb-3 flex items-center justify-between gap-3 font-button text-xs uppercase tracking-[0.15em] text-[#E4D4B0]">
                        <span className="flex items-center gap-2">
                          <CalendarDays
                            size={14}
                            className={section.concluded ? "text-[#F5EBD9]/45" : "text-[#A0612A]"}
                            aria-hidden="true"
                          />
                          {formatTourDate(tour, localeMeta.dateLocale, t("Su richiesta"))}
                        </span>
                        {section.concluded && (
                          <span className="border border-[#F5EBD9]/20 px-2.5 py-1 text-[10px] text-[#F5EBD9]/55">
                            {t("Concluso")}
                          </span>
                        )}
                      </div>
                      <div className={section.concluded ? "opacity-90 grayscale-[25%]" : ""}>
                        <TourCard
                          tour={tour}
                          color={typeColors[tour.type] || "#A0612A"}
                          detailPath={route("eventDetail", { slug: tour.slug })}
                        />
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
        </div>

        {upcomingTours.length === 0 && (
          <div className="mt-12 border border-[#F5EBD9]/15 px-6 py-8">
            <p className="font-body text-[#F5EBD9]/70">
              {t("Le prossime date sono in preparazione. Contattaci per organizzare un tour su richiesta.")}
            </p>
          </div>
        )}

        <div className="mt-12 flex flex-col gap-4 sm:flex-row">
          <Link
            to={href("/#contatti")}
            className="btn-mech inline-flex items-center justify-center bg-[#A0612A] px-8 py-4 text-base text-[#F5EBD9] hover:bg-[#b87033]"
          >
            {CTA_LABELS.primary}
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
      <Footer />
    </div>
  );
}
