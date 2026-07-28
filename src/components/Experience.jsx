import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Route, Bike, Castle, Trees, Mountain, Waves, Building2, UtensilsCrossed } from "lucide-react";
import { tinaField } from "tinacms/dist/react";
import { useSiteContent } from "@/content/TinaContentProvider";

const icons = {
  route: Route,
  bike: Bike,
  castle: Castle,
  trees: Trees,
  mountain: Mountain,
  waves: Waves,
  building: Building2,
  food: UtensilsCrossed,
};

export default function Experience() {
  const { homepage } = useSiteContent();
  const content = homepage.journey;
  const [openIndex, setOpenIndex] = useState(null);

  return (
    <section className="bg-[#252019] topo-dark py-24 lg:py-32">
      <div className="max-w-7xl mx-auto px-5 lg:px-8">
        <div className="text-center mb-16">
          <p
            className="font-button text-[#E4D4B0] text-xs tracking-[0.3em] uppercase mb-4"
            data-tina-field={tinaField(content, "eyebrow")}
          >
            {content.eyebrow}
          </p>
          <h2 className="font-heading text-5xl lg:text-7xl text-[#F5EBD9] leading-none">
            <span data-tina-field={tinaField(content, "title")}>{content.title}</span>{" "}
            <span className="text-[#A0612A]" data-tina-field={tinaField(content, "accent")}>
              {content.accent}
            </span>
          </h2>
          <p
            className="mt-6 max-w-2xl mx-auto font-body text-base sm:text-lg leading-relaxed text-[#F5EBD9]/70"
            data-tina-field={tinaField(content, "intro")}
          >
            {content.intro}
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[#F5EBD9]/10">
          {content.items.map((item, i) => {
            const Icon = icons[item.icon] || Route;
            const isOpen = openIndex === i;
            return (
              <button
                key={item.label}
                data-tina-field={tinaField(item)}
                onClick={() => setOpenIndex(isOpen ? null : i)}
                className="group bg-[#252019] hover:bg-[#1C1814] p-8 lg:p-10 flex flex-col items-center text-center transition-colors duration-300"
              >
                <motion.div
                  animate={{ rotate: isOpen ? 0 : 45 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="w-14 h-14 border border-[#6B7A3E]/50 group-hover:border-[#A0612A] flex items-center justify-center mb-5"
                  style={{ borderColor: isOpen ? "#A0612A" : undefined }}
                >
                  <Icon size={24} className={`text-[#E4D4B0] transition-transform duration-300 ${isOpen ? "" : "-rotate-45"}`} />
                </motion.div>
                <span className="font-body text-sm text-[#F5EBD9]/85 leading-tight">{item.label}</span>
                <AnimatePresence>
                  {isOpen && (
                    <motion.p
                      initial={{ opacity: 0, height: 0, marginTop: 0 }}
                      animate={{ opacity: 1, height: "auto", marginTop: 12 }}
                      exit={{ opacity: 0, height: 0, marginTop: 0 }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                      className="font-body text-xs text-[#F5EBD9]/60 leading-relaxed overflow-hidden"
                    >
                      {item.description}
                    </motion.p>
                  )}
                </AnimatePresence>
              </button>
            );
          })}
        </div>
      </div>
    </section>);

}
