import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, ArrowCounterClockwise, CaretRight, CreditCard, ShieldCheck, Users, XCircle } from '@phosphor-icons/react';
import { addGuests, cancelBooking, getBooking, initiatePayment, mockConfirmBooking, verifyPayment } from '../api/bookings';
import { getGuests } from '../api/users';
import { hotelImage } from '../lib/images';
import { fmtDate, inr, nights as nightsBetween } from '../lib/dates';
import { Button } from '../components/ui/Button';
import { Banner, Card, EmptyState, Skeleton, StatusPill } from '../components/ui/Display';

/* ─── Razorpay types ─────────────────────────────────────────────────────────── */
declare global {
  interface Window { Razorpay: new (opts: RzpOptions) => RzpInstance }
}
interface RzpOptions {
  key: string; amount: number; currency: string;
  name: string; description: string; order_id: string;
  handler: (r: RzpResponse) => void;
  prefill?: { name?: string; email?: string; contact?: string };
  theme?: { color?: string };
  modal?: { ondismiss?: () => void };
}
interface RzpResponse { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }
interface RzpInstance { open(): void }

interface Guest { id: number; name: string; gender: string; age: number }
interface BookingStatus {
  id: number; bookingStatus: string; amount: number;
  checkInDate: string; checkOutDate: string; roomsCount: number;
  createdAt?: string;
  hotel?: { name: string; city: string }; room?: { type: string };
}

function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return; }
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

const initials = (name: string) => name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);

