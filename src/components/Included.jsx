import React from "react";
import { Navigation, Luggage, Wrench, Satellite, Home, Gift } from "lucide-react";

const includes = [
  { label: "Guida locale esperta", icon: Navigation },
  { label: "Trasporto bagagli", icon: Luggage },
  { label: "Assistenza tecnica", icon: Wrench },
  { label: "Dispositivo GPS Live Tracking", icon: Satellite },
  { label: "Agriturismo mezza pensione", icon: Home },
  { label: "Gadget esclusivi", icon: Gift },
];

export default function Included() {
  return (
    <section className="bg-[#F5EBD9] topo-bg py-24 lg:py-32 border-y border-[#1C1814]/10">
      <div className="max-w-5xl mx-auto px-5 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="font-heading text-5xl lg:text-7xl text-[#1C1814] leading-none">
            COSA <span className="text-[#A0612A]">COMPRENDE</span>
          </h2>
          <p className="mx-auto mt-6 max-w-2xl font-body text-base leading-relaxed text-[#1C1814]/65 lg:text-lg">
            In base alla tipologia di tour, la proposta può comprendere i seguenti servizi.
            Tutti i dettagli vengono confermati prima della prenotazione.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-x-12">
          {includes.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="flex items-center gap-5 border-b border-[#1C1814]/15 py-5"
              >
                <Icon size={26} className="flex-shrink-0 text-[#6B7A3E]" aria-hidden="true" />
                <span className="font-body text-base lg:text-lg text-[#1C1814]">{item.label}</span>
              </div>
            );
          })}
        </div>
        <p className="mt-8 border-l-2 border-[#A0612A] pl-5 font-body text-sm leading-relaxed text-[#1C1814]/70 lg:text-base">
          Quando previsto, il dispositivo GPS Live Tracking viene fornito
          dall'organizzazione, che può così verificare in ogni momento che il gruppo
          rimanga compatto e che nessun partecipante resti isolato o si disperda lungo
          il percorso. Non viene utilizzato come navigatore e non fornisce indicazioni
          di percorso ai partecipanti.
        </p>
      </div>
    </section>
  );
}
