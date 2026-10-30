import { Link } from 'react-router-dom';
import { Logo } from '../ui/Display';

export default function Footer() {
  return (
    <footer id="about" className="border-t border-line bg-night-2">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:px-8 md:grid-cols-[1.6fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-sm text-sm text-ink-muted">
            Hotel stays with live pricing. Pick a room, we hold it for ten minutes, and you pay with UPI or card.
          </p>
        </div>
        <nav className="flex flex-col gap-2.5 text-sm">
          <span className="font-display text-base">Explore</span>
          <Link to="/search" className="text-ink-muted transition-colors hover:text-ink">All hotels</Link>
          <Link to="/search?city=Goa" className="text-ink-muted transition-colors hover:text-ink">Goa</Link>
          <Link to="/search?city=Mumbai" className="text-ink-muted transition-colors hover:text-ink">Mumbai</Link>
        </nav>
        <nav className="flex flex-col gap-2.5 text-sm">
          <span className="font-display text-base">Account</span>
          <Link to="/login" className="text-ink-muted transition-colors hover:text-ink">Login</Link>
          <Link to="/register" className="text-ink-muted transition-colors hover:text-ink">Create an account</Link>
          <Link to="/profile" className="text-ink-muted transition-colors hover:text-ink">My bookings</Link>
        </nav>
      </div>
      <div className="border-t border-line">
        <p className="mx-auto max-w-6xl px-5 py-5 text-xs text-ink-faint sm:px-8">© 2026 QuickStay</p>
      </div>
    </footer>
  );
}
