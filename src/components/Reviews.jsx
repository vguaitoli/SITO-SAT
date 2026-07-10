import React from "react";
import { Star, Quote } from "lucide-react";

const reviews = [
  {
    text: "Esperienza incredibile, organizzazione perfetta.",
    author: "Marco F.",
    detail: "Tour Gennargentu Wild",
  },
  {
    text: "La Sardegna più vera, lontana dal turismo.",
    author: "Laura B.",
    detail: "Weekend Adventure",
  },
  {
    text: "Percorsi spettacolari e guide eccezionali.",
    author: "Andrea M.",
    detail: "Supramonte Extreme",
  },
];

export default function Reviews() {
  return (
    <section id="recensioni" className="bg-[#A0612A] topo-dark py-24 lg:py-32 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-5 lg:px-8 relative z-10">
        <div className="text-center mb-16">
          <div className="flex justify-center gap-1 mb-6">
            {[...Array(5)].map((_, i) => (
              <Star key={i} size={28} className="text-[#E4D4B0] fill-[#E4D4B0]" />
            ))}
          </div>
          <p className="font-button text-[#F5EBD9]/80 text-xs tracking-[0.3em] uppercase mb-4">Recensioni</p>
          <h2 className="font-heading text-5xl lg:text-7xl text-[#F5EBD9] leading-none">
            CHI C'È STATO<br />
            <span className="text-[#1C1814]">RACCONTA</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {reviews.map((r, i) => (
            <article
              key={i}
              className="bg-[#1C1814] p-8 lg:p-10 flex flex-col"
            >
              <Quote size={36} className="text-[#A0612A] mb-6" />
              <p className="font-heading text-2xl lg:text-3xl text-[#F5EBD9] leading-tight mb-8 tracking-wide">
                "{r.text}"
              </p>
              <div className="mt-auto">
                <div className="flex gap-0.5 mb-3">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} size={14} className="text-[#E4D4B0] fill-[#E4D4B0]" />
                  ))}
                </div>
                <p className="font-button text-sm tracking-wider uppercase text-[#F5EBD9]">{r.author}</p>
                <p className="font-body text-xs text-[#F5EBD9]/50 mt-1">{r.detail}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}