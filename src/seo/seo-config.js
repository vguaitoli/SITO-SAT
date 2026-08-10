import { CATEGORIE } from "../data/categorie.js";
import { blogPosts, getBlogPost } from "../data/blogPosts.js";
import tourCatalogContent from "../../content/tours/index.json" with { type: "json" };
import eventCatalogContent from "../../content/events/index.json" with { type: "json" };
import { normalizeEvents, normalizeTours } from "../content/normalize.js";
import { localizeValue } from "../i18n/translate.js";
import {
  getAlternatePaths,
  LOCALE_META,
  resolveRoute,
  routePath,
  SUPPORTED_LOCALES,
} from "../i18n/routes.js";

export const SITE_ORIGIN = "https://www.sardegnatrailavventura.it";
export const SITE_NAME = "Sardegna Trail Avventura";

const DEFAULT_IMAGE = "/media/og-logo.jpg";
const HOME_IMAGE = "/media/reali/hero-maxienduro-panorama-1200.webp";
const HOME_HERO_IMAGE = "/media/logo-sardegna-trail-avventura.png";
const INDEX_ROBOTS = "index, follow, max-image-preview:large";
const NOINDEX_ROBOTS = "noindex, nofollow";
const TOUR_PAGES = normalizeTours(tourCatalogContent);
const EVENT_PAGES = normalizeEvents(eventCatalogContent);

/**
 * Le pagine indice non hanno una data propria: la ricavano dal contenuto che
 * elencano. Così lastmod resta un segnale veritiero e stabile, invece di
 * cambiare a ogni build come farebbe una data di compilazione — che
 * dichiarerebbe a Google modifiche mai avvenute.
 */
const soloGiorno = (value) => (value ? String(value).slice(0, 10) : null);
const giornoPiuRecente = (...giorni) => giorni.filter(Boolean).sort().at(-1) || null;

const TOURS_LASTMOD = giornoPiuRecente(...TOUR_PAGES.map((tour) => soloGiorno(tour.updatedAt)));
const EVENTS_LASTMOD = giornoPiuRecente(...EVENT_PAGES.map((event) => soloGiorno(event.updatedAt)));
const BLOG_LASTMOD = giornoPiuRecente(...blogPosts.map((post) => soloGiorno(post.published_date)));
const HOME_LASTMOD = giornoPiuRecente(TOURS_LASTMOD, EVENTS_LASTMOD, BLOG_LASTMOD);

// Le categorie collegate al catalogo da tourType seguono i propri tour; quelle
// senza (SSV, corsi, noleggio…) hanno solo testo redazionale e seguono il
// catalogo nel suo insieme.
function categoryLastmod(category) {
  if (!category.tourType) return TOURS_LASTMOD;
  const suoi = TOUR_PAGES.filter((tour) => tour.type === category.tourType);
  return giornoPiuRecente(...suoi.map((tour) => soloGiorno(tour.updatedAt))) || TOURS_LASTMOD;
}

const catalogFallbackImages = {
  Maxienduro: "/media/reali/hero-maxienduro-panorama-1800.webp",
  Enduro: "/media/reali/hero-enduro-gruppo-1200.webp",
  Quad: "/media/reali/hero-quad-convoglio-1200.webp",
  "4x4": "/media/reali/hero-4x4-costa-1200.webp",
  "E-Bike": "/media/reali/ebike-costa-1200.webp",
  "Su Misura": "/media/reali/guida-sentiero-1200.webp",
};

