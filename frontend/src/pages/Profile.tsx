import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getMyBookings, cancelBooking } from '../api/bookings';
import { getGuests, addGuest, deleteGuest } from '../api/users';
import {
  User, BedDouble, Plus, Trash2, Calendar,
  CheckCircle, XCircle, Clock, CreditCard, LogOut,
  MapPin, ArrowRight,
} from 'lucide-react';

interface Booking {
  id: number; bookingStatus: string; amount: number;
  checkInDate: string; checkOutDate: string; roomsCount: number;
  hotel?: { name: string; city: string };
}
interface Guest { id: number; name: string; gender: string; age: number }

const STATUS_CONFIG: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  RESERVED:         { color: 'text-blue-700 bg-blue-50',     icon: <Clock size={11} />,       label: 'Reserved' },
  GUESTS_ADDED:     { color: 'text-purple-700 bg-purple-50', icon: <User size={11} />,         label: 'Guests Added' },
  PAYMENTS_PENDING: { color: 'text-amber-700 bg-amber-50',   icon: <CreditCard size={11} />,   label: 'Payment Pending' },
  CONFIRMED:        { color: 'text-green-700 bg-green-50',   icon: <CheckCircle size={11} />,  label: 'Confirmed' },
  CANCELLED:        { color: 'text-red-600 bg-red-50',       icon: <XCircle size={11} />,      label: 'Cancelled' },
};

const HOTEL_IMGS = [
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&q=80',
  'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=400&q=80',
  'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=400&q=80',
  'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=400&q=80',
  'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=400&q=80',
  'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400&q=80',
];

const UPCOMING_STATUSES = ['RESERVED', 'GUESTS_ADDED', 'PAYMENTS_PENDING'];

type BookingFilter = 'all' | 'upcoming' | 'completed' | 'cancelled';

