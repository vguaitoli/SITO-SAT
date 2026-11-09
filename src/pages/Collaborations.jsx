import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import SiteNav from '@/components/SiteNav';
import Footer from '@/components/Footer';
import { useI18n } from '@/i18n/I18nProvider';
import { COLLABORATIONS_COPY, COLLABORATION_PARTNERS } from '@/data/collaborations';

export default function Collaborations() {
  const { locale, route } = useI18n();
  const copy = COLLABORATIONS_COPY[locale];
  return <div className="bg-[var(--obsidian)]">
    <SiteNav />
    <main>
      <header className="mx-auto max-w-7xl px-5 pb-14 pt-36 lg:px-8 lg:pb-16 lg:pt-44">
        <Link to={route('home')} className="inline-flex min-h-11 items-center gap-2 text-sm text-granite-mist/80"><ArrowLeft size={16} aria-hidden="true" />Home</Link>
        <p className="mb-6 mt-8 font-button text-xs uppercase tracking-[0.25em] text-[var(--accent-soft)]">{copy.label}</p>
        <h1 className="max-w-4xl font-heading text-6xl uppercase leading-none text-[var(--granite-mist)] lg:text-8xl">{copy.title}</h1>
        <p className="mt-8 max-w-3xl text-lg leading-relaxed text-granite-mist/85">{copy.intro}</p>
      </header>
      <section aria-label={copy.galleryLabel} className="mx-auto max-w-7xl px-5 pb-16 lg:px-8 lg:pb-24">
        <div className="grid gap-8 md:auto-rows-fr md:grid-cols-2">
          {COLLABORATION_PARTNERS.map(partner => <article key={partner.id} id={partner.id} className="flex scroll-mt-28 flex-col overflow-hidden border border-[#1C1814]/20 bg-[#F5EBD9] text-[#1C1814]">
            <figure className="relative m-0 aspect-[4/3] overflow-hidden bg-[#242019]">
              <img src={partner.image.src} width={partner.image.width} height={partner.image.height} alt={partner.image.alt[locale]} loading="lazy" style={{ objectPosition: partner.image.position || '50% 50%' }} className="h-full w-full object-cover" />
              <figcaption className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-5 pb-4 pt-10 text-xs text-white">{copy.imageCredit} {partner.image.credit}</figcaption>
            </figure>
            <div className="flex h-36 items-center justify-center border-b border-[#1C1814]/10 bg-white px-7 py-4">
              <img src={partner.logo.src} width={partner.logo.width} height={partner.logo.height} alt={`Logo ${partner.name}`} loading="lazy" className="h-auto max-h-28 w-auto max-w-full object-contain sm:max-w-72" />
            </div>
            <div className="flex grow flex-col p-6 lg:p-8">
              <p className="font-button text-xs uppercase tracking-[0.15em] text-[#815021]">{copy.shared}</p>
              <h2 className="mt-4 font-heading text-4xl uppercase leading-tight lg:text-5xl">{partner.name}</h2>
              <p className="mt-3 text-sm text-[#815021]">{partner.vehicle[locale]}</p>
              <h3 className="mt-6 font-heading text-2xl leading-tight text-[#815021] lg:text-3xl">{partner.headline[locale]}</h3>
              <p className="mb-8 mt-4 grow leading-relaxed text-[#1C1814]/85">{partner.description[locale]}</p>
              <div className="mt-auto grid gap-3 border-t border-[#1C1814]/20 pt-5 sm:grid-cols-2">
                <Link to={route(partner.route, partner.category ? { cat: partner.category } : undefined)} className="inline-flex min-h-12 items-center justify-between gap-3 bg-[#815021] px-4 py-3 text-sm text-[#F5EBD9]" aria-label={`${partner.cta[locale]} · ${partner.name}`}>{partner.cta[locale]}<ArrowUpRight size={18} className="shrink-0" aria-hidden="true" /></Link>
                <a href={partner.url} className="inline-flex min-h-12 items-center justify-between gap-3 border border-[#815021] px-4 py-3 text-sm text-[#815021] underline-offset-4 hover:underline" aria-label={`${copy.partnerSite} ${partner.name}`}>{copy.partnerSite}<ArrowUpRight size={18} className="shrink-0" aria-hidden="true" /></a>
              </div>
            </div>
          </article>)}
        </div>
      </section>
    </main>
    <Footer />
  </div>;
}
