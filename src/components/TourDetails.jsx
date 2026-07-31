import React from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import TourCard from "@/components/TourCard.jsx";
import tourCatalogContent from "../../content/tours/index.json";
import { normalizeTours } from "@/content/normalize";
import { useSiteContent } from "@/content/TinaContentProvider";
import { useI18n } from "@/i18n/I18nProvider";

const filterLabels = {
  weekend: "Weekend Adventure",
  week: "Sardegna Trail Week",
  custom: "Tour Personalizzati",
};

export const tours = normalizeTours(tourCatalogContent);

export const typeColors = {
  Maxienduro: "#A0612A",
  Enduro: "#6B7A3E",
  Quad: "#C9A227",
  "4x4": "#8B5E3C",
  "E-Bike": "#4F8A6B",
  "Su Misura": "#B08968",
};

export default function TourDetails({ activeFilter, onClearFilter, id = "tour-details", className = "", showAllByDefault = false, hideHeader = false }) {
  const { tours: editableTours } = useSiteContent();
  const { t, route } = useI18n();
  if (!activeFilter && !showAllByDefault) return null;

  const filteredTours = activeFilter
    ? editableTours.filter((t) => t.groups.includes(activeFilter))
    : editableTours;

  return (
    <motion.section
      id={id}
      className={`bg-[#F5EBD9] topo-bg ${hideHeader ? "pt-16 pb-24 lg:pt-20 lg:pb-32" : "py-24 lg:py-32"} ${className}`}
      initial={{ opacity: 0, y: -24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <div className="max-w-7xl mx-auto px-5 lg:px-8">
        {!hideHeader && (
          <div className="mb-16 max-w-3xl">
            <p className="font-button text-[#A0612A] text-xs tracking-[0.3em] uppercase mb-4">{t("Schede Tecniche")}</p>
            <h2 className="font-heading text-5xl lg:text-7xl text-[#1C1814] leading-none">
              {t("ITINERARI IN")}<br />
              <span className="text-[#A0612A]">{t("DETTAGLIO")}</span>
            </h2>
            <p className="font-body text-[#1C1814]/70 text-lg mt-6">
              {t("Ogni tour con dati tecnici completi: durata, chilometri, livello, percentuale di sterrato, punti di interesse e periodo consigliato.")}
            </p>
            {activeFilter && (
              <button
                onClick={onClearFilter}
                className="mt-6 inline-flex items-center gap-2 font-button text-xs tracking-[0.15em] uppercase text-[#F5EBD9] bg-[#A0612A] hover:bg-[#8a531f] px-4 py-2 transition-colors"
              >
                {t(filterLabels[activeFilter])}
                <X size={14} />
              </button>
            )}
          </div>
        )}

        <div id={`${id}-grid`} className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredTours.map((tour) => (
            <TourCard
              key={tour.slug}
              tour={tour}
              color={typeColors[tour.type] || "#A0612A"}
              detailPath={route("tourDetail", { slug: tour.slug })}
            />
          ))}
        </div>
      </div>
    </motion.section>
  );
}