const seoCopy = {
  it: {
    home: ["Tour off-road in Sardegna", "Tour e corsi off-road in Sardegna in Maxienduro, Enduro, Quad, SSV, 4x4 ed e-bike, con guide locali e istruttore qualificato."],
    tours: ["Itinerari e tour off-road in Sardegna", "Scopri gli itinerari off-road guidati in Sardegna, con durata, difficoltà, mezzo consigliato e informazioni per scegliere il tour."],
    events: ["Eventi e partenze off-road in Sardegna", "Eventi, partenze programmate e proposte off-road in Sardegna. Consulta le esperienze disponibili e richiedi informazioni."],
    blog: ["Racconti e guide sull’off-road in Sardegna", "Racconti, itinerari e consigli per vivere l’off-road in Sardegna tra Maxienduro, Enduro, Quad, 4x4 ed esperienze locali."],
    privacy: ["Privacy policy", `Informativa sul trattamento dei dati personali di ${SITE_NAME}.`],
    cookies: ["Cookie policy", `Informazioni sui cookie e sui servizi utilizzati dal sito ${SITE_NAME}.`],
    notFound: ["Pagina non trovata", "La pagina richiesta non è disponibile."],
    imageAlt: `${SITE_NAME} — tour in Sardegna`,
    area: "Sardegna, Italia",
    routes: { tours: "Itinerari", events: "Eventi", blog: "Blog" },
  },
  en: {
    home: ["Off-road tours in Sardinia", "Guided Maxienduro, Enduro, Quad, SSV, 4x4 and e-bike tours and off-road riding courses in Sardinia with local guides and a qualified instructor."],
    tours: ["Off-road routes and tours in Sardinia", "Explore guided off-road routes in Sardinia with duration, difficulty, recommended vehicle and all the information needed to choose your tour."],
    events: ["Off-road events and departures in Sardinia", "Scheduled departures and off-road events in Sardinia. Discover the available experiences and request information."],
    blog: ["Stories and off-road guides from Sardinia", "Stories, routes and advice for experiencing Sardinia by Maxienduro, Enduro, Quad and 4x4, with local insight."],
    privacy: ["Privacy policy", `Information on how ${SITE_NAME} processes personal data.`],
    cookies: ["Cookie policy", `Information about cookies and the services used by the ${SITE_NAME} website.`],
    notFound: ["Page not found", "The requested page is not available."],
    imageAlt: `${SITE_NAME} — tours in Sardinia`,
    area: "Sardinia, Italy",
    routes: { tours: "Tours", events: "Events", blog: "Blog" },
  },
  fr: {
    home: ["Circuits tout-terrain en Sardaigne", "Circuits guidés en Maxienduro, Enduro, Quad, SSV, 4x4 et vélo électrique, ainsi que stages de conduite tout-terrain en Sardaigne avec guides locaux et moniteur qualifié."],
    tours: ["Itinéraires et circuits tout-terrain en Sardaigne", "Découvrez les itinéraires tout-terrain guidés en Sardaigne, avec durée, difficulté, véhicule conseillé et toutes les informations pour choisir votre circuit."],
    events: ["Événements et départs tout-terrain en Sardaigne", "Départs programmés et événements tout-terrain en Sardaigne. Découvrez les expériences disponibles et demandez des informations."],
    blog: ["Récits et guides tout-terrain en Sardaigne", "Récits, itinéraires et conseils pour découvrir la Sardaigne en Maxienduro, Enduro, Quad ou 4x4, avec une approche locale."],
    privacy: ["Politique de confidentialité", `Informations sur le traitement des données personnelles par ${SITE_NAME}.`],
    cookies: ["Politique de cookies", `Informations sur les cookies et les services utilisés par le site ${SITE_NAME}.`],
    notFound: ["Page introuvable", "La page demandée n’est pas disponible."],
    imageAlt: `${SITE_NAME} — circuits en Sardaigne`,
    area: "Sardaigne, Italie",
    routes: { tours: "Circuits", events: "Événements", blog: "Blog" },
  },
};

