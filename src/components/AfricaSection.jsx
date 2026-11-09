import { Link } from 'react-router-dom';
import { ArrowUpRight, Download } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';
import { AFRICA_TRIPS } from '@/data/africa';

export function AfricaCards() {
  const { t, route, localize } = useI18n();
  const trips = localize(AFRICA_TRIPS);
  return (
    <div className="grid gap-7 md:grid-cols-2 xl:grid-cols-4">
      {trips.map(trip => (
        <article key={trip.slug} className="flex flex-col border border-[#1C1814]/20 bg-[#FBF6EC]">
          <Link to={route('africaDetail', { slug: trip.slug })} className="group block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4" aria-label={`${t('Scopri')} ${trip.title}`}>
            <div className="aspect-[16/10] overflow-hidden">
              <img src={trip.cover} width="1600" height="1000" alt={trip.coverAlt} loading="lazy" className={`h-full w-full object-cover transition-opacity group-hover:opacity-90 ${trip.slug === 'libia-quad-ssv' ? 'scale-[1.7] object-[50%_15%]' : 'object-center'}`} />
            </div>
          </Link>
          <div className="flex grow flex-col p-6">
            <p className="font-button text-xs uppercase tracking-widest text-[#815021]">{trip.days} {t('giorni')} · {trip.vehicles}{trip.year ? ` · ${trip.year}` : ''}</p>
            <h3 className="mt-3 font-heading text-3xl leading-tight text-[#1C1814]">{trip.title}</h3>
            <p className="mt-3 grow font-body leading-relaxed text-[#1C1814]/80">{trip.subtitle}</p>
            <div className="mt-5 border-t border-[#1C1814]/15 pt-4 text-sm text-[#1C1814]/80">
              <p>{t(trip.draft ? 'Proposta di itinerario' : 'Date da confermare')}</p>
              <p className="mt-2">{t('Accompagnamento congiunto STA e Airzoone')}</p>
            </div>
            <Link to={route('africaDetail', { slug: trip.slug })} className="mt-5 inline-flex min-h-11 items-center justify-between gap-3 font-button uppercase text-[#815021] underline-offset-4 hover:underline">
              {t('Scopri il programma')} <ArrowUpRight size={20} aria-hidden="true" />
            </Link>
            {!trip.draft && <>
            <a href={`/programmi/${trip.slug}.pdf`} download={`${trip.slug}.pdf`} className="mt-3 inline-flex min-h-11 items-center justify-center gap-2 border border-[#815021] px-3 py-3 font-button text-sm text-[#815021] transition-colors hover:bg-[#815021]/10">
              <Download size={16} aria-hidden="true" />{t('Scarica programma')}
            </a>
            <p className="mt-2 text-xs text-[#1C1814]/70">{t('PDF originale in italiano')}</p>
            </>}
            <p className="mt-4 text-xs text-[#1C1814]/65">{trip.draft ? <><a href="https://commons.wikimedia.org/wiki/File:D%C3%A9sert_marocain_,_dunes_de_Chegaga.JPG" className="underline">{t('Foto: Jamou · Wikimedia Commons')}</a> · <a href="https://creativecommons.org/licenses/by/3.0/" className="underline">CC BY 3.0</a> · {t('Ridimensionata e ritagliata')}</> : t('Immagine: Airzoone')}</p>
          </div>
        </article>
      ))}
    </div>
  );
}

export default function AfricaSection({ compact = false }) {
  const { t, route } = useI18n();
  return (
    <section aria-labelledby="africa-heading" className="bg-[#F5EBD9] px-5 py-16 lg:px-8 lg:py-24">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="mb-4 font-button text-xs uppercase tracking-[0.25em] text-[#815021]">{t('STA × Airzoone · Accompagnamento congiunto')}</p>
            <h2 id="africa-heading" className="font-heading text-5xl text-[#1C1814]">{t('L’AVVENTURA CONTINUA IN AFRICA.')}</h2>
            <p className="mt-4 max-w-2xl font-body text-lg text-[#1C1814]/80">{t('Tunisia, Libia e Marocco, tra dune e oasi. Scopri il deserto in moto, 4x4, quad e SSV.')}</p>
          </div>
          <Link to={route('africa')} className="btn-mech inline-flex min-h-11 items-center gap-3 bg-[#815021] px-6 py-4 text-[#F5EBD9]">
            {t('Viaggi in Africa')} <ArrowUpRight size={18} aria-hidden="true" />
          </Link>
        </div>
        {!compact && <AfricaCards />}
      </div>
    </section>
  );
}
