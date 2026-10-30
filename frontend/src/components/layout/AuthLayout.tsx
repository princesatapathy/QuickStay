import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import { Logo } from '../ui/Display';

// Shared by Login and Register: form on the left, duotone resort photo on the right.
export default function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="grid h-dvh overflow-hidden lg:grid-cols-2">
      <div className="no-scrollbar flex flex-col overflow-y-auto px-6 py-8 sm:px-12">
        <Logo />
        <motion.div
          className="mx-auto my-auto w-full max-w-sm py-12"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <h1 className="text-4xl">{title}</h1>
          <p className="mt-3 text-ink-muted">{subtitle}</p>
          <div className="mt-8">{children}</div>
          <div className="mt-8 text-center text-sm text-ink-muted">{footer}</div>
        </motion.div>
      </div>

      <div className="relative hidden overflow-hidden lg:block">
        <img
          src="https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=1400&q=80"
          alt="Resort pool at dusk"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-forest/40 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        <p className="absolute bottom-12 left-12 right-12 font-display text-4xl leading-tight text-white">
          Your room is held for ten minutes while you decide.
        </p>
      </div>
    </div>
  );
}
