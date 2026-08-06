import React, { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, BadgeEuro, BedDouble, Clock, Gauge, TrendingUp, Percent, MapPin, UtensilsCrossed, Calendar, Navigation, Users } from "lucide-react";
import { tinaField } from "tinacms/dist/react";
import { useSiteContent } from "@/content/TinaContentProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { ROUTE_MAPS } from "@/data/route-maps";

export default function TourCard({ tour, color, detailPath }) {
  const { TOUR_GROUP } = useSiteContent();
  const { t } = useI18n();
  const [flipped, setFlipped] = useState(false);
  const routeMap = ROUTE_MAPS[tour.slug];

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={`flip-card-container h-full cursor-pointer ${flipped ? "is-flipped" : ""}`}
      onClick={() => setFlipped((f) => !f)}
    >
      <div className="flip-card-inner">
        {/* FRONT */}
        <div className="flip-card-face flip-card-front bg-[#1C1814] flex flex-col h-full">
          {/* Header */}
          <div className="p-6 pb-5 border-b border-[#F5EBD9]/10">
            <span
              className="inline-block font-button text-[10px] tracking-[0.2em] uppercase text-[#1C1814] px-3 py-1.5 mb-3"
              style={{ backgroundColor: color }}
            >
              {tour.type}
            </span>
            {/* Altezza riservata a due righe di titolo: senza, un titolo che va a
                capo o un sottotitolo presente disallineano i dati fra schede
                affiancate. */}
            <div className="sm:min-h-[3.75rem]">
              <h3 className="font-heading text-3xl text-[#F5EBD9] leading-none tracking-wide">
                <span data-tina-field={tinaField(tour, "name")}>{tour.name}</span>
              </h3>
              {tour.subtitle && (
                <p
                  className="mt-2 font-button text-[11px] uppercase tracking-[0.18em] text-[#E4D4B0]/70"
                  data-tina-field={tinaField(tour, "subtitle")}
                >
                  {tour.subtitle}
                </p>
              )}
            </div>
          </div>

          {/* Key stats — km & sterrato front and center */}
          <div className="grid grid-cols-2 divide-x divide-[#F5EBD9]/10 border-b border-[#F5EBD9]/10">
            <div className="p-5 text-center">
              <span className="font-button text-[10px] tracking-[0.15em] uppercase text-[#E4D4B0]/60 flex items-center justify-center gap-1.5 mb-1.5">
                <Gauge size={12} />
                Km
              </span>
              <span className="font-heading text-3xl leading-none sm:flex sm:min-h-[2em] sm:items-center sm:justify-center" style={{ color }}>{tour.km}</span>
            </div>
            <div className="p-5 text-center">
              <span className="font-button text-[10px] tracking-[0.15em] uppercase text-[#E4D4B0]/60 flex items-center justify-center gap-1.5 mb-1.5">
                <Percent size={12} />
                {t("Sterrato")}
              </span>
              <span className="font-heading text-3xl leading-none sm:flex sm:min-h-[2em] sm:items-center sm:justify-center" style={{ color }}>{tour.sterrato}</span>
            </div>
          </div>

          {/* Secondary specs */}
          <div className="grid grid-cols-2 gap-4 p-6 pb-4">
            <div className="flex flex-col gap-1">
              <span className="font-button text-[10px] tracking-[0.15em] uppercase text-[#F5EBD9]/40 flex items-center gap-1.5">
                <Clock size={12} />
                {t("Durata")}
              </span>
              <span className="font-body text-sm font-semibold text-[#F5EBD9]">{tour.durata}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-button text-[10px] tracking-[0.15em] uppercase text-[#F5EBD9]/40 flex items-center gap-1.5">
                <TrendingUp size={12} />
                {t("Livello")}
              </span>
              <span className="font-body text-sm font-semibold text-[#F5EBD9]">{tour.livello}</span>
            </div>
            <div className="col-span-2 flex flex-col gap-1">
              <span className="font-button text-[10px] tracking-[0.15em] uppercase text-[#F5EBD9]/40 flex items-center gap-1.5">
                <Users size={12} aria-hidden="true" />
                {t("Partecipanti")}
              </span>
              <span className="font-body text-sm font-semibold text-[#F5EBD9]">{TOUR_GROUP.label}</span>
            </div>
            <div className="col-span-2 flex flex-col gap-1">
              <span className="font-button text-[10px] tracking-[0.15em] uppercase text-[#F5EBD9]/40 flex items-center gap-1.5">
                <MapPin size={12} />
                {t("Punti di interesse")}
              </span>
              <span className="font-body text-sm text-[#F5EBD9]/80 leading-snug sm:min-h-[2.5rem]">{tour.interesse}</span>
            </div>
          </div>

          {/* Extra info + CTA. Il blocco non è ancorato in basso: lo era, e nelle
              schede con meno voci si apriva un vuoto a metà scheda. Ora il
              contenuto scorre dall'alto e solo il pulsante resta in fondo. */}
          <div className="px-6 pb-6 flex flex-1 flex-col gap-2.5">
            {tour.pranzo !== false && (
              <div className="flex items-center gap-2">
                <UtensilsCrossed size={15} className="text-[#6B7A3E]" />
                <span className="font-body text-sm text-[#F5EBD9]/80">{t("Pranzo tipico incluso")}</span>
              </div>
            )}
            {tour.soggiorno && (
              <div className="flex items-center gap-2">
                <BedDouble size={15} className="text-[#6B7A3E]" aria-hidden="true" />
                <span className="font-body text-sm text-[#F5EBD9]/80">{tour.soggiorno}</span>
              </div>
            )}
            {tour.price && (
              <div className="flex items-center gap-2">
                <BadgeEuro size={15} className="text-[#6B7A3E]" aria-hidden="true" />
                <span
                  className="font-body text-sm text-[#F5EBD9]/80"
                  data-tina-field={tinaField(tour, "price")}
                >
                  {tour.price}
                </span>
              </div>
            )}
            <div className="flex items-start gap-2">
              <Calendar size={15} className="text-[#6B7A3E] flex-shrink-0 mt-0.5" />
              <span
                className="font-body text-sm text-[#F5EBD9]/80 leading-tight"
                data-tina-field={tinaField(tour, "period")}
              >
                {tour.periodo}
              </span>
            </div>
            <p
              className="font-body text-sm text-[#F5EBD9]/60 leading-relaxed mt-1"
              data-tina-field={tinaField(tour, "description")}
            >
              {tour.descrizione}
            </p>
            <div className="mt-auto flex items-center pt-2">
              <Link
                to={detailPath}
                onClick={(event) => event.stopPropagation()}
                className="btn-mech inline-flex items-center gap-2 text-[#A0612A] hover:text-[#E4D4B0] border-b border-[#A0612A] hover:border-[#E4D4B0] pb-1 w-fit text-sm transition-colors font-heading tracking-wide"
              >
                {t("Vedi il programma")}
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>

        {/* BACK — anteprima grafica illustrativa dell'itinerario */}
        <div
          className="flip-card-face flip-card-back flex flex-col h-full"
          style={{
            backgroundColor: "#1C1814",
            backgroundImage:
              "repeating-linear-gradient(115deg, transparent, transparent 22px, rgba(245,235,217,0.05) 22px, rgba(245,235,217,0.05) 23px)",
          }}
        >
          <div className="p-6 pb-3 flex items-center justify-between">
            <span className="font-button text-[10px] tracking-[0.2em] uppercase text-[#F5EBD9]/50 flex items-center gap-1.5">
              <Navigation size={12} />
              {t("Anteprima del tour")}
            </span>
            <span className="font-button text-[10px] tracking-[0.2em] uppercase text-[#F5EBD9]" style={{ color }}>
              {tour.type}
            </span>
          </div>

          {/* La mappa reale del percorso quando esiste; altrimenti il tracciato
              decorativo, che resta il ripiego per i tour senza mappa. La mappa
              riempie lo spazio disponibile: va letta, e il limite di 160px
              pensato per il tracciato astratto la renderebbe illeggibile. */}
          <div className="flex-1 flex items-center justify-center px-6">
            {routeMap ? (
              <img
                src={routeMap.src}
                alt={routeMap.alt}
                loading="lazy"
                decoding="async"
                className="h-full max-h-full w-full object-contain"
              />
            ) : (
              <svg viewBox="0 0 200 140" className="w-full h-full max-h-40">
                <path
                  d="M 15 115 C 45 100, 40 70, 70 65 S 110 30, 100 15 S 140 20, 130 45 S 180 60, 185 95"
                  fill="none"
                  stroke={color}
                  strokeWidth="2.5"
                  strokeDasharray="6 5"
                  strokeLinecap="round"
                />
                <circle cx="15" cy="115" r="5" fill={color} />
                <circle cx="185" cy="95" r="5" fill="none" stroke={color} strokeWidth="2.5" />
              </svg>
            )}
          </div>

          <div className="px-6 pb-6 text-center">
            <h4 className="font-heading text-2xl text-[#F5EBD9] tracking-wide leading-none mb-1">{tour.name}</h4>
            <p className="font-body text-xs text-[#F5EBD9]/50">{tour.km} · {tour.sterrato} {t("sterrato")}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
