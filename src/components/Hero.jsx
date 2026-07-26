import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { MapPin, ArrowRight } from "lucide-react";
import { CATEGORIE } from "@/data/categorie";

const HERO_LOGO = "/media/logo-sardegna-trail-avventura.png";

// Il noleggio è un servizio di supporto ai tour, non un'esperienza a sé:
// non compare nella striscia esperienze della hero.
const esperienze = CATEGORIE.filter((c) => c.kind !== "rental");

// Due loop video dell'hero che si alternano con una dissolvenza incrociata
// cinematografica. 1080p desktop, 540p mobile.
const VIDEO_A_DESKTOP = "/media/hero-offroad-loop-1080.mp4";
const VIDEO_A_MOBILE = "/media/hero-offroad-loop-540.mp4";
const VIDEO_B_DESKTOP = "/media/hero-loop-2-1080.mp4";
const VIDEO_B_MOBILE = "/media/hero-loop-2-540.mp4";

// La dissolvenza incrociata tra i due loop è gestita interamente da
// un'animazione CSS (@keyframes heroCrossfade in index.css): ~5s pieni per
// ciascun video + 2s di dissolvenza, ciclo di 14s. Robusta e indipendente da
// React ed eventi media.

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
  const [videoError, setVideoError] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [videoAReady, setVideoAReady] = useState(false);
  const [secondVideoEnabled, setSecondVideoEnabled] = useState(false);
  const videoARef = useRef(null);
  const videoBRef = useRef(null);

  const saveData =
    typeof navigator !== "undefined" &&
    Boolean(Reflect.get(navigator, "connection")?.saveData);

  // Il logo è il contenuto LCP. I video partono solo dopo il caricamento della
  // pagina e quando il browser ha un momento libero, evitando di competere con
  // HTML, CSS, font e immagine principale.
  useEffect(() => {
    if (reduce || saveData) return undefined;

    let idleId;
    let fallbackTimer;
    const enableVideo = () => {
      const requestIdle = Reflect.get(window, "requestIdleCallback");
      if (typeof requestIdle === "function") {
        idleId = requestIdle.call(window, () => setVideoEnabled(true), { timeout: 2500 });
      } else {
        fallbackTimer = window.setTimeout(() => setVideoEnabled(true), 1200);
      }
    };

    if (document.readyState === "complete") {
      enableVideo();
    } else {
      window.addEventListener("load", enableVideo, { once: true });
    }

    return () => {
      window.removeEventListener("load", enableVideo);
      window.clearTimeout(fallbackTimer);
      const cancelIdle = Reflect.get(window, "cancelIdleCallback");
      if (idleId && typeof cancelIdle === "function") cancelIdle.call(window, idleId);
    };
  }, [reduce, saveData]);

  // Il secondo loop viene richiesto più tardi: l'apertura della pagina scarica
  // un solo video, non due file pesanti nello stesso momento.
  useEffect(() => {
    if (!videoAReady) return undefined;
    const timer = window.setTimeout(() => setSecondVideoEnabled(true), 8000);
    return () => window.clearTimeout(timer);
  }, [videoAReady]);

  // Alcuni browser mettono in pausa i video quando la pagina va in
  // background e non sempre li riavviano: riprendiamo noi al ritorno.
  useEffect(() => {
    const resume = () => {
      if (document.hidden) return;
      [videoARef.current, videoBRef.current].forEach((v) => {
        if (v && v.paused) v.play().catch(() => {});
      });
    };
    document.addEventListener("visibilitychange", resume);
    return () => document.removeEventListener("visibilitychange", resume);
  }, []);
  const motionProps = reduce
    ? {}
    : { variants: container, initial: "hidden", animate: "visible" };
  const child = reduce ? {} : { variants: item };

  // Niente video se l'utente preferisce meno animazioni o ha il risparmio dati.
  const showVideo = videoEnabled && !reduce && !saveData && !videoError;
  // Sorgente in base alla larghezza reale; se non determinabile, desktop.
  const vw =
    typeof window !== "undefined"
      ? window.innerWidth || document.documentElement.clientWidth
      : 0;
  const isMobile = vw > 0 && vw < 768;
  const videoASrc = isMobile ? VIDEO_A_MOBILE : VIDEO_A_DESKTOP;
  const videoBSrc = isMobile ? VIDEO_B_MOBILE : VIDEO_B_DESKTOP;

  return (
    <section
      id="hero"
      className="relative flex min-h-[100svh] w-full flex-col overflow-hidden bg-[var(--obsidian)]"
    >
      {/* Il logo appare subito e resta come fallback mentre i video vengono
          caricati in differita. */}
      <div className="absolute inset-0 flex items-center justify-center bg-[var(--obsidian)]">
        <img
          src={HERO_LOGO}
          alt="Sardegna Trail Avventura"
          width={512}
          height={512}
          {...{ fetchpriority: "high" }}
          decoding="async"
          className="h-auto w-[min(76vw,28rem)] object-contain opacity-90 drop-shadow-2xl lg:translate-x-[28vw] lg:w-[min(36vw,32rem)]"
        />
        {showVideo && (
          <>
            {/* Video A: entra solo quando è pronto, senza lasciare uno sfondo vuoto. */}
            <video
              ref={videoARef}
              src={videoASrc}
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              aria-hidden="true"
              tabIndex={-1}
              onCanPlay={(e) => {
                setVideoAReady(true);
                e.currentTarget.play().catch(() => {});
              }}
              onError={() => setVideoError(true)}
              className={`absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-1000 ${
                videoAReady ? "opacity-100" : "opacity-0"
              }`}
            />
            {secondVideoEnabled && (
              <video
                ref={videoBRef}
                src={videoBSrc}
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
                aria-hidden="true"
                tabIndex={-1}
                onCanPlay={(e) => {
                  e.currentTarget.play().catch(() => {});
                }}
                className="absolute inset-0 h-full w-full object-cover object-center opacity-0 animate-[heroCrossfade_14s_ease-in-out_infinite]"
              />
            )}
          </>
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
            <span>Sardegna · Turismo d'avventura</span>
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
            Scopri la Sardegna più autentica con tour, spedizioni e corsi
            off-road guidati. Itinerari selezionati tra natura, cultura e
            tradizioni locali, lontano dalle rotte del turismo di massa.
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

      {/* Accesso alle esperienze: rappresenta tutto l'universo del brand. */}
      <motion.nav
        aria-label="Le esperienze"
        {...(reduce
          ? {}
          : { variants: item, initial: "hidden", animate: "visible", transition: { delay: 0.6 } })}
        className="relative z-10 border-t border-[var(--border-on-dark)] bg-[var(--obsidian)]/40 backdrop-blur-sm"
      >
        <ul className="mx-auto grid max-w-7xl grid-cols-3 divide-x divide-y divide-[var(--border-on-dark)] px-2 sm:grid-cols-9 sm:divide-y-0 sm:px-5 lg:px-8">
          {esperienze.map((c) => (
            <li key={c.id}>
              <Link
                to={`/esperienze/${c.id}`}
                className="group flex h-full flex-col items-center justify-center gap-1 px-1 py-3 text-center transition-colors hover:bg-[var(--accent)]/15 sm:py-4"
              >
                <span className="font-heading text-lg leading-none text-[var(--granite-mist)] transition-colors group-hover:text-[var(--accent-soft)] sm:text-xl lg:text-2xl">
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
