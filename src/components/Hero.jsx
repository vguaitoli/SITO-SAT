const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ list:async()=>[], filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React from "react";
import { ChevronDown, MapPin } from "lucide-react";

const HERO_IMG = "/media/hero-trail.png?v=real2";

export default function Hero() {
  return (
    <section id="hero" className="relative min-h-screen w-full overflow-hidden bg-[#1C1814]">
      {/* Background image */}
      <div className="absolute inset-0">
        <img
          src={HERO_IMG}
          alt=""
          className="w-full h-full object-cover animate-[heroPan_18s_ease-in-out_infinite_alternate]" />
        
        <div className="absolute inset-0 bg-gradient-to-t from-[#1C1814] via-[#1C1814]/50 to-[#1C1814]/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#1C1814]/80 via-transparent to-transparent" />
      </div>

      {/* Topographic overlay */}
      <div className="absolute inset-0 topo-dark opacity-60" />

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-5 lg:px-8 min-h-screen flex flex-col justify-center pt-28 pb-20">
        <div className="max-w-4xl">
          <div className="flex items-center gap-2 text-[#E4D4B0] mb-6 font-button text-xs tracking-[0.3em] uppercase">
            <MapPin size={14} />
            <span>SARDEGNA · </span>
          </div>

          <h1 className="font-heading text-[#F5EBD9] leading-[0.9] mb-8">
            <span className="block text-5xl sm:text-7xl lg:text-8xl text-transparent" style={{ WebkitTextStroke: "2px #F5EBD9" }}>
              LA VERA SARDEGNA
            </span>
            <span className="block text-5xl sm:text-7xl lg:text-8xl text-transparent" style={{ WebkitTextStroke: "2px #F5EBD9" }}>
              NON SI GUARDA.
            </span>
            <span className="block text-6xl sm:text-8xl lg:text-9xl text-[#A0612A] mt-2">
              SI VIVE.
            </span>
          </h1>

          <p className="font-body text-[#F5EBD9]/85 text-lg lg:text-xl max-w-2xl leading-relaxed mb-10">Tour guidati fuoristrada Enduro, Maxienduro, Quad e 4x4 tra montagne, sterrati, spiagge, nuraghi e panorami mozzafiato. Scopri l'isola più autentica con guide locali esperte.

          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <a
              href="#contatti"
              className="btn-mech bg-[#A0612A] hover:bg-[#b87033] text-[#F5EBD9] px-8 py-4 text-base text-center">
              
              Prenota il tuo Tour
            </a>
            <a
              href="#tour"
              className="btn-mech border-2 border-[#F5EBD9]/80 hover:border-[#F5EBD9] hover:bg-[#F5EBD9] hover:text-[#1C1814] text-[#F5EBD9] px-8 py-4 text-base text-center transition-colors">
              
              Scopri gli Itinerari
            </a>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 animate-bounce">
        <span className="font-button text-[10px] text-[#F5EBD9]/60 tracking-[0.3em] uppercase">Scorri</span>
        <ChevronDown size={20} className="text-[#A0612A]" />
      </div>
    </section>);

}
