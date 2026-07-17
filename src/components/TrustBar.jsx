import React, { useEffect, useRef, useState } from "react";
import { motion, useInView, animate } from "framer-motion";
import { tours } from "@/components/TourDetails.jsx?modalfix=1";
import { CATEGORIE } from "@/data/categorie";

// Solo dati verificabili dai contenuti del sito: nessuna statistica inventata.
const stats = [
  { value: CATEGORIE.length, suffix: "", label: "Mezzi tra cui scegliere" },
  { value: tours.length, suffix: "", label: "Itinerari disponibili" },
  { value: new Set(tours.map((t) => t.livello)).size, suffix: "", label: "Livelli di difficoltà" },
];

function Counter({ value, suffix }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, value, {
      duration: 1.4,
      ease: "easeOut",
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return () => controls.stop();
  }, [inView, value]);

  return (
    <span ref={ref} className="font-heading text-5xl lg:text-6xl text-[#A0612A] leading-none">
      {display}{suffix}
    </span>
  );
}

export default function TrustBar() {
  return (
    <section className="bg-[#1C1814] py-12 lg:py-16">
      <div className="max-w-4xl mx-auto px-5 lg:px-8 grid grid-cols-3 gap-6 text-center">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: i * 0.1 }}
            className="flex flex-col items-center gap-2"
          >
            <Counter value={s.value} suffix={s.suffix} />
            <span className="font-button text-[10px] sm:text-xs tracking-[0.2em] uppercase text-[#F5EBD9]/60">
              {s.label}
            </span>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
