import React from "react";
import Reveal from "@/components/Reveal";
import { cn } from "@/lib/utils";

/**
 * Intestazione di sezione riutilizzabile: occhiello + titolo su due righe con
 * la seconda in accento. `tone` adatta i colori a fondo scuro o chiaro.
 */
export default function SectionHeading({
  eyebrow,
  title,
  accent,
  intro,
  tone = "dark",
  align = "left",
  className = "",
  as = "h2",
}) {
  const Tag = as;
  const light = tone === "light";
  return (
    <Reveal
      className={cn(
        align === "center" ? "mx-auto max-w-3xl text-center" : "max-w-3xl",
        className,
      )}
    >
      {eyebrow && (
        <p className="font-button mb-4 text-xs uppercase tracking-[0.3em] text-[var(--accent)]">
          {eyebrow}
        </p>
      )}
      <Tag
        className={cn(
          "font-heading text-5xl leading-[0.95] lg:text-7xl",
          light ? "text-[var(--text-on-light)]" : "text-[var(--text-on-dark)]",
        )}
      >
        {title}
        {accent && (
          <>
            {" "}
            <span className="text-[var(--accent)]">{accent}</span>
          </>
        )}
      </Tag>
      {intro && (
        <p
          className={cn(
            "mt-6 font-body text-lg leading-relaxed",
            light ? "text-[var(--text-on-light-muted)]" : "text-[var(--text-on-dark-muted)]",
          )}
        >
          {intro}
        </p>
      )}
    </Reveal>
  );
}
