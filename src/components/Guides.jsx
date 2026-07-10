const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ list:async()=>[], filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React from "react";
import GuideCard from "@/components/GuideCard";
import guideGianluca from "@/assets/guides/guide-gianluca-serra.png";
import guideStefano from "@/assets/guides/guide-stefano-atzei.png";
import guideVittorio from "@/assets/guides/guide-vittorio-guaitoli.png";

const guides = [
  {
    name: "Gianluca Serra",
    role: "Guida Esperta",
    desc: "Da oltre 15 anni esplora i sentieri della Sardegna, esperto di percorsi tecnici e sicurezza in fuoristrada.",
    img: guideGianluca,
  },
  {
    name: "Stefano Atzei",
    role: "Guida Esperta",
    desc: "Pilota e appassionato di enduro, conosce ogni tratturo dell'entroterra e ama condividere la cultura locale.",
    img: guideStefano,
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
    <section id="guide" className="bg-[#1C1814] topo-dark py-24 lg:py-32 border-t border-[#A0612A]/20">
      <div className="max-w-7xl mx-auto px-5 lg:px-8">
        <div className="text-center mb-16 max-w-2xl mx-auto">
          <p className="font-button text-[#A0612A] text-xs tracking-[0.3em] uppercase mb-4">Le Nostre Guide</p>
          <h2 className="font-heading text-5xl lg:text-7xl text-[#F5EBD9] leading-none">
            CHI TI <span className="text-[#A0612A]">ACCOMPAGNA</span>
          </h2>
        </div>

        <div className="grid sm:grid-cols-3 gap-1">
          {guides.map((g) => (
            <GuideCard key={g.name} guide={g} />
          ))}
        </div>
      </div>
    </section>
  );
}
