import React from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import { ArrowRight, MessageCircle, Check, Route } from "lucide-react";
import SiteNav from "@/components/SiteNav";
import Footer from "@/components/Footer";
import MobileCta from "@/components/MobileCta";
import Reveal from "@/components/Reveal";
import Photo from "@/components/Photo";
import TourCard from "@/components/TourCard.jsx?modalfix=1";
import { tours, typeColors } from "@/components/TourDetails.jsx?modalfix=1";
import { CATEGORIE, categoria } from "@/data/categorie";
import { fotoProps } from "@/data/foto-helpers";
import { SITE, whatsappLink } from "@/config/site";

/**
 * Pagina dedicata a una delle cinque categorie.
 * I tour mostrati sono solo quelli reali del tipo corrispondente: se per una
 * categoria non esistono itinerari a catalogo (es. SSV) la pagina non inventa
 * dati e indirizza alla richiesta di informazioni.
 */
export default function CategoriaPage() {
  const { cat } = useParams();
  const c = categoria(cat);

  if (!c) return <Navigate to="/#esperienze" replace />;

  const hero = fotoProps(c.fotoHero);
  const tourCategoria = c.tourType ? tours.filter((t) => t.type === c.tourType) : [];
  const altre = CATEGORIE.filter((x) => x.id !== c.id);
  const colore = typeColors[c.tourType] || "#A0612A";

  return (
    <div className="bg-[var(--obsidian)]">
      <SiteNav />

      {/* Hero della categoria */}
      <header className="relative flex min-h-[70svh] items-end overflow-hidden pt-28">
        {hero ? (
          <img
            src={hero.src}
            srcSet={hero.srcSet}
            sizes="100vw"
            alt={hero.alt}
            width={1600}
            height={Math.round(1600 / hero.aspect)}
            fetchpriority="high"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          // Nessuna foto reale ancora disponibile per questa categoria: un'icona
          // al posto di una foto inventata o non pertinente.
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[var(--surface-dark-alt)] to-[var(--obsidian)]">
            <Route size={160} className="text-[var(--accent)]/15" aria-hidden="true" strokeWidth={1} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--obsidian)] via-[var(--obsidian)]/60 to-[var(--obsidian)]/45" />
        {/* Scrim superiore: tiene leggibile la navigazione sopra le foto chiare. */}
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[var(--obsidian)]/90 to-transparent" />
        <div className="absolute inset-0 topo-dark opacity-50" />

        <div className="relative z-10 mx-auto w-full max-w-7xl px-5 pb-14 lg:px-8">
          <nav aria-label="Percorso" className="mb-5 font-button text-xs uppercase tracking-[0.2em] text-[var(--granite-mist)]/60">
            <Link to="/#esperienze" className="hover:text-[var(--accent)]">
              Esperienze
            </Link>
            <span className="mx-2" aria-hidden="true">
              /
            </span>
            <span className="text-[var(--accent-soft)]">{c.nome}</span>
          </nav>
          <p className="font-button mb-3 text-xs uppercase tracking-[0.3em] text-[var(--accent-soft)]">
            {c.claim}
          </p>
          <h1 className="font-heading text-6xl leading-none text-[var(--granite-mist)] lg:text-8xl">
            {c.nome}
          </h1>
        </div>
      </header>

      {/* Introduzione + a chi è adatto */}
      <section className="bg-[var(--obsidian)] py-16 lg:py-24">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 lg:grid-cols-3 lg:px-8">
          <Reveal className="lg:col-span-2">
            <p className="font-body text-xl leading-relaxed text-[var(--granite-mist)]/85 lg:text-2xl">
              {c.intro}
            </p>
          </Reveal>
          <Reveal delay={0.1} className="border-l-2 border-[var(--accent)] pl-6">
            <p className="font-button mb-2 text-xs uppercase tracking-[0.25em] text-[var(--accent-soft)]">
              A chi è adatto
            </p>
            <p className="font-body leading-relaxed text-[var(--granite-mist)]/75">{c.adatto}</p>
          </Reveal>
        </div>
      </section>

      {/* Galleria della categoria (assente finché non ci sono foto reali) */}
      {c.galleria.length > 0 && (
        <section className="bg-[var(--obsidian)] pb-16 lg:pb-24">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
              {c.galleria.map((slug, i) => (
                <Reveal key={slug} delay={i * 0.07} className={i === 0 ? "col-span-2 lg:col-span-1" : ""}>
                  <Photo
                    slug={slug}
                    ratio="4/3"
                    sizes="(min-width: 1024px) 33vw, 50vw"
                    className="h-full w-full"
                    imgClassName="transition-transform duration-700 hover:scale-105"
                  />
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Tour reali della categoria, oppure richiesta informazioni */}
      <section id="tour" className="bg-[var(--surface-light)] topo-bg py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          {tourCategoria.length > 0 ? (
            <>
              <Reveal className="mb-14 max-w-3xl">
                <p className="font-button mb-4 text-xs uppercase tracking-[0.3em] text-[var(--accent)]">
                  Itinerari
                </p>
                <h2 className="font-heading text-5xl leading-none text-[var(--text-on-light)] lg:text-7xl">
                  I tour in <span className="text-[var(--accent)]">{c.nome}</span>
                </h2>
                <p className="mt-6 font-body text-lg text-[var(--text-on-light-muted)]">
                  {tourCategoria.length === 1
                    ? "Un itinerario a catalogo, con dati tecnici completi."
                    : `${tourCategoria.length} itinerari a catalogo, con dati tecnici completi.`}{" "}
                  Ogni tour è personalizzabile per il tuo gruppo.
                </p>
              </Reveal>
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {tourCategoria.map((tour) => (
                  <TourCard key={tour.name} tour={tour} color={typeColors[tour.type] || colore} />
                ))}
              </div>
            </>
          ) : (
            /* Nessun itinerario a catalogo: nessun dato inventato, si passa dal contatto. */
            <Reveal className="mx-auto max-w-2xl text-center">
              <p className="font-button mb-4 text-xs uppercase tracking-[0.3em] text-[var(--accent)]">
                Itinerari {c.nome}
              </p>
              <h2 className="font-heading text-5xl leading-none text-[var(--text-on-light)] lg:text-6xl">
                Costruiamo il tuo <span className="text-[var(--accent)]">percorso</span>
              </h2>
              <p className="mt-6 font-body text-lg leading-relaxed text-[var(--text-on-light-muted)]">
                I tour in {c.nome} li organizziamo su richiesta, in base al gruppo, al
                periodo e al tipo di percorso che cercate. Scrivici: ti diciamo cosa è
                possibile fare e quando.
              </p>
              <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
                <Link
                  to="/#contatti"
                  className="btn-mech inline-flex items-center justify-center gap-2.5 bg-[var(--cta)] px-8 py-4 text-base text-[var(--cta-text)] hover:bg-[var(--cta-hover)]"
                >
                  Richiedi informazioni
                  <ArrowRight size={18} aria-hidden="true" />
                </Link>
                {SITE.contattiVerificati && (
                  <a
                    href={whatsappLink(`Ciao! Vorrei informazioni sui tour in ${c.nome} in Sardegna.`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-mech inline-flex items-center justify-center gap-2.5 bg-[var(--wild-sage)] px-8 py-4 text-base text-[var(--granite-mist)] hover:bg-[var(--wild-sage-bright)]"
                  >
                    <MessageCircle size={18} aria-hidden="true" />
                    Scrivici su WhatsApp
                  </a>
                )}
              </div>
            </Reveal>
          )}
        </div>
      </section>

      {/* Cosa è incluso — informazioni reali già presenti nel sito */}
      <section className="bg-[var(--surface-dark-alt)] py-20">
        <div className="mx-auto max-w-5xl px-5 lg:px-8">
          <h2 className="font-heading mb-8 text-4xl text-[var(--granite-mist)] lg:text-5xl">
            In ogni tour <span className="text-[var(--accent)]">è incluso</span>
          </h2>
          <ul className="grid gap-x-10 gap-y-4 sm:grid-cols-2">
            {[
              "Guida locale esperta",
              "Trasporto bagagli",
              "Assistenza tecnica",
              "Tag GPS live",
              "Agriturismo mezza pensione",
              "Gadget esclusivi",
            ].map((item) => (
              <li key={item} className="flex items-center gap-3 border-b border-[var(--border-on-dark)] py-3">
                <Check size={16} className="flex-shrink-0 text-[var(--wild-sage-bright)]" aria-hidden="true" />
                <span className="font-body text-[var(--granite-mist)]/85">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Le altre categorie */}
      <section className="bg-[var(--obsidian)] topo-dark py-20">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <h2 className="font-heading mb-8 text-3xl text-[var(--granite-mist)] lg:text-4xl">
            Le altre <span className="text-[var(--accent)]">esperienze</span>
          </h2>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            {altre.map((o) => (
              <Link
                key={o.id}
                to={`/esperienze/${o.id}`}
                className="group relative block aspect-[4/3] overflow-hidden bg-[var(--obsidian)]"
              >
                {o.fotoCard ? (
                  <Photo
                    slug={o.fotoCard}
                    ratio="4/3"
                    sizes="(min-width: 1024px) 25vw, 50vw"
                    className="absolute inset-0 h-full w-full"
                    imgClassName="opacity-70 transition-all duration-500 group-hover:scale-105 group-hover:opacity-95"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[var(--surface-dark-alt)] to-[var(--obsidian)]">
                    <Route size={40} className="text-[var(--accent)]/20" aria-hidden="true" strokeWidth={1.25} />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--obsidian)] to-transparent" />
                <span className="absolute bottom-4 left-4 font-heading text-2xl text-[var(--granite-mist)] transition-colors group-hover:text-[var(--accent-soft)]">
                  {o.nome}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA finale */}
      <section className="border-t border-[var(--accent)]/20 bg-[var(--obsidian)] py-20 text-center">
        <div className="mx-auto max-w-3xl px-5">
          <h2 className="font-heading text-4xl leading-tight text-[var(--granite-mist)] lg:text-6xl">
            Pronto a partire in <span className="text-[var(--accent)]">{c.nome}</span>?
          </h2>
          <p className="mt-5 font-body text-lg text-[var(--granite-mist)]/70">
            Dicci quando vorresti venire: verifichiamo la disponibilità e ti diciamo
            qual è il percorso giusto per te.
          </p>
          <Link
            to="/#contatti"
            className="btn-mech mt-8 inline-flex items-center gap-2.5 bg-[var(--cta)] px-8 py-4 text-base text-[var(--cta-text)] hover:bg-[var(--cta-hover)]"
          >
            Verifica disponibilità
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
          {SITE.contattiVerificati && (
            <p className="mt-4 font-body text-sm text-[var(--granite-mist)]/50">
              Oppure scrivici a{" "}
              <a href={`mailto:${SITE.email}`} className="underline hover:text-[var(--accent)]">
                {SITE.email}
              </a>
            </p>
          )}
        </div>
      </section>

      <Footer />
      <MobileCta />
    </div>
  );
}
