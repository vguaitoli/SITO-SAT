import { ArrowLeft } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useI18n } from "@/i18n/I18nProvider";

export default function PageNotFound() {
  const location = useLocation();
  const { t, route } = useI18n();

  return (
    <main className="topo-dark flex min-h-screen items-center justify-center bg-[var(--obsidian)] px-5 py-20 text-center">
      <div className="max-w-xl">
        <p className="font-button text-xs uppercase tracking-[0.35em] text-[var(--accent)]">
          {t("Sentiero non trovato")}
        </p>
        <h1 className="mt-5 font-heading text-8xl leading-none text-[var(--granite-mist)] sm:text-9xl">
          404
        </h1>
        <p className="mt-6 font-body text-lg leading-relaxed text-[var(--granite-mist)]/70">
          La pagina <span className="text-[var(--granite-mist)]">{location.pathname}</span> non è
          {t("non è disponibile. Torna alla base e riparti da un itinerario conosciuto.")}
        </p>
        <Link
          to={route("home")}
          className="btn-mech mt-8 inline-flex items-center gap-2 bg-[var(--cta)] px-7 py-4 text-[var(--cta-text)] hover:bg-[var(--cta-hover)]"
        >
          <ArrowLeft size={18} aria-hidden="true" />
          {t("Torna alla homepage")}
        </Link>
      </div>
    </main>
  );
}
