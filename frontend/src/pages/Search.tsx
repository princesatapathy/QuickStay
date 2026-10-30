import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { CaretLeft, CaretRight, MapPin, Sliders } from '@phosphor-icons/react';
import { searchHotels } from '../api/hotels';
import { hotelImage } from '../lib/images';
import { fmtDate, inr, nights as nightsBetween } from '../lib/dates';
import { Button } from '../components/ui/Button';
import { Banner, Card, EmptyState, Skeleton, Stars } from '../components/ui/Display';
import { AmenityChip } from '../components/ui/Amenity';
import { Dialog } from '../components/ui/Dialog';

interface HotelPrice {
  id: number;
  name: string;
  city: string;
  price: number;
  starRating: number;
  photos: string[];
  amenities: string[];
}

const PRICE_RANGES = [
  { label: 'Under ₹1,000', min: 0, max: 1000 },
  { label: '₹1,000 to ₹2,000', min: 1000, max: 2000 },
  { label: '₹2,000 to ₹3,000', min: 2000, max: 3000 },
  { label: 'Above ₹3,000', min: 3000, max: Infinity },
];
const SORTS = [
  { value: '', label: 'Recommended' },
  { value: 'priceLow', label: 'Price: low to high' },
  { value: 'priceHigh', label: 'Price: high to low' },
];

function Filters({
  ranges,
  onToggle,
  onClear,
}: {
  ranges: string[];
  onToggle: (l: string) => void;
  onClear: () => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="t-h3">Price per night</h2>
        <button onClick={onClear} className="text-sm text-ink-muted transition-colors hover:text-accent">Clear</button>
      </div>
      <div className="mt-4 space-y-2">
        {PRICE_RANGES.map((r) => {
          const on = ranges.includes(r.label);
          return (
            <label
              key={r.label}
              className={`flex h-11 cursor-pointer items-center gap-3 rounded-lg border px-4 text-sm transition-colors ${
                on ? 'border-accent bg-accent/10 text-ink' : 'border-line text-ink-muted hover:bg-surface-2'
              }`}
            >
              <input type="checkbox" checked={on} onChange={() => onToggle(r.label)} className="h-4 w-4 accent-accent" />
              {r.label}
            </label>
          );
        })}
      </div>
    </div>
  );
}

