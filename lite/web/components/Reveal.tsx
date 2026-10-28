import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useCanObserve } from '../lib/motion';

interface RevealProps {
  children: ReactNode;
  /** Seconds to wait after it scrolls into view, for a row that arrives in turn. */
  delay?: number;
}

/**
 * Rises and fades in the first time it scrolls into view. Under reduced motion
 * (the app shell's MotionConfig follows the reader's setting) it only fades.
 */
export function Reveal({ children, delay = 0 }: Readonly<RevealProps>) {
  const canObserve = useCanObserve();
  if (!canObserve) return <div>{children}</div>;
  return (
    <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }} transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </motion.div>
  );
}
