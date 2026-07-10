const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ list:async()=>[], filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React from "react";
import { Check } from "lucide-react";

const reasons = [
  "Guide locali esperte",
  "Percorsi esclusivi",
  "Natura incontaminata",
  "Assistenza tecnica",
  "Esperienze autentiche",
  "Piccoli gruppi",
];

export default function WhyChoose() {
  return (
    <section className="bg-[#1C1814] py-16 lg:py-20 border-y border-[#A0612A]/20">
      <div className="max-w-7xl mx-auto px-5 lg:px-8">
        <div
          className="rounded-lg overflow-hidden shadow-2xl"
          style={{
            backgroundImage:
              "url('/media/hero-trail.png?v=real2')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="bg-[#1c1917]/55 backdrop-brightness-95 px-6 py-12 lg:px-12 lg:py-16">
            <p className="font-button text-center text-[#E4D4B0] text-xs tracking-[0.3em] uppercase mb-10">
              Perché scegliere Sardegna Trail Avventura
            </p>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-y-10 lg:gap-y-0 lg:gap-x-6">
              {reasons.map((r, i) => (
                <div
                  key={r}
                  className="flex flex-col items-center text-center lg:px-3"
                >
                  <span
                    className="font-heading leading-none mb-5"
                    style={{ color: "#c28169", fontSize: "3rem" }}
                  >
                    {i + 1}
                  </span>
                  <div
                    className="w-full mb-5"
                    style={{
                      borderTop: "1px dashed #98a68b",
                    }}
                  />
                  <div className="flex items-center gap-2 justify-center">
                    <Check size={15} style={{ color: "#98a68b" }} className="flex-shrink-0" />
                    <span
                      className="font-body uppercase tracking-wide leading-snug"
                      style={{ color: "#e5e0d7", fontSize: "0.8rem", fontWeight: 500 }}
                    >
                      {r}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
