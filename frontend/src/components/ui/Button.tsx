import { forwardRef, type ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { motion, type HTMLMotionProps } from 'motion/react';
import { SpinnerGap } from '@phosphor-icons/react';

type Variant = 'primary' | 'ghost' | 'quiet' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const base =
  'inline-flex items-center justify-center gap-2 rounded-lg font-medium tracking-wide whitespace-nowrap select-none transition-colors disabled:opacity-50 disabled:pointer-events-none';
const variants: Record<Variant, string> = {
  primary: 'bg-accent text-on-accent hover:bg-accent-hover',
  ghost:   'border border-accent/40 text-accent hover:bg-accent/10',
  quiet:   'text-ink-muted hover:text-ink hover:bg-surface-2',
  danger:  'border border-bad/40 text-bad hover:bg-bad/10',
};
const sizes: Record<Size, string> = {
  sm: 'h-9 px-4 text-sm',
  md: 'h-11 px-6 text-[15px]',
  lg: 'h-14 px-8 text-base',
};

export const btnClass = (variant: Variant = 'primary', size: Size = 'md', extra = '') =>
  `${base} ${variants[variant]} ${sizes[size]} ${extra}`;

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  children?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, disabled, className = '', children, ...rest },
  ref,
) {
  return (
    <motion.button
      ref={ref}
      whileTap={{ scale: 0.97 }}
      disabled={disabled || loading}
      className={btnClass(variant, size, className)}
      {...rest}
    >
      {loading && <SpinnerGap size={18} className="animate-spin" />}
      {children}
    </motion.button>
  );
});

// Same look, but a router link (navigation, not an action).
export function ButtonLink({
  variant = 'primary',
  size = 'md',
  className = '',
  ...rest
}: LinkProps & { variant?: Variant; size?: Size }) {
  return <Link className={btnClass(variant, size, className)} {...rest} />;
}
