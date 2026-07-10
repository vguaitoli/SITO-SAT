import React, { useEffect } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function GalleryLightbox({ image, onClose, onNext, onPrev }) {
  useEffect(() => {
    if (!image) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onNext();
      if (e.key === "ArrowLeft") onPrev();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [image, onClose, onNext, onPrev]);

  if (!image) return null;

  const handleDragEnd = (e, info) => {
    if (info.offset.x < -80) onNext();
    else if (info.offset.x > 80) onPrev();
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-[#1C1814]/95 flex items-center justify-center p-4 lg:p-10"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-5 right-5 text-[#F5EBD9] hover:text-[#A0612A] transition-colors"
        aria-label="Chiudi"
      >
        <X size={32} />
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onPrev(); }}
        className="hidden sm:block absolute left-2 lg:left-6 top-1/2 -translate-y-1/2 text-[#F5EBD9] hover:text-[#A0612A] transition-colors"
        aria-label="Foto precedente"
      >
        <ChevronLeft size={40} />
      </button>
      <AnimatePresence mode="wait">
        <motion.img
          key={image.src}
          src={image.src}
          alt={image.alt}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.6}
          onDragEnd={handleDragEnd}
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="max-w-full max-h-full object-contain touch-pan-y cursor-grab active:cursor-grabbing"
        />
      </AnimatePresence>
      <button
        onClick={(e) => { e.stopPropagation(); onNext(); }}
        className="hidden sm:block absolute right-2 lg:right-6 top-1/2 -translate-y-1/2 text-[#F5EBD9] hover:text-[#A0612A] transition-colors"
        aria-label="Foto successiva"
      >
        <ChevronRight size={40} />
      </button>
      <p className="absolute bottom-6 left-1/2 -translate-x-1/2 font-button text-xs tracking-[0.2em] uppercase text-[#F5EBD9]/80">
        {image.label}
      </p>
    </div>
  );
}