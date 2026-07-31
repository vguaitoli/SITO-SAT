import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Route } from "lucide-react";
import Reveal from "@/components/Reveal";
import SectionHeading from "@/components/SectionHeading";
import { CATEGORIE } from "@/data/categorie";
import { fotoProps } from "@/data/foto-helpers";
import { tinaField } from "tinacms/dist/react";
import { useSiteContent } from "@/content/TinaContentProvider";
import { useI18n } from "@/i18n/I18nProvider";

/**
 * "Scegli la tua avventura": una card per ciascuna categoria, in una griglia
 * uniforme che scala con il numero di esperienze.
 */
function Card({ cat, featuredMobile = false }) {
  const { t, href } = useI18n();
  const photo = fotoProps(cat.fotoCard);
  const cta =
    cat.kind === "course"
      ? t("Scopri i corsi")
      : cat.tourType
        ? t("Scopri i tour")
        : t("Richiedi informazioni");
  return (
    <Link
      to={href(`/esperienze/${cat.id}`)}
      className={`group relative block h-full overflow-hidden bg-[var(--obsidian)] ${
        featuredMobile ? "aspect-[8/5] md:aspect-[4/5]" : "aspect-[4/5]"
      }`}
      aria-label={`${cat.nome} — ${cta}`}
    >
      {photo ? (
        <img
          src={photo.src}
          srcSet={photo.srcSet}
          sizes={featuredMobile ? "(min-width: 768px) 33vw, 100vw" : "(min-width: 768px) 33vw, 50vw"}
          alt={t(photo.alt)}
          width={1200}
          height={Math.round(1200 / photo.aspect)}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover opacity-75 transition-all duration-700 ease-out group-hover:scale-105 group-hover:opacity-95"
        />
      ) : (
        // Nessuna foto reale ancora disponibile per questa categoria: un'icona
        // al posto di una foto inventata o non pertinente.
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[var(--surface-dark-alt)] to-[var(--obsidian)]">
          <Route size={72} className="text-[var(--accent)]/25" aria-hidden="true" strokeWidth={1.25} />
        </div>
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[var(--obsidian)] via-[var(--obsidian)]/45 to-transparent" />

      <div className="absolute inset-x-0 bottom-0 p-4 transition-transform duration-500 ease-out group-hover:-translate-y-1 sm:p-6 lg:p-7">
        <p className="font-button text-[10px] uppercase tracking-[0.25em] text-[var(--accent-soft)]">
          {cat.claim}
        </p>
        <h3 className="mt-2 font-heading text-3xl tracking-wide text-[var(--granite-mist)]">
          {cat.nome}
        </h3>
        <p className="mt-2 hidden font-body text-[var(--granite-mist)]/75 sm:line-clamp-3 sm:text-sm sm:leading-relaxed">
          {cat.cardIntro || cat.intro}
        </p>
        <span className="mt-4 inline-flex items-center gap-2 font-button text-xs uppercase tracking-[0.2em] text-[var(--accent-soft)]">
          {cta}
          <ArrowRight
            size={15}
            className="transition-transform duration-300 group-hover:translate-x-1"
            aria-hidden="true"
          />
        </span>
      </div>
    </Link>
  );
}

// Il noleggio è un servizio di supporto ai tour, non un'esperienza a sé:
// resta raggiungibile da navbar e pagina dedicata, ma non compare qui.
export default function Categorie() {
  const { homepage } = useSiteContent();
  const { localize } = useI18n();
  const esperienze = localize(CATEGORIE).filter((cat) => cat.kind !== "rental");
  const content = homepage.experiences;

  return (
    <section id="esperienze" className="bg-[var(--obsidian)] topo-dark py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div data-tina-field={tinaField(content)}>
          <SectionHeading
            eyebrow={content.eyebrow}
            title={content.title}
            accent={content.accent}
            intro={content.intro}
            className="mb-14"
          />
        </div>

        <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
          {esperienze.map((cat, i) => (
            <Reveal
              key={cat.id}
              delay={i * 0.06}
              className={cat.kind === "course" ? "col-span-2 md:col-span-1" : ""}
            >
              <Card cat={cat} featuredMobile={cat.kind === "course"} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
