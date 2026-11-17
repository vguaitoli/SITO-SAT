import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { MessageCircle, CalendarCheck } from "lucide-react";
import { useSiteContent } from "@/content/TinaContentProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { availabilityTargetForPath } from "@/lib/availability-target";

/**
 * Barra CTA persistente ma discreta, solo su mobile. Compare dopo la hero e
 * offre i due canali reali: WhatsApp e verifica disponibilità.
 */
export default function MobileCta() {
  const { CTA_LABELS, SITE, events } = useSiteContent();
  const { href, route } = useI18n();
  const location = useLocation();
  const [visible, setVisible] = useState(false);
  const availabilityTarget = availabilityTargetForPath(
    location.pathname,
    events,
    route,
    href("/#contatti"),
  );

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > window.innerHeight * 0.9);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      // Sollevata dal bordo: su iPhone la barra di Safari galleggia sopra il fondo della pagina.
      className={`sopra-barra-browser fixed inset-x-3 z-40 flex gap-px overflow-hidden rounded-md border border-[var(--border-on-dark)] bg-obsidian/95 shadow-[0_10px_30px_rgba(0,0,0,0.45)] backdrop-blur-md transition-[transform,opacity] duration-300 lg:hidden ${
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-[180%] opacity-0"
      }`}
      aria-hidden={!visible}
    >
      <Link
        to={availabilityTarget}
        className="flex flex-1 items-center justify-center gap-2 bg-[var(--cta)] px-2 py-3.5 text-center font-button text-xs uppercase leading-tight tracking-wider text-[var(--cta-text)]"
        tabIndex={visible ? 0 : -1}
      >
        <CalendarCheck size={17} aria-hidden="true" />
        {CTA_LABELS.primary}
      </Link>
      {SITE.contattiVerificati && (
        <a
          href={SITE.whatsapp.href}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-1 items-center justify-center gap-2 bg-[var(--wild-sage)] px-2 py-3.5 text-center font-button text-xs uppercase leading-tight tracking-wider text-[var(--granite-mist)]"
          tabIndex={visible ? 0 : -1}
        >
          <MessageCircle size={17} aria-hidden="true" />
          {CTA_LABELS.whatsapp}
        </a>
      )}
    </div>
  );
}
