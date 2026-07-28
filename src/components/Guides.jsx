import React from "react";
import GuideCard from "@/components/GuideCard";
import { tinaField } from "tinacms/dist/react";
import { useSiteContent } from "@/content/TinaContentProvider";

export default function Guides() {
  const { homepage } = useSiteContent();
  const content = homepage.guides;

  return (
    <section
      id="guide"
      className="border-t border-[#A0612A]/20 bg-[#1C1814] topo-dark py-16 sm:py-24 lg:py-32"
    >
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="mx-auto mb-10 max-w-2xl text-center sm:mb-14">
          <p
            className="mb-4 font-button text-xs uppercase tracking-[0.3em] text-[#A0612A]"
            data-tina-field={tinaField(content, "eyebrow")}
          >
            {content.eyebrow}
          </p>
          <h2 className="font-heading text-4xl leading-none text-[#F5EBD9] sm:text-5xl lg:text-7xl">
            <span data-tina-field={tinaField(content, "title")}>{content.title}</span>{" "}
            <span className="text-[#A0612A]" data-tina-field={tinaField(content, "accent")}>
              {content.accent}
            </span>
          </h2>
        </div>

        {/* Due guide: card affiancate e centrate, contenute su desktop.
            Griglia definita partendo dal mobile. */}
        <div className="mx-auto grid max-w-3xl grid-cols-2 gap-3 sm:gap-6">
          {content.items.map((guide) => (
            <div key={guide.name} data-tina-field={tinaField(guide)}>
              <GuideCard
                guide={{
                  name: guide.name,
                  role: guide.role,
                  desc: guide.description,
                  img: guide.image,
                  imageAlt: guide.imageAlt,
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
