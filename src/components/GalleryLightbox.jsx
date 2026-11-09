import React, { useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useI18n } from "@/i18n/I18nProvider";

export default function GalleryLightbox({ image, onClose, onNext, onPrev, returnFocusRef }) {
  const { t } = useI18n();
  useEffect(() => {
    if (!image) return;
    const onKeyDown = (e) => {
      if (e.key === "ArrowRight") onNext();
      if (e.key === "ArrowLeft") onPrev();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [image, onClose, onNext, onPrev]);

  const handleDragEnd = (e, info) => {
    if (info.offset.x < -80) onNext();
    else if (info.offset.x > 80) onPrev();
  };

  return (
    <Dialog.Root open={Boolean(image)} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[99] bg-[#1C1814]/95" />
        <Dialog.Content
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            returnFocusRef?.current?.focus();
          }}
          className="fixed inset-0 z-[100] h-[100svh] w-screen overflow-hidden p-4 outline-none lg:p-10"
        >
          <Dialog.Title className="sr-only">{image?.alt || t("Gallery")}</Dialog.Title>
          <Dialog.Description className="sr-only">
            {t("Usa le frecce per cambiare foto")}
          </Dialog.Description>
          <Dialog.Close asChild>
            <button
              type="button"
              className="absolute right-5 top-5 z-20 p-2 text-[#F5EBD9] transition-colors hover:text-[#E4D4B0]"
              aria-label={t("Chiudi")}
            >
              <X size={32} aria-hidden="true" />
            </button>
          </Dialog.Close>

        {image && (
          <>
            <button
              type="button"
              onClick={onPrev}
              className="absolute left-2 top-1/2 z-10 -translate-y-1/2 p-2 text-[#F5EBD9] transition-colors hover:text-[#E4D4B0] sm:left-4 lg:left-6"
              aria-label={t("Foto precedente")}
            >
              <ChevronLeft size={40} aria-hidden="true" />
            </button>
            <div className="flex h-full w-full items-center justify-center px-10 sm:px-14">
              <AnimatePresence mode="wait">
                <motion.img
                  key={image.src}
                  src={image.src}
                  alt={image.alt}
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.6}
                  onDragEnd={handleDragEnd}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="max-h-full max-w-full cursor-grab touch-pan-y object-contain active:cursor-grabbing"
                />
              </AnimatePresence>
            </div>
            <button
              type="button"
              onClick={onNext}
              className="absolute right-2 top-1/2 z-10 -translate-y-1/2 p-2 text-[#F5EBD9] transition-colors hover:text-[#E4D4B0] sm:right-4 lg:right-6"
              aria-label={t("Foto successiva")}
            >
              <ChevronRight size={40} aria-hidden="true" />
            </button>
          </>
        )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
