import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Bed, Clock, CreditCard, MapPin } from '@phosphor-icons/react';
import { format, addDays } from 'date-fns';
import { searchHotels } from '../api/hotels';
import { CITIES, hotelImage } from '../lib/images';
import { inr } from '../lib/dates';
import { Reveal } from '../components/motion/Motion';
import { ButtonLink } from '../components/ui/Button';
import { Skeleton, Stars } from '../components/ui/Display';
import SearchForm from '../components/layout/SearchForm';
import Story from '../components/home/Story';

interface FeaturedHotel {
  id: number;
  name: string;
  city: string;
  starRating: number;
  price: number;
}

const HOW = [
  { icon: Bed,        title: 'Pick a room',           body: 'Search by city and dates, then choose the room that suits you.' },
  { icon: Clock,      title: 'We hold it 10 minutes', body: 'Your room is reserved while you add guests and pay.' },
  { icon: CreditCard, title: 'Pay with UPI or card',  body: 'Razorpay handles UPI, cards, netbanking and wallets.' },
];

const cardClass = 'group block overflow-hidden rounded-xl border border-line bg-surface shadow-sm transition-shadow hover:shadow-md';

export default function Home() {
  const today = new Date();
  const checkIn = format(addDays(today, 1), 'yyyy-MM-dd');
  const checkOut = format(addDays(today, 3), 'yyyy-MM-dd');

  const [hotels, setHotels] = useState<FeaturedHotel[]>([]);
  const [loadingHotels, setLoadingHotels] = useState(true);

  // Real hotels only: take the first popular city that has any. Otherwise the section shows cities.
  useEffect(() => {
    const cities = CITIES.map((c) => c.name);
    const tryNext = (idx: number) => {
      if (idx >= cities.length) { setLoadingHotels(false); return; }
      searchHotels({ city: cities[idx], checkIn, checkOut, roomsCount: 1, size: 3 })
        .then((res) => {
          const content: unknown[] = res.data?.data?.content ?? [];
          if (content.length === 0) { tryNext(idx + 1); return; }
          setHotels(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            content.map((item: any) => ({
              id: item.hotel?.id ?? item.id,
              name: item.hotel?.name ?? item.name ?? 'Hotel',
              city: item.hotel?.city ?? item.city ?? cities[idx],
              starRating: item.hotel?.starRating ?? 0,
              price: item.price ?? item.minPrice ?? 0,
            })),
          );
          setLoadingHotels(false);
        })
        .catch(() => tryNext(idx + 1));
    };
    tryNext(0);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const searchLink = (city: string) => `/search?city=${encodeURIComponent(city)}&checkIn=${checkIn}&checkOut=${checkOut}&rooms=1`;
  const hotelLink = (id: number) => `/hotels/${id}?checkIn=${checkIn}&checkOut=${checkOut}&rooms=1`;

  const rise = (delay: number) => ({
    initial: { opacity: 0, y: 24 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] as const },
  });

  return (
    <div>
      {/* HERO: full-screen photograph, left-aligned copy, white search bar */}
      <section className="relative flex min-h-[100svh] items-center overflow-hidden">
        <motion.img
          src="https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=1920&q=80"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          initial={{ scale: 1.06 }}
          animate={{ scale: 1 }}
          transition={{ duration: 2.4, ease: [0.16, 1, 0.3, 1] }}
        />
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative mx-auto w-full max-w-6xl px-5 pb-16 pt-32 sm:px-8">
          <motion.span {...rise(0.05)} className="inline-flex rounded-full bg-white/20 px-4 py-1.5 text-sm font-medium text-white backdrop-blur">
            Live prices. A 10-minute hold.
          </motion.span>
          <motion.h1 {...rise(0.15)} className="t-display mt-5 max-w-2xl text-balance text-white">Stay somewhere worth the trip</motion.h1>
          <motion.p {...rise(0.25)} className="mt-4 max-w-[46ch] text-pretty text-white/90">
            Live prices, a 10-minute hold on your room, and confirmation the moment you pay.
          </motion.p>
          <motion.div {...rise(0.4)} className="mt-8 max-w-4xl rounded-xl bg-white p-4 shadow-xl">
            <SearchForm />
          </motion.div>
        </div>
      </section>

      {/* FEATURED: real hotels when the API has them, otherwise popular cities */}
      <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8 md:py-24">
        <Reveal className="text-center">
          <h2 className="t-h2">Featured destinations</h2>
          <p className="mx-auto mt-3 max-w-[54ch] text-ink-muted">Handpicked places to stay, with live prices for the next few nights.</p>
        </Reveal>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {loadingHotels ? (
            [0, 1, 2].map((i) => <Skeleton key={i} className="h-80" />)
          ) : hotels.length > 0 ? (
            hotels.map((h, i) => (
              <Reveal key={h.id} delay={i * 0.08}>
                <Link to={hotelLink(h.id)} className={cardClass}>
                  <div className="aspect-[4/3] overflow-hidden bg-surface-2">
                    <img src={hotelImage(i)} alt={h.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  </div>
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="t-h3 truncate">{h.name}</h3>
                      <Stars value={h.starRating} size={13} />
                    </div>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-muted"><MapPin size={14} /> {h.city}</p>
                    <div className="mt-5 flex items-center justify-between">
                      <p><span className="text-xl font-medium tabular-nums">{inr(h.price)}</span> <span className="text-sm text-ink-muted">/ night</span></p>
                      <span className="rounded-lg border border-line px-4 py-2 text-sm font-medium transition-colors group-hover:bg-surface-2">View rooms</span>
                    </div>
                  </div>
                </Link>
              </Reveal>
            ))
          ) : (
            CITIES.slice(0, 3).map((c, i) => (
              <Reveal key={c.name} delay={i * 0.08}>
                <Link to={searchLink(c.name)} className={cardClass}>
                  <div className="aspect-[4/3] overflow-hidden bg-surface-2">
                    <img src={c.img} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  </div>
                  <div className="flex items-center justify-between p-5">
                    <h3 className="t-h3">{c.name}</h3>
                    <span className="rounded-lg border border-line px-4 py-2 text-sm font-medium transition-colors group-hover:bg-surface-2">Explore</span>
                  </div>
                </Link>
              </Reveal>
            ))
          )}
        </div>

        <div className="mt-10 text-center">
          <ButtonLink to="/search" variant="ghost" className="!border-line !text-ink hover:!bg-surface-2">Browse all hotels</ButtonLink>
        </div>
      </section>

      <Story />

      {/* HOW BOOKING WORKS */}
      <section id="experience" className="border-t border-line bg-night-2 py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <Reveal className="text-center">
            <h2 className="t-h2">How booking works</h2>
            <p className="mx-auto mt-3 max-w-[46ch] text-ink-muted">Three steps, and no surprises on the way.</p>
          </Reveal>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {HOW.map(({ icon: Icon, title, body }, i) => (
              <Reveal key={title} delay={i * 0.1}>
                <div className="h-full rounded-xl border border-line bg-surface p-7">
                  <span className="grid h-12 w-12 place-items-center rounded-full bg-accent text-on-accent"><Icon size={22} /></span>
                  <h3 className="t-h3 mt-5">{title}</h3>
                  <p className="mt-2 text-ink-muted">{body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
