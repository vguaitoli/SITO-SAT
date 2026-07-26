import { CATEGORIE } from "../data/categorie.js";
import { blogPosts } from "../data/blogPosts.js";

export const SITE_ORIGIN = "https://www.sardegnatrailavventura.it";
export const SITE_NAME = "Sardegna Trail Avventura";

const DEFAULT_IMAGE = "/media/og-logo.jpg";
const HOME_IMAGE = "/media/reali/hero-maxienduro-panorama-1200.webp";
const HOME_HERO_IMAGE = "/media/logo-sardegna-trail-avventura.png";
const INDEX_ROBOTS = "index, follow, max-image-preview:large";
const NOINDEX_ROBOTS = "noindex, nofollow";

const categoryDescriptions = {
  maxienduro:
    "Tour guidati in Maxienduro in Sardegna tra sterrati panoramici, montagne e coste selvagge, con guide locali esperte.",
  enduro:
    "Tour guidati Enduro in Sardegna su sentieri tecnici, mulattiere e tratturi tra Barbagia e Supramonte.",
  quad:
    "Esperienze e tour in Quad in Sardegna, accompagnati da guide locali lungo sterrati, paesaggi e territori autentici.",
  ssv:
    "Esperienze in SSV in Sardegna per vivere il fuoristrada con guida affiancata, sicurezza e accompagnamento locale.",
  "4x4":
    "Tour guidati in 4x4 in Sardegna tra altipiani, guadi, coste remote e borghi, con itinerari adatti al gruppo.",
  "4x4-experience":
    "Escursioni 4x4 in Sardegna da passeggero, a bordo dei mezzi dell’organizzazione con guide locali esperte.",
  "tour-stradali":
    "Tour stradali in Sardegna tra coste, montagne e borghi, lungo percorsi panoramici pensati per moto e auto.",
  "e-bike":
    "Tour guidati in e-bike in Sardegna tra sentieri, nuraghi e borghi, con pedalata assistita e ritmo accessibile.",
  "corsi-off-road":
    "Corsi di guida off-road in Sardegna con Gianluca Serra, istruttore qualificato, per migliorare tecnica, controllo e sicurezza sullo sterrato.",
};

const categoryTitles = {
  maxienduro: "Tour Maxienduro in Sardegna",
  enduro: "Tour Enduro in Sardegna",
  quad: "Tour in Quad in Sardegna",
  ssv: "Esperienze in SSV in Sardegna",
  "4x4": "Tour 4x4 in Sardegna",
  "4x4-experience": "Escursioni 4x4 in Sardegna da passeggero",
  "tour-stradali": "Tour stradali in Sardegna",
  "e-bike": "Tour in e-bike in Sardegna",
  "corsi-off-road": "Corsi di guida off-road in Sardegna",
};

const staticPages = {
  "/": {
    title: `Tour off-road in Sardegna | ${SITE_NAME}`,
    description:
      "Tour e corsi off-road in Sardegna in Maxienduro, Enduro, Quad, SSV, 4x4 ed e-bike, con guide locali e istruttore qualificato.",
    image: HOME_IMAGE,
    preloadImage: HOME_HERO_IMAGE,
  },
  "/itinerari": {
    title: `Itinerari e tour off-road in Sardegna | ${SITE_NAME}`,
    description:
      "Scopri gli itinerari off-road guidati in Sardegna, con durata, difficoltà, mezzo consigliato e informazioni per scegliere il tour.",
    image: "/media/reali/guida-sentiero-1200.webp",
  },
  "/eventi": {
    title: `Eventi e partenze off-road in Sardegna | ${SITE_NAME}`,
    description:
      "Eventi, partenze programmate e proposte off-road in Sardegna. Consulta le esperienze disponibili e richiedi informazioni.",
    image: "/media/reali/gruppo-altopiano-1200.webp",
  },
  "/blog": {
    title: `Racconti e guide sull’off-road in Sardegna | ${SITE_NAME}`,
    description:
      "Racconti, itinerari e consigli per vivere l’off-road in Sardegna tra Maxienduro, Enduro, Quad, 4x4 ed esperienze locali.",
    image: HOME_IMAGE,
  },
  "/privacy": {
    title: `Privacy policy | ${SITE_NAME}`,
    description: `Informativa sul trattamento dei dati personali di ${SITE_NAME}.`,
    robots: NOINDEX_ROBOTS,
  },
  "/cookie-policy": {
    title: `Cookie policy | ${SITE_NAME}`,
    description: `Informazioni sui cookie e sui servizi utilizzati dal sito ${SITE_NAME}.`,
    robots: NOINDEX_ROBOTS,
  },
  "/login": {
    title: `Accesso riservato | ${SITE_NAME}`,
    description: "Pagina di accesso riservata.",
    robots: NOINDEX_ROBOTS,
  },
  "/register": {
    title: `Registrazione | ${SITE_NAME}`,
    description: "Pagina di registrazione riservata.",
    robots: NOINDEX_ROBOTS,
  },
  "/forgot-password": {
    title: `Recupera password | ${SITE_NAME}`,
    description: "Pagina per il recupero delle credenziali.",
    robots: NOINDEX_ROBOTS,
  },
  "/reset-password": {
    title: `Reimposta password | ${SITE_NAME}`,
    description: "Pagina per reimpostare le credenziali.",
    robots: NOINDEX_ROBOTS,
  },
  "/blog/admin": {
    title: `Amministrazione blog | ${SITE_NAME}`,
    description: "Area amministrativa riservata.",
    robots: NOINDEX_ROBOTS,
  },
};

function normalizePath(pathname) {
  if (!pathname || pathname === "/") return "/";
  const clean = pathname.split("?")[0].split("#")[0].replace(/\/+$/, "");
  return clean || "/";
}

