import React from "react";
import { Link } from "react-router-dom";
import { Phone, Mail, Instagram, Facebook, MessageCircle } from "lucide-react";
import { SITE } from "@/config/site";
import { CATEGORIE } from "@/data/categorie";
import PhotoRibbon from "@/components/PhotoRibbon";

// Nastro fotografico dal materiale reale, senza ripetizioni ravvicinate.
const ribbonSlugs = [
  "hero-enduro-gruppo",
  "hero-4x4-costa",
  "hero-quad-convoglio",
  "hero-ssv-guado",
  "maxienduro-tenere",
  "pinnetta-sosta",
];

const navItems = [
  { label: "Esperienze", href: "#esperienze" },
  { label: "Tour", href: "/itinerari" },
  { label: "Chi Siamo", href: "#guide" },
  { label: "Gallery", href: "#gallery" },
  { label: "Blog", href: "/blog" },
  { label: "Eventi", href: "/eventi" },
  { label: "FAQ", href: "#faq" },
  { label: "Contatti", href: "#contatti" },
];

// Le àncore (#) puntano alla home; i percorsi assoluti restano tali.
const toTarget = (href) => (href.startsWith("#") ? `/${href}` : href);

export default function Footer() {
  return (
    <footer className="border-t border-[var(--accent)]/30 bg-[var(--obsidian)]">
      {/* Nastro fotografico scorrevole */}
      <div className="border-b border-[var(--border-on-dark)] py-4">
        <PhotoRibbon slugs={ribbonSlugs} className="h-20 w-32" />
      </div>

      <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
        <div className="mb-12 grid gap-12 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="mb-4 flex items-center gap-3">
              <img
                src="/media/logo-sardegna-trail-avventura.png"
                alt=""
                width={48}
                height={48}
                className="h-12 w-12 shrink-0 object-contain"
              />
              <span className="border-l border-[var(--accent)] pl-3 font-button text-xs uppercase leading-tight tracking-[0.2em] text-[var(--accent-soft)]">
                Sardegna
                <br />
                Trail Avventura
              </span>
            </div>
            <p className="max-w-sm font-heading text-2xl leading-tight tracking-wide text-[var(--accent)]">
              "La Sardegna che non ti aspetti."
            </p>
            <p className="mt-4 max-w-sm font-body text-sm leading-relaxed text-[var(--granite-mist)]/60">
              Tour off-road guidati in Maxienduro, Enduro, Quad, SSV, 4x4 ed
              e-bike, tra montagne, sterrati, nuraghi e coste selvagge.
            </p>
          </div>

          {/* Navigazione + Esperienze */}
          <div>
            <h4 className="mb-5 font-button text-xs uppercase tracking-[0.2em] text-[var(--accent-soft)]">
              Naviga
            </h4>
            <ul className="space-y-3">
              {navItems.map((l) => (
                <li key={l.href}>
                  <Link
                    to={toTarget(l.href)}
                    className="font-body text-sm text-[var(--granite-mist)]/70 transition-colors hover:text-[var(--accent)]"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
            <h4 className="mb-3 mt-6 font-button text-xs uppercase tracking-[0.2em] text-[var(--accent-soft)]">
              Esperienze
            </h4>
            <ul className="flex flex-wrap gap-x-4 gap-y-2">
              {CATEGORIE.map((c) => (
                <li key={c.id}>
                  <Link
                    to={`/esperienze/${c.id}`}
                    className="font-body text-sm text-[var(--granite-mist)]/70 transition-colors hover:text-[var(--accent)]"
                  >
                    {c.nome}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contatti */}
          <div>
            <h4 className="mb-5 font-button text-xs uppercase tracking-[0.2em] text-[var(--accent-soft)]">
              Contatti
            </h4>
            {SITE.contattiVerificati ? (
              <ul className="space-y-4">
                <li>
                  <a href={SITE.telefono.href} className="flex items-center gap-3 font-body text-sm text-[var(--granite-mist)]/70 transition-colors hover:text-[var(--accent)]">
                    <Phone size={16} aria-hidden="true" /> {SITE.telefono.display}
                  </a>
                </li>
                <li>
                  <a href={`mailto:${SITE.email}`} className="flex items-center gap-3 font-body text-sm text-[var(--granite-mist)]/70 transition-colors hover:text-[var(--accent)]">
                    <Mail size={16} aria-hidden="true" /> {SITE.email}
                  </a>
                </li>
                <li>
                  <a href={SITE.whatsapp.href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 font-body text-sm text-[var(--granite-mist)]/70 transition-colors hover:text-[var(--accent)]">
                    <MessageCircle size={16} aria-hidden="true" /> WhatsApp
                  </a>
                </li>
                <li className="flex items-center gap-3 font-body text-sm text-[var(--granite-mist)]/70">
                  <span className="flex items-center gap-2">
                    <a href={SITE.social.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="transition-colors hover:text-[var(--accent)]">
                      <Instagram size={16} aria-hidden="true" />
                    </a>
                    <a href={SITE.social.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="transition-colors hover:text-[var(--accent)]">
                      <Facebook size={16} aria-hidden="true" />
                    </a>
                  </span>
                  {SITE.social.handle}
                </li>
              </ul>
            ) : (
              <p className="font-body text-sm leading-relaxed text-[var(--granite-mist)]/60">
                Recapiti in aggiornamento.{" "}
                <Link to="/#contatti" className="text-[var(--accent-soft)] underline transition-colors hover:text-[var(--accent)]">
                  Scrivici dal modulo di contatto
                </Link>{" "}
                e ti rispondiamo al più presto.
              </p>
            )}
          </div>
        </div>

        <div className="fissure-light mb-8" />

        {/* Dati legali del Titolare + informative */}
        <div className="mb-6 flex flex-col items-center gap-4 md:flex-row md:justify-between">
          <p className="text-center font-body text-xs leading-relaxed text-[var(--granite-mist)]/40 md:text-left">
            {SITE.legale.ragioneSociale} · {SITE.legale.formaGiuridica} · P.IVA {SITE.legale.partitaIva}
            <br className="hidden md:block" />
            <span className="md:hidden"> · </span>
            {SITE.legale.sede}
          </p>
          <nav className="flex items-center gap-4" aria-label="Informative legali">
            <Link
              to="/privacy"
              className="font-body text-xs text-[var(--granite-mist)]/60 underline transition-colors hover:text-[var(--accent)]"
            >
              Privacy Policy
            </Link>
            <Link
              to="/cookie-policy"
              className="font-body text-xs text-[var(--granite-mist)]/60 underline transition-colors hover:text-[var(--accent)]"
            >
              Cookie Policy
            </Link>
          </nav>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 pb-16 md:flex-row md:pb-0">
          <p className="text-center font-body text-xs text-[var(--granite-mist)]/40 md:text-left">
            © {new Date().getFullYear()} {SITE.nome}. Tutti i diritti riservati.
          </p>
          <p className="font-body text-xs text-[var(--granite-mist)]/40">
            Maxienduro · Enduro · Quad · SSV · 4x4 · E-Bike — Sardegna
          </p>
        </div>
      </div>
    </footer>
  );
}
