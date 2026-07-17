import React from "react";
import GuideCard from "@/components/GuideCard";
import guideGianluca from "@/assets/guides/guide-gianluca-serra.webp";
import guideVittorio from "@/assets/guides/guide-vittorio-guaitoli.webp";

const guides = [
  {
    name: "Gianluca Serra",
    role: "Guida Esperta",
    desc: "Da oltre 15 anni esplora i sentieri della Sardegna, esperto di percorsi tecnici e sicurezza in fuoristrada.",
    img: guideGianluca,
  },
  {
    name: "Vittorio Guaitoli",
    role: "Guida Esperta",
    desc: "Specialista in assistenza tecnica e navigazione GPS, garantisce un'avventura sicura ad ogni tappa del tour.",
    img: guideVittorio,
  },
];

export default function Guides() {
  return (
    <section
      id="guide"
      className="border-t border-[#A0612A]/20 bg-[#1C1814] topo-dark py-16 sm:py-24 lg:py-32"
    >
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="mx-auto mb-10 max-w-2xl text-center sm:mb-14">
          <p className="mb-4 font-button text-xs uppercase tracking-[0.3em] text-[#A0612A]">Le Nostre Guide</p>
          <h2 className="font-heading text-4xl leading-none text-[#F5EBD9] sm:text-5xl lg:text-7xl">
            CHI TI <span className="text-[#A0612A]">ACCOMPAGNA</span>
          </h2>
        </div>

        {/* Due guide: card affiancate e centrate, contenute su desktop.
            Griglia definita partendo dal mobile. */}
        <div className="mx-auto grid max-w-3xl grid-cols-2 gap-3 sm:gap-6">
          {guides.map((g) => (
            <GuideCard key={g.name} guide={g} />
          ))}
        </div>
      </div>
    </section>
  );
}
