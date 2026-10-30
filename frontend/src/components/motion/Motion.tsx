import { useEffect, useRef, type ReactNode } from 'react';
import { motion, animate, useInView, useMotionValue, useTransform } from 'motion/react';

// Content entering on scroll: sequence that matches reading order. Reduced motion
// is handled globally by <MotionConfig reducedMotion="user"> in App.
export function Reveal({
  children,
  delay = 0,
  className = '',
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

// Route change: a short fade and rise so navigation reads as a state change.
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

// Numbers that tick to their value (stats, totals). Writes straight to the DOM,
// no React re-render per frame.
export function CountUp({
  value,
  format = (n: number) => Math.round(n).toLocaleString('en-IN'),
  className = '',
}: {
  value: number;
  format?: (n: number) => string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const mv = useMotionValue(0);
  const text = useTransform(mv, format);

  useEffect(() => {
    const unsub = text.on('change', (v) => {
      if (ref.current) ref.current.textContent = v;
    });
    return unsub;
  }, [text]);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(mv, value, { duration: 1.1, ease: [0.16, 1, 0.3, 1] });
    return () => controls.stop();
  }, [inView, value, mv]);

  return (
    <span ref={ref} className={`tabular-nums ${className}`}>
      {format(0)}
    </span>
  );
}
