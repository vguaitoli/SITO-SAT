import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowDown, ArrowUpRight, Download } from 'lucide-react';
import SiteNav from '@/components/SiteNav';
import Footer from '@/components/Footer';
import { AfricaCards } from '@/components/AfricaSection';
import { AFRICA_TRIPS } from '@/data/africa';
import { useSiteContent } from '@/content/TinaContentProvider';
import { useI18n } from '@/i18n/I18nProvider';

export default function Africa() {
  const { slug } = useParams();
  const { t, route, localize, localeMeta } = useI18n();
  const trip = localize(AFRICA_TRIPS.find(item => item.slug === slug));
  const { SITE } = useSiteContent();
  const request = trip ? `${t('Vorrei informazioni sul viaggio')} ${trip.title}.` : '';
  const email = `mailto:${SITE.email}?subject=${encodeURIComponent(`${t('Informazioni')} ${trip?.title || t('Viaggi in Africa')}`)}&body=${encodeURIComponent(request)}`;
  const lists = trip ? [
    { title: t('La quota comprende'), items: trip.included },
    { title: t('La quota non comprende'), items: trip.excluded },
  ].filter(list => list.items.length > 0) : [];
  const stats = trip ? [
    { label: t('Durata'), value: `${trip.days} ${t('giorni')}` },
    { label: t('Mezzi'), value: trip.vehicles },
    { label: t('Gruppo minimo'), value: trip.minimum },
  ].filter(item => item.value) : [];

  return (
    <div className="bg-[var(--obsidian)]">
      <SiteNav />
      <main>
        {trip ? (
          <header className="relative border-b border-[var(--accent)]/30">
            <div className="grid lg:min-h-[720px] lg:grid-cols-[0.95fr_1.05fr]">
              <div className="order-last flex flex-col justify-center px-5 pb-12 pt-9 sm:px-8 lg:order-first lg:pb-16 lg:pl-[max(2rem,calc((100vw-1280px)/2+2rem))] lg:pr-12 lg:pt-36">
                <Link to={route('africa')} className="inline-flex min-h-11 items-center gap-2 self-start text-sm text-granite-mist/80 transition-colors hover:text-[var(--accent-soft)]">
                  <ArrowLeft size={16} aria-hidden="true" />{t('Tutti i viaggi in Africa')}
                </Link>
                <p className="mb-5 mt-7 font-button text-xs uppercase tracking-[0.2em] text-[var(--accent-soft)]">STA × Airzoone</p>
                <h1 className="max-w-2xl font-heading text-6xl uppercase leading-[0.95] text-[var(--granite-mist)] sm:text-7xl xl:text-8xl">{trip.title}</h1>
                <p className="mt-6 max-w-lg font-heading text-2xl leading-snug text-[var(--accent-soft)] lg:text-3xl">{trip.subtitle}</p>
                <p className="mt-5 max-w-lg font-body text-base leading-relaxed text-granite-mist/85">{trip.description}</p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <a href="#programma" className="btn-mech inline-flex min-h-11 items-center gap-3 bg-[var(--accent)] px-5 py-3 text-sm text-[var(--obsidian)]">
                    {t('Scopri il programma')} <ArrowDown size={16} aria-hidden="true" />
                  </a>
                  {!trip.draft && <a href={`/programmi/${trip.slug}.pdf`} download={`${trip.slug}.pdf`} className="btn-mech inline-flex min-h-11 items-center gap-3 border border-granite-mist/40 px-5 py-3 text-sm text-[var(--granite-mist)] transition-colors hover:border-[var(--accent-soft)]">
                    <Download size={16} aria-hidden="true" />{t('Scarica programma')}
                  </a>}
                </div>
                <p className="mt-6 text-sm text-granite-mist/70">{t(trip.draft ? 'Proposta di itinerario' : 'Accompagnamento congiunto STA e Airzoone')}</p>
              </div>
              <figure className="relative m-0 h-[340px] overflow-hidden sm:h-[450px] lg:h-auto lg:min-h-[720px]">
                <img src={trip.hero.src} width={trip.hero.width} height={trip.hero.height} alt={trip.hero.alt} fetchPriority="high" className="h-full w-full object-cover object-center lg:absolute lg:inset-0" />
                <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/35" />
                <figcaption className="absolute bottom-5 right-5 border-l border-white/60 pl-3 font-button text-xs uppercase tracking-widest text-white">{trip.country} · {trip.vehicles}</figcaption>
              </figure>
            </div>
          </header>
        ) : (
        <header className="mx-auto max-w-7xl px-5 pb-14 pt-36 lg:px-8 lg:pt-44">
          <Link to={slug ? route('africa') : route('home')} className="inline-flex min-h-11 items-center gap-2 text-sm text-[var(--granite-mist)]">
            <ArrowLeft size={16} aria-hidden="true" />{slug ? t('Tutti i viaggi in Africa') : 'Home'}
          </Link>
          <p className="mb-5 mt-8 font-button text-xs uppercase tracking-[0.25em] text-[var(--accent-soft)]">{t('Accompagnamento congiunto STA e Airzoone')}</p>
          <h1 className="max-w-4xl font-heading text-6xl uppercase leading-none text-[var(--granite-mist)] lg:text-8xl">
            {trip ? trip.title : slug ? t('Programma non trovato') : <>{t('VIAGGI IN')} <span className="text-[var(--accent)]">{t('AFRICA.')}</span></>}
          </h1>
          <p className="mt-7 max-w-2xl font-body text-lg leading-relaxed text-granite-mist/85">
            {trip ? trip.description : t('L’avventura continua oltre la Sardegna. Scopri i viaggi e le proposte in Tunisia, Libia e Marocco.')}
          </p>
        </header>
        )}
        <section id="programma" className="scroll-mt-24 bg-[#F5EBD9] px-5 py-14 text-[#1C1814] lg:px-8 lg:py-20">
          <div className="mx-auto max-w-7xl">
            {!slug ? (
              <>
                <div className="mb-10 max-w-3xl">
                  <h2 className="font-heading text-3xl">{t('IL DESERTO, UNA PASSIONE DA CONDIVIDERE.')}</h2>
                  <p className="mt-4 leading-relaxed">{t('Ci uniscono la passione per il fuoristrada e il fascino del deserto: gli spazi aperti, la guida sulla sabbia, le serate al campo. Da questa intesa nasce la collaborazione tra Sardegna Trail Avventura e Airzoone, per accompagnarti insieme tra le dune della Tunisia e i paesaggi della Libia.')}</p>
                </div>
                <AfricaCards />
              </>
            ) : !trip ? (
              <Link to={route('africa')} className="underline">{t('Torna ai programmi disponibili')}</Link>
            ) : (
              <>
                <div className="grid items-start gap-10 lg:grid-cols-[1fr_340px]">
                  <div>
                    <dl className="mb-10 grid grid-cols-3 gap-3 border-y border-[#1C1814]/20 py-6">
                      {stats.map(({ label, value }) => (
                        <div key={label}><dt className="text-xs uppercase tracking-wide text-[#1C1814]/70">{label}</dt><dd className="mt-2 font-heading text-2xl">{value}</dd></div>
                      ))}
                    </dl>
                    {trip.draft && <p className="mb-8 border-l-2 border-[#815021] pl-5 leading-relaxed">{t('Itinerario proposto, da validare con gli accompagnatori. Tracce, trasferimenti e pernottamenti sono da definire.')}</p>}
                    {trip.minimumNote && <p className="mb-6 text-sm">{t(trip.minimumNote)}</p>}
                    <div className="mb-12 grid gap-5 sm:grid-cols-2">
                      {trip.photos.map(photo => (
                        <figure key={photo.src} className="m-0">
                          <div className="aspect-[4/3] overflow-hidden bg-[#1C1814]/10">
                            <img src={photo.src} width={photo.width} height={photo.height} alt={photo.alt} loading="lazy" className="h-full w-full object-cover" />
                          </div>
                          <figcaption className="mt-3 flex items-start justify-between gap-3 border-t border-[#1C1814]/20 pt-3">
                            <span className="font-heading text-xl leading-tight">{photo.caption}</span>
                            <span className="shrink-0 pt-1 text-[10px] uppercase tracking-wider text-[#1C1814]/65">Airzoone</span>
                          </figcaption>
                        </figure>
                      ))}
                    </div>
                    <h2 className="font-heading text-4xl">{t('IL VIAGGIO, GIORNO PER GIORNO')}</h2>
                    <ol className="mt-7 divide-y divide-[#1C1814]/20">
                      {trip.stages.map(([title, description], index) => (
                        <li key={title} className="grid grid-cols-[2.5rem_1fr] gap-4 py-6">
                          <span className="font-heading text-3xl text-[#815021]">{String(index + 1).padStart(2, '0')}</span>
                          <div><h3 className="font-heading text-2xl">{title}</h3><p className="mt-2 leading-relaxed text-[#1C1814]/85">{description}</p></div>
                        </li>
                      ))}
                    </ol>
                  </div>
                  <aside className="order-first border border-[#1C1814]/20 bg-[#FBF6EC] p-6 lg:order-last lg:sticky lg:top-28">
                    <p className="font-button text-xs uppercase tracking-widest text-[#815021]">{t('Quota di partecipazione')}</p>
                    <p className="mt-3 font-heading text-5xl">{trip.price == null ? t('Quota da definire') : trip.price.toLocaleString(localeMeta.dateLocale, { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}</p>
                    {trip.price != null && <p className="mt-2 text-sm">{t('Per partecipante')}</p>}
                    {trip.priceNote && <p className="mt-3 font-medium leading-relaxed">{t(trip.priceNote)}</p>}
                    <p className="mt-5 leading-relaxed">{t(trip.draft ? 'Prezzo, servizi inclusi e date di partenza sono in preparazione.' : 'Voli internazionali e trasporto del proprio mezzo sono esclusi. Consulta il dettaglio dei costi qui sotto.')}</p>
                    <a href={email} className="btn-mech mt-6 flex min-h-11 items-center justify-center gap-2 bg-[#815021] px-4 py-4 text-center text-sm text-[#F5EBD9]">
                      {t('Richiedi informazioni')} <ArrowUpRight size={18} aria-hidden="true" />
                    </a>
                    {!trip.draft && <><a href={`/programmi/${trip.slug}.pdf`} download={`${trip.slug}.pdf`} className="mt-3 flex min-h-11 items-center justify-center gap-2 border border-[#815021] px-4 py-3 text-sm text-[#815021] transition-colors hover:bg-[#815021]/10">
                      <Download size={16} aria-hidden="true" />{t('Scarica programma')}
                    </a>
                    <p className="mt-2 text-center text-xs text-[#1C1814]/70">{t('PDF originale in italiano')}</p>
                    </>}
                    <p className="mt-5 border-t border-[#1C1814]/15 pt-5 text-sm leading-relaxed">{t(trip.draft ? 'Proposta di itinerario' : 'Accompagnamento congiunto STA e Airzoone')}</p>
                  </aside>
                </div>
                {lists.length > 0 && <div className="mt-12 grid gap-10 border-t border-[#1C1814]/20 pt-10 md:grid-cols-2">
                  {lists.map(({ title, items }) => (
                    <section key={title}>
                      <h2 className="font-heading text-3xl">{title}</h2>
                      <ul className="mt-5 list-disc space-y-3 pl-5 leading-relaxed">{items.map(item => <li key={item}>{item}</li>)}</ul>
                    </section>
                  ))}
                </div>
                }
                {trip.supplements && <p className="mt-10 border border-[#1C1814]/20 p-5 leading-relaxed">{trip.supplements}</p>}
                {trip.draft && <p className="mt-10 text-xs leading-relaxed"><a href="https://commons.wikimedia.org/wiki/File:D%C3%A9sert_marocain_,_dunes_de_Chegaga.JPG" className="underline">{t('Foto: Jamou · Wikimedia Commons')}</a> · <a href="https://creativecommons.org/licenses/by/3.0/" className="underline">CC BY 3.0</a> · {t('Ridimensionata e ritagliata')}</p>}
              </>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