const FILTER_CHIPS: { key: BookingFilter; label: string }[] = [
  { key: 'all',       label: 'All Bookings' },
  { key: 'upcoming',  label: 'Upcoming' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

function fmt(d: string) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function nights(ci: string, co: string) {
  if (!ci || !co) return 0;
  return Math.ceil((new Date(co).getTime() - new Date(ci).getTime()) / 86400000);
}

export default function Profile() {
  const { user, logout, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [bookings,    setBookings]    = useState<Booking[]>([]);
  const [guests,      setGuests]      = useState<Guest[]>([]);
  const [tab,         setTab]         = useState<'bookings' | 'guests'>('bookings');
  const [loading,     setLoading]     = useState(true);
  const [bookingFilter, setBookingFilter] = useState<BookingFilter>('all');
  const [cancellingId,  setCancellingId]  = useState<number | null>(null);

  const [guestName,     setGuestName]     = useState('');
  const [guestGender,   setGuestGender]   = useState('MALE');
  const [guestAge,      setGuestAge]      = useState('');
  const [addingGuest,   setAddingGuest]   = useState(false);
  const [showGuestForm, setShowGuestForm] = useState(false);

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
    try {
      await addGuest({ name: guestName, gender: guestGender, age: Number(guestAge) });
      const res = await getGuests();
      setGuests(res.data?.data ?? []);
      setGuestName(''); setGuestAge(''); setShowGuestForm(false);
    } catch { /* ignore */ }
    finally { setAddingGuest(false); }
  };

  const handleDeleteGuest = async (id: number) => {
    if (!confirm('Remove this guest?')) return;
    await deleteGuest(id).catch(() => {});
    setGuests((g) => g.filter((x) => x.id !== id));
  };

  const handleCancel = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (!confirm('Cancel this booking?')) return;
    setCancellingId(id);
    try {
      await cancelBooking(id);
      setBookings((prev) => prev.map((b) => b.id === id ? { ...b, bookingStatus: 'CANCELLED' } : b));
    } catch { /* ignore */ }
    finally { setCancellingId(null); }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#f9f9f9] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#ff385c] border-t-transparent" />
      </div>
    );
  }

  if (!user) return null;

  const filteredBookings = bookings.filter((b) => {
    if (bookingFilter === 'upcoming')  return UPCOMING_STATUSES.includes(b.bookingStatus);
    if (bookingFilter === 'completed') return b.bookingStatus === 'CONFIRMED';
    if (bookingFilter === 'cancelled') return b.bookingStatus === 'CANCELLED';
    return true;
  });

  const inp = 'w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#ff385c] transition-colors';

  return (
    <div className="min-h-screen bg-[#f9f9f9]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">

        {/* ── Profile card ──────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-8 flex items-center gap-5">
          <div className="w-16 h-16 rounded-full bg-[#ff385c] flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-2xl">{user.name?.[0]?.toUpperCase() ?? 'U'}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-[#1a1c1c] truncate">{user.name}</h1>
            <p className="text-gray-500 text-sm">{user.email}</p>
            <div className="flex gap-1.5 mt-1.5 flex-wrap">
              {user.roles?.map((r) => (
                <span key={r} className="text-xs bg-[#ffe4e8] text-[#ff385c] px-2.5 py-0.5 rounded-full font-semibold">
                  {r.replace('ROLE_', '')}
                </span>
              ))}
            </div>
          </div>
          <button onClick={() => { logout(); navigate('/'); }}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors shrink-0">
            <LogOut size={15} /> Sign Out
          </button>
        </div>

        {/* ── Main tabs ─────────────────────────────────────────── */}
        <div className="flex gap-1 bg-[#eeeeee] rounded-xl p-1 mb-6 w-fit">
          {[
            { key: 'bookings', label: 'My Bookings',  icon: <BedDouble size={14} /> },
            { key: 'guests',   label: 'Saved Guests', icon: <User size={14} /> },
          ].map(({ key, label, icon }) => (
            <button key={key} onClick={() => setTab(key as 'bookings' | 'guests')}
              className={`flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${
                tab === key ? 'bg-white text-[#1a1c1c] shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}>
              {icon} {label}
            </button>
          ))}
        </div>

        {/* ── Content ───────────────────────────────────────────── */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#ff385c] border-t-transparent" />
          </div>
        ) : tab === 'bookings' ? (
          <div>
            {/* Filter chips */}
            <div className="flex gap-2 flex-wrap mb-6">
              {FILTER_CHIPS.map(({ key, label }) => (
                <button key={key} onClick={() => setBookingFilter(key)}
                  className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                    bookingFilter === key
                      ? 'bg-[#ff385c] text-white'
                      : 'bg-[#eeeeee] text-[#1a1c1c] hover:bg-gray-300'
                  }`}>
                  {label}
                  <span className="ml-1.5 opacity-60 text-xs">
                    {key === 'all'       ? bookings.length
                     : key === 'upcoming'  ? bookings.filter(b => UPCOMING_STATUSES.includes(b.bookingStatus)).length
                     : key === 'completed' ? bookings.filter(b => b.bookingStatus === 'CONFIRMED').length
                     :                       bookings.filter(b => b.bookingStatus === 'CANCELLED').length}
                  </span>
                </button>
              ))}
            </div>

            {/* Booking cards */}
            {filteredBookings.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-14 text-center">
                <BedDouble size={48} className="text-gray-200 mx-auto mb-4" />
                <p className="text-[#1a1c1c] font-semibold mb-1">
                  {bookingFilter === 'all' ? 'No bookings yet' : `No ${bookingFilter} bookings`}
                </p>
                <p className="text-gray-400 text-sm mb-5">
                  {bookingFilter === 'all' ? 'Find and book your first hotel stay' : 'Nothing to show here'}
                </p>
                {bookingFilter === 'all' && (
                  <button onClick={() => navigate('/')}
                    className="px-6 py-2.5 bg-[#ff385c] text-white rounded-xl text-sm font-semibold hover:bg-[#e21e4a] transition-colors">
                    Search Hotels
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredBookings.map((b) => {
                  const cfg = STATUS_CONFIG[b.bookingStatus] ?? STATUS_CONFIG.RESERVED;
                  const isUpcoming  = UPCOMING_STATUSES.includes(b.bookingStatus);
                  const isConfirmed = b.bookingStatus === 'CONFIRMED';
                  const isCancelled = b.bookingStatus === 'CANCELLED';
                  const n = nights(b.checkInDate, b.checkOutDate);

                  return (
                    <div key={b.id}
                      onClick={() => navigate(`/booking/${b.id}`)}
                      className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md cursor-pointer transition-all overflow-hidden">

                      {/* Pending warning banner */}
                      {(b.bookingStatus === 'RESERVED' || b.bookingStatus === 'PAYMENTS_PENDING') && (
                        <div className="bg-amber-50 border-b border-amber-100 px-4 py-2 flex items-center gap-2">
                          <Clock size={13} className="text-amber-600 shrink-0" />
                          <p className="text-xs text-amber-700 font-medium">
                            {b.bookingStatus === 'RESERVED'
                              ? 'Booking reserved — complete payment before it expires'
                              : 'Payment pending — awaiting confirmation'}
                          </p>
                        </div>
                      )}

                      <div className="p-4 flex gap-4">
                        {/* Hotel image */}
                        <div className="w-28 h-28 sm:w-36 sm:h-28 rounded-xl overflow-hidden shrink-0 bg-gray-100">
                          <img
                            src={HOTEL_IMGS[b.id % HOTEL_IMGS.length]}
                            alt={b.hotel?.name ?? 'Hotel'}
                            className="w-full h-full object-cover"
                          />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <div className="min-w-0">
                              <h3 className="font-bold text-[#1a1c1c] truncate text-base">
                                {b.hotel?.name ?? 'Hotel'}
                              </h3>
                              {b.hotel?.city && (
                                <p className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                                  <MapPin size={11} className="shrink-0" /> {b.hotel.city}
                                </p>
                              )}
                            </div>
                            <span className={`flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-semibold shrink-0 ${cfg.color}`}>
                              {cfg.icon} {cfg.label}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 text-sm text-gray-500 mt-2 mb-3">
                            <Calendar size={13} className="shrink-0" />
                            <span>{fmt(b.checkInDate)} → {fmt(b.checkOutDate)}</span>
                            {n > 0 && <span className="text-gray-400">· {n}n</span>}
                            <span className="text-gray-400 ml-1">· {b.roomsCount}r</span>
                          </div>

                          <div className="flex items-center justify-between">
                            <p className="font-bold text-[#1a1c1c] text-lg">₹{b.amount?.toFixed(0)}</p>

                            {/* Action buttons */}
                            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                              {isUpcoming && (
                                <>
                                  <button
                                    onClick={() => navigate(`/booking/${b.id}`)}
                                    className="px-3 py-1.5 bg-[#ff385c] text-white rounded-lg text-xs font-semibold hover:bg-[#e21e4a] transition-colors">
                                    Continue
                                  </button>
                                  <button
                                    onClick={(e) => handleCancel(e, b.id)}
                                    disabled={cancellingId === b.id}
                                    className="px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg text-xs font-semibold hover:bg-gray-50 disabled:opacity-50 transition-colors">
                                    {cancellingId === b.id ? '…' : 'Cancel'}
                                  </button>
                                </>
                              )}
                              {isConfirmed && (
                                <>
                                  <button
                                    onClick={() => navigate(`/booking/${b.id}`)}
                                    className="px-3 py-1.5 border border-gray-200 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-50 transition-colors">
                                    View Details
                                  </button>
                                  <button
                                    onClick={(e) => handleCancel(e, b.id)}
                                    disabled={cancellingId === b.id}
                                    className="px-3 py-1.5 border border-gray-200 text-red-500 rounded-lg text-xs font-semibold hover:bg-red-50 disabled:opacity-50 transition-colors">
                                    {cancellingId === b.id ? '…' : 'Cancel'}
                                  </button>
                                </>
                              )}
                              {isCancelled && (
                                <button
                                  onClick={() => navigate('/')}
                                  className="flex items-center gap-1 px-3 py-1.5 border border-[#ff385c] text-[#ff385c] rounded-lg text-xs font-semibold hover:bg-[#ffe4e8] transition-colors">
                                  Book Again <ArrowRight size={11} />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* ── Guests tab ──────────────────────────────────────── */
          <div>
            <div className="space-y-3 mb-4">
              {guests.length === 0 && !showGuestForm ? (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
                  <User size={40} className="text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No saved guests yet</p>
                </div>
              ) : guests.map((g) => (
                <div key={g.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#ffe4e8] flex items-center justify-center shrink-0">
                      <span className="text-[#ff385c] font-bold text-sm">{g.name?.[0]?.toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-[#1a1c1c] text-sm">{g.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{g.gender} · Age {g.age}</p>
                    </div>
                  </div>
                  <button onClick={() => handleDeleteGuest(g.id)}
                    className="p-2 text-gray-300 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50">
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>

            {showGuestForm ? (
              <form onSubmit={handleAddGuest} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h3 className="font-bold text-[#1a1c1c] mb-4">Add New Guest</h3>
                <div className="space-y-3">
                  <input type="text" placeholder="Full Name" value={guestName}
                    onChange={(e) => setGuestName(e.target.value)} required className={inp} />
                  <select value={guestGender} onChange={(e) => setGuestGender(e.target.value)} className={inp}>
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHERS">Other</option>
                  </select>
                  <input type="number" placeholder="Age" value={guestAge} min={1} max={120}
                    onChange={(e) => setGuestAge(e.target.value)} required className={inp} />
                </div>
                <div className="flex gap-2 mt-4">
                  <button type="submit" disabled={addingGuest}
                    className="flex-1 py-2.5 bg-[#ff385c] text-white rounded-xl text-sm font-semibold hover:bg-[#e21e4a] disabled:opacity-60 transition-colors">
                    {addingGuest ? 'Adding…' : 'Add Guest'}
                  </button>
                  <button type="button" onClick={() => setShowGuestForm(false)}
                    className="px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <button onClick={() => setShowGuestForm(true)}
                className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 hover:border-[#ff385c] hover:text-[#ff385c] transition-colors text-sm w-full justify-center">
                <Plus size={16} /> Add Guest
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
