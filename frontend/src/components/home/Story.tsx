import { Link } from 'react-router-dom';
import { ArrowRight } from '@phosphor-icons/react';
import { HOTEL_IMGS } from '../../lib/images';
import { Reveal } from '../motion/Motion';

// The story of a booking told as three picture cards: find it, hold it, pay for it.
// Each card maps to something the app really does.
const CARDS = [
  { img: HOTEL_IMGS[5], tag: 'Live pricing', title: 'Know the price first', body: 'Search a city and see what each room costs for your exact dates, so the number you fall for is the one you pay.' },
  { img: HOTEL_IMGS[4], tag: '10-minute hold', title: 'Take a breath', body: 'Pick a room and we hold it for ten minutes while you add guests. Nobody can book it from under you.' },
  { img: HOTEL_IMGS[0], tag: 'UPI or card', title: 'Paid, confirmed, done', body: 'Pay with UPI, card or netbanking. Your confirmation arrives the moment the payment clears.' },
];

export default function Story() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8 md:py-24">
      <Reveal className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="t-h2">Booking, made calm</h2>
          <p className="mt-3 max-w-[52ch] text-ink-muted">From the first search to the confirmation email, here is what happens.</p>
        </div>
        <Link to="/search" className="inline-flex items-center gap-1.5 text-sm font-medium transition-colors hover:text-ink-muted">
          Start searching <ArrowRight size={16} />
        </Link>
      </Reveal>

      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {CARDS.map((c, i) => (
          <Reveal key={c.title} delay={i * 0.08}>
            <Link to="/search" className="group relative block h-80 overflow-hidden rounded-xl bg-surface-2">
              <img src={c.img} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10" />
              <div className="relative flex h-full flex-col justify-between p-5 text-white">
                <span className="w-fit rounded-full bg-white px-3 py-1 text-xs font-medium text-ink">{c.tag}</span>
                <div>
                  <h3 className="t-h3">{c.title}</h3>
                  <p className="mt-2 text-sm text-white/85">{c.body}</p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium transition-all group-hover:gap-2.5">Start searching <ArrowRight size={16} /></span>
                </div>
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
