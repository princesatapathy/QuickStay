import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'motion/react';
import { List, MagnifyingGlass, X } from '@phosphor-icons/react';
import { useAuth } from '../../context/AuthContext';
import { ButtonLink } from '../ui/Button';
import { Logo } from '../ui/Display';
import SearchDrawer from './SearchDrawer';

export default function Navbar() {
  const { user, isManager } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [menu, setMenu] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Over the Home hero the bar is transparent with white text; everywhere else, and once the
  // page has scrolled, it is solid white.
  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, 'change', (y) => setScrolled(y > 24));
  const overHero = pathname === '/' && !scrolled;

  const scrollTo = (id: string) => {
    setMenu(false);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
    else {
      navigate('/');
      setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }), 400);
    }
  };

  const links = [
    { label: 'Home', go: () => { setMenu(false); navigate('/'); } },
    { label: 'Hotels', go: () => { setMenu(false); navigate('/search'); } },
    { label: 'Experience', go: () => scrollTo('experience') },
    { label: 'About', go: () => scrollTo('about') },
  ];

  const initial = user?.name?.[0]?.toUpperCase() ?? 'U';

  return (
    <>
      <header className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${overHero ? 'bg-transparent text-white' : 'border-b border-line bg-white/95 text-ink backdrop-blur'}`}>
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
          <Logo />

          <div className="hidden items-center gap-8 md:flex">
            {links.map((l) => (
              <button key={l.label} onClick={l.go} className="text-[15px] font-medium opacity-90 transition-opacity hover:opacity-100">{l.label}</button>
            ))}
            {user && isManager && <Link to="/admin" className="text-[15px] font-medium opacity-90 hover:opacity-100">Dashboard</Link>}
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => setDrawer(true)} aria-label="Find a stay" className={`grid h-10 w-10 place-items-center rounded-full transition-colors ${overHero ? 'hover:bg-white/15' : 'hover:bg-surface-2'}`}>
              <MagnifyingGlass size={20} />
            </button>
            {user ? (
              <button onClick={() => navigate('/profile')} title={user.name} aria-label="Your profile" className="hidden h-10 w-10 place-items-center rounded-full bg-accent text-sm font-medium text-on-accent hover:bg-accent-hover md:grid">
                {initial}
              </button>
            ) : (
              <ButtonLink to="/login" size="sm" className={`hidden !rounded-full px-6 md:inline-flex ${overHero ? '!bg-black' : ''}`}>Login</ButtonLink>
            )}
            <button onClick={() => setMenu(true)} aria-label="Open menu" className={`rounded-lg p-2 md:hidden ${overHero ? 'hover:bg-white/15' : 'hover:bg-surface-2'}`}>
              <List size={24} />
            </button>
          </div>
        </nav>
      </header>

      <SearchDrawer open={drawer} onClose={() => setDrawer(false)} />

      <AnimatePresence>
        {menu && (
          <motion.div className="fixed inset-0 z-[60] md:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-ink/45" onClick={() => setMenu(false)} />
            <motion.aside
              className="absolute right-0 top-0 flex h-full w-80 max-w-[85vw] flex-col border-l border-line bg-white p-6 text-ink"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 34 }}
            >
              <div className="flex items-center justify-between">
                <Logo />
                <button onClick={() => setMenu(false)} aria-label="Close menu" className="rounded-lg p-2 text-ink-muted hover:bg-surface-2"><X size={22} /></button>
              </div>
              <div className="mt-8 flex flex-col">
                {links.map((l) => (
                  <button key={l.label} onClick={l.go} className="border-b border-line py-4 text-left font-display text-2xl">{l.label}</button>
                ))}
                {user && isManager && <Link to="/admin" onClick={() => setMenu(false)} className="border-b border-line py-4 font-display text-2xl">Dashboard</Link>}
              </div>
              <div className="mt-auto flex flex-col gap-3">
                {user ? (
                  <ButtonLink to="/profile" variant="ghost" className="w-full" onClick={() => setMenu(false)}>{user.name}</ButtonLink>
                ) : (
                  <>
                    <ButtonLink to="/login" className="w-full" onClick={() => setMenu(false)}>Login</ButtonLink>
                    <ButtonLink to="/register" variant="ghost" className="w-full" onClick={() => setMenu(false)}>Sign up</ButtonLink>
                  </>
                )}
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
