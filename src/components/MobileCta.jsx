import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MessageCircle, CalendarCheck } from "lucide-react";
import { SITE } from "@/config/site";

/**
 * Barra CTA persistente ma discreta, solo su mobile. Compare dopo la hero e
 * offre i due canali reali: WhatsApp e verifica disponibilità.
 */
export default function MobileCta() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > window.innerHeight * 0.9);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 flex gap-px border-t border-[var(--border-on-dark)] bg-[var(--obsidian)]/95 backdrop-blur-md transition-transform duration-300 lg:hidden ${
        visible ? "translate-y-0" : "translate-y-full"
      }`}
      aria-hidden={!visible}
    >
      {SITE.contattiVerificati && (
        <a
          href={SITE.whatsapp.href}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-1 items-center justify-center gap-2 bg-[var(--wild-sage)] py-3.5 font-button text-sm uppercase tracking-wider text-[var(--granite-mist)]"
          tabIndex={visible ? 0 : -1}
        >
          <MessageCircle size={17} aria-hidden="true" />
          WhatsApp
        </a>
      )}
      <Link
        to="/#contatti"
        className="flex flex-1 items-center justify-center gap-2 bg-[var(--cta)] py-3.5 font-button text-sm uppercase tracking-wider text-[var(--cta-text)]"
        tabIndex={visible ? 0 : -1}
      >
        <CalendarCheck size={17} aria-hidden="true" />
        Disponibilità
      </Link>
    </div>
  );
}