const categorySeo = {
  it: {
    maxienduro: ["Tour Maxienduro in Sardegna", "Tour guidati in Maxienduro in Sardegna tra sterrati panoramici, montagne e coste selvagge, con guide locali esperte."],
    enduro: ["Tour Enduro in Sardegna", "Tour guidati Enduro in Sardegna su sentieri tecnici, mulattiere e tratturi tra Barbagia e Supramonte."],
    quad: ["Tour in Quad in Sardegna", "Esperienze e tour in Quad in Sardegna, accompagnati da guide locali lungo sterrati, paesaggi e territori autentici."],
    ssv: ["Esperienze in SSV in Sardegna", "Esperienze in SSV in Sardegna per vivere il fuoristrada con guida affiancata, sicurezza e accompagnamento locale."],
    "4x4": ["Tour 4x4 in Sardegna", "Tour guidati in 4x4 in Sardegna tra altipiani, guadi, coste remote e borghi, con itinerari adatti al gruppo."],
    "4x4-experience": ["Escursioni 4x4 in Sardegna da passeggero", "Escursioni 4x4 in Sardegna da passeggero, a bordo dei mezzi dell’organizzazione con guide locali esperte."],
    "tour-stradali": ["Tour stradali in Sardegna", "Tour stradali in Sardegna tra coste, montagne e borghi, lungo percorsi panoramici pensati per moto e auto."],
    "e-bike": ["Tour in e-bike in Sardegna", "Tour guidati in e-bike in Sardegna tra sentieri, nuraghi e borghi, con pedalata assistita e ritmo accessibile."],
    "corsi-off-road": ["Corsi di guida off-road in Sardegna", "Corsi di guida off-road in Sardegna con Gianluca Serra, istruttore qualificato, per migliorare tecnica, controllo e sicurezza sullo sterrato."],
    noleggio: ["Noleggio quad, enduro e maxienduro in Sardegna", "Partecipa ai tour Sardegna Trail Avventura anche senza mezzo proprio. Noleggio di Quad, Enduro e Maxienduro tramite partner locali selezionati."],
  },
  en: {
    maxienduro: ["Maxienduro tours in Sardinia", "Guided Maxienduro tours in Sardinia across panoramic dirt roads, mountains and wild coastlines with expert local guides."],
    enduro: ["Enduro tours in Sardinia", "Guided Enduro tours in Sardinia on technical trails, mule tracks and country paths through Barbagia and Supramonte."],
    quad: ["Quad tours in Sardinia", "Guided Quad experiences and tours in Sardinia through authentic landscapes and territories."],
    ssv: ["SSV experiences in Sardinia", "SSV experiences in Sardinia with side-by-side driving, safety and local guidance."],
    "4x4": ["4x4 tours in Sardinia", "Guided 4x4 tours in Sardinia across plateaus, river crossings, remote coastlines and villages."],
    "4x4-experience": ["Passenger 4x4 experiences in Sardinia", "Explore Sardinia as a passenger in the organisation’s 4x4 vehicles with expert local guides."],
    "tour-stradali": ["Scenic road tours in Sardinia", "Road tours in Sardinia through coastlines, mountains and villages, designed for motorcycles and cars."],
    "e-bike": ["E-bike tours in Sardinia", "Guided e-bike tours in Sardinia through trails, nuraghi and villages at an accessible pace."],
    "corsi-off-road": ["Off-road riding courses in Sardinia", "Off-road riding courses in Sardinia with qualified instructor Gianluca Serra to improve technique, control and safety."],
    noleggio: ["Quad, Enduro and Maxienduro rental in Sardinia", "Join a Sardegna Trail Avventura tour without your own vehicle, with Quad, Enduro and Maxienduro rental through selected local partners."],
  },
  fr: {
    maxienduro: ["Circuits Maxienduro en Sardaigne", "Circuits guidés en Maxienduro en Sardaigne entre pistes panoramiques, montagnes et côtes sauvages, avec des guides locaux expérimentés."],
    enduro: ["Circuits Enduro en Sardaigne", "Circuits Enduro guidés en Sardaigne sur sentiers techniques et chemins muletiers entre Barbagia et Supramonte."],
    quad: ["Circuits en Quad en Sardaigne", "Expériences et circuits guidés en Quad à travers les paysages et territoires authentiques de Sardaigne."],
    ssv: ["Expériences en SSV en Sardaigne", "Expériences en SSV en Sardaigne, avec conduite côte à côte, sécurité et accompagnement local."],
    "4x4": ["Circuits en 4x4 en Sardaigne", "Circuits guidés en 4x4 en Sardaigne entre plateaux, gués, côtes isolées et villages."],
    "4x4-experience": ["Excursions en 4x4 comme passager en Sardaigne", "Découvrez la Sardaigne comme passager dans les 4x4 de l’organisation avec des guides locaux expérimentés."],
    "tour-stradali": ["Circuits routiers panoramiques en Sardaigne", "Circuits routiers en Sardaigne entre côtes, montagnes et villages, conçus pour motos et voitures."],
    "e-bike": ["Circuits en vélo électrique en Sardaigne", "Circuits guidés en vélo électrique entre sentiers, nuraghes et villages, à un rythme accessible."],
    "corsi-off-road": ["Stages de conduite tout-terrain en Sardaigne", "Stages de conduite tout-terrain en Sardaigne avec Gianluca Serra, moniteur qualifié, pour améliorer technique, maîtrise et sécurité."],
    noleggio: ["Location de Quad, Enduro et Maxienduro en Sardaigne", "Participez à un circuit Sardegna Trail Avventura sans votre propre véhicule grâce à nos partenaires locaux sélectionnés."],
  },
};

