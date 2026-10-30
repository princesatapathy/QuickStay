import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Bed, CalendarBlank, MapPin, Plus, SignOut, Trash, User as UserIcon } from '@phosphor-icons/react';
import { useAuth } from '../context/AuthContext';
import { cancelBooking, getMyBookings } from '../api/bookings';
import { addGuest, deleteGuest, getGuests } from '../api/users';
import { hotelImage } from '../lib/images';
import { fmtDate, inr, nights as nightsBetween } from '../lib/dates';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Form';
import { Banner, Card, EmptyState, Skeleton, StatusPill } from '../components/ui/Display';

interface Booking {
  id: number; bookingStatus: string; amount: number;
  checkInDate: string; checkOutDate: string; roomsCount: number;
  hotel?: { name: string; city: string };
}
interface Guest { id: number; name: string; gender: string; age: number }

const UPCOMING = ['RESERVED', 'GUESTS_ADDED', 'PAYMENTS_PENDING'];
type BookingFilter = 'all' | 'upcoming' | 'completed' | 'cancelled';
const FILTERS: { key: BookingFilter; label: string; test: (b: Booking) => boolean }[] = [
  { key: 'all',       label: 'All',       test: () => true },
  { key: 'upcoming',  label: 'Upcoming',  test: (b) => UPCOMING.includes(b.bookingStatus) },
  { key: 'completed', label: 'Confirmed', test: (b) => b.bookingStatus === 'CONFIRMED' },
  { key: 'cancelled', label: 'Cancelled', test: (b) => b.bookingStatus === 'CANCELLED' },
];

// One inline "are you sure" used for bookings and guests.
function Confirm({ label, busy, onYes, onNo }: { label: string; busy?: boolean; onYes: (e: React.MouseEvent) => void; onNo: (e: React.MouseEvent) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-ink-muted">{label}</span>
      <Button variant="danger" size="sm" onClick={onYes} loading={busy}>Yes</Button>
      <Button variant="quiet" size="sm" onClick={onNo} disabled={busy}>No</Button>
    </div>
  );
}

