import React from "react";
import { Navigation, Luggage, Wrench, Satellite, Home, Gift } from "lucide-react";

const includes = [
{ label: "Guida locale esperta", icon: Navigation },
{ label: "Trasporto bagagli", icon: Luggage },
{ label: "Assistenza\xA0tecnica", icon: Wrench },
{ label: "Tag GPS live", icon: Satellite },
{ label: "Agriturismo mezza pensione", icon: Home },
{ label: "Gadget esclusivi", icon: Gift }];

export default function Included() {
  return (
    <section className="bg-[#F5EBD9] topo-bg py-24 lg:py-32 border-y border-[#1C1814]/10">
      <div className="max-w-5xl mx-auto px-5 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="font-heading text-5xl lg:text-7xl text-[#1C1814] leading-none">
            COSA <span className="text-[#A0612A]">COMPRENDE</span>
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 gap-x-12">
          {includes.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="flex items-center gap-5 py-5 border-b border-[#1C1814]/15">

                <Icon size={26} className="text-[#6B7A3E] flex-shrink-0" />
                <span className="font-body text-base lg:text-lg text-[#1C1814]">{item.label}</span>
              </div>);

          })}
        </div>
      </div>
    </section>);

}