const staticImages = {
  home: { image: HOME_IMAGE, preloadImage: HOME_HERO_IMAGE, lastmod: HOME_LASTMOD },
  tours: { image: "/media/reali/guida-sentiero-1200.webp", lastmod: TOURS_LASTMOD },
  events: { image: "/media/reali/gruppo-altopiano-1200.webp", lastmod: EVENTS_LASTMOD },
  blog: { image: HOME_IMAGE, lastmod: BLOG_LASTMOD },
  privacy: { robots: NOINDEX_ROBOTS },
  cookies: { robots: NOINDEX_ROBOTS },
};

function absoluteUrl(pathname) {
  return new URL(pathname, SITE_ORIGIN).href;
}

function breadcrumb(locale, items) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

/**
 * Il nodo dell'attività. Va incluso nel grafo di ogni pagina che lo richiama
 * come organizer, provider, publisher o author: un @id che punta a un nodo
 * definito altrove resta irrisolto, e i validatori lo leggono come un Thing
 * privo di nome e di url.
 */
function businessNode(locale) {
  const copy = seoCopy[locale];
  return {
    "@type": "TravelAgency",
    "@id": `${SITE_ORIGIN}/#business`,
    name: SITE_NAME,
    url: absoluteUrl(routePath(locale, "home")),
    logo: absoluteUrl("/media/logo-sardegna-trail-avventura.png"),
    image: absoluteUrl(HOME_IMAGE),
    description: copy.home[1],
    telephone: "+39 348 79 81 591",
    email: "sardegnatrailavventura@gmail.com",
    address: {
      "@type": "PostalAddress",
      streetAddress: "Strada Vicinale Zinziodda Li Buttagari, 111",
      postalCode: "07100",
      addressLocality: "Sassari",
      addressRegion: "SS",
      addressCountry: "IT",
    },
    areaServed: { "@type": "AdministrativeArea", name: copy.area },
    sameAs: [
      "https://instagram.com/sardegnatrailavventura",
      "https://facebook.com/sardegnatrailavventura",
    ],
  };
}

function homeStructuredData(locale) {
  const home = routePath(locale, "home");
  return {
    "@context": "https://schema.org",
    "@graph": [
      businessNode(locale),
      {
        "@type": "WebSite",
        "@id": `${SITE_ORIGIN}/#website`,
        url: absoluteUrl(home),
        name: SITE_NAME,
        inLanguage: LOCALE_META[locale].htmlLang,
        publisher: { "@id": `${SITE_ORIGIN}/#business` },
      },
    ],
  };
}

function collectionStructuredData(locale, routeName, path, title, description) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      breadcrumb(locale, [
        { name: "Home", path: routePath(locale, "home") },
        { name: seoCopy[locale].routes[routeName], path },
      ]),
      {
        "@type": "CollectionPage",
        name: title,
        description,
        url: absoluteUrl(path),
        inLanguage: LOCALE_META[locale].htmlLang,
      },
    ],
  };
}

function categoryStructuredData(locale, category, path, title, description) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      businessNode(locale),
      breadcrumb(locale, [
        { name: "Home", path: routePath(locale, "home") },
        { name: category.nome, path },
      ]),
      {
        "@type": category.kind === "course" ? "Course" : "Service",
        name: title,
        url: absoluteUrl(path),
        description,
        areaServed: { "@type": "AdministrativeArea", name: seoCopy[locale].area },
        provider: { "@id": `${SITE_ORIGIN}/#business` },
      },
    ],
  };
}

function blogStructuredData(locale, post, path) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      businessNode(locale),
      breadcrumb(locale, [
        { name: "Home", path: routePath(locale, "home") },
        { name: "Blog", path: routePath(locale, "blog") },
        { name: post.title, path },
      ]),
      {
        "@type": "BlogPosting",
        headline: post.title,
        description: post.excerpt,
        image: absoluteUrl(post.cover_image || HOME_IMAGE),
        datePublished: post.published_date,
        dateModified: post.published_date,
        mainEntityOfPage: absoluteUrl(path),
        inLanguage: LOCALE_META[locale].htmlLang,
        author: { "@id": `${SITE_ORIGIN}/#business` },
        publisher: { "@id": `${SITE_ORIGIN}/#business` },
      },
    ],
  };
}

function catalogImage(item) {
  return item.tappe?.find((stage) => stage.foto)?.foto || catalogFallbackImages[item.type] || DEFAULT_IMAGE;
}

function compactDescription(value, maxLength = 158) {
  const compact = String(value || "").replace(/\\n|\s+/g, " ").trim();
  if (compact.length <= maxLength) return compact;
  const shortened = compact.slice(0, maxLength - 1);
  const lastSpace = shortened.lastIndexOf(" ");
  return `${shortened.slice(0, Math.max(lastSpace, 80))}…`;
}

