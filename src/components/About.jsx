import React from "react";
import Reveal from "@/components/Reveal";
import { tinaField } from "tinacms/dist/react";
import { useSiteContent } from "@/content/TinaContentProvider";

export default function About() {
  const { homepage } = useSiteContent();
  const content = homepage.about;

  return (
    <section id="chi-siamo" className="overflow-hidden bg-[var(--obsidian)] topo-dark py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          {/* Fotografia reale */}
          <Reveal className="relative order-2 lg:order-1">
            <img
              src={content.image}
              alt={content.imageAlt}
              width={1200}
              height={900}
              loading="lazy"
              decoding="async"
              data-tina-field={tinaField(content, "image")}
              className="aspect-[4/3] w-full object-cover"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[var(--obsidian)]/40 to-transparent" />
            <div className="absolute -bottom-5 -right-5 max-w-[200px] bg-[var(--cta)] px-8 py-6 lg:-right-8">
              <p
                className="font-heading text-5xl leading-none text-[var(--granite-mist)]"
                data-tina-field={tinaField(content, "badgeValue")}
              >
                {content.badgeValue}
              </p>
              <p
                className="mt-2 font-body text-xs leading-tight text-[var(--granite-mist)]/80"
                data-tina-field={tinaField(content, "badgeText")}
              >
                {content.badgeText}
              </p>
            </div>
          </Reveal>

          {/* Testo */}
          <div className="order-1 lg:order-2">
            <Reveal>
              <p className="font-button mb-4 text-xs uppercase tracking-[0.3em] text-[var(--accent-soft)]">
                <span data-tina-field={tinaField(content, "eyebrow")}>{content.eyebrow}</span>
              </p>
              <h2 className="mb-8 font-heading text-5xl leading-none text-[var(--granite-mist)] lg:text-7xl">
                <span data-tina-field={tinaField(content, "titleLine1")}>{content.titleLine1}</span>
                <br />
                <span data-tina-field={tinaField(content, "titleLine2")}>{content.titleLine2}</span>
                <br />
                <span className="text-[var(--accent)]" data-tina-field={tinaField(content, "titleAccent")}>
                  {content.titleAccent}
                </span>
              </h2>
            </Reveal>
            <div className="fissure-light mb-8" />
            <Reveal delay={0.1}>
              <div className="space-y-5 font-body text-lg leading-relaxed text-[var(--granite-mist)]/80">
                {content.paragraphs.map((paragraph, index) => (
                  <p key={index} data-tina-field={tinaField(content, "paragraphs")}>
                    {paragraph}
                  </p>
                ))}
                <p
                  className="border-l-2 border-[var(--accent)] pl-6 text-xl font-medium text-[var(--granite-mist)]"
                  data-tina-field={tinaField(content, "quote")}
                >
                  {content.quote}
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
