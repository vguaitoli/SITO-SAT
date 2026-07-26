import React, { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";

const TRACK_SRC = "/media/homepage-sito.mp3";
// Volume contenuto: la musica accompagna l'apertura senza coprire il contenuto.
const TARGET_VOLUME = 0.24;
const FADE_IN_MS = 1800;
const FADE_TARGET_ID = "tour-in-evidenza";
// La dissolvenza inizia nell'ultima parte del percorso verso la sezione.
const FADE_START_RATIO = 0.6;

/**
 * Musica di sottofondo per l'apertura della home.
 *
 * Parte in dissolvenza dopo il caricamento della pagina e sfuma durante
 * l'avvicinamento a "Tour in evidenza", dove si ferma definitivamente.
 *
 * I browser che bloccano l'autoplay mostrano subito un controllo accessibile:
 * la riproduzione parte alla prima interazione dell'utente. Con Risparmio dati
 * attivo il file non viene richiesto finché l'utente non sceglie di ascoltarlo.
 */
export default function BackgroundMusic() {
  const audioRef = useRef(null);
  const playRef = useRef(null);
  const scrollRafRef = useRef(null);
  const fadeInRafRef = useRef(null);
  const stoppedRef = useRef(false);
  const startedRef = useRef(false);
  const fadeInProgressRef = useRef(0);
  const scrollVolumeRef = useRef(1);
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

    const applyVolume = () => {
      audio.volume =
        TARGET_VOLUME * fadeInProgressRef.current * scrollVolumeRef.current;
    };

    const stopAtTarget = () => {
      stoppedRef.current = true;
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      if (fadeInRafRef.current) cancelAnimationFrame(fadeInRafRef.current);
      if (mounted) setStatus("stopped");
    };

    const updateScrollVolume = () => {
      const target = document.getElementById(FADE_TARGET_ID);
      if (!target) return;

      const targetTop = target.getBoundingClientRect().top + window.scrollY;
      if (targetTop <= 0) return;

      const fadeStart = targetTop * FADE_START_RATIO;
      const fadeDistance = Math.max(1, targetTop - fadeStart);
      const fadeProgress = Math.min(
        1,
        Math.max(0, (window.scrollY - fadeStart) / fadeDistance),
      );

      scrollVolumeRef.current = 1 - fadeProgress;
      applyVolume();

      if (fadeProgress >= 1) stopAtTarget();
    };

    const fadeInVolume = () => {
      const start = performance.now();
      const step = (now) => {
        if (stoppedRef.current) return;
        fadeInProgressRef.current = Math.min(1, (now - start) / FADE_IN_MS);
        applyVolume();
        if (fadeInProgressRef.current < 1) {
          fadeInRafRef.current = requestAnimationFrame(step);
        }
      };
      fadeInRafRef.current = requestAnimationFrame(step);
    };

    const tryPlay = () => {
      if (startedRef.current || stoppedRef.current) return Promise.resolve();
      if (!audio.getAttribute("src")) {
        audio.src = TRACK_SRC;
      }
      audio.volume = 0;
      return audio
        .play()
        .then(() => {
          if (!mounted || stoppedRef.current) return;
          startedRef.current = true;
          setStatus("playing");
          updateScrollVolume();
          fadeInVolume();
        })
        .catch(() => {
          if (mounted && !stoppedRef.current) setStatus("blocked");
        });
    };

    playRef.current = tryPlay;

    const removeGestureListeners = () => {
      document.removeEventListener("pointerdown", onFirstGesture);
      document.removeEventListener("keydown", onFirstGesture);
    };

    const onFirstGesture = (event) => {
      if (event.target instanceof Element && event.target.closest("[data-audio-control]")) {
        return;
      }
      tryPlay().then(() => {
        if (startedRef.current) removeGestureListeners();
      });
    };

    const onScroll = () => {
      if (scrollRafRef.current || stoppedRef.current) return;
      scrollRafRef.current = requestAnimationFrame(() => {
        scrollRafRef.current = null;
        updateScrollVolume();
      });
    };

    const onVisibilityChange = () => {
      if (document.hidden && startedRef.current && !audio.paused) {
        pausedWhenHidden = true;
        audio.pause();
      } else if (!document.hidden && pausedWhenHidden && !stoppedRef.current) {
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
    window.addEventListener("scroll", onScroll, { passive: true });
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
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("load", startAfterPageLoad);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.clearTimeout(startTimer);
      const cancelIdle = Reflect.get(window, "cancelIdleCallback");
      if (idleId && typeof cancelIdle === "function") {
        cancelIdle.call(window, idleId);
      }
      if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current);
      if (fadeInRafRef.current) cancelAnimationFrame(fadeInRafRef.current);
      audio.pause();
    };
  }, []);

  const handleAudioControl = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!startedRef.current) {
      playRef.current?.();
      return;
    }

    audio.muted = !audio.muted;
    setMuted(audio.muted);
  };

  const showControl = status === "playing" || status === "blocked";
  const audioOff = muted || status === "blocked";
  const handleEnded = () => {
    stoppedRef.current = true;
    setStatus("stopped");
  };

  return (
    <>
      <audio ref={audioRef} preload="none" onEnded={handleEnded} />
      {showControl && (
        <button
          type="button"
          data-audio-control
          onClick={handleAudioControl}
          aria-label={audioOff ? "Attiva la musica di sottofondo" : "Disattiva la musica di sottofondo"}
          title={audioOff ? "Attiva musica" : "Disattiva musica"}
          className="fixed right-4 top-24 z-30 flex h-11 w-11 items-center justify-center rounded-full border border-[var(--granite-mist)]/40 bg-[var(--obsidian)]/80 text-[var(--granite-mist)] shadow-lg backdrop-blur-sm transition-colors hover:border-[var(--accent)] hover:text-[var(--accent-soft)] lg:bottom-5 lg:right-5 lg:top-auto"
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
