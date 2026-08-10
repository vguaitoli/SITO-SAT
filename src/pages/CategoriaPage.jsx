import React from "react";
import { Link, useLocation, useParams, Navigate } from "react-router-dom";
import { tinaField } from "tinacms/dist/react";
import { ArrowRight, MessageCircle, Check, Route } from "lucide-react";
import SiteNav from "@/components/SiteNav";
import Footer from "@/components/Footer";
import MobileCta from "@/components/MobileCta";
import Reveal from "@/components/Reveal";
import Photo from "@/components/Photo";
import PhotoRibbon from "@/components/PhotoRibbon";
import TourCard from "@/components/TourCard.jsx";
import { typeColors } from "@/components/TourDetails.jsx";
import { CATEGORIE, categoria } from "@/data/categorie";
import { fotoProps } from "@/data/foto-helpers";
import guideGianluca from "@/assets/guides/guide-gianluca-serra.webp";
import { useSiteContent } from "@/content/TinaContentProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { resolveRoute } from "@/i18n/routes";

/**
 * Pagina dedicata a una delle esperienze.
 * I tour mostrati sono solo quelli reali del tipo corrispondente: se per una
 * categoria non esistono itinerari a catalogo la pagina non inventa dati e
 * indirizza alla richiesta di informazioni. I corsi hanno contenuti dedicati.
 */
