import React from "react";
import { motion, useReducedMotion } from "framer-motion";

/**
 * @typedef {React.HTMLAttributes<HTMLElement> & {
 *   as?: keyof React.JSX.IntrinsicElements,
 *   delay?: number,
 *   y?: number,
 *   amount?: number,
 * }} RevealProps
 */

/**
 * Rivelazione morbida allo scroll. Se l'utente preferisce meno movimento
 * (prefers-reduced-motion) il contenuto appare senza traslazioni né fade.
 *
 * @param {RevealProps} props
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
  const MotionTag = /** @type {React.ElementType} */ (motion[as] || motion.div);

  if (reduce) {
    const Tag = /** @type {React.ElementType} */ (as);
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
