import React from "react";
import { Navigation, Luggage, Wrench, Satellite, Home, Gift } from "lucide-react";
import { tinaField } from "tinacms/dist/react";
import { useSiteContent } from "@/content/TinaContentProvider";

const icons = {
  navigation: Navigation,
  luggage: Luggage,
  wrench: Wrench,
  satellite: Satellite,
  home: Home,
  gift: Gift,
};

export default function Included() {
  const { homepage } = useSiteContent();
  const content = homepage.included;

  return (
    <section className="bg-[#F5EBD9] topo-bg py-24 lg:py-32 border-y border-[#1C1814]/10">
      <div className="max-w-5xl mx-auto px-5 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="font-heading text-5xl lg:text-7xl text-[#1C1814] leading-none">
            <span data-tina-field={tinaField(content, "title")}>{content.title}</span>{" "}
            <span className="text-[#A0612A]" data-tina-field={tinaField(content, "accent")}>
              {content.accent}
            </span>
          </h2>
          <p
            className="mx-auto mt-6 max-w-2xl font-body text-base leading-relaxed text-[#1C1814]/65 lg:text-lg"
            data-tina-field={tinaField(content, "intro")}
          >
            {content.intro}
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-x-12">
          {content.items.map((item) => {
            const Icon = icons[item.icon] || Navigation;
            return (
              <div
                key={item.label}
                data-tina-field={tinaField(item)}
                className="flex items-center gap-5 border-b border-[#1C1814]/15 py-5"
              >
                <Icon size={26} className="flex-shrink-0 text-[#6B7A3E]" aria-hidden="true" />
                <span className="font-body text-base lg:text-lg text-[#1C1814]">{item.label}</span>
              </div>
            );
          })}
        </div>
        <p
          className="mt-8 border-l-2 border-[#A0612A] pl-5 font-body text-sm leading-relaxed text-[#1C1814]/70 lg:text-base"
          data-tina-field={tinaField(content, "note")}
        >
          {content.note}
        </p>
      </div>
    </section>
  );
}
