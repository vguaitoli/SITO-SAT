import React, { useState } from "react";
import { Plus, Minus } from "lucide-react";

const faqs = [
  {
    q: "Che differenza c'è tra Weekend Adventure e Sardegna Trail Week?",
    a: "Il Weekend Adventure è un tour di 4 giorni, ideale per chi ha poco tempo ma vuole vivere un'esperienza intensa. La Sardegna Trail Week è invece un'immersione di 7 giorni tra i percorsi più suggestivi dell'isola. Offriamo anche Tour Personalizzati su misura per gruppi e moto club.",
  },
  {
    q: "Che livello è richiesto?",
    a: "Offriamo tour per tutti i livelli: da principiante (tour in quad e percorsi accessibili) fino a esperto (sentieri tecnici del Supramonte in Maxienduro ed Enduro). Ogni scheda tecnica indica il livello richiesto. Se non sei sicuro, contattaci e ti consiglieremo l'itinerario giusto per te.",
  },
  {
    q: "Cosa è incluso nel prezzo del tour?",
    a: "Ogni tour comprende guida esperta locale, trasporto bagagli, assistenza tecnica, GPS live tag per seguire il percorso, mezza pensione in agriturismo e gadget esclusivi Sardegna Trail Avventura.",
  },
  {
    q: "È possibile noleggiare la moto?",
    a: "Sì, collaboriamo con partner locali per il noleggio di moto Maxienduro, enduro e quad. Possiamo organizzare il noleggio insieme al tour. Contattaci in anticipo per verificare la disponibilità e prenotare il mezzo più adatto.",
  },
  {
    q: "Cosa succede in caso di pioggia?",
    a: "La sicurezza viene prima di tutto. In caso di condizioni meteo avverse valutiamo insieme se posticipare il tour o modificare l'itinerario con percorsi alternativi più sicuri. Il tour può essere riprogrammato senza costi aggiuntivi entro la stagione.",
  },
];

export default function FAQ() {
  const [open, setOpen] = useState(0);

  return (
    <section id="faq" className="bg-[#F5EBD9] topo-bg py-24 lg:py-32">
      <div className="max-w-4xl mx-auto px-5 lg:px-8">
        <div className="text-center mb-16">
          <p className="font-button text-[#A0612A] text-xs tracking-[0.3em] uppercase mb-4">Domande Frequenti</p>
          <h2 className="font-heading text-5xl lg:text-7xl text-[#1C1814] leading-none">
            <span className="text-[#A0612A]">FAQ</span>
          </h2>
        </div>

        <div className="space-y-px bg-[#1C1814]/10">
          {faqs.map((faq, i) => (
            <div key={i} className="bg-[#F5EBD9]">
              <button
                onClick={() => setOpen(open === i ? -1 : i)}
                className="w-full flex items-center justify-between gap-4 text-left py-6 group"
              >
                <span className="font-heading text-2xl lg:text-3xl text-[#1C1814] group-hover:text-[#A0612A] transition-colors tracking-wide">
                  {faq.q}
                </span>
                <span className="flex-shrink-0 w-10 h-10 border border-[#1C1814]/20 group-hover:border-[#A0612A] flex items-center justify-center transition-colors">
                  {open === i ? (
                    <Minus size={18} className="text-[#A0612A]" />
                  ) : (
                    <Plus size={18} className="text-[#1C1814] group-hover:text-[#A0612A] transition-colors" />
                  )}
                </span>
              </button>
              <div
                className={`overflow-hidden transition-all duration-300 ${
                  open === i ? "max-h-60 pb-6" : "max-h-0"
                }`}
              >
                <p className="font-body text-[#1C1814]/70 text-base lg:text-lg leading-relaxed pr-14">
                  {faq.a}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}