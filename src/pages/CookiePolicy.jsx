import { Link } from "react-router-dom";
import SiteNav from "@/components/SiteNav";
import Footer from "@/components/Footer";
import { SITE } from "@/config/site";
import { useI18n } from "@/i18n/I18nProvider";
import { LEGAL_CONTENT } from "@/i18n/legal-content";

function interpolate(value, legal) {
  return value
    .replaceAll("{person}", legal.titolare)
    .replaceAll("{owner}", legal.ragioneSociale)
    .replaceAll("{form}", legal.formaGiuridica)
    .replaceAll("{vat}", legal.partitaIva)
    .replaceAll("{address}", legal.sede)
    .replaceAll("{email}", SITE.email);
}

export default function CookiePolicy() {
  const { locale, href } = useI18n();
  const content = LEGAL_CONTENT[locale].cookies;
  const { legale } = SITE;

  return (
    <div className="min-h-screen bg-[#1C1814] topo-dark">
      <SiteNav />
      <main className="mx-auto max-w-3xl px-5 pb-16 pt-32 lg:px-8 lg:pb-24 lg:pt-40">
        <p className="mb-4 font-button text-xs uppercase tracking-[0.3em] text-[#A0612A]">{content.eyebrow}</p>
        <h1 className="mb-4 font-heading text-5xl leading-none text-[#F5EBD9] lg:text-6xl">
          {content.title} <span className="text-[#A0612A]">{content.accent}</span>
        </h1>
        <div className="mb-12 space-y-1 font-body text-sm text-[#F5EBD9]/50">
          <p>{content.intro}</p>
          <p>{content.updated}</p>
        </div>

        {content.sections.map((section, index) => (
          <section key={section.title} className="mb-10">
            <h2 className="mb-3 font-heading text-2xl tracking-wide text-[#F5EBD9] lg:text-3xl">
              <span className="text-[#A0612A]">{index + 1}.</span> {section.title}
            </h2>
            <div className="space-y-3 font-body text-sm leading-relaxed text-[#F5EBD9]/70">
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph}>{interpolate(paragraph, legale)}</p>
              ))}
            </div>
          </section>
        ))}

        <Link to={href("/privacy")} className="btn-mech mt-4 inline-flex bg-[#A0612A] px-8 py-4 text-base text-[#F5EBD9] hover:bg-[#b87033]">
          {content.cta}
        </Link>
      </main>
      <Footer />
    </div>
  );
}
