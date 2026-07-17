import React from "react";
import { motion, useReducedMotion } from "framer-motion";

/**
 * Rivelazione morbida allo scroll. Se l'utente preferisce meno movimento
 * (prefers-reduced-motion) il contenuto appare senza traslazioni né fade.
 */
export default function Reveal({
  as = "div",
  children,
  delay = 0,
  y = 26,
  className = "",
  amount = 0.25,
  ...rest
}) {
  const reduce = useReducedMotion();
  const MotionTag = motion[as] || motion.div;

  if (reduce) {
    const Tag = as;
    return (
      <Tag className={className} {...rest}>
        {children}
      </Tag>
    );
  }

  return (
    <MotionTag
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay }}
      {...rest}
    >
      {children}
    </MotionTag>
  );
}
