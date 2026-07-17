import React from "react";
import { Link } from "react-router-dom";
import { CalendarDays } from "lucide-react";
import SiteNav from "@/components/SiteNav";
import Footer from "@/components/Footer";
import TourCard from "@/components/TourCard.jsx?modalfix=1";
import { tours, typeColors } from "@/components/TourDetails.jsx?modalfix=1";

const sortedTours = [...tours].sort((a, b) => {
  if (!a.date && !b.date) return 0;
  if (!a.date) return 1;
  if (!b.date) return -1;
  return new Date(a.date) - new Date(b.date);
});

export default function Events() {
  return (
    <div className="bg-[#1C1814] min-h-screen topo-dark">
      <SiteNav />
      <div className="max-w-7xl mx-auto px-5 lg:px-8 pt-32 lg:pt-40 pb-16 lg:pb-24">
        <p className="font-button text-[#A0612A] text-xs tracking-[0.3em] uppercase mb-4">In Programma</p>
        <h1 className="font-heading text-5xl lg:text-7xl text-[#F5EBD9] leading-none mb-4">
          EVENTI <span className="text-[#A0612A]">& USCITE</span>
        </h1>
        <p className="font-body text-[#F5EBD9]/60 text-sm max-w-2xl mb-16">
          Date indicative, da confermare in base alla disponibilità. Contattaci per verificare i prossimi posti liberi.
        </p>

        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
          {sortedTours.map((tour) => (
            <div key={tour.name}>
              <div className="flex items-center gap-2 mb-3 font-button text-xs tracking-[0.15em] uppercase text-[#E4D4B0]">
                <CalendarDays size={14} className="text-[#A0612A]" />
                {tour.date
                  ? new Date(tour.date).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" })
                  : "Su richiesta"}
              </div>
              <TourCard tour={tour} color={typeColors[tour.type] || "#A0612A"} />
            </div>
          ))}
        </div>

        <Link
          to="/#contatti"
          className="btn-mech inline-flex bg-[#A0612A] hover:bg-[#b87033] text-[#F5EBD9] px-8 py-4 text-base mt-12"
        >
          Contattaci per Info
        </Link>
      </div>
      <Footer />
    </div>
  );
}