/* ─── Countdown ring: drains from amber to red as the hold runs out ──────────── */
const HOLD_SECONDS = 600;
function CountdownRing({ createdAt }: { createdAt: string }) {
  const [secs, setSecs] = useState<number>(() => {
    const elapsed = Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000);
    return Math.max(0, HOLD_SECONDS - elapsed);
  });

  useEffect(() => {
    if (secs <= 0) return;
    const id = setInterval(() => setSecs((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [secs]);

  const mm = String(Math.floor(secs / 60)).padStart(2, '0');
  const ss = String(secs % 60).padStart(2, '0');
  const urgent = secs < 60;
  const r = 14;
  const c = 2 * Math.PI * r;

  return (
    <div className={`flex items-center gap-3 rounded-lg border px-3 py-1.5 ${urgent ? 'border-bad/40 text-bad' : 'border-line text-ink'}`} role="timer" aria-label="Time left to complete booking">
      <svg width="34" height="34" viewBox="0 0 34 34" className="-rotate-90">
        <circle cx="17" cy="17" r={r} fill="none" strokeWidth="3" className="stroke-line" />
        <circle
          cx="17" cy="17" r={r} fill="none" strokeWidth="3" strokeLinecap="round"
          className={urgent ? 'stroke-bad' : 'stroke-accent'}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - secs / HOLD_SECONDS)}
          style={{ transition: 'stroke-dashoffset 1s linear' }}
        />
      </svg>
      <span className="text-sm font-bold tabular-nums">{secs === 0 ? 'Hold expired' : `${mm}:${ss}`}</span>
    </div>
  );
}

/* ─── Stepper with an animated progress line ─────────────────────────────────── */
function Stepper({ step }: { step: 1 | 2 | 3 }) {
  const steps = ['Dates', 'Guests', 'Payment'];
  return (
    <ol className="mb-6 flex items-center">
      {steps.map((label, i) => {
        const n = i + 1;
        const done = n < step;
        const active = n === step;
        return (
          <li key={label} className="flex flex-1 items-center last:flex-none">
            <div className="flex items-center gap-2">
              <span
                className={`grid h-8 w-8 place-items-center rounded-full text-sm font-bold transition-colors ${
                  done || active ? 'bg-accent text-on-accent' : 'border border-line text-ink-faint'
                }`}
              >
                {done ? '✓' : n}
              </span>
              <span className={`text-sm font-medium ${active ? 'text-ink' : 'text-ink-muted'}`}>{label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className="mx-3 h-px flex-1 bg-line">
                <motion.div className="h-px origin-left bg-accent" initial={false} animate={{ scaleX: done ? 1 : 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} />
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/* ─── Summary: backend amount is the final total, no fees or taxes are added ─── */
function BookingSummary({ booking }: { booking: BookingStatus }) {
  const stayNights = nightsBetween(booking.checkInDate, booking.checkOutDate);
  const total = booking.amount ?? 0;
  const rooms = Math.max(1, booking.roomsCount ?? 1);
  const nightly = Math.round(total / (stayNights * rooms));

  return (
    <Card className="overflow-hidden">
      <div className="aspect-[16/9] overflow-hidden">
        <img src={hotelImage(booking.id)} alt={booking.hotel?.name ?? 'Hotel'} className="h-full w-full object-cover" />
      </div>
      <div className="p-5">
        <h3 className="t-h3">{booking.hotel?.name ?? 'Hotel'}</h3>
        <p className="text-sm text-ink-muted">{booking.hotel?.city}{booking.room?.type ? ` · ${booking.room.type}` : ''}</p>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-surface-2 p-3">
            <p className="text-xs text-ink-muted">Check in</p>
            <p className="text-sm font-bold">{fmtDate(booking.checkInDate)}</p>
          </div>
          <div className="rounded-lg bg-surface-2 p-3">
            <p className="text-xs text-ink-muted">Check out</p>
            <p className="text-sm font-bold">{fmtDate(booking.checkOutDate)}</p>
          </div>
        </div>

        <div className="mt-5 space-y-2 text-sm">
          <div className="flex justify-between text-ink-muted">
            <span>{inr(nightly)} × {stayNights} night{stayNights > 1 ? 's' : ''}{rooms > 1 ? ` × ${rooms} rooms` : ''}</span>
            <span className="tabular-nums">{inr(total)}</span>
          </div>
          <div className="flex justify-between border-t border-line pt-3 text-base font-bold">
            <span>Total</span>
            <span className="tabular-nums">{inr(total)}</span>
          </div>
        </div>

        <p className="mt-4 flex items-center gap-2 text-xs text-ink-muted">
          <ShieldCheck size={16} className="text-accent" /> Secure payment via Razorpay
        </p>
      </div>
    </Card>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────────── */
export default function BookingDetail() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();

  const [booking, setBooking] = useState<BookingStatus | null>(null);
  const [savedGuests, setSavedGuests] = useState<Guest[]>([]);
  const [selectedGuests, setSelectedGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const fetchStatus = useCallback(() => {
    if (!bookingId) return;
    setLoading(true);
    getBooking(Number(bookingId))
      .then((res) => setBooking(res.data?.data))
      .catch(() => setError('Failed to load booking'))
      .finally(() => setLoading(false));
  }, [bookingId]);

  useEffect(() => {
    fetchStatus();
    getGuests().then((res) => setSavedGuests(res.data?.data ?? [])).catch(() => {});
  }, [fetchStatus]);

  /* ── Actions (unchanged behaviour) ── */
  const handleAddGuests = async () => {
    if (!bookingId || selectedGuests.length === 0) return;
    setActionLoading(true); setError('');
    try {
      await addGuests(Number(bookingId), selectedGuests);
      fetchStatus();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err.response?.data?.message ?? 'Failed to add guests');
    } finally { setActionLoading(false); }
  };

  const handlePayWithRazorpay = async () => {
    if (!bookingId) return;
    setActionLoading(true); setError('');
    try {
      const loaded = await loadRazorpay();
      if (!loaded) { setError('Payment gateway failed to load.'); setActionLoading(false); return; }
      const res = await initiatePayment(Number(bookingId));
      const order = res.data?.data;
      if (!order?.orderId) throw new Error('Invalid order from server');
      const rzp = new window.Razorpay({
        key: order.keyId, amount: order.amount, currency: order.currency,
        name: 'QuickStay',
        description: `Booking #${bookingId} - ${booking?.hotel?.name ?? ''}`,
        order_id: order.orderId,
        theme: { color: '#0f5132' },
        handler: async (r) => {
          try { await verifyPayment(Number(bookingId), r); fetchStatus(); }
          catch { setError('Payment verification failed. Contact support with booking #' + bookingId); }
          finally { setActionLoading(false); }
        },
        modal: { ondismiss: () => { setError('Payment cancelled. Retry anytime.'); setActionLoading(false); } },
      });
      rzp.open();
      setActionLoading(false); // modal is open; re-enable the button while the user interacts
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      setError(err.response?.data?.message ?? err.message ?? 'Payment initiation failed');
      setActionLoading(false);
    }
  };

  const handleMockConfirm = async () => {
    if (!bookingId) return;
    setActionLoading(true); setError('');
    try { await mockConfirmBooking(Number(bookingId)); fetchStatus(); }
    catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err.response?.data?.message ?? 'Confirmation failed');
    } finally { setActionLoading(false); }
  };

  const handleCancel = async () => {
    if (!bookingId) return;
    setActionLoading(true);
    try { await cancelBooking(Number(bookingId)); fetchStatus(); }
    catch { setError('Cancel failed'); }
    finally { setActionLoading(false); setShowCancelConfirm(false); }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 px-5 sm:px-8">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  const status = booking?.bookingStatus ?? '';
  const inProgress = status === 'RESERVED' || status === 'GUESTS_ADDED';
  const stepperStep: 1 | 2 | 3 = status === 'GUESTS_ADDED' ? 3 : 2;

  const title =
    status === 'CONFIRMED' ? 'Booking confirmed'
    : status === 'CANCELLED' ? 'Booking cancelled'
    : status === 'PAYMENTS_PENDING' ? 'Awaiting payment'
    : 'Complete your booking';

  return (
    <div className="mx-auto max-w-5xl px-5 pb-16 sm:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <button onClick={() => navigate('/profile')} className="inline-flex items-center gap-2 text-sm text-ink-muted transition-colors hover:text-ink">
          <ArrowLeft size={16} /> My bookings
        </button>
        {inProgress && booking?.createdAt && <CountdownRing createdAt={booking.createdAt} />}
      </div>

      {error && <div className="mb-5"><Banner tone="error">{error}</Banner></div>}

      {!booking ? (
        <Card><EmptyState title="Booking not found" action={<Button variant="ghost" onClick={() => navigate('/profile')}>Go to my bookings</Button>} /></Card>
      ) : (
        <div className={`grid items-start gap-8 ${inProgress ? 'lg:grid-cols-[1fr_20rem]' : ''}`}>
          <div className="min-w-0">
            <div className="mb-5 flex flex-wrap items-center gap-3">
              <h1 className="t-h2">{title}</h1>
              <StatusPill status={status} />
            </div>
            <p className="-mt-3 mb-6 text-ink-muted">{booking.hotel?.name} · {booking.hotel?.city}</p>

            {inProgress && <Stepper step={stepperStep} />}

            {/* Guests */}
            {status === 'RESERVED' && (
              <Card className="p-5 sm:p-6">
                <h2 className="t-h3 flex items-center gap-2"><Users size={20} className="text-accent" /> Who is checking in?</h2>
                <p className="mt-1 text-sm text-ink-muted">Pick guests from your saved list, or add them in your profile.</p>

                {savedGuests.length === 0 ? (
                  <div className="mt-5 rounded-lg border border-dashed border-line px-4 py-8 text-center">
                    <p className="text-sm text-ink-muted">No saved guests yet.</p>
                    <Button variant="ghost" size="sm" className="mt-3" onClick={() => navigate('/profile')}>Add guests in profile</Button>
                  </div>
                ) : (
                  <div className="mt-5 space-y-2">
                    {savedGuests.map((g) => {
                      const checked = selectedGuests.some((sg) => sg.id === g.id);
                      return (
                        <label key={g.id} className={`flex cursor-pointer items-center gap-4 rounded-lg border p-4 transition-colors ${checked ? 'border-accent bg-accent/10' : 'border-line hover:bg-surface-2'}`}>
                          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface-2 text-sm font-bold text-accent">{initials(g.name)}</span>
                          <span className="min-w-0 flex-1">
                            <span className="block font-medium">{g.name}</span>
                            <span className="block text-sm text-ink-muted">{g.gender} · Age {g.age}</span>
                          </span>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => setSelectedGuests(e.target.checked ? [...selectedGuests, g] : selectedGuests.filter((sg) => sg.id !== g.id))}
                            className="h-4 w-4 accent-accent"
                          />
                        </label>
                      );
                    })}
                  </div>
                )}

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <Button onClick={handleAddGuests} disabled={selectedGuests.length === 0} loading={actionLoading} className="flex-1 sm:flex-none">
                    Continue to payment <CaretRight size={16} weight="bold" />
                  </Button>
                  {showCancelConfirm ? (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-ink-muted">Cancel this booking?</span>
                      <Button variant="danger" size="sm" onClick={handleCancel} disabled={actionLoading}>Yes, cancel</Button>
                      <Button variant="quiet" size="sm" onClick={() => setShowCancelConfirm(false)} disabled={actionLoading}>Keep</Button>
                    </div>
                  ) : (
                    <Button variant="quiet" onClick={() => setShowCancelConfirm(true)} disabled={actionLoading}>Cancel booking</Button>
                  )}
                </div>
                {selectedGuests.length > 0 && (
                  <p className="mt-3 text-sm text-accent">{selectedGuests.length} guest{selectedGuests.length > 1 ? 's' : ''} selected</p>
                )}
              </Card>
            )}

            {/* Payment */}
            {status === 'GUESTS_ADDED' && (
              <div className="space-y-4">
                <Card className="p-5 sm:p-6">
                  <h2 className="t-h3">Your trip</h2>
                  <div className="mt-3 flex flex-wrap gap-x-8 gap-y-2 text-sm">
                    <p><span className="block text-ink-muted">Dates</span><span className="font-bold">{fmtDate(booking.checkInDate)} to {fmtDate(booking.checkOutDate)}</span></p>
                    <p><span className="block text-ink-muted">Rooms</span><span className="font-bold">{booking.roomsCount}</span></p>
                  </div>
                </Card>

                <Card className="p-5 sm:p-6">
                  <h2 className="t-h3">Pay with</h2>
                  <div className="mt-4 flex items-center gap-4 rounded-lg border border-accent bg-accent/10 p-4">
                    <span className="grid h-10 w-10 place-items-center rounded-lg bg-surface-2 text-accent"><CreditCard size={22} /></span>
                    <div>
                      <p className="font-medium">Razorpay</p>
                      <p className="text-sm text-ink-muted">UPI, cards, netbanking and wallets</p>
                    </div>
                  </div>
                  <p className="mt-4 text-xs text-ink-muted">By paying you agree to the property rules and privacy policy.</p>
                  <Button size="lg" className="mt-5 w-full" onClick={handlePayWithRazorpay} loading={actionLoading}>
                    {!actionLoading && <CreditCard size={20} />} {actionLoading ? 'Opening payment' : `Pay ${inr(booking.amount ?? 0)}`}
                  </Button>
                  {import.meta.env.DEV && (
                    <Button variant="ghost" size="sm" className="mt-3 w-full border-dashed" onClick={handleMockConfirm} disabled={actionLoading}>
                      Skip payment (dev only)
                    </Button>
                  )}
                </Card>
              </div>
            )}

            {/* Pending */}
            {status === 'PAYMENTS_PENDING' && (
              <Card>
                <EmptyState
                  icon={<CreditCard size={26} />}
                  title="Payment in progress"
                  body="Finish paying in the Razorpay window. If you closed it, refresh to check the status."
                  action={<Button variant="ghost" onClick={fetchStatus}><ArrowCounterClockwise size={16} /> Refresh status</Button>}
                />
              </Card>
            )}

            {/* Confirmed: the check draws itself over an amber glow */}
            {status === 'CONFIRMED' && (
              <Card className="relative overflow-hidden p-8 text-center sm:p-12">
                <div aria-hidden className="absolute inset-x-0 top-0 h-48 bg-[radial-gradient(60%_100%_at_50%_0%,rgb(15_81_50/0.12),transparent)]" />
                <div className="relative">
                  <svg width="72" height="72" viewBox="0 0 72 72" className="mx-auto" aria-hidden>
                    <motion.circle cx="36" cy="36" r="32" fill="none" strokeWidth="3" className="stroke-accent" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.7, ease: 'easeOut' }} />
                    <motion.path d="M22 37 L32 47 L51 26" fill="none" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="stroke-accent" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5, delay: 0.6, ease: 'easeOut' }} />
                  </svg>
                  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1, duration: 0.6 }}>
                    <h2 className="t-h2 mt-5">You're all set</h2>
                    <p className="mt-2 text-ink-muted">Your stay at <span className="font-medium text-ink">{booking.hotel?.name}</span> is confirmed.</p>
                    <p className="text-ink-muted">{fmtDate(booking.checkInDate)} to {fmtDate(booking.checkOutDate)}</p>
                    <p className="mx-auto mt-6 w-fit rounded-lg border border-line bg-surface-2 px-6 py-3">
                      <span className="block text-2xl font-bold tabular-nums text-accent">{inr(booking.amount ?? 0)}</span>
                      <span className="text-xs text-ink-muted">Total paid</span>
                    </p>
                    <Button className="mt-6" onClick={() => navigate('/profile')}>Go to my bookings <CaretRight size={16} weight="bold" /></Button>
                  </motion.div>
                </div>
              </Card>
            )}

            {/* Cancelled: calm */}
            {status === 'CANCELLED' && (
              <Card>
                <EmptyState
                  icon={<XCircle size={28} className="text-bad" />}
                  title="This booking was cancelled"
                  body="The room has been released. You can search for another stay any time."
                  action={<Button onClick={() => navigate('/')}>Find another hotel</Button>}
                />
              </Card>
            )}
          </div>

          {inProgress && (
            <aside className="lg:sticky lg:top-28">
              <BookingSummary booking={booking} />
            </aside>
          )}
        </div>
      )}
    </div>
  );
}