function catalogSeoText(locale, item, isEvent) {
  const title = isEvent
    ? locale === "en"
      ? `${item.name}: off-road event in Sardinia`
      : locale === "fr"
        ? `${item.name} : événement tout-terrain en Sardaigne`
        : `${item.name}: evento off-road in Sardegna`
    : locale === "en"
      ? `${item.name}: ${item.type} tour in Sardinia`
      : locale === "fr"
        ? `${item.name} : circuit ${item.type} en Sardaigne`
        : `${item.name}: tour ${item.type} in Sardegna`;

  const details = isEvent
    ? `${item.periodo}. ${item.durata}, ${item.interesse}.`
    : locale === "en"
      ? `${item.durata}, ${item.km}, ${item.livello} level.`
      : locale === "fr"
        ? `${item.durata}, ${item.km}, niveau ${item.livello}.`
        : `${item.durata}, ${item.km}, livello ${item.livello}.`;
  return {
    title,
    description: compactDescription(`${item.descrizione} ${details}`),
  };
}

function tourStructuredData(locale, item, path, title, description) {
  const image = catalogImage(item);
  return {
    "@context": "https://schema.org",
    "@graph": [
      businessNode(locale),
      breadcrumb(locale, [
        { name: "Home", path: routePath(locale, "home") },
        { name: seoCopy[locale].routes.tours, path: routePath(locale, "tours") },
        { name: item.name, path },
      ]),
      {
        "@type": "TouristTrip",
        name: title,
        description,
        url: absoluteUrl(path),
        image: absoluteUrl(image),
        touristType: item.type,
        itinerary: item.tappe?.length
          ? {
              "@type": "ItemList",
              itemListElement: item.tappe.map((stage, index) => ({
                "@type": "ListItem",
                position: index + 1,
                name: stage.title,
                description: stage.desc,
              })),
            }
          : undefined,
        provider: { "@id": `${SITE_ORIGIN}/#business` },
        inLanguage: LOCALE_META[locale].htmlLang,
      },
    ],
  };
}

function eventStructuredData(locale, item, path, description) {
  const image = catalogImage(item);
  const numericPrice = String(item.price || "").match(/[\d.,]+/)?.[0]?.replace(",", ".");
  return {
    "@context": "https://schema.org",
    "@graph": [
      businessNode(locale),
      breadcrumb(locale, [
        { name: "Home", path: routePath(locale, "home") },
        { name: seoCopy[locale].routes.events, path: routePath(locale, "events") },
        { name: item.name, path },
      ]),
      {
        "@type": "Event",
        name: item.name,
        description,
        startDate: item.startDate,
        endDate: item.endDate || item.startDate,
        eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
        eventStatus: "https://schema.org/EventScheduled",
        url: absoluteUrl(path),
        image: [absoluteUrl(image)],
        location: {
          "@type": "Place",
          name: item.startLocation || seoCopy[locale].area,
          address: {
            "@type": "PostalAddress",
            addressLocality: item.startLocation || undefined,
            addressRegion: "Sardegna",
            addressCountry: "IT",
          },
        },
        organizer: { "@id": `${SITE_ORIGIN}/#business` },
        ...(numericPrice
          ? {
              offers: {
                "@type": "Offer",
                url: absoluteUrl(path),
                price: numericPrice,
                priceCurrency: "EUR",
                availability: "https://schema.org/InStock",
              },
            }
          : {}),
        inLanguage: LOCALE_META[locale].htmlLang,
      },
    ],
  };
}

function finalize(path, locale, seo) {
  const image = seo.image || DEFAULT_IMAGE;
  const alternatePaths = getAlternatePaths(path);
  return {
    path,
    locale,
    htmlLang: LOCALE_META[locale].htmlLang,
    ogLocale: LOCALE_META[locale].ogLocale,
    title: `${seo.title} | ${SITE_NAME}`,
    description: seo.description,
    canonical: absoluteUrl(path),
    alternates: {
      it: absoluteUrl(alternatePaths.it),
      en: absoluteUrl(alternatePaths.en),
      fr: absoluteUrl(alternatePaths.fr),
      "x-default": absoluteUrl(alternatePaths.it),
    },
    robots: seo.robots || INDEX_ROBOTS,
    image: absoluteUrl(image),
    imageAlt: seo.imageAlt || seoCopy[locale].imageAlt,
    type: seo.type || "website",
    preloadImage: seo.preloadImage ? absoluteUrl(seo.preloadImage) : null,
    structuredData: seo.structuredData || null,
    indexable: (seo.robots || INDEX_ROBOTS).startsWith("index"),
    lastmod: seo.lastmod || null,
  };
}

