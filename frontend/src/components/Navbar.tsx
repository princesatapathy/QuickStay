import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Menu, X, BedDouble } from 'lucide-react';

export default function Navbar() {
  const { user, isManager } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const scrollTo = (id: string) => {
    setMobileOpen(false);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    } else {
      navigate('/');
      setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }), 300);
    }
  };

  const NAV_LINKS = [
    { label: 'Home',       action: () => { setMobileOpen(false); navigate('/'); } },
    { label: 'Hotels',     action: () => { setMobileOpen(false); navigate('/search'); } },
    { label: 'Experience', action: () => scrollTo('experience') },
    { label: 'About',      action: () => scrollTo('about') },
  ];

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white shadow-[0_2px_16px_rgba(0,0,0,0.08)] flex items-center justify-between px-5 sm:px-10 py-4">
        {/* ── Logo ──────────────────────────────────────── */}
        <Link to="/" className="flex items-center gap-2 font-extrabold text-xl text-[#ff385c]">
          <BedDouble size={20} className="text-[#ff385c]" />
          QuickStay
        </Link>

        {/* ── Desktop nav ───────────────────────────────── */}
        <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-gray-500">
          {NAV_LINKS.map(({ label, action }) => (
            <button key={label} onClick={action}
              className="hover:text-[#ff385c] transition-colors bg-transparent border-none cursor-pointer font-semibold text-sm">
              {label}
            </button>
          ))}
          {user && isManager && (
            <Link to="/admin"
              className="px-4 py-1.5 rounded-full border border-[#ff385c] text-[#ff385c] text-sm font-semibold hover:bg-[#ffe4e8] transition-colors">
              Dashboard
            </Link>
          )}
        </div>

        {/* ── Right ─────────────────────────────────────── */}
        <div className="flex items-center gap-3">
          {user ? (
            <button onClick={() => navigate('/profile')} title={user.name}
              className="w-10 h-10 rounded-full bg-[#ff385c] text-white font-bold text-sm flex items-center justify-center hover:bg-[#e21e4a] transition-colors">
              {user.name?.[0]?.toUpperCase() ?? 'U'}
            </button>
          ) : (
            <div className="hidden md:flex items-center gap-3">
              <Link to="/login"
                className="text-sm font-semibold text-gray-700 hover:text-[#ff385c] transition-colors">
                Log in
              </Link>
              <Link to="/register"
                className="px-5 py-2 rounded-full bg-[#ff385c] text-white text-sm font-semibold hover:bg-[#e21e4a] transition-colors shadow-sm">
                Sign up
              </Link>
            </div>
          )}

          {/* Mobile login shortcut (not logged in) */}
          {!user && (
            <Link to="/login"
              className="md:hidden px-4 py-2 rounded-full bg-[#ff385c] text-white text-sm font-semibold hover:bg-[#e21e4a] transition-colors">
              Login
            </Link>
          )}

          {/* Hamburger */}
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="md:hidden p-1.5 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </nav>

      {/* ── Mobile menu ───────────────────────────────────── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="absolute top-0 right-0 h-full w-72 bg-white shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <span className="font-extrabold text-[#ff385c] text-lg flex items-center gap-2">
                <BedDouble size={18} /> QuickStay
              </span>
              <button onClick={() => setMobileOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100">
                <X size={20} />
              </button>
            </div>
            <nav className="flex-1 px-4 py-6 space-y-1">
              {NAV_LINKS.map(({ label, action }) => (
                <button key={label} onClick={action}
                  className="w-full text-left px-4 py-3 rounded-xl text-gray-700 font-semibold text-sm hover:bg-[#ffe4e8] hover:text-[#ff385c] transition-colors">
                  {label}
                </button>
              ))}
              {user && isManager && (
                <Link to="/admin" onClick={() => setMobileOpen(false)}
                  className="block px-4 py-3 rounded-xl text-[#ff385c] font-semibold text-sm hover:bg-[#ffe4e8] transition-colors">
                  Dashboard
                </Link>
              )}
            </nav>
            <div className="px-4 py-5 border-t border-gray-100">
              {user ? (
                <button onClick={() => { navigate('/profile'); setMobileOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className="w-9 h-9 rounded-full bg-[#ff385c] flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {user.name?.[0]?.toUpperCase() ?? 'U'}
                  </div>
                  <div className="text-left min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{user.name}</p>
                    <p className="text-gray-400 text-xs truncate">{user.email}</p>
                  </div>
                </button>
              ) : (
                <div className="flex gap-2">
                  <Link to="/login" onClick={() => setMobileOpen(false)}
                    className="flex-1 text-center py-2.5 bg-[#ff385c] text-white rounded-xl font-semibold text-sm hover:bg-[#e21e4a] transition-colors">
                    Login
                  </Link>
                  <Link to="/register" onClick={() => setMobileOpen(false)}
                    className="flex-1 text-center py-2.5 border border-gray-200 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-50 transition-colors">
                    Register
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
