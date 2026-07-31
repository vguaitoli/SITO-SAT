import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  getSeoEntries,
  getSeoForPath,
  getSitemapEntries,
  SITE_ORIGIN,
  SITE_NAME,
} from "../src/seo/seo-config.js";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distDir = path.join(projectRoot, "dist");
const seoDir = path.join(distDir, "_seo");
const indexPath = path.join(distDir, "index.html");
const SEO_BLOCK = /<!-- SEO:START -->[\s\S]*?<!-- SEO:END -->/;

function escapeAttribute(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function structuredDataMarkup(value) {
  if (!value) return "";
  const json = JSON.stringify(value).replaceAll("<", "\\u003c");
  return `    <script id="seo-jsonld" type="application/ld+json">${json}</script>`;
}

function headMarkup(seo) {
  const preload = seo.preloadImage
    ? `\n    <link rel="preload" as="image" href="${escapeAttribute(seo.preloadImage)}"${
        seo.preloadImageSrcSet
          ? ` imagesrcset="${escapeAttribute(seo.preloadImageSrcSet)}" imagesizes="100vw"`
          : ""
      } fetchpriority="high" />`
    : "";

  const alternates = Object.entries(seo.alternates)
    .map(
      ([hreflang, href]) =>
        `\n    <link rel="alternate" hreflang="${escapeAttribute(hreflang)}" href="${escapeAttribute(href)}" />`,
    )
    .join("");

  return `<!-- SEO:START -->
    <meta name="robots" content="${escapeAttribute(seo.robots)}" />
    <meta name="googlebot" content="${escapeAttribute(seo.robots)}" />
    <meta name="description" content="${escapeAttribute(seo.description)}" />
    <link rel="canonical" href="${escapeAttribute(seo.canonical)}" />${alternates}${preload}
    <meta property="og:site_name" content="${escapeAttribute(SITE_NAME)}" />
    <meta property="og:title" content="${escapeAttribute(seo.title)}" />
    <meta property="og:description" content="${escapeAttribute(seo.description)}" />
    <meta property="og:type" content="${escapeAttribute(seo.type)}" />
    <meta property="og:locale" content="${escapeAttribute(seo.ogLocale)}" />
    <meta property="og:url" content="${escapeAttribute(seo.canonical)}" />
    <meta property="og:image" content="${escapeAttribute(seo.image)}" />
    <meta property="og:image:alt" content="${escapeAttribute(seo.imageAlt)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeAttribute(seo.title)}" />
    <meta name="twitter:description" content="${escapeAttribute(seo.description)}" />
    <meta name="twitter:image" content="${escapeAttribute(seo.image)}" />
    <title>${escapeAttribute(seo.title)}</title>
${structuredDataMarkup(seo.structuredData)}
    <!-- SEO:END -->`;
}

function renderHtml(template, seo) {
  if (!SEO_BLOCK.test(template)) {
    throw new Error("Blocco SEO non trovato in dist/index.html.");
  }
  return template
    .replace(/<html lang="[^"]*">/, `<html lang="${escapeAttribute(seo.htmlLang)}">`)
    .replace(SEO_BLOCK, headMarkup(seo));
}

function outputPathForRoute(routePath) {
  const route = routePath.replace(/^\/+/, "");
  return path.join(seoDir, `${route}.html`);
}

function sitemapXml(entries) {
  const urls = entries
    .map((entry) => {
      const lastmod = entry.lastmod ? `\n    <lastmod>${escapeXml(entry.lastmod)}</lastmod>` : "";
      const alternates = Object.entries(entry.alternates)
        .map(
          ([hreflang, href]) =>
            `\n    <xhtml:link rel="alternate" hreflang="${escapeXml(hreflang)}" href="${escapeXml(href)}" />`,
        )
        .join("");
      return `  <url>\n    <loc>${escapeXml(entry.canonical)}</loc>${alternates}${lastmod}\n  </url>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls}
</urlset>
`;
}

const template = await fs.readFile(indexPath, "utf8");
const entries = getSeoEntries();

await fs.rm(seoDir, { recursive: true, force: true });
await fs.mkdir(seoDir, { recursive: true });

for (const entry of entries) {
  if (entry.path === "/") continue;
  const outputPath = outputPathForRoute(entry.path);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, renderHtml(template, entry));
}

const homeSeo = getSeoForPath("/");
await fs.writeFile(indexPath, renderHtml(template, homeSeo));

const notFoundSeo = getSeoForPath("/pagina-non-trovata");
await fs.writeFile(path.join(distDir, "404.html"), renderHtml(template, notFoundSeo));

const sitemap = sitemapXml(getSitemapEntries());
await fs.writeFile(path.join(distDir, "sitemap.xml"), sitemap);

console.log(
  `[seo] Generate ${entries.length} pagine con metadati dedicati e sitemap su ${SITE_ORIGIN}.`,
);