function SlidingTabs<T extends string>({ id, value, options, onChange }: { id: string; value: T; options: { key: T; label: string; count?: number }[]; onChange: (k: T) => void }) {
  return (
    <div role="tablist" className="no-scrollbar flex w-fit max-w-full gap-1 overflow-x-auto rounded-lg border border-line bg-surface p-1">
      {options.map((o) => (
        <button
          key={o.key}
          role="tab"
          aria-selected={value === o.key}
          onClick={() => onChange(o.key)}
          className="relative shrink-0 rounded-lg px-4 py-2 text-sm font-medium"
        >
          {value === o.key && <motion.span layoutId={id} className="absolute inset-0 rounded-lg bg-accent" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
          <span className={`relative ${value === o.key ? 'text-on-accent' : 'text-ink-muted'}`}>
            {o.label}{o.count !== undefined && <span className="ml-1.5 opacity-70">{o.count}</span>}
          </span>
        </button>
      ))}
    </div>
  );
}

export default function Profile() {
  const { user, logout, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [tab, setTab] = useState<'bookings' | 'guests'>('bookings');
  const [loading, setLoading] = useState(true);
  const [bookingFilter, setBookingFilter] = useState<BookingFilter>('all');
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [guestError, setGuestError] = useState('');

  const [guestName, setGuestName] = useState('');
  const [guestGender, setGuestGender] = useState('MALE');
  const [guestAge, setGuestAge] = useState('');
  const [addingGuest, setAddingGuest] = useState(false);
  const [showGuestForm, setShowGuestForm] = useState(false);
  const [showDeleteId, setShowDeleteId] = useState<number | null>(null);
  const [showCancelId, setShowCancelId] = useState<number | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/login'); return; }
    setLoading(true);
    Promise.all([
      getMyBookings().then((r) => setBookings(r.data?.data ?? [])),
      getGuests().then((r) => setGuests(r.data?.data ?? [])),
    ]).finally(() => setLoading(false));
  }, [authLoading, user]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAddGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingGuest(true);
    setGuestError('');
    try {
      await addGuest({ name: guestName, gender: guestGender, age: Number(guestAge) });
      const res = await getGuests();
      setGuests(res.data?.data ?? []);
      setGuestName(''); setGuestAge(''); setShowGuestForm(false);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setGuestError(e.response?.data?.message ?? 'Failed to add guest');
    } finally { setAddingGuest(false); }
  };

  const handleDeleteGuest = async (id: number) => {
    setGuestError('');
    try {
      await deleteGuest(id);
      setGuests((g) => g.filter((x) => x.id !== id));
    } catch {
      setGuestError('Failed to remove guest');
    } finally { setShowDeleteId(null); }
  };

  const handleCancel = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    setCancellingId(id);
    try {
      await cancelBooking(id);
      setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, bookingStatus: 'CANCELLED' } : b)));
    } catch { /* cancel errors are non-critical here; the booking page shows details */ }
    finally { setCancellingId(null); setShowCancelId(null); }
  };

  if (authLoading) {
    return <div className="mx-auto max-w-4xl px-5 sm:px-8"><Skeleton className="h-28 w-full rounded-xl" /></div>;
  }
  if (!user) return null;

  const active = FILTERS.find((f) => f.key === bookingFilter)!;
  const shown = bookings.filter(active.test);

  return (
    <div className="mx-auto max-w-4xl px-5 pb-16 sm:px-8">
      <Card className="flex flex-wrap items-center gap-4 p-5 sm:p-6">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-accent font-display text-2xl text-on-accent ring-4 ring-accent/20">
          {user.name?.[0]?.toUpperCase() ?? 'U'}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="t-h3 truncate">{user.name}</h1>
          <p className="truncate text-sm text-ink-muted">{user.email}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {user.roles?.map((r) => (
              <span key={r} className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-bold text-accent">{r.replace('ROLE_', '')}</span>
            ))}
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => { logout(); navigate('/'); }}>
          <SignOut size={16} /> Sign out
        </Button>
      </Card>

      <div className="mt-8">
        <SlidingTabs
          id="profile-tab"
          value={tab}
          onChange={setTab}
          options={[{ key: 'bookings', label: 'My bookings' }, { key: 'guests', label: 'Saved guests' }]}
        />
      </div>

      <div className="mt-6">
        {loading ? (
          <div className="space-y-3">{[0, 1].map((i) => <Skeleton key={i} className="h-36 w-full rounded-xl" />)}</div>
        ) : tab === 'bookings' ? (
          <>
            <SlidingTabs
              id="booking-filter"
              value={bookingFilter}
              onChange={setBookingFilter}
              options={FILTERS.map((f) => ({ key: f.key, label: f.label, count: bookings.filter(f.test).length }))}
            />

            {shown.length === 0 ? (
              <Card className="mt-5">
                <EmptyState
                  icon={<Bed size={26} />}
                  title={bookingFilter === 'all' ? 'No bookings yet' : `No ${active.label.toLowerCase()} bookings`}
                  body={bookingFilter === 'all' ? 'Find your first stay and it will show up here.' : undefined}
                  action={bookingFilter === 'all' ? <Button onClick={() => navigate('/')}>Search hotels</Button> : undefined}
                />
              </Card>
            ) : (
              <ul className="mt-5 space-y-3">
                {shown.map((b, i) => {
                  const isUpcoming = UPCOMING.includes(b.bookingStatus);
                  const isConfirmed = b.bookingStatus === 'CONFIRMED';
                  const isCancelled = b.bookingStatus === 'CANCELLED';
                  const n = nightsBetween(b.checkInDate, b.checkOutDate);
                  return (
                    <motion.li
                      key={b.id}
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.45, delay: Math.min(i, 6) * 0.05, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <Card className="overflow-hidden transition-colors hover:border-accent/50">
                        {(b.bookingStatus === 'RESERVED' || b.bookingStatus === 'PAYMENTS_PENDING') && (
                          <p className="border-b border-line bg-accent/10 px-5 py-2 text-xs font-medium text-accent">
                            {b.bookingStatus === 'RESERVED' ? 'Reserved. Complete payment before the hold expires.' : 'Payment pending. Waiting for confirmation.'}
                          </p>
                        )}
                        <div className="flex gap-4 p-4 sm:p-5">
                          <button onClick={() => navigate(`/booking/${b.id}`)} aria-label={`Open booking at ${b.hotel?.name ?? 'hotel'}`} className="hidden h-28 w-36 shrink-0 overflow-hidden rounded-lg sm:block">
                            <img src={hotelImage(b.id)} alt="" loading="lazy" className="h-full w-full object-cover" />
                          </button>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <h3 className="t-h3 truncate">{b.hotel?.name ?? 'Hotel'}</h3>
                                {b.hotel?.city && <p className="flex items-center gap-1 text-sm text-ink-muted"><MapPin size={14} /> {b.hotel.city}</p>}
                              </div>
                              <StatusPill status={b.bookingStatus} />
                            </div>
                            <p className="mt-3 flex flex-wrap items-center gap-x-2 text-sm text-ink-muted">
                              <CalendarBlank size={14} /> {fmtDate(b.checkInDate)} to {fmtDate(b.checkOutDate)}
                              <span>· {n} night{n > 1 ? 's' : ''}</span>
                              <span>· {b.roomsCount} room{b.roomsCount > 1 ? 's' : ''}</span>
                            </p>
                            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                              <p className="text-lg font-bold tabular-nums">{inr(b.amount ?? 0)}</p>
                              <div className="flex flex-wrap items-center gap-2">
                                {isUpcoming && <Button size="sm" onClick={() => navigate(`/booking/${b.id}`)}>Continue</Button>}
                                {isConfirmed && <Button size="sm" variant="ghost" onClick={() => navigate(`/booking/${b.id}`)}>Details</Button>}
                                {(isUpcoming || isConfirmed) && (showCancelId === b.id ? (
                                  <Confirm label="Cancel?" busy={cancellingId === b.id} onYes={(e) => handleCancel(e, b.id)} onNo={(e) => { e.stopPropagation(); setShowCancelId(null); }} />
                                ) : (
                                  <Button size="sm" variant="quiet" onClick={() => setShowCancelId(b.id)} disabled={cancellingId === b.id}>Cancel</Button>
                                ))}
                                {isCancelled && <Button size="sm" variant="ghost" onClick={() => navigate('/')}>Book again</Button>}
                              </div>
                            </div>
                          </div>
                        </div>
                      </Card>
                    </motion.li>
                  );
                })}
              </ul>
            )}
          </>
        ) : (
          <>
            {guestError && <div className="mb-4"><Banner tone="error">{guestError}</Banner></div>}

            {guests.length === 0 && !showGuestForm ? (
              <Card><EmptyState icon={<UserIcon size={26} />} title="No saved guests yet" body="Save the people you travel with to pick them at checkout." /></Card>
            ) : (
              <ul className="space-y-3">
                {guests.map((g) => (
                  <li key={g.id}>
                    <Card className="flex items-center justify-between gap-3 p-4">
                      <div className="flex items-center gap-3">
                        <span className="grid h-10 w-10 place-items-center rounded-full bg-surface-2 font-bold text-accent">{g.name?.[0]?.toUpperCase()}</span>
                        <div>
                          <p className="font-medium">{g.name}</p>
                          <p className="text-sm text-ink-muted">{g.gender} · Age {g.age}</p>
                        </div>
                      </div>
                      {showDeleteId === g.id ? (
                        <Confirm label="Remove?" onYes={() => handleDeleteGuest(g.id)} onNo={() => setShowDeleteId(null)} />
                      ) : (
                        <button onClick={() => setShowDeleteId(g.id)} aria-label={`Remove ${g.name}`} className="rounded-full p-2 text-ink-faint transition-colors hover:bg-bad/10 hover:text-bad">
                          <Trash size={18} />
                        </button>
                      )}
                    </Card>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-4">
              {showGuestForm ? (
                <Card className="p-5 sm:p-6">
                  <form onSubmit={handleAddGuest} className="space-y-4">
                    <h2 className="t-h3">Add a guest</h2>
                    <Input label="Full name" required value={guestName} onChange={(e) => setGuestName(e.target.value)} />
                    <div className="grid grid-cols-2 gap-3">
                      <Select label="Gender" value={guestGender} onChange={(e) => setGuestGender(e.target.value)}>
                        <option value="MALE">Male</option>
                        <option value="FEMALE">Female</option>
                        <option value="OTHERS">Other</option>
                      </Select>
                      <Input label="Age" type="number" min={1} max={120} required value={guestAge} onChange={(e) => setGuestAge(e.target.value)} />
                    </div>
                    <div className="flex gap-3">
                      <Button type="submit" loading={addingGuest} className="flex-1">{addingGuest ? 'Adding' : 'Add guest'}</Button>
                      <Button type="button" variant="ghost" onClick={() => setShowGuestForm(false)}>Cancel</Button>
                    </div>
                  </form>
                </Card>
              ) : (
                <Button variant="ghost" className="w-full border-dashed" onClick={() => setShowGuestForm(true)}>
                  <Plus size={18} /> Add guest
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
