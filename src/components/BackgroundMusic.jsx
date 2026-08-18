import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Volume2, VolumeX } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";

const TRACK_SRC = "/media/ascent-of-stone.mp3";
// Volume contenuto: la musica accompagna la navigazione senza coprire il contenuto.
const TARGET_VOLUME = 0.24;
const FADE_IN_MS = 1800;

/**
 * Musica di sottofondo persistente per l'intera esperienza di navigazione.
 *
 * Parte in dissolvenza dopo il caricamento, continua in loop tra le diverse
 * pagine del sito e resta sempre attivabile o disattivabile dall'utente.
 *
 * I browser che bloccano l'autoplay mostrano subito un controllo accessibile:
 * la riproduzione parte alla prima interazione dell'utente. Con Risparmio dati
 * attivo il file non viene richiesto finché l'utente non sceglie di ascoltarlo.
 */
export default function BackgroundMusic() {
  const { t } = useI18n();
  const { pathname } = useLocation();
  const audioRef = useRef(null);
  const playRef = useRef(null);
  const fadeInRafRef = useRef(null);
  const startedRef = useRef(false);
  // Diventa true al primo gesto reale dell'utente (click, tocco o tasto): da
  // quel momento i click sull'icona tornano a essere un normale toggle
  // muto/attivo invece di un nuovo tentativo di sblocco dell'audio.
  const unlockedRef = useRef(false);
  const fadeInProgressRef = useRef(0);
  const [muted, setMuted] = useState(false);
  const [status, setStatus] = useState("pending");

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return undefined;

    let idleId;
    let startTimer;
    let mounted = true;
    let pausedWhenHidden = false;

    const saveData = Boolean(Reflect.get(navigator, "connection")?.saveData);

    const fadeInVolume = () => {
      const start = performance.now();
      const step = (now) => {
        fadeInProgressRef.current = Math.min(1, (now - start) / FADE_IN_MS);
        audio.volume = TARGET_VOLUME * fadeInProgressRef.current;
        if (fadeInProgressRef.current < 1) {
          fadeInRafRef.current = requestAnimationFrame(step);
        }
      };
      fadeInRafRef.current = requestAnimationFrame(step);
    };

    // Safari (WebKit) consente l'autoplay silenzioso ma non autorizza mai
    // l'audio realmente udibile finché non arriva un gesto utente sincrono:
    // senza forzare di nuovo muted/play dentro il gesto stesso, il suono può
    // restare bloccato in silenzio per minuti, finché un'interazione a caso
    // (uno scroll, un click altrove) non lo sblocca per puro caso.
    const tryPlay = () => {
      if (!audio.getAttribute("src")) {
        audio.src = TRACK_SRC;
      }
      audio.muted = false;
      if (!startedRef.current) {
        audio.volume = 0;
      }
      return audio
        .play()
        .then(() => {
          if (!mounted) return;
          setMuted(false);
          setStatus("playing");
          if (!startedRef.current) {
            startedRef.current = true;
            fadeInVolume();
          }
        })
        .catch(() => {
          if (mounted && !startedRef.current) setStatus("blocked");
        });
    };

    playRef.current = tryPlay;

    const removeGestureListeners = () => {
      document.removeEventListener("pointerdown", onFirstGesture);
      document.removeEventListener("keydown", onFirstGesture);
    };

    const onFirstGesture = (event) => {
      if (unlockedRef.current) {
        if (startedRef.current && !audio.paused) {
          removeGestureListeners();
        } else {
          tryPlay().then(() => {
            if (startedRef.current) removeGestureListeners();
          });
        }
        return;
      }
      if (event.target instanceof Element && event.target.closest("[data-audio-control]")) {
        return;
      }
      unlockedRef.current = true;
      tryPlay().then(() => {
        if (startedRef.current) removeGestureListeners();
      });
    };

    const onVisibilityChange = () => {
      if (document.hidden && startedRef.current && !audio.paused) {
        pausedWhenHidden = true;
        audio.pause();
      } else if (!document.hidden && pausedWhenHidden) {
        pausedWhenHidden = false;
        audio.play().catch(() => {
          if (mounted) setStatus("blocked");
        });
      }
    };

    const startAfterPageLoad = () => {
      if (saveData) {
        setStatus("blocked");
        return;
      }
      const requestIdle = Reflect.get(window, "requestIdleCallback");
      if (typeof requestIdle === "function") {
        idleId = requestIdle.call(window, tryPlay, { timeout: 1000 });
      } else {
        startTimer = window.setTimeout(tryPlay, 0);
      }
    };

    if (!saveData) {
      document.addEventListener("pointerdown", onFirstGesture, { passive: true });
      document.addEventListener("keydown", onFirstGesture);
    }
    document.addEventListener("visibilitychange", onVisibilityChange);

    if (document.readyState === "complete") {
      startAfterPageLoad();
    } else {
      window.addEventListener("load", startAfterPageLoad, { once: true });
    }

    return () => {
      mounted = false;
      playRef.current = null;
      removeGestureListeners();
      window.removeEventListener("load", startAfterPageLoad);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.clearTimeout(startTimer);
      const cancelIdle = Reflect.get(window, "cancelIdleCallback");
      if (idleId && typeof cancelIdle === "function") {
        cancelIdle.call(window, idleId);
      }
      if (fadeInRafRef.current) cancelAnimationFrame(fadeInRafRef.current);
      audio.pause();
    };
  }, []);

  const handleAudioControl = () => {
    const audio = audioRef.current;
    if (!audio) return;

    const shouldEnable =
      status === "blocked" || !startedRef.current || audio.paused || audio.muted;

    unlockedRef.current = true;

    if (shouldEnable) {
      playRef.current?.();
      return;
    }

    audio.muted = true;
    setMuted(true);
  };

  const showControl = status === "playing" || status === "blocked";
  const audioOff = muted || status === "blocked";

  // Il questionario post-tour richiede concentrazione: niente musica né
  // controllo flottante nella pagina feedback.
  if (pathname === "/feedback") return null;

  return (
    <>
      <audio ref={audioRef} preload="none" loop />
      {showControl && (
        <button
          type="button"
          data-audio-control
          onClick={handleAudioControl}
          aria-label={audioOff ? t("Attiva la musica di sottofondo") : t("Disattiva la musica di sottofondo")}
          title={audioOff ? t("Attiva musica") : t("Disattiva musica")}
          className="fixed right-4 top-24 z-30 flex h-11 w-11 items-center justify-center rounded-full border border-granite-mist/40 bg-obsidian/80 text-[var(--granite-mist)] shadow-lg backdrop-blur-sm transition-colors hover:border-[var(--accent)] hover:text-[var(--accent-soft)] lg:bottom-5 lg:right-5 lg:top-auto"
        >
          {audioOff ? (
            <VolumeX size={18} aria-hidden="true" />
          ) : (
            <Volume2 size={18} aria-hidden="true" />
          )}
        </button>
      )}
    </>
  );
}