export default function Search() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const city = params.get('city') || '';
  const checkIn = params.get('checkIn') || '';
  const checkOut = params.get('checkOut') || '';
  const rooms = Number(params.get('rooms') || 1);

  const [hotels, setHotels] = useState<HotelPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [ranges, setRanges] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('');
  const [sheet, setSheet] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    setLoading(true);
    setError('');
    searchHotels({ city, checkIn, checkOut, roomsCount: rooms, page, size: 20 })
      .then((res) => {
        const data = res.data?.data;
        const raw: unknown[] = data?.content ?? [];
        // Handles both flat HotelPrice and wrapped {hotel, price} shapes.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setHotels(raw.map((item: any) => ({
          id: item.hotel?.id ?? item.id,
          name: item.hotel?.name ?? item.name ?? 'Hotel',
          city: item.hotel?.city ?? item.city ?? city,
          price: item.price ?? item.minPrice ?? 0,
          starRating: item.hotel?.starRating ?? item.starRating ?? 0,
          photos: item.hotel?.photos ?? item.photos ?? [],
          amenities: item.hotel?.amenities ?? item.amenities ?? [],
        })));
        setTotalPages(data?.totalPages ?? 0);
      })
      .catch((err) => {
        if (err.response?.status === 401) {
          navigate('/login?redirect=' + encodeURIComponent(window.location.pathname + window.location.search));
        } else {
          setError(err.response?.data?.message || 'Failed to load hotels');
        }
      })
      .finally(() => setLoading(false));
  }, [city, checkIn, checkOut, rooms, page, reload, navigate]);

  const filtered = useMemo(() => {
    let list = [...hotels];
    if (ranges.length) {
      const active = PRICE_RANGES.filter((r) => ranges.includes(r.label));
      list = list.filter((h) => active.some((r) => h.price >= r.min && h.price < r.max));
    }
    if (sortBy === 'priceLow') list.sort((a, b) => a.price - b.price);
    if (sortBy === 'priceHigh') list.sort((a, b) => b.price - a.price);
    return list;
  }, [hotels, ranges, sortBy]);

  const stayNights = nightsBetween(checkIn, checkOut);
  const toggleRange = (l: string) => setRanges((p) => (p.includes(l) ? p.filter((x) => x !== l) : [...p, l]));
  const clear = () => { setRanges([]); setSortBy(''); };
  const query = `checkIn=${checkIn}&checkOut=${checkOut}&rooms=${rooms}`;

  return (
    <div className="mx-auto max-w-6xl px-5 pb-16 sm:px-8">
      <header className="pt-4">
        <h1 className="t-h2">{city ? `Hotels in ${city}` : 'All hotels'}</h1>
        <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-muted">
          {checkIn && checkOut ? (
            <>
              <span>{fmtDate(checkIn)} to {fmtDate(checkOut)}</span>
              <span>{stayNights} night{stayNights > 1 ? 's' : ''}</span>
              <span>{rooms} room{rooms > 1 ? 's' : ''}</span>
            </>
          ) : (
            <span>Browse every available hotel.</span>
          )}
          <Link to="/" className="font-medium text-accent hover:underline">Change search</Link>
        </p>
      </header>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div role="radiogroup" aria-label="Sort" className="no-scrollbar flex max-w-full gap-1 overflow-x-auto rounded-lg border border-line bg-surface p-1">
          {SORTS.map((s) => (
            <button
              key={s.value}
              role="radio"
              aria-checked={sortBy === s.value}
              onClick={() => setSortBy(s.value)}
              className="relative shrink-0 rounded-lg px-4 py-2 text-sm font-medium"
            >
              {sortBy === s.value && (
                <motion.span layoutId="sort-pill" className="absolute inset-0 rounded-lg bg-accent" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />
              )}
              <span className={`relative ${sortBy === s.value ? 'text-on-accent' : 'text-ink-muted'}`}>{s.label}</span>
            </button>
          ))}
        </div>
        <Button variant="ghost" size="sm" className="lg:hidden" onClick={() => setSheet(true)}>
          <Sliders size={16} /> Filters{ranges.length ? ` (${ranges.length})` : ''}
        </Button>
      </div>

      <div className="mt-6 grid items-start gap-8 lg:grid-cols-[1fr_16rem]">
        <div className="min-w-0">
          {loading ? (
            <div className="space-y-4">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-44 w-full rounded-xl" />)}
            </div>
          ) : error ? (
            <div className="space-y-4">
              <Banner tone="error">{error}</Banner>
              <Button variant="ghost" onClick={() => setReload((n) => n + 1)}>Try again</Button>
            </div>
          ) : filtered.length === 0 ? (
            <Card>
              <EmptyState
                icon={<MapPin size={26} />}
                title="No hotels found"
                body={city ? `Nothing available in ${city} for these dates, or no match for your filters.` : 'No hotels match your filters.'}
                action={<Button onClick={() => (ranges.length ? clear() : navigate('/'))}>{ranges.length ? 'Clear filters' : 'Change search'}</Button>}
              />
            </Card>
          ) : (
            <>
              <p className="mb-4 text-sm text-ink-muted">{filtered.length} hotel{filtered.length !== 1 ? 's' : ''}</p>
              <ul className="space-y-4">
                {filtered.map((h, i) => (
                  <motion.li
                    key={h.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: Math.min(i, 6) * 0.05, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <Link
                      to={`/hotels/${h.id}?${query}`}
                      className="group flex flex-col overflow-hidden rounded-xl border border-line bg-surface transition-colors hover:border-accent/50 sm:flex-row"
                    >
                      <div className="aspect-[16/10] w-full shrink-0 overflow-hidden sm:aspect-auto sm:w-72">
                        <img src={hotelImage(h.id, h.photos)} alt={h.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col justify-between gap-4 p-5">
                        <div>
                          <Stars value={h.starRating} />
                          <h3 className="t-h3 mt-1 truncate text-accent">{h.name}</h3>
                          <p className="mt-1 flex items-center gap-1 text-sm text-ink-muted"><MapPin size={14} /> {h.city}</p>
                          {h.amenities.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {h.amenities.slice(0, 4).map((a) => <AmenityChip key={a} name={a} />)}
                            </div>
                          )}
                        </div>
                        <div className="flex items-end justify-between gap-3">
                          <p className="text-xl font-bold tabular-nums">
                            {inr(h.price)} <span className="text-sm font-normal text-ink-muted">per night</span>
                          </p>
                          {stayNights > 1 && (
                            <p className="text-right text-xs text-ink-muted">
                              {inr(h.price * stayNights * rooms)} for {stayNights} nights
                            </p>
                          )}
                        </div>
                      </div>
                    </Link>
                  </motion.li>
                ))}
              </ul>

              {totalPages > 1 && (
                <div className="mt-8 flex items-center justify-center gap-4">
                  <Button variant="ghost" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)} aria-label="Previous page"><CaretLeft size={16} /></Button>
                  <span className="text-sm text-ink-muted">Page {page + 1} of {totalPages}</span>
                  <Button variant="ghost" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)} aria-label="Next page"><CaretRight size={16} /></Button>
                </div>
              )}
            </>
          )}
        </div>

        <aside className="sticky top-28 hidden rounded-xl border border-line bg-surface p-5 lg:block">
          <Filters ranges={ranges} onToggle={toggleRange} onClear={clear} />
        </aside>
      </div>

      <Dialog open={sheet} onClose={() => setSheet(false)} title="Filters">
        <Filters ranges={ranges} onToggle={toggleRange} onClear={clear} />
        <Button className="mt-6 w-full" onClick={() => setSheet(false)}>Show {filtered.length} hotel{filtered.length !== 1 ? 's' : ''}</Button>
      </Dialog>
    </div>
  );
}
