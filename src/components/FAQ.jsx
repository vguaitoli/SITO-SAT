import React, { useState } from "react";
import { Plus, Minus } from "lucide-react";
import { tinaField } from "tinacms/dist/react";
import { useSiteContent } from "@/content/TinaContentProvider";


export default function FAQ() {
  const { homepage } = useSiteContent();
  const content = homepage.faq;
  const [open, setOpen] = useState(0);

  return (
    <section id="faq" className="bg-[#F5EBD9] topo-bg py-24 lg:py-32">
      <div className="max-w-4xl mx-auto px-5 lg:px-8">
        <div className="text-center mb-16">
          <p className="font-button text-[#A0612A] text-xs tracking-[0.3em] uppercase mb-4" data-tina-field={tinaField(content, "eyebrow")}>
            {content.eyebrow}
          </p>
          <h2 className="font-heading text-5xl lg:text-7xl text-[#1C1814] leading-none">
            <span className="text-[#A0612A]" data-tina-field={tinaField(content, "title")}>{content.title}</span>
          </h2>
        </div>

        <div className="space-y-px bg-[#1C1814]/10">
          {content.items.map((faq, i) => (
            <div key={faq.question} className="bg-[#F5EBD9]" data-tina-field={tinaField(faq)}>
              <button
                onClick={() => setOpen(open === i ? -1 : i)}
                className="w-full flex items-center justify-between gap-4 text-left py-6 group"
              >
                <span className="font-heading text-2xl lg:text-3xl text-[#1C1814] group-hover:text-[#A0612A] transition-colors tracking-wide">
                  {faq.question}
                </span>
                <span className="flex-shrink-0 w-10 h-10 border border-[#1C1814]/20 group-hover:border-[#A0612A] flex items-center justify-center transition-colors">
                  {open === i ? (
                    <Minus size={18} className="text-[#A0612A]" />
                  ) : (
                    <Plus size={18} className="text-[#1C1814] group-hover:text-[#A0612A] transition-colors" />
                  )}
                </span>
              </button>
              {/* grid-rows 0fr→1fr: si apre sull'altezza reale del testo, senza
                  tagliare le risposte lunghe come farebbe una max-height fissa. */}
              <div
                className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                  open === i ? "grid-rows-[1fr] pb-6" : "grid-rows-[0fr]"
                }`}
              >
                <div className="overflow-hidden">
                  <p className="font-body text-[#1C1814]/70 text-base lg:text-lg leading-relaxed pr-14">
                    {faq.answer}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
