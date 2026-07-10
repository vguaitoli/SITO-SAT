const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ list:async()=>[], filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React from "react";
import { motion } from "framer-motion";
import { Moon, CalendarDays, SlidersHorizontal } from "lucide-react";
import TourDetails from "@/components/TourDetails.jsx?modalfix=1";

const TOUR_IMG_DAILY = "/media/sunset-group.png?v=real2";
const TOUR_IMG_WEEKEND = "/media/coast-trail.png?v=real2";
const TOUR_IMG_CUSTOM = "/media/nuraghe-stop.png?v=real2";

const tours = [
{
  title: "Weekend Adventure",
  desc: "Quattro giorni di puro divertimento tra sterrati, montagne e pernottamenti in Sardegna.",
  img: TOUR_IMG_DAILY,
  icon: Moon,
  tag: "4 Giorni",
  group: "weekend"
},
{
  title: "Sardegna Trail Week",
  desc: "Una settimana immersiva tra i percorsi più suggestivi dell'isola, natura e tradizione.",
  img: TOUR_IMG_WEEKEND,
  icon: CalendarDays,
  tag: "7 Giorni",
  group: "week"
},
{
  title: "Tour Personalizzati",
  desc: "Esperienze create su misura per gruppi e moto club.",
  img: TOUR_IMG_CUSTOM,
  icon: SlidersHorizontal,
  tag: "Su Misura",
  group: "custom"
}];

export default function TourTypes({ onSelect, activeFilter, onClearFilter }) {
  return (
    <section id="tour" className="bg-[#F5EBD9] topo-bg py-24 lg:py-32">
      <div className="max-w-7xl mx-auto px-5 lg:px-8">
        <div className="mb-16 max-w-3xl">
          <p className="font-button text-[#A0612A] text-xs tracking-[0.3em] uppercase mb-4">I Tour</p>
          <h2 className="font-heading text-5xl lg:text-7xl text-[#1C1814] leading-none">
            SCEGLI LA TUA<br />
            <span className="text-[#A0612A]">AVVENTURA</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-1">
          {tours.map((t, i) => {
            const Icon = t.icon;
            return (
              <React.Fragment key={t.title}>
              <motion.button
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.5, ease: "easeOut", delay: i * 0.1 }}
                onClick={() => onSelect(t.group)}
                className="group relative bg-[#1C1814] overflow-hidden cursor-pointer block text-left w-full">
                
                <div className="aspect-[3/4] overflow-hidden">
                  <img
                    src={t.img}
                    alt={t.title}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover opacity-70 group-hover:opacity-90 group-hover:scale-105 transition-all duration-500" />
                  
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-[#1C1814] via-[#1C1814]/40 to-transparent" />
                <div className="absolute inset-0 topo-dark opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                <div className="absolute top-5 right-5 z-10">
                  <span className="font-button text-[10px] tracking-[0.2em] uppercase text-[#1C1814] bg-[#E4D4B0] px-3 py-1.5">
                    {t.tag}
                  </span>
                </div>

                <div className="absolute bottom-0 inset-x-0 p-7 z-10">
                  <div className="flex items-center gap-3 mb-3">
                    <Icon size={22} className="text-[#A0612A]" />
                    <h3 className="font-heading text-3xl text-[#F5EBD9] tracking-wide">{t.title}</h3>
                  </div>
                  <p className="font-body text-sm text-[#F5EBD9]/75 leading-relaxed">{t.desc}</p>
                  <div className="mt-5 flex items-center gap-2 font-button text-xs tracking-[0.2em] uppercase text-[#E4D4B0] opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    Scopri i dettagli
                    <span className="w-8 h-px bg-[#E4D4B0]" />
                  </div>
                </div>
              </motion.button>
              {t.group === activeFilter && (
                <div className="md:hidden">
                  <TourDetails
                    id={`tour-details-mobile-${t.group}`}
                    activeFilter={activeFilter}
                    onClearFilter={onClearFilter}
                  />
                </div>
              )}
              </React.Fragment>);

          })}
        </div>
      </div>
    </section>);

}