export function getSeoForPath(pathname) {
  const resolved = resolveRoute(pathname);
  const { locale, name, params } = resolved;
  const path = name === "notFound" ? pathname : routePath(locale, name, params);
  const copy = seoCopy[locale];

  if (["home", "tours", "events", "blog", "privacy", "cookies"].includes(name)) {
    const [title, description] = copy[name];
    const structuredData =
      name === "home"
        ? homeStructuredData(locale)
        : ["tours", "events", "blog"].includes(name)
          ? collectionStructuredData(locale, name, path, title, description)
          : null;
    return finalize(path, locale, {
      title,
      description,
      ...staticImages[name],
      structuredData,
    });
  }

  if (name === "experiences") {
    const sourceCategory = CATEGORIE.find((item) => item.id === params.cat);
    if (sourceCategory) {
      const category = localizeValue(sourceCategory, locale);
      const [title, description] = categorySeo[locale][sourceCategory.id];
      return finalize(path, locale, {
        title,
        description,
        image: category.fotoHero ? `/media/reali/${category.fotoHero}-1200.webp` : DEFAULT_IMAGE,
        imageAlt: `${category.nome} — ${copy.area}`,
        structuredData: categoryStructuredData(locale, category, path, title, description),
        lastmod: categoryLastmod(sourceCategory),
      });
    }
  }

  if (name === "tourDetail") {
    const sourceTour = TOUR_PAGES.find((item) => item.slug === params.slug);
    if (sourceTour) {
      const tour = localizeValue(sourceTour, locale);
      const { title, description } = catalogSeoText(locale, tour, false);
      return finalize(path, locale, {
        title,
        description,
        image: catalogImage(tour),
        imageAlt: `${tour.name} — ${copy.area}`,
        structuredData: tourStructuredData(locale, tour, path, title, description),
        lastmod: sourceTour.updatedAt?.slice(0, 10) || null,
      });
    }
  }

  if (name === "eventDetail") {
    const sourceEvent = EVENT_PAGES.find((item) => item.slug === params.slug);
    if (sourceEvent) {
      const event = localizeValue(sourceEvent, locale);
      const { title, description } = catalogSeoText(locale, event, true);
      return finalize(path, locale, {
        title,
        description,
        image: catalogImage(event),
        imageAlt: `${event.name} — ${copy.area}`,
        type: "article",
        structuredData: eventStructuredData(locale, event, path, description),
        lastmod: sourceEvent.updatedAt?.slice(0, 10) || null,
      });
    }
  }

  if (name === "blogPost") {
    const post = getBlogPost(params.id, locale);
    if (post) {
      return finalize(path, locale, {
        title: post.title,
        description: post.excerpt,
        image: post.cover_image || HOME_IMAGE,
        imageAlt: post.title,
        type: "article",
        structuredData: blogStructuredData(locale, post, path),
        lastmod: post.published_date || null,
      });
    }
  }

  return finalize(path, locale, {
    title: copy.notFound[0],
    description: copy.notFound[1],
    robots: NOINDEX_ROBOTS,
  });
}

export function getSeoEntries() {
  return SUPPORTED_LOCALES.flatMap((locale) => [
    getSeoForPath(routePath(locale, "home")),
    getSeoForPath(routePath(locale, "tours")),
    getSeoForPath(routePath(locale, "events")),
    getSeoForPath(routePath(locale, "blog")),
    getSeoForPath(routePath(locale, "privacy")),
    getSeoForPath(routePath(locale, "cookies")),
    ...CATEGORIE.map((category) =>
      getSeoForPath(routePath(locale, "experiences", { cat: category.id })),
    ),
    ...TOUR_PAGES.map((tour) =>
      getSeoForPath(routePath(locale, "tourDetail", { slug: tour.slug })),
    ),
    ...EVENT_PAGES.map((event) =>
      getSeoForPath(routePath(locale, "eventDetail", { slug: event.slug })),
    ),
    ...blogPosts.map((post) =>
      getSeoForPath(routePath(locale, "blogPost", { id: post.id })),
    ),
  ]);
}

export function getSitemapEntries() {
  return getSeoEntries().filter((entry) => entry.indexable);
}
