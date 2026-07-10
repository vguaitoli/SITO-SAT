const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ list:async()=>[], filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React from "react";

const ABOUT_IMG = "/media/sunset-group.png?v=real2";

export default function About() {
  return (
    <section id="chi-siamo" className="bg-[#1C1814] topo-dark py-24 lg:py-32 overflow-hidden">
      <div className="max-w-7xl mx-auto px-5 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Image */}
          <div className="relative order-2 lg:order-1">
            <div className="relative aspect-[4/5] overflow-hidden">
              <img
                src={ABOUT_IMG}
                alt="Guida locale di Sardegna Trail Avventura"
                className="w-full h-full object-cover" />
              
              <div className="absolute inset-0 bg-gradient-to-t from-[#1C1814]/60 to-transparent" />
            </div>
            <div className="absolute -bottom-5 -right-5 lg:-right-8 bg-[#A0612A] px-8 py-6 max-w-[200px]">
              <p className="font-heading text-5xl text-[#F5EBD9] leading-none">100%</p>
              <p className="font-body text-xs text-[#F5EBD9]/80 mt-2 leading-tight">
                Sardegna autentica, fuori dai sentieri turistici
              </p>
            </div>
          </div>

          {/* Text */}
          <div className="order-1 lg:order-2">
            <p className="font-button text-[#E4D4B0] text-xs tracking-[0.3em] uppercase mb-4">Chi Siamo</p>
            <h2 className="font-heading text-5xl lg:text-7xl text-[#F5EBD9] leading-none mb-8">
              PASSIONE.<br />
              ESPERIENZA.<br />
              <span className="text-[#A0612A]">SARDEGNA.</span>
            </h2>
            <div className="fissure-light mb-8" />
            <div className="space-y-5 font-body text-[#F5EBD9]/80 text-lg leading-relaxed">
              <p>Sardegna Trail Avventura nasce dalla passione per il mondo del Fuoristrada e dall'amore per questa terra. Ogni percorso è stato selezionato per offrire emozioni autentiche, panorami unici e divertimento in totale sicurezza.

              </p>
              <p className="text-[#F5EBD9] text-xl font-medium border-l-2 border-[#A0612A] pl-6">
                Non proponiamo semplici escursioni. Creiamo esperienze che rimangono nella memoria.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>);

}
