import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

const TALLY_FORM_URL = "https://tally.so/r/Xx600V";
const TALLY_EMBED_URL =
  "https://tally.so/embed/Xx600V?alignLeft=1&hideTitle=1&transparentBackground=1&dynamicHeight=1";
const TALLY_SCRIPT_URL = "https://tally.so/widgets/embed.js";

export default function Feedback() {
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const loadedRef = useRef(false);

  useEffect(() => {
    loadedRef.current = loaded;
  }, [loaded]);

  useEffect(() => {
    const tallyWindow = /** @type {typeof window & { Tally?: { loadEmbeds?: () => void } }} */ (window);
    let script = /** @type {HTMLScriptElement | null} */ (
      document.querySelector(`script[src="${TALLY_SCRIPT_URL}"]`)
    );
    let createdScript = false;

    const loadEmbeds = () => tallyWindow.Tally?.loadEmbeds?.();
    const handleError = () => setLoadError(true);

    if (!script) {
      script = document.createElement("script");
      script.src = TALLY_SCRIPT_URL;
      script.async = true;
      script.onload = loadEmbeds;
      script.onerror = handleError;
      document.body.appendChild(script);
      createdScript = true;
    } else if (tallyWindow.Tally) {
      loadEmbeds();
    } else {
      script.addEventListener("load", loadEmbeds);
      script.addEventListener("error", handleError);
    }

    const timeout = window.setTimeout(() => {
      if (!loadedRef.current) setLoadError(true);
    }, 12000);

    return () => {
      window.clearTimeout(timeout);
      if (!createdScript) {
        script?.removeEventListener("load", loadEmbeds);
        script?.removeEventListener("error", handleError);
      }
    };
  }, []);

  const handleLoad = () => {
    loadedRef.current = true;
    setLoaded(true);
    setLoadError(false);
  };

  return (
    <div className="min-h-screen bg-[var(--obsidian)] text-[var(--granite-mist)]">
      <header className="border-b border-granite-mist/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-5 py-5 lg:px-8">
          <Link to="/" aria-label="Sardegna Trail Avventura — Home" className="inline-flex items-center gap-3">
            <img
              src="/media/logo-sardegna-trail-avventura.png"
              alt=""
              width="72"
              height="72"
              className="h-14 w-14 object-contain sm:h-16 sm:w-16"
            />
            <span className="hidden font-heading text-2xl leading-[0.85] tracking-wide sm:block">
              SARDEGNA<br />TRAIL AVVENTURA
            </span>
          </Link>
          <Link
            to="/"
            className="font-button inline-flex min-h-11 items-center gap-2 text-xs uppercase tracking-[0.16em] text-granite-mist/75 transition-colors hover:text-[var(--accent-soft)]"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            Torna al sito
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-8 sm:py-12 lg:px-8 lg:py-16">
        <div className="grid border border-granite-mist/10 bg-[var(--carbon)] shadow-2xl shadow-black/20 lg:grid-cols-[minmax(300px,0.72fr)_minmax(0,1.5fr)]">
          <aside className="relative isolate min-h-[300px] overflow-hidden lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)] lg:min-h-[680px] lg:max-h-[860px] lg:self-start">
            <picture>
              <source
                media="(min-width: 1024px)"
                srcSet="/media/reali/chi-siamo-gruppo-1200.webp 1200w, /media/reali/chi-siamo-gruppo-1800.webp 1800w"
                sizes="36vw"
              />
              <img
                src="/media/reali/chi-siamo-gruppo-768.webp"
                srcSet="/media/reali/chi-siamo-gruppo-480.webp 480w, /media/reali/chi-siamo-gruppo-768.webp 768w"
                sizes="100vw"
                alt="Il gruppo di Sardegna Trail Avventura durante un'esperienza in Sardegna"
                width="768"
                height="576"
                loading="eager"
                decoding="async"
                {...{ fetchpriority: "high" }}
                className="absolute inset-0 h-full w-full object-cover object-center"
              />
            </picture>
            <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-obsidian/45 to-obsidian/10 lg:bg-gradient-to-r lg:from-obsidian/85 lg:via-obsidian/35 lg:to-transparent" />
            <div className="relative flex h-full min-h-[300px] flex-col justify-end p-7 sm:p-9 lg:min-h-[680px] lg:justify-center lg:p-10">
              <p className="font-button text-xs uppercase tracking-[0.3em] text-[var(--accent-soft)]">
                La tua esperienza conta
              </p>
              <h1 className="mt-4 max-w-md font-heading text-5xl leading-[0.92] sm:text-6xl lg:text-7xl">
                RACCONTACI<br />IL TUO <span className="text-[var(--accent)]">TRAIL</span>
              </h1>
              <p className="mt-5 max-w-md font-body text-sm leading-relaxed text-granite-mist/80 sm:text-base">
                Bastano pochi minuti. Il tuo feedback ci aiuta a migliorare itinerari, organizzazione e accoglienza delle prossime avventure.
              </p>
            </div>
          </aside>

          <section className="relative bg-[var(--surface-light)] px-4 py-8 text-[var(--obsidian)] sm:px-8 sm:py-10 lg:px-10 lg:py-12" aria-labelledby="feedback-form-title">
            <div className="mx-auto max-w-3xl">
              <p className="font-button text-xs uppercase tracking-[0.28em] text-[var(--accent)]">
                Questionario post-tour
              </p>
              <h2 id="feedback-form-title" className="mt-3 font-heading text-4xl leading-none sm:text-5xl">
                CONDIVIDI IL TUO FEEDBACK
              </h2>
              <p className="mt-4 max-w-2xl font-body text-sm leading-relaxed text-[var(--text-on-light-muted)] sm:text-base">
                Le risposte vengono raccolte tramite Tally e saranno utilizzate per migliorare l’esperienza Sardegna Trail Avventura.
              </p>

              <div className="relative mt-8 min-h-[620px] overflow-hidden border border-obsidian/10 bg-white/35 sm:min-h-[680px]">
                {!loaded && !loadError && (
                  <div className="absolute inset-x-0 top-0 z-10 flex min-h-64 flex-col items-center justify-center gap-4 bg-[var(--surface-light)]" role="status">
                    <span className="h-9 w-9 animate-spin rounded-full border-4 border-obsidian/15 border-t-[var(--accent)]" aria-hidden="true" />
                    <span className="font-button text-xs uppercase tracking-[0.18em] text-[var(--text-on-light-muted)]">
                      Caricamento questionario
                    </span>
                  </div>
                )}

                {loadError && !loaded && (
                  <div className="absolute inset-x-0 top-0 z-20 flex min-h-72 flex-col items-center justify-center px-6 text-center bg-[var(--surface-light)]" role="alert">
                    <p className="font-heading text-3xl">IL QUESTIONARIO NON SI È CARICATO</p>
                    <p className="mt-3 max-w-md font-body text-sm leading-relaxed text-[var(--text-on-light-muted)]">
                      Puoi aprirlo direttamente su Tally e continuare da lì.
                    </p>
                    <a
                      href={TALLY_FORM_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-mech mt-6 inline-flex min-h-11 items-center gap-2 bg-[var(--cta)] px-6 py-3 text-sm text-[var(--cta-text)] hover:bg-[var(--cta-hover)]"
                    >
                      Apri il questionario
                      <ExternalLink size={16} aria-hidden="true" />
                    </a>
                  </div>
                )}

                <iframe
                  data-tally-src={TALLY_EMBED_URL}
                  title="Questionario post-tour Sardegna Trail Avventura"
                  width="100%"
                  height="760"
                  frameBorder="0"
                  marginHeight={0}
                  marginWidth={0}
                  scrolling="no"
                  loading="eager"
                  onLoad={handleLoad}
                  className={`block w-full transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"}`}
                />
              </div>

              <p className="mt-5 text-center font-body text-xs leading-relaxed text-[var(--text-on-light-muted)]">
                Problemi con la visualizzazione?{" "}
                <a href={TALLY_FORM_URL} target="_blank" rel="noopener noreferrer" className="font-semibold text-[var(--accent)] underline underline-offset-4 hover:text-[var(--cta-hover)]">
                  Apri il questionario in una nuova scheda
                </a>.
              </p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
