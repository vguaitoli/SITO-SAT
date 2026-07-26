import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { getSeoForPath, SITE_NAME } from "@/seo/seo-config";

function upsertMeta(selector, attributes) {
  let element = document.head.querySelector(selector);
  if (!element) {
    element = document.createElement("meta");
    document.head.appendChild(element);
  }

  Object.entries(attributes).forEach(([name, value]) => {
    element.setAttribute(name, value);
  });
}

function upsertCanonical(href) {
  let element = document.head.querySelector('link[rel="canonical"]');
  if (!element) {
    element = document.createElement("link");
    element.setAttribute("rel", "canonical");
    document.head.appendChild(element);
  }
  element.setAttribute("href", href);
}

function updateStructuredData(value) {
  let element = document.head.querySelector("#seo-jsonld");

  if (!value) {
    element?.remove();
    return;
  }

  if (!element) {
    element = document.createElement("script");
    element.id = "seo-jsonld";
    element.type = "application/ld+json";
    document.head.appendChild(element);
  }

  element.textContent = JSON.stringify(value);
}

export default function SeoHead() {
  const { pathname } = useLocation();

  useEffect(() => {
    const seo = getSeoForPath(pathname);

    document.documentElement.lang = "it";
    document.title = seo.title;
    upsertCanonical(seo.canonical);

    upsertMeta('meta[name="description"]', {
      name: "description",
      content: seo.description,
    });
    upsertMeta('meta[name="robots"]', {
      name: "robots",
      content: seo.robots,
    });
    upsertMeta('meta[name="googlebot"]', {
      name: "googlebot",
      content: seo.robots,
    });
    upsertMeta('meta[property="og:site_name"]', {
      property: "og:site_name",
      content: SITE_NAME,
    });
    upsertMeta('meta[property="og:title"]', {
      property: "og:title",
      content: seo.title,
    });
    upsertMeta('meta[property="og:description"]', {
      property: "og:description",
      content: seo.description,
    });
    upsertMeta('meta[property="og:type"]', {
      property: "og:type",
      content: seo.type,
    });
    upsertMeta('meta[property="og:locale"]', {
      property: "og:locale",
      content: "it_IT",
    });
    upsertMeta('meta[property="og:url"]', {
      property: "og:url",
      content: seo.canonical,
    });
    upsertMeta('meta[property="og:image"]', {
      property: "og:image",
      content: seo.image,
    });
    upsertMeta('meta[property="og:image:alt"]', {
      property: "og:image:alt",
      content: seo.imageAlt,
    });
    upsertMeta('meta[name="twitter:card"]', {
      name: "twitter:card",
      content: "summary_large_image",
    });
    upsertMeta('meta[name="twitter:title"]', {
      name: "twitter:title",
      content: seo.title,
    });
    upsertMeta('meta[name="twitter:description"]', {
      name: "twitter:description",
      content: seo.description,
    });
    upsertMeta('meta[name="twitter:image"]', {
      name: "twitter:image",
      content: seo.image,
    });

    updateStructuredData(seo.structuredData);
  }, [pathname]);

  return null;
}