function absoluteUrl(pathname) {
  return new URL(pathname, SITE_ORIGIN).href;
}

function breadcrumb(items) {
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

function homeStructuredData() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "TravelAgency",
        "@id": `${SITE_ORIGIN}/#business`,
        name: SITE_NAME,
        url: `${SITE_ORIGIN}/`,
        logo: absoluteUrl("/media/logo-sardegna-trail-avventura.png"),
        image: absoluteUrl(HOME_IMAGE),
        description:
          "Tour e corsi off-road in Sardegna in Maxienduro, Enduro, Quad, SSV, 4x4 ed e-bike.",
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
        areaServed: {
          "@type": "AdministrativeArea",
          name: "Sardegna, Italia",
        },
        sameAs: [
          "https://instagram.com/sardegnatrailavventura",
          "https://facebook.com/sardegnatrailavventura",
        ],
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_ORIGIN}/#website`,
        url: `${SITE_ORIGIN}/`,
        name: SITE_NAME,
        inLanguage: "it-IT",
        publisher: { "@id": `${SITE_ORIGIN}/#business` },
      },
    ],
  };
}

function categoryStructuredData(category, path, description) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      breadcrumb([
        { name: "Home", path: "/" },
        { name: category.nome, path },
      ]),
      {
        "@type": category.kind === "course" ? "Course" : "Service",
        name: categoryTitles[category.id] || category.nome,
        url: absoluteUrl(path),
        description,
        areaServed: { "@type": "AdministrativeArea", name: "Sardegna, Italia" },
        provider: { "@id": `${SITE_ORIGIN}/#business` },
      },
    ],
  };
}

function blogStructuredData(post, path) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      breadcrumb([
        { name: "Home", path: "/" },
        { name: "Blog", path: "/blog" },
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
        inLanguage: "it-IT",
        author: { "@id": `${SITE_ORIGIN}/#business` },
        publisher: { "@id": `${SITE_ORIGIN}/#business` },
      },
    ],
  };
}

function staticStructuredData(path) {
  if (path === "/") return homeStructuredData();
  if (!["/itinerari", "/eventi", "/blog"].includes(path)) return null;

  const names = {
    "/itinerari": "Itinerari",
    "/eventi": "Eventi",
    "/blog": "Blog",
  };

  return {
    "@context": "https://schema.org",
    "@graph": [
      breadcrumb([
        { name: "Home", path: "/" },
        { name: names[path], path },
      ]),
      {
        "@type": "CollectionPage",
        name: staticPages[path].title,
        description: staticPages[path].description,
        url: absoluteUrl(path),
        inLanguage: "it-IT",
      },
    ],
  };
}

function finalize(path, seo) {
  const image = seo.image || DEFAULT_IMAGE;
  return {
    path,
    title: seo.title,
    description: seo.description,
    canonical: absoluteUrl(path),
    robots: seo.robots || INDEX_ROBOTS,
    image: absoluteUrl(image),
    imageAlt: seo.imageAlt || `${SITE_NAME} — tour in Sardegna`,
    type: seo.type || "website",
    preloadImage: seo.preloadImage ? absoluteUrl(seo.preloadImage) : null,
    preloadImageSrcSet: seo.preloadImageSrcSet
      ? seo.preloadImageSrcSet
          .split(", ")
          .map((candidate) => {
            const [url, width] = candidate.split(" ");
            return `${absoluteUrl(url)} ${width}`;
          })
          .join(", ")
      : null,
    structuredData: seo.structuredData || staticStructuredData(path),
    indexable: (seo.robots || INDEX_ROBOTS).startsWith("index"),
    lastmod: seo.lastmod || null,
  };
}

export function getSeoForPath(pathname) {
  const path = normalizePath(pathname);

  if (staticPages[path]) return finalize(path, staticPages[path]);

  const categoryMatch = path.match(/^\/esperienze\/([^/]+)$/);
  if (categoryMatch) {
    const category = CATEGORIE.find((item) => item.id === categoryMatch[1]);
    if (category) {
      const description =
        categoryDescriptions[category.id] ||
        `${category.nome} in Sardegna con guide locali esperte.`;
      const image = category.fotoHero
        ? `/media/reali/${category.fotoHero}-1200.webp`
        : DEFAULT_IMAGE;
      return finalize(path, {
        title: `${categoryTitles[category.id] || category.nome} | ${SITE_NAME}`,
        description,
        image,
        imageAlt: category.fotoHero
          ? `${category.nome} in Sardegna`
          : `${SITE_NAME}`,
        structuredData: categoryStructuredData(category, path, description),
      });
    }
  }

  const blogMatch = path.match(/^\/blog\/([^/]+)$/);
  if (blogMatch) {
    const post = blogPosts.find((item) => item.id === blogMatch[1]);
    if (post) {
      return finalize(path, {
        title: `${post.title} | ${SITE_NAME}`,
        description: post.excerpt,
        image: post.cover_image || HOME_IMAGE,
        imageAlt: post.title,
        type: "article",
        structuredData: blogStructuredData(post, path),
        lastmod: post.published_date || null,
      });
    }
  }

  return finalize(path, {
    title: `Pagina non trovata | ${SITE_NAME}`,
    description: "La pagina richiesta non è disponibile.",
    robots: NOINDEX_ROBOTS,
    structuredData: null,
  });
}

export function getSeoEntries() {
  const paths = [
    ...Object.keys(staticPages),
    ...CATEGORIE.map((category) => `/esperienze/${category.id}`),
    ...blogPosts.map((post) => `/blog/${post.id}`),
  ];

  return paths.map(getSeoForPath);
}

export function getSitemapEntries() {
  return getSeoEntries().filter((entry) => entry.indexable);
}
