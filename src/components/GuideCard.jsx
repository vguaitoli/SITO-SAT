import React, { useState } from "react";
import { motion } from "framer-motion";

export default function GuideCard({ guide }) {
  const [flipped, setFlipped] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={`flip-card-container aspect-[3/4] cursor-pointer ${flipped ? "is-flipped" : ""}`}
      onClick={() => setFlipped((f) => !f)}
    >
      <div className="flip-card-inner">
        {/* FRONT */}
        <div className="flip-card-face flip-card-front h-full overflow-hidden bg-[#252019]">
          <img
            src={guide.img}
            alt={guide.name}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover opacity-85 transition-all duration-500 hover:scale-105 hover:opacity-100"
          />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#1C1814] via-[#1C1814]/70 to-transparent p-4 sm:p-6">
            <p className="mb-1.5 font-button text-[10px] uppercase tracking-[0.2em] text-[#A0612A] sm:mb-2">
              {guide.role}
            </p>
            <h3 className="font-heading text-xl leading-tight tracking-wide text-[#F5EBD9] sm:text-2xl">
              {guide.name}
            </h3>
          </div>
        </div>

        {/* BACK */}
        <div className="flip-card-face flip-card-back flex h-full flex-col justify-center bg-[#1C1814] p-5 text-center sm:p-7">
          <p className="mb-2 font-button text-[10px] uppercase tracking-[0.2em] text-[#A0612A] sm:mb-3">
            {guide.role}
          </p>
          <h3 className="mb-3 font-heading text-2xl leading-tight tracking-wide text-[#F5EBD9] sm:mb-4 sm:text-3xl">
            {guide.name}
          </h3>
          <p className="font-body text-xs leading-relaxed text-[#F5EBD9]/75 sm:text-sm">
            {guide.desc}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
