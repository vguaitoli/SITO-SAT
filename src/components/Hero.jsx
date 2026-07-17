import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { MapPin, ArrowRight } from "lucide-react";
import { CATEGORIE } from "@/data/categorie";
import { fotoProps } from "@/data/foto-helpers";

const bg = fotoProps("hero-maxienduro-panorama");

// Loop video hero (Pexels, licenza libera): drone che segue un fuoristrada
// su una sterrata tra la macchia mediterranea. 1080p desktop, 540p mobile.
const VIDEO_DESKTOP = "/media/hero-offroad-loop-1080.mp4";
const VIDEO_MOBILE = "/media/hero-offroad-loop-540.mp4";

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.15 } },
};
const item = {
  hidden: { opacity: 0, y: 26 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
};

export default function Hero() {
  const reduce = useReducedMotion();
  const [videoReady, setVideoReady] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const videoRef = useRef(null);

  // Alcuni browser mettono in pausa i video quando la pagina va in
  // background e non sempre li riavviano: riprendiamo noi al ritorno.
  useEffect(() => {
    const resume = () => {
      const v = videoRef.current;
      if (!document.hidden && v && v.paused) v.play().catch(() => {});
    };
    document.addEventListener("visibilitychange", resume);
    return () => document.removeEventListener("visibilitychange", resume);
  }, []);
  const motionProps = reduce
    ? {}
    : { variants: container, initial: "hidden", animate: "visible" };
  const child = reduce ? {} : { variants: item };

  // Niente video se l'utente preferisce meno animazioni o ha il risparmio dati.
  const saveData =
    typeof navigator !== "undefined" && navigator.connection?.saveData;
  const showVideo = !reduce && !saveData && !videoError;
  // Sorgente in base alla larghezza reale; se non determinabile, desktop.
  const vw =
    typeof window !== "undefined"
      ? window.innerWidth || document.documentElement.clientWidth
      : 0;
  const videoSrc = vw > 0 && vw < 768 ? VIDEO_MOBILE : VIDEO_DESKTOP;

  return (
    <section
      id="hero"
      className="relative flex min-h-[100svh] w-full flex-col overflow-hidden bg-[var(--obsidian)]"
    >
      {/* Sfondo scuro pieno: il video entra in dissolvenza dal buio, senza far
          intravedere prima una foto. La fotografia resta solo come fallback
          quando il video non parte (reduced-motion, risparmio dati o errore). */}
      <div className="absolute inset-0">
        {!showVideo && (
          <img
            src={bg.src}
            srcSet={bg.srcSet}
            sizes="100vw"
            alt={bg.alt}
            width={1800}
            height={Math.round(1800 / bg.aspect)}
            fetchpriority="high"
            decoding="async"
            className={`h-full w-full object-cover object-center ${reduce ? "" : "animate-[heroPan_22s_ease-out_forwards]"}`}
          />
        )}
        {showVideo && (
          <video
            ref={videoRef}
            src={videoSrc}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            aria-hidden="true"
            tabIndex={-1}
            onPlaying={() => setVideoReady(true)}
            onCanPlay={(e) => {
              e.currentTarget.play().catch(() => {});
            }}
            onError={() => setVideoError(true)}
            className={`absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-1000 ${videoReady ? "opacity-100" : "opacity-0"}`}
          />
        )}
        {/* Gradienti per la leggibilità del testo. */}
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--obsidian)] via-[var(--obsidian)]/55 to-[var(--obsidian)]/40" />
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--obsidian)]/85 via-[var(--obsidian)]/35 to-transparent" />
        <div className="absolute inset-0 topo-dark opacity-50" />
      </div>

      {/* Contenuto */}
      {/* Spaziature compatte su mobile: la striscia delle categorie deve restare
          dentro la prima schermata anche sui telefoni piccoli. */}
      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col justify-center px-5 pb-8 pt-24 sm:pb-12 sm:pt-28 lg:px-8">
        <motion.div className="max-w-4xl" {...motionProps}>
          <motion.div
            {...child}
            className="mb-4 flex items-center gap-2 font-button text-xs uppercase tracking-[0.3em] text-[var(--accent-soft)] sm:mb-6"
          >
            <MapPin size={14} aria-hidden="true" />
            <span>Sardegna · Tour off-road guidati</span>
          </motion.div>

          <h1 className="mb-5 font-heading leading-[0.88] text-[var(--granite-mist)] sm:mb-7">
            <motion.span {...child} className="block text-5xl sm:text-7xl lg:text-8xl">
              Non visitare la Sardegna.
            </motion.span>
            <motion.span
              {...child}
              className="block text-6xl text-[var(--accent)] sm:text-8xl lg:text-9xl"
            >
              Vivila.
            </motion.span>
          </h1>

          <motion.p
            {...child}
            className="mb-6 max-w-2xl font-body text-base leading-relaxed text-[var(--granite-mist)]/90 drop-shadow sm:mb-9 sm:text-lg lg:text-xl"
          >
            Esperienze fuoristrada in Maxienduro, Enduro, Quad, SSV e 4x4. Dai
            sentieri del Supramonte alle coste selvagge, con guide sarde che
            conoscono ogni tratturo dell'isola.
          </motion.p>

          <motion.div {...child} className="flex flex-col gap-4 sm:flex-row">
            <a
              href="#contatti"
              className="btn-mech inline-flex items-center justify-center gap-2.5 bg-[var(--cta)] px-8 py-4 text-base text-[var(--cta-text)] transition-colors hover:bg-[var(--cta-hover)]"
            >
              Verifica disponibilità
              <ArrowRight size={18} aria-hidden="true" />
            </a>
            <a
              href="#esperienze"
              className="btn-mech inline-flex items-center justify-center border-2 border-[var(--granite-mist)]/70 px-8 py-4 text-base text-[var(--granite-mist)] transition-colors hover:border-[var(--granite-mist)] hover:bg-[var(--granite-mist)] hover:text-[var(--obsidian)]"
            >
              Scopri le esperienze
            </a>
          </motion.div>
        </motion.div>
      </div>

      {/* Accesso alle cinque categorie: rappresenta tutto l'universo del brand. */}
      <motion.nav
        aria-label="Le cinque esperienze"
        {...(reduce
          ? {}
          : { variants: item, initial: "hidden", animate: "visible", transition: { delay: 0.6 } })}
        className="relative z-10 border-t border-[var(--border-on-dark)] bg-[var(--obsidian)]/40 backdrop-blur-sm"
      >
        <ul className="mx-auto grid max-w-7xl grid-cols-5 divide-x divide-[var(--border-on-dark)] px-2 sm:px-5 lg:px-8">
          {CATEGORIE.map((c) => (
            <li key={c.id}>
              <Link
                to={`/esperienze/${c.id}`}
                className="group flex h-full flex-col items-center justify-center gap-1 px-1 py-4 text-center transition-colors hover:bg-[var(--accent)]/15"
              >
                <span className="font-heading text-lg leading-none text-[var(--granite-mist)] transition-colors group-hover:text-[var(--accent-soft)] sm:text-2xl">
                  {c.nome}
                </span>
                <span className="hidden font-button text-[10px] uppercase tracking-[0.15em] text-[var(--granite-mist)]/50 sm:block">
                  Scopri
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </motion.nav>

    </section>
  );
}
