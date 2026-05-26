import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getBooking, addGuests, initiatePayment, verifyPayment,
  mockConfirmBooking, cancelBooking,
} from '../api/bookings';
import { getGuests } from '../api/users';
import {
  ArrowLeft, CheckCircle, XCircle, Clock, CreditCard,
  Users, Shield, ChevronRight, AlertCircle, RotateCcw,
} from 'lucide-react';

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

/* ─── Types ──────────────────────────────────────────────────────────────────── */
interface Guest { id: number; name: string; gender: string; age: number }
interface BookingStatus {
  id: number; bookingStatus: string; amount: number;
  checkInDate: string; checkOutDate: string; roomsCount: number;
  hotel?: { name: string; city: string }; room?: { type: string };
}

/* ─── Helpers ────────────────────────────────────────────────────────────────── */
const HOTEL_IMGS = [
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&q=80',
  'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=600&q=80',
  'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=600&q=80',
  'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=600&q=80',
  'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=600&q=80',
  'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=600&q=80',
];

function fmtDate(d: string) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function nightsBetween(a: string, b: string) {
  if (!a || !b) return 1;
  return Math.max(1, Math.ceil((new Date(b).getTime() - new Date(a).getTime()) / 86400000));
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

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}

/* ─── Countdown timer ────────────────────────────────────────────────────────── */
function CountdownTimer({ bookingId }: { bookingId: string }) {
  const storageKey = `qs_booking_start_${bookingId}`;
  const [secs, setSecs] = useState<number>(() => {
    const stored = localStorage.getItem(storageKey);
    if (!stored) { localStorage.setItem(storageKey, String(Date.now())); return 600; }
    const elapsed = Math.floor((Date.now() - Number(stored)) / 1000);
    return Math.max(0, 600 - elapsed);
  });

  useEffect(() => {
    if (secs <= 0) return;
    const id = setInterval(() => setSecs((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [secs]);

  const mm = String(Math.floor(secs / 60)).padStart(2, '0');
  const ss = String(secs % 60).padStart(2, '0');
  const urgent = secs < 60;
  const expired = secs === 0;

  return (
    <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${
      expired ? 'bg-red-100 text-red-700' :
      urgent  ? 'bg-red-50 text-red-600 animate-pulse' :
                'bg-[#ffe4e8] text-[#ff385c]'
    }`}>
      <Clock size={14} />
      {expired ? 'Booking expired' : `Expires in ${mm}:${ss}`}
    </div>
  );
}

/* ─── Progress stepper ───────────────────────────────────────────────────────── */
function Stepper({ step }: { step: 1 | 2 | 3 }) {
  const steps = [
    { n: 1, label: 'Dates' },
    { n: 2, label: 'Guests' },
    { n: 3, label: 'Payment' },
  ];
  return (
    <div className="flex items-center gap-0 mb-8">
      {steps.map((s, i) => {
        const done    = s.n < step;
        const active  = s.n === step;
        const pending = s.n > step;
        return (
          <div key={s.n} className="flex items-center">
            {/* Circle */}
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                done    ? 'bg-[#ff385c] text-white' :
                active  ? 'bg-[#ff385c] text-white ring-4 ring-[#ffe4e8]' :
                          'bg-[#eeeeee] text-[#757575]'
              }`}>
                {done ? <CheckCircle size={16} /> : s.n}
              </div>
              <span className={`text-xs mt-1 font-semibold whitespace-nowrap ${
                active ? 'text-[#ff385c]' : pending ? 'text-[#757575]' : 'text-[#1a1c1c]'
              }`}>{s.label}</span>
            </div>
            {/* Connector */}
            {i < steps.length - 1 && (
              <div className={`h-0.5 w-16 sm:w-24 mx-1 mb-5 transition-colors ${
                s.n < step ? 'bg-[#ff385c]' : 'bg-[#eeeeee]'
              }`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Booking summary sidebar ────────────────────────────────────────────────── */
function BookingSummary({ booking }: { booking: BookingStatus }) {
  const nights   = nightsBetween(booking.checkInDate, booking.checkOutDate);
  const subtotal = booking.amount ?? 0;
  // Backend amount IS the final total; reverse-engineer nightly rate for display
  const fee      = Math.round(subtotal * 0.05);
  const tax      = Math.round(subtotal * 0.025);
  const baseNightly = Math.round((subtotal - fee - tax) / Math.max(1, nights));
  const imgUrl   = HOTEL_IMGS[booking.id % HOTEL_IMGS.length];

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
      {/* Hotel image */}
      <div className="h-44 overflow-hidden">
        <img src={imgUrl} alt={booking.hotel?.name} className="w-full h-full object-cover" />
      </div>

      <div className="p-5">
        {/* Hotel info */}
        <div className="mb-4">
          <h3 className="font-bold text-[#1a1c1c] text-base leading-snug">
            {booking.hotel?.name ?? 'Hotel'}
          </h3>
          <p className="text-xs text-[#757575] mt-0.5">{booking.hotel?.city}</p>
          {booking.room?.type && (
            <span className="inline-block mt-2 px-2.5 py-0.5 bg-[#f3f3f3] text-[#4a4a4a] text-xs rounded-full font-medium">
              {booking.room.type}
            </span>
          )}
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="bg-[#f9f9f9] rounded-xl p-3">
            <p className="text-[10px] text-[#757575] uppercase tracking-wide font-semibold mb-0.5">Check-in</p>
            <p className="text-sm font-bold text-[#1a1c1c]">{fmtDate(booking.checkInDate)}</p>
          </div>
          <div className="bg-[#f9f9f9] rounded-xl p-3">
            <p className="text-[10px] text-[#757575] uppercase tracking-wide font-semibold mb-0.5">Check-out</p>
            <p className="text-sm font-bold text-[#1a1c1c]">{fmtDate(booking.checkOutDate)}</p>
          </div>
        </div>

        {/* Price breakdown */}
        <div className="space-y-2 text-sm border-t border-gray-100 pt-4">
          <div className="flex justify-between text-[#4a4a4a]">
            <span>₹{baseNightly.toLocaleString()} × {nights} night{nights > 1 ? 's' : ''}</span>
            <span>₹{(baseNightly * nights).toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-[#4a4a4a]">
            <span>Service fee (5%)</span>
            <span>₹{fee.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-[#4a4a4a]">
            <span>Taxes (2.5%)</span>
            <span>₹{tax.toLocaleString()}</span>
          </div>
          <div className="flex justify-between font-bold text-[#1a1c1c] pt-2 border-t border-gray-100 text-base">
            <span>Total</span>
            <span>₹{subtotal.toLocaleString()}</span>
          </div>
        </div>

        {/* Secure badge */}
        <div className="flex items-center gap-2 mt-4 text-xs text-[#757575]">
          <Shield size={14} className="text-[#ff385c]" />
          Secure booking · Free cancellation
        </div>
      </div>
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────────────────────────── */
export default function BookingDetail() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();

  const [booking,        setBooking]        = useState<BookingStatus | null>(null);
  const [savedGuests,    setSavedGuests]    = useState<Guest[]>([]);
  const [selectedGuests, setSelectedGuests] = useState<Guest[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [actionLoading,  setActionLoading]  = useState(false);
  const [error,          setError]          = useState('');

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

  /* ── Actions ── */
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
        description: `Booking #${bookingId} — ${booking?.hotel?.name ?? ''}`,
        order_id: order.orderId,
        theme: { color: '#ff385c' },
        handler: async (r) => {
          try { await verifyPayment(Number(bookingId), r); fetchStatus(); }
          catch { setError('Payment verified failed. Contact support. Booking #' + bookingId); }
        },
        modal: { ondismiss: () => { setError('Payment cancelled. Retry anytime.'); setActionLoading(false); } },
      });
      rzp.open();
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
    if (!bookingId || !confirm('Cancel this booking? This cannot be undone.')) return;
    setActionLoading(true);
    try { await cancelBooking(Number(bookingId)); fetchStatus(); }
    catch { setError('Cancel failed'); }
    finally { setActionLoading(false); }
  };

  /* ── Loading ── */
  if (loading) return (
    <div className="min-h-screen bg-[#f9f9f9] flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#ff385c] border-t-transparent" />
    </div>
  );

  const status = booking?.bookingStatus ?? '';
  const showStepper = status === 'RESERVED' || status === 'GUESTS_ADDED';
  const stepperStep: 1 | 2 | 3 = status === 'GUESTS_ADDED' || status === 'PAYMENTS_PENDING' ? 3 : 2;
  const showSidebar = status === 'RESERVED' || status === 'GUESTS_ADDED';

  return (
    <div className="min-h-screen bg-[#f9f9f9]">
      {/* ── Top bar ── */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-3 flex items-center justify-between">
          <button
            onClick={() => navigate('/profile')}
            className="flex items-center gap-2 text-[#4a4a4a] hover:text-[#ff385c] text-sm font-medium transition-colors"
          >
            <ArrowLeft size={16} /> My Bookings
          </button>

          {(status === 'RESERVED' || status === 'GUESTS_ADDED') && bookingId && (
            <CountdownTimer bookingId={bookingId} />
          )}
        </div>
      </div>

      {/* ── Page content ── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8">
        {/* Error banner */}
        {error && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 text-sm">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {!booking ? (
          <div className="text-center py-20 text-[#757575]">Booking not found.</div>
        ) : (
          <div className={`flex flex-col ${showSidebar ? 'lg:flex-row' : ''} gap-8`}>

            {/* ── Left column ── */}
            <div className="flex-1 min-w-0">
              {/* Page heading */}
              <div className="mb-6">
                <h1 className="text-2xl font-extrabold text-[#1a1c1c]">
                  {status === 'CONFIRMED'  ? 'Booking Confirmed!'  :
                   status === 'CANCELLED'  ? 'Booking Cancelled'   :
                   status === 'PAYMENTS_PENDING' ? 'Awaiting Payment' :
                   'Complete your booking'}
                </h1>
                <p className="text-[#757575] text-sm mt-1">
                  {booking.hotel?.name} · {booking.hotel?.city}
                </p>
              </div>

              {/* Stepper */}
              {showStepper && <Stepper step={stepperStep} />}

              {/* ── RESERVED: Add Guests ── */}
              {status === 'RESERVED' && (
                <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-[#1a1c1c] mb-1 flex items-center gap-2">
                    <Users size={20} className="text-[#ff385c]" />
                    Who's checking in?
                  </h2>
                  <p className="text-sm text-[#757575] mb-5">
                    Select guests from your saved list or add them in your profile.
                  </p>

                  {savedGuests.length === 0 ? (
                    <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl">
                      <Users size={32} className="text-gray-300 mx-auto mb-2" />
                      <p className="text-[#757575] text-sm mb-3">No saved guests yet.</p>
                      <button
                        onClick={() => navigate('/profile')}
                        className="text-[#ff385c] text-sm font-semibold hover:underline"
                      >
                        Add guests in Profile →
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2 mb-5">
                      {savedGuests.map((g) => {
                        const checked = selectedGuests.some((sg) => sg.id === g.id);
                        return (
                          <label
                            key={g.id}
                            className={`flex items-center gap-4 p-4 border rounded-xl cursor-pointer transition-all ${
                              checked
                                ? 'border-[#ff385c] bg-[#ffe4e8]/20'
                                : 'border-gray-200 hover:border-[#ff385c]/40'
                            }`}
                          >
                            {/* Avatar */}
                            <div className="w-10 h-10 rounded-full bg-[#ffe4e8] text-[#ff385c] flex items-center justify-center text-sm font-bold shrink-0">
                              {initials(g.name)}
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold text-[#1a1c1c] text-sm">{g.name}</p>
                              <p className="text-xs text-[#757575]">{g.gender} · Age {g.age}</p>
                            </div>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => setSelectedGuests(
                                e.target.checked
                                  ? [...selectedGuests, g]
                                  : selectedGuests.filter((sg) => sg.id !== g.id)
                              )}
                              className="w-4 h-4 accent-[#ff385c] rounded"
                            />
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {selectedGuests.length > 0 && (
                    <p className="text-xs text-[#ff385c] font-semibold mb-3">
                      {selectedGuests.length} guest{selectedGuests.length > 1 ? 's' : ''} selected
                    </p>
                  )}

                  <div className="flex gap-3 flex-wrap">
                    <button
                      onClick={handleAddGuests}
                      disabled={actionLoading || selectedGuests.length === 0}
                      className="flex-1 min-w-[180px] py-3 bg-[#ff385c] text-white rounded-xl font-semibold hover:bg-[#e21e4a] disabled:opacity-50 transition-colors text-sm flex items-center justify-center gap-2"
                    >
                      {actionLoading ? 'Saving…' : 'Continue to Payment'}
                      {!actionLoading && <ChevronRight size={16} />}
                    </button>
                    <button
                      onClick={handleCancel}
                      disabled={actionLoading}
                      className="px-5 py-3 border border-gray-200 text-[#4a4a4a] rounded-xl hover:bg-gray-50 text-sm font-medium"
                    >
                      Cancel booking
                    </button>
                  </div>
                </div>
              )}

              {/* ── GUESTS_ADDED: Payment ── */}
              {status === 'GUESTS_ADDED' && (
                <div className="space-y-4">
                  {/* Trip summary */}
                  <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                    <h2 className="text-base font-bold text-[#1a1c1c] mb-3">Your trip</h2>
                    <div className="flex gap-6 text-sm">
                      <div>
                        <p className="text-[#757575] text-xs uppercase tracking-wide font-semibold mb-0.5">Dates</p>
                        <p className="font-semibold text-[#1a1c1c]">
                          {fmtDate(booking.checkInDate)} → {fmtDate(booking.checkOutDate)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[#757575] text-xs uppercase tracking-wide font-semibold mb-0.5">Rooms</p>
                        <p className="font-semibold text-[#1a1c1c]">{booking.roomsCount} room{booking.roomsCount > 1 ? 's' : ''}</p>
                      </div>
                    </div>
                  </div>

                  {/* Payment method */}
                  <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                    <h2 className="text-base font-bold text-[#1a1c1c] mb-4">Pay with</h2>

                    {/* Razorpay card */}
                    <div className="border border-gray-200 rounded-xl p-4 flex items-center gap-4 mb-4">
                      <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-extrabold text-sm shrink-0">
                        R
                      </div>
                      <div>
                        <p className="font-semibold text-[#1a1c1c] text-sm">Razorpay</p>
                        <p className="text-xs text-[#757575]">UPI · Credit/Debit Card · NetBanking · Wallets</p>
                      </div>
                      <div className="ml-auto w-4 h-4 rounded-full border-2 border-[#ff385c] bg-[#ff385c] flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                      </div>
                    </div>

                    {/* T&C */}
                    <p className="text-xs text-[#757575] leading-relaxed mb-5">
                      By selecting Pay Now, I agree to the{' '}
                      <span className="text-[#ff385c] font-medium cursor-pointer">Property Rules</span>,{' '}
                      <span className="text-[#ff385c] font-medium cursor-pointer">Ground Rules</span>, and{' '}
                      <span className="text-[#ff385c] font-medium cursor-pointer">Privacy Policy</span>.
                    </p>

                    {/* Pay now button */}
                    <button
                      onClick={handlePayWithRazorpay}
                      disabled={actionLoading}
                      className="w-full py-3.5 bg-[#ff385c] text-white rounded-xl font-bold text-sm hover:bg-[#e21e4a] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                    >
                      <CreditCard size={18} />
                      {actionLoading ? 'Opening payment…' : `Pay ₹${booking.amount?.toLocaleString()}`}
                    </button>

                    {/* Mock confirm (dev) */}
                    <button
                      onClick={handleMockConfirm}
                      disabled={actionLoading}
                      className="w-full mt-3 py-2.5 border border-dashed border-gray-300 text-[#757575] rounded-xl text-xs hover:border-gray-400 hover:text-[#4a4a4a] transition-colors"
                    >
                      🛠 Skip payment — dev/demo only
                    </button>
                  </div>
                </div>
              )}

              {/* ── PAYMENTS_PENDING ── */}
              {status === 'PAYMENTS_PENDING' && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center shadow-sm">
                  <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CreditCard size={28} className="text-amber-600" />
                  </div>
                  <h2 className="font-extrabold text-amber-800 text-xl mb-2">Payment in Progress</h2>
                  <p className="text-amber-600 text-sm mb-6">
                    Complete payment in the Razorpay window. Close and refresh to check status.
                  </p>
                  <button
                    onClick={fetchStatus}
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-semibold hover:bg-amber-600"
                  >
                    <RotateCcw size={15} /> Refresh Status
                  </button>
                </div>
              )}

              {/* ── CONFIRMED ── */}
              {status === 'CONFIRMED' && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="h-2 bg-[#ff385c]" />
                  <div className="p-8 text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle size={32} className="text-green-600" />
                    </div>
                    <h2 className="font-extrabold text-[#1a1c1c] text-2xl mb-2">Booking Confirmed!</h2>
                    <p className="text-[#757575] text-sm mb-2">
                      Your stay at <strong>{booking.hotel?.name}</strong> is confirmed.
                    </p>
                    <p className="text-[#757575] text-sm mb-6">
                      {fmtDate(booking.checkInDate)} → {fmtDate(booking.checkOutDate)}
                    </p>
                    <div className="inline-block bg-[#ffe4e8] rounded-xl px-6 py-3 mb-6">
                      <p className="text-[#ff385c] font-extrabold text-2xl">₹{booking.amount?.toLocaleString()}</p>
                      <p className="text-[#ff385c] text-xs">Total paid</p>
                    </div>
                    <br />
                    <button
                      onClick={() => navigate('/profile')}
                      className="inline-flex items-center gap-2 px-8 py-3 bg-[#ff385c] text-white rounded-xl font-semibold text-sm hover:bg-[#e21e4a]"
                    >
                      Go to My Bookings <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}

              {/* ── CANCELLED ── */}
              {status === 'CANCELLED' && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="h-2 bg-red-500" />
                  <div className="p-8 text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <XCircle size={32} className="text-red-500" />
                    </div>
                    <h2 className="font-extrabold text-[#1a1c1c] text-xl mb-2">Booking Cancelled</h2>
                    <p className="text-[#757575] text-sm mb-6">
                      This booking has been cancelled and inventory released.
                    </p>
                    <button
                      onClick={() => navigate('/')}
                      className="inline-flex items-center gap-2 px-8 py-3 bg-[#ff385c] text-white rounded-xl font-semibold text-sm hover:bg-[#e21e4a]"
                    >
                      Find Another Hotel <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ── Right sidebar ── */}
            {showSidebar && (
              <div className="lg:w-80 shrink-0">
                <div className="sticky top-20">
                  <BookingSummary booking={booking} />
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}
