import React, { useState } from "react";
import { motion } from "framer-motion";
import { Clock, Gauge, TrendingUp, Percent, MapPin, UtensilsCrossed, Calendar, Flame, Navigation } from "lucide-react";
import WeatherWidget from "@/components/WeatherWidget";
import TourFullDetailsModal from "@/components/TourFullDetailsModal.jsx?modalfix=1";

export default function TourCard({ tour, color }) {
  const [flipped, setFlipped] = useState(false);
  const [showFull, setShowFull] = useState(false);

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
            <h3 className="font-heading text-3xl text-[#F5EBD9] leading-none tracking-wide">
              {tour.name}
            </h3>
          </div>

          {/* Key stats — km & sterrato front and center */}
          <div className="grid grid-cols-2 divide-x divide-[#F5EBD9]/10 border-b border-[#F5EBD9]/10">
            <div className="p-5 text-center">
              <span className="font-button text-[10px] tracking-[0.15em] uppercase text-[#E4D4B0]/60 flex items-center justify-center gap-1.5 mb-1.5">
                <Gauge size={12} />
                Km
              </span>
              <span className="font-heading text-3xl leading-none" style={{ color }}>{tour.km}</span>
            </div>
            <div className="p-5 text-center">
              <span className="font-button text-[10px] tracking-[0.15em] uppercase text-[#E4D4B0]/60 flex items-center justify-center gap-1.5 mb-1.5">
                <Percent size={12} />
                Sterrato
              </span>
              <span className="font-heading text-3xl leading-none" style={{ color }}>{tour.sterrato}</span>
            </div>
          </div>

          {/* Secondary specs */}
          <div className="grid grid-cols-2 gap-4 p-6 pb-4">
            <div className="flex flex-col gap-1">
              <span className="font-button text-[10px] tracking-[0.15em] uppercase text-[#F5EBD9]/40 flex items-center gap-1.5">
                <Clock size={12} />
                Durata
              </span>
              <span className="font-body text-sm font-semibold text-[#F5EBD9]">{tour.durata}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-button text-[10px] tracking-[0.15em] uppercase text-[#F5EBD9]/40 flex items-center gap-1.5">
                <TrendingUp size={12} />
                Livello
              </span>
              <span className="font-body text-sm font-semibold text-[#F5EBD9]">{tour.livello}</span>
            </div>
            <div className="col-span-2 flex flex-col gap-1">
              <span className="font-button text-[10px] tracking-[0.15em] uppercase text-[#F5EBD9]/40 flex items-center gap-1.5">
                <MapPin size={12} />
                Punti di interesse
              </span>
              <span className="font-body text-sm text-[#F5EBD9]/80 leading-snug">{tour.interesse}</span>
            </div>
          </div>

          {/* Extra info + CTA */}
          <div className="px-6 pb-6 mt-auto flex flex-col gap-2.5">
            <div className="flex items-center gap-2">
              <UtensilsCrossed size={15} className="text-[#6B7A3E]" />
              <span className="font-body text-sm text-[#F5EBD9]/80">Pranzo tipico incluso</span>
            </div>
            <div className="flex items-start gap-2">
              <Calendar size={15} className="text-[#6B7A3E] flex-shrink-0 mt-0.5" />
              <span className="font-body text-sm text-[#F5EBD9]/80 leading-tight">{tour.periodo}</span>
            </div>
            <p className="font-body text-sm text-[#F5EBD9]/60 leading-relaxed mt-1">{tour.descrizione}</p>
            {tour.meteo && (
              <div onClick={(e) => e.stopPropagation()} className="border-t border-[#F5EBD9]/10 pt-2.5 mt-1">
                <WeatherWidget lat={tour.meteo.lat} lng={tour.meteo.lng} locationName={tour.meteo.nome} color={color} />
              </div>
            )}
            <div className="flex items-center justify-between mt-2">
              <button
                onClick={(e) => { e.stopPropagation(); setShowFull(true); }}
                className="btn-mech inline-flex items-center gap-2 text-[#A0612A] hover:text-[#E4D4B0] border-b border-[#A0612A] hover:border-[#E4D4B0] pb-1 w-fit text-sm transition-colors font-heading tracking-wide"
              >
                <Flame size={16} />
                BRAAAAP
              </button>
              <span className="font-button text-[10px] tracking-[0.1em] uppercase text-[#F5EBD9]/40 flex items-center gap-1.5">
                <Navigation size={12} style={{ color }} />
                Traccia GPS
              </span>
            </div>
          </div>
        </div>

        {/* BACK — stylized route map */}
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
              Traccia GPS
            </span>
            <span className="font-button text-[10px] tracking-[0.2em] uppercase text-[#F5EBD9]" style={{ color }}>
              {tour.type}
            </span>
          </div>

          <div className="flex-1 flex items-center justify-center px-6">
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
          </div>

          <div className="px-6 pb-6 text-center">
            <h4 className="font-heading text-2xl text-[#F5EBD9] tracking-wide leading-none mb-1">{tour.name}</h4>
            <p className="font-body text-xs text-[#F5EBD9]/50">{tour.km} · {tour.sterrato} sterrato</p>
          </div>
        </div>
      </div>
      {showFull && (
        <div onClick={(e) => e.stopPropagation()}>
          <TourFullDetailsModal tour={tour} color={color} onClose={() => setShowFull(false)} />
        </div>
      )}
    </motion.div>
  );
}