export default function CategoriaPage() {
  const { cat } = useParams();
  const { pathname } = useLocation();
  const resolvedRoute = resolveRoute(pathname);
  const categoryId =
    resolvedRoute.name === "experiences" ? resolvedRoute.params.cat : cat;
  const sourceCategory = categoria(categoryId);
  const { t, href, route, localize } = useI18n();
  const c = localize(sourceCategory);
  const { tours, rentalPage, CTA_LABELS, SITE, TOUR_GROUP } = useSiteContent();
  const whatsappLink = (message) =>
    `https://wa.me/${SITE.whatsapp.numero}?text=${encodeURIComponent(message)}`;

  if (!c) return <Navigate to={href("/#esperienze")} replace />;

  const hero = fotoProps(c.fotoHero);
  const tourCategoria = c.tourType ? tours.filter((t) => t.type === c.tourType) : [];
  const altre = localize(CATEGORIE).filter((x) => x.id !== c.id);
  const colore = typeColors[c.tourType] || "#A0612A";
  const isCourse = c.kind === "course";
  const isRental = c.kind === "rental";
  const rentalHero = isRental ? rentalPage.hero : null;
  const rentalOffer = isRental ? rentalPage.offer : null;
  const rentalProcess = isRental ? rentalPage.process : null;
  const rentalFinalCta = isRental ? rentalPage.finalCta : null;
  const pageName = rentalHero?.title || c.nome;
  const contactTarget = href(isRental ? "/?interesse=Noleggio#contatti" : "/#contatti");
  const highlights = isCourse
    ? [
        t("Istruttore qualificato"),
        t("Percorso definito sul livello di partenza"),
        t("Lavoro pratico su tecnica e controllo del mezzo"),
        t("Attenzione a sicurezza e lettura del terreno"),
      ]
    : isRental
      ? rentalProcess?.items || []
      : [
          t("Guida locale esperta"),
          t("Trasporto bagagli"),
          t("Assistenza tecnica"),
          t("Dispositivo GPS Live Tracking"),
          t("Agriturismo mezza pensione"),
          t("Gadget esclusivi"),
        ];

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
            alt={t(hero.alt)}
            width={1600}
            height={Math.round(1600 / hero.aspect)}
            {...{ fetchpriority: "high" }}
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          // Nessuna foto reale ancora disponibile per questa categoria: un'icona
          // al posto di una foto inventata o non pertinente.
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[var(--surface-dark-alt)] to-obsidian">
            <Route size={160} className="text-oxblood/15" aria-hidden="true" strokeWidth={1} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-obsidian/60 to-obsidian/45" />
        {/* Scrim superiore: tiene leggibile la navigazione sopra le foto chiare. */}
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-obsidian/90 to-transparent" />
        <div className="absolute inset-0 topo-dark opacity-50" />

        <div className="relative z-10 mx-auto w-full max-w-7xl px-5 pb-14 lg:px-8">
          <nav aria-label={t("Percorso")} className="mb-5 font-button text-xs uppercase tracking-[0.2em] text-granite-mist/60">
            <Link to={href("/#esperienze")} className="hover:text-[var(--accent)]">
              {t("Esperienze")}
            </Link>
            <span className="mx-2" aria-hidden="true">
              /
            </span>
            <span className="text-[var(--accent-soft)]">{pageName}</span>
          </nav>
          <p
            className="font-button mb-3 text-xs uppercase tracking-[0.3em] text-[var(--accent-soft)]"
            data-tina-field={isRental ? tinaField(rentalHero, "claim") : undefined}
          >
            {rentalHero?.claim || c.claim}
          </p>
          <h1
            className="font-heading text-6xl leading-none text-[var(--granite-mist)] lg:text-8xl"
            data-tina-field={isRental ? tinaField(rentalHero, "title") : undefined}
          >
            {pageName}
          </h1>
        </div>
      </header>

      {/* Introduzione + a chi è adatto */}
      <section className="bg-[var(--obsidian)] py-16 lg:py-24">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 lg:grid-cols-3 lg:px-8">
          <Reveal className="lg:col-span-2">
            <p
              className="font-body text-xl leading-relaxed text-granite-mist/85 lg:text-2xl"
              data-tina-field={isRental ? tinaField(rentalHero, "intro") : undefined}
            >
              {rentalHero?.intro || c.intro}
            </p>
          </Reveal>
          <Reveal delay={0.1} className="border-l-2 border-[var(--accent)] pl-6">
            <p
              className="font-button mb-2 text-xs uppercase tracking-[0.25em] text-[var(--accent-soft)]"
              data-tina-field={isRental ? tinaField(rentalHero, "audienceLabel") : undefined}
            >
              {rentalHero?.audienceLabel || t("A chi è adatto")}
            </p>
            <p
              className="font-body leading-relaxed text-granite-mist/75"
              data-tina-field={isRental ? tinaField(rentalHero, "audience") : undefined}
            >
              {rentalHero?.audience || c.adatto}
            </p>
          </Reveal>
        </div>
      </section>

      {/* Nastro fotografico a scorrimento (assente finché non ci sono foto reali) */}
      {c.carosello?.length > 0 && (
        <div className="border-y border-[var(--border-on-dark)] bg-[var(--obsidian)] py-4 mb-16 lg:mb-24">
          <PhotoRibbon slugs={c.carosello} />
        </div>
      )}

      {/* Tour reali della categoria, oppure richiesta informazioni */}
      <section id="tour" className="bg-[var(--surface-light)] topo-bg py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          {tourCategoria.length > 0 ? (
            <>
              <Reveal className="mb-14 max-w-3xl">
                <p className="font-button mb-4 text-xs uppercase tracking-[0.3em] text-[var(--accent)]">
                  {t("Itinerari")}
                </p>
                <h2 className="font-heading text-5xl leading-none text-[var(--text-on-light)] lg:text-7xl">
                  {t("I tour in")} <span className="text-[var(--accent)]">{c.nome}</span>
                </h2>
                <p className="mt-6 font-body text-lg text-[var(--text-on-light-muted)]">
                  {tourCategoria.length === 1
                    ? t("Un itinerario a catalogo, con dati tecnici completi.")
                    : `${tourCategoria.length} ${t("itinerari a catalogo, con dati tecnici completi.")}`}{" "}
                  {t("Ogni tour è personalizzabile per il tuo gruppo.")} {TOUR_GROUP.sentence}
                </p>
              </Reveal>
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {tourCategoria.map((tour) => (
                  <TourCard
                    key={tour.slug}
                    tour={tour}
                    color={typeColors[tour.type] || colore}
                    detailPath={route("tourDetail", { slug: tour.slug })}
                  />
                ))}
              </div>
            </>
          ) : isCourse ? (
            <div className="grid items-stretch gap-10 lg:grid-cols-[1.35fr_0.65fr]">
              <Reveal className="flex flex-col justify-center">
                <p className="font-button mb-4 text-xs uppercase tracking-[0.3em] text-[var(--accent)]">
                  {t("Formazione off-road")}
                </p>
                <h2 className="font-heading text-5xl leading-none text-[var(--text-on-light)] lg:text-7xl">
                  {t("Migliora la tua")} <span className="text-[var(--accent)]">{t("guida")}</span>
                </h2>
                <p className="mt-6 max-w-2xl font-body text-lg leading-relaxed text-[var(--text-on-light-muted)]">
                  {t("Il corso viene costruito a partire dalla tua esperienza, dalla moto che utilizzi e dagli obiettivi che vuoi raggiungere. Contattaci per definire insieme programma, disponibilità e requisiti prima di iniziare.")}
                </p>
                <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                  <Link
                    to={contactTarget}
                    className="btn-mech inline-flex items-center justify-center gap-2.5 bg-[var(--cta)] px-8 py-4 text-base text-[var(--cta-text)] hover:bg-[var(--cta-hover)]"
                  >
                    {CTA_LABELS.primary}
                    <ArrowRight size={18} aria-hidden="true" />
                  </Link>
                  {SITE.contattiVerificati && (
                    <a
                      href={whatsappLink(t("Ciao! Vorrei informazioni sui corsi di guida off-road con Gianluca."))}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-mech inline-flex items-center justify-center gap-2.5 bg-[var(--wild-sage)] px-8 py-4 text-base text-[var(--granite-mist)] hover:bg-[var(--wild-sage-bright)]"
                    >
                      <MessageCircle size={18} aria-hidden="true" />
                      {CTA_LABELS.whatsapp}
                    </a>
                  )}
                </div>
              </Reveal>

              <Reveal
                delay={0.1}
                className="relative min-h-[28rem] overflow-hidden bg-[var(--obsidian)]"
              >
                <img
                  src={guideGianluca}
                  alt={t("Gianluca Serra, istruttore qualificato di guida off-road")}
                  width={600}
                  height={800}
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-transparent to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-7">
                  <p className="font-button text-xs uppercase tracking-[0.24em] text-[var(--accent-soft)]">
                    {t("Istruttore qualificato")}
                  </p>
                  <h3 className="mt-2 font-heading text-4xl text-[var(--granite-mist)]">
                    Gianluca Serra
                  </h3>
                  <p className="mt-2 font-body text-sm leading-relaxed text-granite-mist/75">
                    {t("Esperienza sul territorio e attenzione alla progressione tecnica e alla sicurezza in fuoristrada.")}
                  </p>
                </div>
              </Reveal>
            </div>
          ) : isRental ? (
            <Reveal className="mx-auto max-w-2xl text-center">
              <p
                className="font-button mb-4 text-xs uppercase tracking-[0.3em] text-[var(--accent)]"
                data-tina-field={tinaField(rentalOffer, "eyebrow")}
              >
                {rentalOffer.eyebrow}
              </p>
              <h2 className="font-heading text-5xl leading-none text-[var(--text-on-light)] lg:text-6xl">
                <span data-tina-field={tinaField(rentalOffer, "title")}>{rentalOffer.title}</span>{" "}
                <span className="text-[var(--accent)]" data-tina-field={tinaField(rentalOffer, "accent")}>
                  {rentalOffer.accent}
                </span>
                <span data-tina-field={tinaField(rentalOffer, "suffix")}>{rentalOffer.suffix}</span>
              </h2>
              <p
                className="mt-6 font-body text-lg leading-relaxed text-[var(--text-on-light-muted)]"
                data-tina-field={tinaField(rentalOffer, "description")}
              >
                {rentalOffer.description}
              </p>
              <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
                <Link
                  to={contactTarget}
                  className="btn-mech inline-flex items-center justify-center gap-2.5 bg-[var(--cta)] px-8 py-4 text-base text-[var(--cta-text)] hover:bg-[var(--cta-hover)]"
                >
                  {CTA_LABELS.primary}
                  <ArrowRight size={18} aria-hidden="true" />
                </Link>
                {SITE.contattiVerificati && (
                  <a
                    href={whatsappLink(rentalFinalCta.whatsappMessage)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-mech inline-flex items-center justify-center gap-2.5 bg-[var(--wild-sage)] px-8 py-4 text-base text-[var(--granite-mist)] hover:bg-[var(--wild-sage-bright)]"
                  >
                    <MessageCircle size={18} aria-hidden="true" />
                    {CTA_LABELS.whatsapp}
                  </a>
                )}
              </div>
            </Reveal>
          ) : (
            /* Nessun itinerario a catalogo: nessun dato inventato, si passa dal contatto. */
            <Reveal className="mx-auto max-w-2xl text-center">
              <p className="font-button mb-4 text-xs uppercase tracking-[0.3em] text-[var(--accent)]">
                {t("Itinerari")} {c.nome}
              </p>
              <h2 className="font-heading text-5xl leading-none text-[var(--text-on-light)] lg:text-6xl">
                {t("Costruiamo il tuo")} <span className="text-[var(--accent)]">{t("percorso")}</span>
              </h2>
              <p className="mt-6 font-body text-lg leading-relaxed text-[var(--text-on-light-muted)]">
                {t("Organizziamo questi tour su richiesta, in base al gruppo, al periodo e al tipo di percorso che cercate. Scrivici: ti diciamo cosa è possibile fare e quando.")}
              </p>
              <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
                <Link
                  to={contactTarget}
                  className="btn-mech inline-flex items-center justify-center gap-2.5 bg-[var(--cta)] px-8 py-4 text-base text-[var(--cta-text)] hover:bg-[var(--cta-hover)]"
                >
                  {CTA_LABELS.primary}
                  <ArrowRight size={18} aria-hidden="true" />
                </Link>
                {SITE.contattiVerificati && (
                  <a
                    href={whatsappLink(`${t("Ciao! Vorrei informazioni sui tour in")} ${c.nome} ${t("in Sardegna.")}`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-mech inline-flex items-center justify-center gap-2.5 bg-[var(--wild-sage)] px-8 py-4 text-base text-[var(--granite-mist)] hover:bg-[var(--wild-sage-bright)]"
                  >
                    <MessageCircle size={18} aria-hidden="true" />
                    {CTA_LABELS.whatsapp}
                  </a>
                )}
              </div>
            </Reveal>
          )}
        </div>
      </section>

      {/* Informazioni reali già presenti nel sito, differenziate per tour e corsi. */}
      <section className="bg-[var(--surface-dark-alt)] py-20">
        <div className="mx-auto max-w-5xl px-5 lg:px-8">
          <h2 className="font-heading mb-8 text-4xl text-[var(--granite-mist)] lg:text-5xl">
            {isCourse ? (
              <>
                {t("Un percorso")} <span className="text-[var(--accent)]">{t("su misura")}</span>
              </>
            ) : isRental ? (
              <>
                <span data-tina-field={tinaField(rentalProcess, "title")}>{rentalProcess.title}</span>{" "}
                <span className="text-[var(--accent)]" data-tina-field={tinaField(rentalProcess, "accent")}>
                  {rentalProcess.accent}
                </span>
              </>
            ) : (
              <>
                {t("In base al tour")} <span className="text-[var(--accent)]">{t("può essere incluso")}</span>
              </>
            )}
          </h2>
          <ul className="grid gap-x-10 gap-y-4 sm:grid-cols-2">
            {highlights.map((item, index) => (
              <li
                key={item}
                className="flex items-center gap-3 border-b border-[var(--border-on-dark)] py-3"
                data-tina-field={isRental ? tinaField(rentalProcess, "items", index) : undefined}
              >
                <Check size={16} className="flex-shrink-0 text-[var(--wild-sage-bright)]" aria-hidden="true" />
                <span className="font-body text-granite-mist/85">{item}</span>
              </li>
            ))}
          </ul>
          {!isCourse && !isRental && (
            <p className="mt-6 font-body text-sm leading-relaxed text-granite-mist/60">
              {t("Quando previsto, il dispositivo GPS Live Tracking viene fornito dall'organizzazione, che può così verificare in ogni momento che il gruppo rimanga compatto e che nessun partecipante resti isolato o si disperda lungo il percorso. Non viene utilizzato come navigatore e non fornisce indicazioni di percorso ai partecipanti. Servizi e dotazioni vengono confermati prima della prenotazione.")}
            </p>
          )}
          {isRental && (
            <p
              className="mt-6 font-body text-sm leading-relaxed text-granite-mist/55"
              data-tina-field={tinaField(rentalProcess, "note")}
            >
              {rentalProcess.note}
            </p>
          )}
        </div>
      </section>

      {/* Le altre categorie */}
      <section className="bg-[var(--obsidian)] topo-dark py-20">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <h2 className="font-heading mb-8 text-3xl text-[var(--granite-mist)] lg:text-4xl">
            {t("Le altre")} <span className="text-[var(--accent)]">{t("esperienze")}</span>
          </h2>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            {altre.map((o) => (
              <Link
                key={o.id}
                to={href(`/esperienze/${o.id}`)}
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
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[var(--surface-dark-alt)] to-obsidian">
                    <Route size={40} className="text-oxblood/20" aria-hidden="true" strokeWidth={1.25} />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-obsidian to-transparent" />
                <span className="absolute bottom-4 left-4 font-heading text-2xl text-[var(--granite-mist)] transition-colors group-hover:text-[var(--accent-soft)]">
                  {o.nome}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA finale */}
      <section className="border-t border-oxblood/20 bg-[var(--obsidian)] py-20 text-center">
        <div className="mx-auto max-w-3xl px-5">
          <h2 className="font-heading text-4xl leading-tight text-[var(--granite-mist)] lg:text-6xl">
            {isCourse ? (
              <>
                {t("Pronto a migliorare la tua")} <span className="text-[var(--accent)]">{t("guida")}</span>?
              </>
            ) : isRental ? (
              <>
                <span data-tina-field={tinaField(rentalFinalCta, "title")}>{rentalFinalCta.title}</span>{" "}
                <span className="text-[var(--accent)]" data-tina-field={tinaField(rentalFinalCta, "accent")}>
                  {rentalFinalCta.accent}
                </span>
                <span data-tina-field={tinaField(rentalFinalCta, "suffix")}>{rentalFinalCta.suffix}</span>
              </>
            ) : (
              <>
                {t("Pronto a partire in")} <span className="text-[var(--accent)]">{c.nome}</span>?
              </>
            )}
          </h2>
          <p
            className="mt-5 font-body text-lg text-granite-mist/70"
            data-tina-field={isRental ? tinaField(rentalFinalCta, "description") : undefined}
          >
            {isCourse
              ? t("Raccontaci la tua esperienza, la moto che utilizzi e cosa vuoi migliorare: ti daremo le informazioni adatte al tuo livello.")
              : isRental
                ? rentalFinalCta.description
                : t("Dicci quando vorresti venire: verifichiamo la disponibilità e ti diciamo qual è il percorso giusto per te.")}
          </p>
          <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
            <Link
              to={contactTarget}
              className="btn-mech inline-flex items-center justify-center gap-2.5 bg-[var(--cta)] px-8 py-4 text-base text-[var(--cta-text)] hover:bg-[var(--cta-hover)]"
            >
              {CTA_LABELS.primary}
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
            {SITE.contattiVerificati && (
              <a
                href={whatsappLink(
                  isRental
                    ? rentalFinalCta.whatsappMessage
                    : `${t("Ciao! Vorrei verificare la disponibilità per")} ${c.nome}.`,
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-mech inline-flex items-center justify-center gap-2.5 bg-[var(--wild-sage)] px-8 py-4 text-base text-[var(--granite-mist)] hover:bg-[var(--wild-sage-bright)]"
              >
                <MessageCircle size={18} aria-hidden="true" />
                {CTA_LABELS.whatsapp}
              </a>
            )}
          </div>
        </div>
      </section>

      <Footer />
      <MobileCta />
    </div>
  );
}
