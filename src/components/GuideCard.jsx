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
        <div className="flip-card-face flip-card-front bg-[#252019] overflow-hidden h-full">
          <div className="w-full h-full overflow-hidden">
            <img
              src={guide.img}
              alt={guide.name}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover opacity-85 hover:opacity-100 hover:scale-105 transition-all duration-500"
            />
          </div>
          <div className="absolute bottom-0 inset-x-0 p-6 bg-gradient-to-t from-[#1C1814] via-[#1C1814]/70 to-transparent">
            <p className="font-button text-[10px] tracking-[0.2em] uppercase text-[#A0612A] mb-2">{guide.role}</p>
            <h3 className="font-heading text-2xl text-[#F5EBD9] tracking-wide leading-tight">{guide.name}</h3>
          </div>
        </div>

        {/* BACK */}
        <div className="flip-card-face flip-card-back bg-[#1C1814] h-full flex flex-col justify-center p-7 text-center">
          <p className="font-button text-[10px] tracking-[0.2em] uppercase text-[#A0612A] mb-3">{guide.role}</p>
          <h3 className="font-heading text-3xl text-[#F5EBD9] tracking-wide leading-tight mb-4">{guide.name}</h3>
          <p className="font-body text-sm text-[#F5EBD9]/75 leading-relaxed">{guide.desc}</p>
        </div>
      </div>
    </motion.div>
  );
}