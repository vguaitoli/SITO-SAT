import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, MessageCircle, ArrowRight } from "lucide-react";
import { CATEGORIE } from "@/data/categorie";
import { useSiteContent } from "@/content/TinaContentProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { LOCALE_META, SUPPORTED_LOCALES } from "@/i18n/routes";

const navLinks = [
  { label: "Esperienze", href: "#esperienze" },
  { label: "Corsi Off-road", href: "/esperienze/corsi-off-road" },
  { label: "Noleggio", href: "/esperienze/noleggio" },
  { label: "Tour", href: "/itinerari" },
  { label: "Chi Siamo", href: "#guide" },
  { label: "Gallery", href: "#gallery" },
  { label: "Blog", href: "/blog" },
  { label: "Eventi", href: "/eventi" },
  { label: "FAQ", href: "#faq" },
];

export default function SiteNav() {
  const { CTA_LABELS, SITE } = useSiteContent();
  const { locale, t, href, localize, switchTo } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const mobileCategories = localize(CATEGORIE).filter(
    ({ id }) => id !== "corsi-off-road" && id !== "noleggio",
  );
  const changeLanguage = (event) => {
    navigate(`${switchTo(event.target.value)}${location.search}${location.hash}`);
    setOpen(false);
  };

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
          ? "border-b border-[var(--accent)]/30 bg-[var(--obsidian)] py-3 shadow-lg"
          : // Gradiente robusto: garantisce il contrasto del menu anche sopra foto molto chiare.
            "bg-gradient-to-b from-[var(--obsidian)] via-[var(--obsidian)]/75 to-transparent pb-10 pt-5"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 lg:px-8">
        <Link to={href("/#hero")} className="flex shrink-0 items-center gap-2 sm:gap-3" aria-label={`${SITE.nome} — home`}>
          <img
            src="/media/logo-sardegna-trail-avventura.png"
            alt=""
            width={62}
            height={62}
            className="h-[40px] w-[40px] shrink-0 object-contain sm:h-[53px] sm:w-[53px] lg:h-[62px] lg:w-[62px]"
          />
          <span className="block border-l border-[var(--accent)] pl-2 font-button text-[10px] uppercase leading-tight tracking-[0.15em] text-[var(--accent-soft)] sm:pl-3 sm:text-xs sm:tracking-[0.2em]">
            Sardegna
            <br />
            Trail Avventura
          </span>
        </Link>

        <nav aria-label={t("Navigazione principale")} className="hidden items-center gap-5 xl:flex 2xl:gap-8">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              to={href(l.href)}
              className="group relative font-button text-xs uppercase tracking-wider text-[var(--granite-mist)]/85 transition-colors hover:text-[var(--accent)] 2xl:text-sm"
            >
              {t(l.label)}
              <span className="absolute -bottom-1 left-0 h-px w-0 bg-[var(--accent)] transition-all duration-300 group-hover:w-full" />
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <label className="relative">
            <span className="sr-only">{t("Cambia lingua")}</span>
            <select
              value={locale}
              onChange={changeLanguage}
              aria-label={t("Cambia lingua")}
              className="h-10 cursor-pointer border border-[var(--border-on-dark)] bg-[var(--obsidian)] px-2 font-button text-[11px] uppercase tracking-wider text-[var(--granite-mist)] outline-none transition-colors hover:border-[var(--accent)] focus:border-[var(--accent)]"
            >
              {SUPPORTED_LOCALES.map((language) => (
                <option key={language} value={language}>
                  {LOCALE_META[language].short}
                </option>
              ))}
            </select>
          </label>
          {SITE.contattiVerificati && (
            <a
              href={SITE.whatsapp.href}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-mech hidden items-center gap-2.5 bg-[var(--wild-sage)] px-5 py-3 text-sm text-[var(--granite-mist)] hover:bg-[var(--wild-sage-bright)] 2xl:flex"
            >
              <MessageCircle size={16} aria-hidden="true" />
              {CTA_LABELS.whatsapp}
            </a>
          )}
          <Link
            to={href("/#contatti")}
            className="btn-mech hidden items-center gap-2 bg-[var(--cta)] px-5 py-2.5 text-sm text-[var(--cta-text)] hover:bg-[var(--cta-hover)] md:flex"
          >
            {CTA_LABELS.primary}
          </Link>
          <button
            onClick={() => setOpen((o) => !o)}
            className="p-2 text-[var(--granite-mist)] xl:hidden"
            aria-label={open ? t("Chiudi menu") : t("Apri menu")}
            aria-expanded={open}
          >
            {open ? <X size={26} /> : <Menu size={26} />}
          </button>
        </div>
      </div>

      {/* Menu mobile */}
      {open && (
        <div className="max-h-[calc(100svh-4rem)] overflow-y-auto border-t border-[var(--accent)]/30 bg-[var(--obsidian)] xl:hidden">
          <nav aria-label={t("Navigazione mobile")} className="flex flex-col px-5 py-4">
            {navLinks.map((l) => (
              <Link
                key={l.href}
                to={href(l.href)}
                onClick={() => setOpen(false)}
                className="border-b border-[var(--border-on-dark)] py-3.5 font-button text-base uppercase tracking-wider text-[var(--granite-mist)]/90 hover:text-[var(--accent)]"
              >
                {t(l.label)}
              </Link>
            ))}

            {/* Accesso rapido alle categorie */}
            <p className="mt-5 font-button text-[10px] uppercase tracking-[0.25em] text-[var(--granite-mist)]/50">
              {t("Le esperienze")}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {mobileCategories.map((c) => (
                <Link
                  key={c.id}
                  to={href(`/esperienze/${c.id}`)}
                  onClick={() => setOpen(false)}
                  className="border border-[var(--border-on-dark)] px-3 py-2.5 text-center font-heading text-lg tracking-wide text-[var(--granite-mist)] hover:border-[var(--accent)] hover:text-[var(--accent-soft)]"
                >
                  {c.nome}
                </Link>
              ))}
            </div>

            <div className="mt-5 flex flex-col gap-2">
              <Link
                to={href("/#contatti")}
                onClick={() => setOpen(false)}
                className="btn-mech flex items-center justify-center gap-2 bg-[var(--cta)] px-5 py-3 text-sm text-[var(--cta-text)]"
              >
                {CTA_LABELS.primary}
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
              {SITE.contattiVerificati && (
                <a
                  href={SITE.whatsapp.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setOpen(false)}
                  className="btn-mech flex items-center justify-center gap-2 bg-[var(--wild-sage)] px-5 py-3 text-sm text-[var(--granite-mist)]"
                >
                  <MessageCircle size={16} aria-hidden="true" />
                  {CTA_LABELS.whatsapp}
                </a>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
