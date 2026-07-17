import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Menu, X, MessageCircle, ArrowRight } from "lucide-react";
import { SITE } from "@/config/site";
import { CATEGORIE } from "@/data/categorie";

const navLinks = [
  { label: "Esperienze", href: "#esperienze" },
  { label: "Tour", href: "/itinerari" },
  { label: "Chi Siamo", href: "#guide" },
  { label: "Gallery", href: "#gallery" },
  { label: "Blog", href: "/blog" },
  { label: "Eventi", href: "/eventi" },
  { label: "FAQ", href: "#faq" },
];

const toTarget = (href) => (href.startsWith("#") ? `/${href}` : href);

export default function SiteNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Blocca lo scroll del body quando il menu mobile è aperto.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "border-b border-[var(--accent)]/30 bg-[var(--obsidian)]/95 py-3 backdrop-blur-md"
          : // Gradiente robusto: garantisce il contrasto del menu anche sopra foto molto chiare.
            "bg-gradient-to-b from-[var(--obsidian)] via-[var(--obsidian)]/75 to-transparent pb-10 pt-5"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 lg:px-8">
        <Link to="/#hero" className="flex shrink-0 items-center gap-2 sm:gap-3" aria-label={`${SITE.nome} — home`}>
          <img
            src="/media/logo-sardegna-trail-avventura.png"
            alt=""
            width={56}
            height={56}
            className="h-9 w-9 shrink-0 object-contain sm:h-12 sm:w-12 lg:h-14 lg:w-14"
          />
          <span className="block border-l border-[var(--accent)] pl-2 font-button text-[10px] uppercase leading-tight tracking-[0.15em] text-[var(--accent-soft)] sm:pl-3 sm:text-xs sm:tracking-[0.2em]">
            Sardegna
            <br />
            Trail Avventura
          </span>
        </Link>

        <nav aria-label="Navigazione principale" className="hidden items-center gap-6 lg:flex xl:gap-8">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              to={toTarget(l.href)}
              className="group relative font-button text-sm uppercase tracking-wider text-[var(--granite-mist)]/85 transition-colors hover:text-[var(--accent)]"
            >
              {l.label}
              <span className="absolute -bottom-1 left-0 h-px w-0 bg-[var(--accent)] transition-all duration-300 group-hover:w-full" />
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          {SITE.contattiVerificati && (
            <a
              href={SITE.whatsapp.href}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-mech hidden items-center gap-2.5 bg-[var(--wild-sage)] px-5 py-3 text-sm text-[var(--granite-mist)] hover:bg-[var(--wild-sage-bright)] sm:flex"
            >
              <MessageCircle size={16} aria-hidden="true" />
              WhatsApp
            </a>
          )}
          <Link
            to="/#contatti"
            className="btn-mech hidden items-center gap-2 bg-[var(--cta)] px-5 py-2.5 text-sm text-[var(--cta-text)] hover:bg-[var(--cta-hover)] md:flex"
          >
            Verifica disponibilità
          </Link>
          <button
            onClick={() => setOpen((o) => !o)}
            className="p-2 text-[var(--granite-mist)] lg:hidden"
            aria-label={open ? "Chiudi menu" : "Apri menu"}
            aria-expanded={open}
          >
            {open ? <X size={26} /> : <Menu size={26} />}
          </button>
        </div>
      </div>

      {/* Menu mobile */}
      {open && (
        <div className="max-h-[calc(100svh-4rem)] overflow-y-auto border-t border-[var(--accent)]/30 bg-[var(--obsidian)] lg:hidden">
          <nav aria-label="Navigazione mobile" className="flex flex-col px-5 py-4">
            {navLinks.map((l) => (
              <Link
                key={l.href}
                to={toTarget(l.href)}
                onClick={() => setOpen(false)}
                className="border-b border-[var(--border-on-dark)] py-3.5 font-button text-base uppercase tracking-wider text-[var(--granite-mist)]/90 hover:text-[var(--accent)]"
              >
                {l.label}
              </Link>
            ))}

            {/* Accesso rapido alle categorie */}
            <p className="mt-5 font-button text-[10px] uppercase tracking-[0.25em] text-[var(--granite-mist)]/50">
              Le esperienze
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {CATEGORIE.map((c) => (
                <Link
                  key={c.id}
                  to={`/esperienze/${c.id}`}
                  onClick={() => setOpen(false)}
                  className="border border-[var(--border-on-dark)] px-3 py-2.5 text-center font-heading text-lg tracking-wide text-[var(--granite-mist)] hover:border-[var(--accent)] hover:text-[var(--accent-soft)]"
                >
                  {c.nome}
                </Link>
              ))}
            </div>

            <div className="mt-5 flex flex-col gap-2">
              {SITE.contattiVerificati && (
                <a
                  href={SITE.whatsapp.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setOpen(false)}
                  className="btn-mech flex items-center justify-center gap-2 bg-[var(--wild-sage)] px-5 py-3 text-sm text-[var(--granite-mist)]"
                >
                  <MessageCircle size={16} aria-hidden="true" />
                  WhatsApp
                </a>
              )}
              <Link
                to="/#contatti"
                onClick={() => setOpen(false)}
                className="btn-mech flex items-center justify-center gap-2 bg-[var(--cta)] px-5 py-3 text-sm text-[var(--cta-text)]"
              >
                Verifica disponibilità
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
