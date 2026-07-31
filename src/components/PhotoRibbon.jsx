import React, { useEffect, useRef } from "react";
import { fotoProps } from "@/data/foto-helpers";
import { useI18n } from "@/i18n/I18nProvider";

// Durata di un ciclo completo dell'auto-scroll: stessa cadenza dell'animazione
// CSS che sostituisce, ricalcolata in px/s in base alla larghezza reale.
const LOOP_DURATION_S = 36;
// Dopo un'interazione manuale (drag, swipe, rotellina) l'auto-scroll riparte
// da solo trascorso questo tempo di inattività.
const RESUME_DELAY_MS = 1500;

/**
 * Nastro fotografico: scorre da solo, ma è anche scorribile manualmente su
 * ogni piattaforma (swipe touch, trascinamento con il mouse, rotellina o
 * trackpad). Il loop infinito è ottenuto duplicando le foto e riportando lo
 * scroll all'inizio non appena supera la prima copia, sia durante l'auto-
 * scroll sia durante lo scroll manuale.
 */
export default function PhotoRibbon({ slugs, className = "h-40 w-60 sm:h-52 sm:w-80" }) {
  const { t } = useI18n();
  const photos = (slugs || []).map(fotoProps).filter(Boolean);
  const scrollerRef = useRef(null);
  const trackRef = useRef(null);
  const tickRef = useRef(null);
  const pausedRef = useRef(false);
  const resumeTimerRef = useRef(null);
  const dragRef = useRef(null);

  useEffect(() => {
    const scroller = scrollerRef.current;
    const track = trackRef.current;
    if (!scroller || !track || photos.length === 0) return undefined;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const wrap = () => {
      const single = track.scrollWidth;
      if (single > 0 && scroller.scrollLeft >= single) {
        scroller.scrollLeft -= single;
      }
    };

    const pause = () => {
      pausedRef.current = true;
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    };
    const scheduleResume = () => {
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
      resumeTimerRef.current = setTimeout(() => {
        pausedRef.current = false;
      }, RESUME_DELAY_MS);
    };

    // setInterval invece di requestAnimationFrame: l'auto-scroll deve avanzare
    // in modo affidabile anche quando il rendering non è a piena cadenza
    // (tab non a fuoco, throttling del browser), non solo a schermo attivo.
    const TICK_MS = 30;
    let lastTime = Date.now();
    tickRef.current = setInterval(() => {
      const now = Date.now();
      const dtSeconds = (now - lastTime) / 1000;
      lastTime = now;
      if (!reduceMotion && !pausedRef.current) {
        const single = track.scrollWidth;
        if (single > 0) {
          scroller.scrollLeft += (single / LOOP_DURATION_S) * dtSeconds;
          wrap();
        }
      }
    }, TICK_MS);

    // Mouse: trascinamento manuale (touch e trackpad scrollano già in modo nativo).
    const onPointerDown = (e) => {
      if (e.pointerType !== "mouse") return;
      dragRef.current = { startX: e.clientX, startScroll: scroller.scrollLeft };
      pause();
      scroller.classList.add("cursor-grabbing");
      scroller.setPointerCapture(e.pointerId);
    };
    const onPointerMove = (e) => {
      if (!dragRef.current) return;
      scroller.scrollLeft = dragRef.current.startScroll - (e.clientX - dragRef.current.startX);
    };
    const endDrag = (e) => {
      if (!dragRef.current) return;
      dragRef.current = null;
      scroller.classList.remove("cursor-grabbing");
      if (e?.pointerId != null && scroller.hasPointerCapture(e.pointerId)) {
        scroller.releasePointerCapture(e.pointerId);
      }
      scheduleResume();
    };

    const onTouchStart = () => pause();
    const onTouchEnd = () => scheduleResume();
    const onWheel = () => {
      pause();
      scheduleResume();
    };
    const onScroll = () => wrap();

    scroller.addEventListener("pointerdown", onPointerDown);
    scroller.addEventListener("pointermove", onPointerMove);
    scroller.addEventListener("pointerup", endDrag);
    scroller.addEventListener("pointercancel", endDrag);
    scroller.addEventListener("touchstart", onTouchStart, { passive: true });
    scroller.addEventListener("touchend", onTouchEnd, { passive: true });
    scroller.addEventListener("wheel", onWheel, { passive: true });
    scroller.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      clearInterval(tickRef.current);
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
      scroller.removeEventListener("pointerdown", onPointerDown);
      scroller.removeEventListener("pointermove", onPointerMove);
      scroller.removeEventListener("pointerup", endDrag);
      scroller.removeEventListener("pointercancel", endDrag);
      scroller.removeEventListener("touchstart", onTouchStart);
      scroller.removeEventListener("touchend", onTouchEnd);
      scroller.removeEventListener("wheel", onWheel);
      scroller.removeEventListener("scroll", onScroll);
    };
  }, [photos.length]);

  if (photos.length === 0) return null;

  return (
    <div
      ref={scrollerRef}
      aria-label={t("Galleria fotografica scorrevole")}
      tabIndex={0}
      className="w-full max-w-full cursor-grab select-none overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [scroll-behavior:auto] [overscroll-behavior-x:contain] [&::-webkit-scrollbar]:hidden"
    >
      <div className="flex w-max">
        {[0, 1].map((copy) => (
          <div
            key={copy}
            ref={copy === 0 ? trackRef : undefined}
            className="flex shrink-0 gap-2 pr-2"
            aria-hidden={copy === 1 ? true : undefined}
          >
            {photos.map((photo) => (
              <img
                key={`${photo.slug}-${copy}`}
                src={photo.src}
                srcSet={photo.srcSet}
                sizes="320px"
                alt={copy === 0 ? t(photo.alt) : ""}
                width={640}
                height={Math.round(640 / photo.aspect)}
                loading="lazy"
                decoding="async"
                draggable={false}
                className={`flex-shrink-0 object-cover grayscale transition-all hover:grayscale-0 ${className}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
