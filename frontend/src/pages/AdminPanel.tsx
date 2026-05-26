import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Plus, List, BedDouble,
  Building2, Upload, X, TrendingUp, TrendingDown,
  Pencil, Trash2, ToggleLeft, ToggleRight, CheckCircle,
  IndianRupee, CalendarDays, Users,
} from 'lucide-react';
import api from '../api/client';
import {
  createHotel, updateHotel, deleteHotel, activateHotel, getHotelReports,
} from '../api/hotels';

// ─── Types ────────────────────────────────────────────────────────────────────
interface HotelContactInfo { address?: string; phoneNumber?: string; email?: string; location?: string }
interface Hotel {
  id: number; name: string; city: string; active: boolean;
  contactInfo?: HotelContactInfo;
  amenities?: string[];
}
interface Room  { id: number; type: string; basePrice: number; totalCount: number; amenities: string[]; capacity?: number }
interface BookingRow {
  id: number; bookingStatus: string; amount: number;
  checkInDate: string; checkOutDate: string; roomsCount: number;
  user?: { name?: string }; room?: { type?: string }; hotel?: { name?: string };
}
interface ReportData {
  totalRevenue: number; bookingCount: number; avgRevenue: number;
}

type Page = 'dashboard' | 'myHotels' | 'addHotel' | 'editHotel' | 'addRoom' | 'listRoom';

const NAV_ITEMS: { id: Page; label: string; icon: React.ReactNode; divider?: boolean }[] = [
  { id: 'dashboard', label: 'Dashboard',  icon: <LayoutDashboard size={17} /> },
  { id: 'myHotels',  label: 'My Hotels',  icon: <Building2 size={17} /> },
  { id: 'addHotel',  label: 'Add Hotel',  icon: <Plus size={17} /> },
  { id: 'addRoom',   label: 'Add Room',   icon: <Plus size={17} />, divider: true },
  { id: 'listRoom',  label: 'List Rooms', icon: <List size={17} /> },
];

const HOTEL_AMENITY_OPTIONS = [
  'WiFi', 'Pool', 'Gym', 'Parking', 'Breakfast', 'Spa', 'Restaurant',
  'Room Service', 'Bar', 'Conference Room', 'Laundry', 'Airport Shuttle',
];
const ROOM_AMENITY_OPTIONS = [
  'AC', 'TV', 'WiFi', 'Mini Bar', 'Bathtub', 'Balcony',
  'Sea View', 'City View', 'King Bed', 'Twin Beds', 'Safe', 'Kettle',
];
const ROOM_TYPES = ['SINGLE', 'DOUBLE', 'DELUXE', 'SUITE', 'FAMILY'];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(d: string) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function defaultDates() {
  const end   = new Date();
  const start = new Date(); start.setDate(start.getDate() - 30);
  return {
    start: start.toISOString().split('T')[0],
    end:   end.toISOString().split('T')[0],
  };
}

// ─── Dashboard page ───────────────────────────────────────────────────────────
function DashboardPage({ hotels }: { hotels: Hotel[] }) {
  const [bookings,     setBookings]     = useState<BookingRow[]>([]);
  const [report,       setReport]       = useState<ReportData>({ totalRevenue: 0, bookingCount: 0, avgRevenue: 0 });
  const [prevReport,   setPrevReport]   = useState<ReportData>({ totalRevenue: 0, bookingCount: 0, avgRevenue: 0 });
  const [loading,      setLoading]      = useState(true);
  const [dateRange,    setDateRange]    = useState(defaultDates());
  const [pendingRange, setPendingRange] = useState(defaultDates());

  const fetchData = useCallback(async (range: { start: string; end: string }) => {
    if (hotels.length === 0) { setLoading(false); return; }
    setLoading(true);

    // Previous period (same duration, immediately before)
    const durationMs = new Date(range.end).getTime() - new Date(range.start).getTime();
    const prevEnd   = new Date(new Date(range.start).getTime() - 86400000).toISOString().split('T')[0];
    const prevStart = new Date(new Date(range.start).getTime() - durationMs - 86400000).toISOString().split('T')[0];

    try {
      const [bookingResults, reportResults, prevResults] = await Promise.all([
        Promise.all(hotels.map((h) =>
          api.get(`/admin/hotels/${h.id}/bookings`).then((r) => r.data?.data ?? []).catch(() => [])
        )),
        Promise.all(hotels.map((h) =>
          getHotelReports(h.id, range.start, range.end).then((r) => r.data?.data ?? null).catch(() => null)
        )),
        Promise.all(hotels.map((h) =>
          getHotelReports(h.id, prevStart, prevEnd).then((r) => r.data?.data ?? null).catch(() => null)
        )),
      ]);

      setBookings((bookingResults.flat() as BookingRow[]));

      // Aggregate reports
      const agg = (results: (ReportData | null)[]) =>
        results.reduce<ReportData>((acc, r) => r ? {
          totalRevenue:  acc.totalRevenue  + (r.totalRevenue  ?? 0),
          bookingCount:  acc.bookingCount  + (r.bookingCount  ?? 0),
          avgRevenue:    0,
        } : acc, { totalRevenue: 0, bookingCount: 0, avgRevenue: 0 });

      const cur  = agg(reportResults);
      const prev = agg(prevResults);
      cur.avgRevenue  = cur.bookingCount  > 0 ? cur.totalRevenue  / cur.bookingCount  : 0;
      prev.avgRevenue = prev.bookingCount > 0 ? prev.totalRevenue / prev.bookingCount : 0;

      setReport(cur);
      setPrevReport(prev);
    } finally { setLoading(false); }
  }, [hotels]);

  useEffect(() => { fetchData(dateRange); }, [fetchData]); // eslint-disable-line react-hooks/exhaustive-deps

  function trend(cur: number, prev: number) {
    if (prev === 0) return null;
    const pct = ((cur - prev) / prev) * 100;
    const up = pct >= 0;
    return (
      <span className={`flex items-center gap-0.5 text-xs font-semibold ${up ? 'text-green-600' : 'text-red-500'}`}>
        {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
        {Math.abs(pct).toFixed(1)}%
      </span>
    );
  }

  const STAT_CARDS = [
    {
      label: 'Total Bookings',
      value: report.bookingCount,
      display: String(report.bookingCount),
      icon: <Users size={18} className="text-[#ff385c]" />,
      prev: prevReport.bookingCount,
    },
    {
      label: 'Total Revenue',
      value: report.totalRevenue,
      display: `₹${report.totalRevenue.toLocaleString('en-IN')}`,
      icon: <IndianRupee size={18} className="text-[#ff385c]" />,
      prev: prevReport.totalRevenue,
    },
    {
      label: 'Avg / Booking',
      value: report.avgRevenue,
      display: `₹${report.avgRevenue.toFixed(0)}`,
      icon: <BarChart size={18} className="text-[#ff385c]" />,
      prev: prevReport.avgRevenue,
    },
  ];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1c1c] mb-1">Dashboard</h1>
          <p className="text-gray-500 text-sm">Revenue and booking analytics across all your hotels.</p>
        </div>
        {/* Date range picker */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2 bg-white text-sm">
            <CalendarDays size={14} className="text-gray-400" />
            <input type="date" value={pendingRange.start} max={pendingRange.end}
              onChange={(e) => setPendingRange((p) => ({ ...p, start: e.target.value }))}
              className="outline-none text-gray-700 text-xs w-28" />
            <span className="text-gray-300">→</span>
            <input type="date" value={pendingRange.end} min={pendingRange.start}
              onChange={(e) => setPendingRange((p) => ({ ...p, end: e.target.value }))}
              className="outline-none text-gray-700 text-xs w-28" />
          </div>
          <button
            onClick={() => { setDateRange(pendingRange); fetchData(pendingRange); }}
            className="px-4 py-2 bg-[#ff385c] text-white rounded-xl text-xs font-semibold hover:bg-[#e21e4a] transition-colors">
            Apply
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#ff385c] border-t-transparent" />
        </div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {STAT_CARDS.map(({ label, display, icon, value, prev }) => (
              <div key={label} className="bg-white border border-gray-100 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 bg-[#ffe4e8] rounded-xl flex items-center justify-center">
                    {icon}
                  </div>
                  {trend(value, prev)}
                </div>
                <p className="text-2xl font-bold text-[#1a1c1c] mb-0.5">{display}</p>
                <p className="text-xs text-gray-400">{label}</p>
              </div>
            ))}
          </div>

          {/* Recent bookings */}
          <h2 className="text-sm font-bold text-[#ff385c] uppercase tracking-wider mb-4">Recent Bookings</h2>
          <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
            {bookings.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-sm">No bookings yet</div>
            ) : (
              <div className="overflow-auto max-h-80">
                <table className="w-full text-sm min-w-[640px]">
                  <thead className="sticky top-0 bg-white border-b border-gray-100">
                    <tr>
                      {['Hotel', 'Guest', 'Room', 'Dates', 'Amount', 'Status'].map((h) => (
                        <th key={h} className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {bookings.slice(0, 30).map((b) => (
                      <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3 font-medium text-gray-800 text-xs">{b.hotel?.name ?? '–'}</td>
                        <td className="px-5 py-3 text-gray-600 text-xs">{b.user?.name ?? '–'}</td>
                        <td className="px-5 py-3 text-gray-500 text-xs">{b.room?.type ?? '–'}</td>
                        <td className="px-5 py-3 text-gray-500 text-xs whitespace-nowrap">
                          {fmt(b.checkInDate)} → {fmt(b.checkOutDate)}
                        </td>
                        <td className="px-5 py-3 font-semibold text-[#1a1c1c] text-xs">₹{b.amount?.toFixed(0)}</td>
                        <td className="px-5 py-3">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            b.bookingStatus === 'CONFIRMED' ? 'bg-green-100 text-green-700'
                            : b.bookingStatus === 'CANCELLED' ? 'bg-gray-100 text-gray-500'
                            : 'bg-amber-100 text-amber-700'
                          }`}>
                            {b.bookingStatus === 'CONFIRMED' ? 'Confirmed'
                              : b.bookingStatus === 'CANCELLED' ? 'Cancelled' : 'Pending'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// Inline icon (avoids import)
function BarChart({ size, className }: { size: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" /><line x1="2" y1="20" x2="22" y2="20" />
    </svg>
  );
}

// ─── Hotel Form (shared by Add + Edit) ───────────────────────────────────────
interface HotelFormProps {
  initial?: Hotel | null;
  onSuccess: () => void;
  onCancel?: () => void;
}

function HotelForm({ initial, onSuccess, onCancel }: HotelFormProps) {
  const isEdit = !!initial;
  const [name,      setName]      = useState(initial?.name                          ?? '');
  const [city,      setCity]      = useState(initial?.city                          ?? '');
  const [address,   setAddress]   = useState(initial?.contactInfo?.address          ?? '');
  const [phone,     setPhone]     = useState(initial?.contactInfo?.phoneNumber       ?? '');
  const [email,     setEmail]     = useState(initial?.contactInfo?.email            ?? '');
  const [location,  setLocation]  = useState(initial?.contactInfo?.location         ?? '');
  const [amenities, setAmenities] = useState<string[]>(initial?.amenities ?? []);
  const [active,    setActive]    = useState(initial?.active    ?? false);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [success,   setSuccess]   = useState('');

  const toggleAmenity = (a: string) =>
    setAmenities((prev) => prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(''); setSuccess('');
    const payload = {
      name, city, amenities, active,
      contactInfo: { address, phoneNumber: phone, email, location: location || null },
    };
    try {
      if (isEdit && initial) {
        await updateHotel(initial.id, payload);
        setSuccess('Hotel updated!');
      } else {
        await createHotel(payload);
        setSuccess('Hotel created!');
        setName(''); setCity(''); setAddress(''); setPhone('');
        setEmail(''); setLocation(''); setAmenities([]); setActive(false);
      }
      setTimeout(onSuccess, 800);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message ?? `Failed to ${isEdit ? 'update' : 'create'} hotel`);
    } finally { setLoading(false); }
  };

  const inp = 'w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#ff385c] transition-colors bg-white';

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold text-[#1a1c1c]">{isEdit ? 'Edit Hotel' : 'Add Hotel'}</h1>
        {onCancel && (
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-700 transition-colors">
            <X size={20} />
          </button>
        )}
      </div>
      <p className="text-gray-500 text-sm mb-7">
        {isEdit ? 'Update the hotel details below.' : 'Fill in the details to list a new hotel.'}
      </p>

      {success && (
        <div className="flex items-center justify-between bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-4 text-sm">
          <span className="flex items-center gap-2"><CheckCircle size={14} />{success}</span>
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="max-w-xl space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Hotel Name *</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Grand Palace Hotel" required className={inp} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">City *</label>
            <input type="text" value={city} onChange={(e) => setCity(e.target.value)}
              placeholder="Mumbai" required className={inp} />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Address</label>
          <input type="text" value={address} onChange={(e) => setAddress(e.target.value)}
            placeholder="123 Marine Drive, Mumbai" className={inp} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Phone</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 43210" className={inp} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="hotel@example.com" className={inp} />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Location / Map Link</label>
          <input type="text" value={location} onChange={(e) => setLocation(e.target.value)}
            placeholder="https://maps.google.com/..." className={inp} />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-2">
            Amenities
            {amenities.length > 0 && (
              <span className="ml-2 text-[#ff385c] font-semibold">{amenities.length} selected</span>
            )}
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-4 border border-gray-200 rounded-xl bg-gray-50">
            {HOTEL_AMENITY_OPTIONS.map((a) => (
              <label key={a} className={`flex items-center gap-2.5 cursor-pointer px-3 py-2 rounded-lg transition-colors ${
                amenities.includes(a) ? 'bg-[#ffe4e8] border border-[#ff385c]/30' : 'hover:bg-white'
              }`}>
                <input type="checkbox" checked={amenities.includes(a)} onChange={() => toggleAmenity(a)}
                  className="w-4 h-4 rounded border-gray-300 accent-[#ff385c]" />
                <span className={`text-sm font-medium ${amenities.includes(a) ? 'text-[#ff385c]' : 'text-gray-600'}`}>{a}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-[#1a1c1c]">Active</p>
            <p className="text-xs text-gray-400">Visible to guests when active</p>
          </div>
          <button type="button" onClick={() => setActive((v) => !v)}
            className={`transition-colors ${active ? 'text-[#ff385c]' : 'text-gray-300'}`}>
            {active ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
          </button>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={loading}
            className="px-8 py-2.5 bg-[#ff385c] text-white rounded-xl font-semibold text-sm hover:bg-[#e21e4a] disabled:opacity-50 transition-colors">
            {loading ? (isEdit ? 'Saving…' : 'Creating…') : (isEdit ? 'Save Changes' : 'Create Hotel')}
          </button>
          {onCancel && (
            <button type="button" onClick={onCancel}
              className="px-6 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50 transition-colors">
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

// ─── My Hotels page ───────────────────────────────────────────────────────────
function MyHotelsPage({
  hotels, onEdit, onRefresh,
}: { hotels: Hotel[]; onEdit: (h: Hotel) => void; onRefresh: () => void }) {
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState('');

  const handleToggle = async (h: Hotel) => {
    setTogglingId(h.id);
    try {
      await activateHotel(h.id);
      onRefresh();
    } catch { setError('Toggle failed'); }
    finally { setTogglingId(null); }
  };

  const handleDelete = async (h: Hotel) => {
    if (!confirm(`Delete "${h.name}"? This cannot be undone.`)) return;
    setDeletingId(h.id);
    try {
      await deleteHotel(h.id);
      onRefresh();
    } catch { setError('Delete failed'); }
    finally { setDeletingId(null); }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#1a1c1c] mb-1">My Hotels</h1>
      <p className="text-gray-500 text-sm mb-7">Manage your hotel listings — activate, edit, or remove.</p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm flex justify-between">
          {error}
          <button onClick={() => setError('')}><X size={14} /></button>
        </div>
      )}

      {hotels.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Building2 size={48} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm">No hotels yet. Add your first hotel.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {hotels.map((h) => (
            <div key={h.id} className="bg-white border border-gray-100 rounded-2xl p-5 flex items-center gap-4">
              {/* Avatar */}
              <div className="w-11 h-11 rounded-xl bg-[#ffe4e8] flex items-center justify-center shrink-0">
                <Building2 size={20} className="text-[#ff385c]" />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-[#1a1c1c] text-sm">{h.name}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                    h.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {h.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  {h.city}{h.contactInfo?.address ? ` · ${h.contactInfo.address}` : ''}
                </p>
                {h.amenities && h.amenities.length > 0 && (
                  <div className="flex gap-1 flex-wrap mt-1.5">
                    {h.amenities.slice(0, 4).map((a) => (
                      <span key={a} className="text-[10px] bg-[#ffe4e8] text-[#ff385c] px-2 py-0.5 rounded-full font-medium">{a}</span>
                    ))}
                    {h.amenities.length > 4 && (
                      <span className="text-[10px] text-gray-400">+{h.amenities.length - 4} more</span>
                    )}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleToggle(h)}
                  disabled={togglingId === h.id}
                  title={h.active ? 'Deactivate' : 'Activate'}
                  className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${
                    h.active
                      ? 'text-green-500 hover:bg-green-50'
                      : 'text-gray-300 hover:bg-gray-100 hover:text-gray-500'
                  }`}>
                  {h.active ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                </button>
                <button
                  onClick={() => onEdit(h)}
                  className="p-2 rounded-lg text-gray-400 hover:text-[#ff385c] hover:bg-[#ffe4e8] transition-colors">
                  <Pencil size={15} />
                </button>
                <button
                  onClick={() => handleDelete(h)}
                  disabled={deletingId === h.id}
                  className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50">
                  {deletingId === h.id ? <span className="text-xs">…</span> : <Trash2 size={15} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Add Room page ────────────────────────────────────────────────────────────
function AddRoomPage({ hotels }: { hotels: Hotel[] }) {
  const [hotelId,   setHotelId]   = useState<number | ''>(hotels[0]?.id ?? '');
  const [roomType,  setRoomType]  = useState('');
  const [price,     setPrice]     = useState('');
  const [count,     setCount]     = useState('1');
  const [capacity,  setCapacity]  = useState('2');
  const [amenities, setAmenities] = useState<string[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [success,   setSuccess]   = useState('');
  const [error,     setError]     = useState('');

  const toggleAmenity = (a: string) =>
    setAmenities((prev) => prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hotelId) { setError('Select a hotel first'); return; }
    setLoading(true); setError(''); setSuccess('');
    try {
      await api.post(`/admin/hotels/${hotelId}/rooms`, {
        type: roomType, basePrice: Number(price), totalCount: Number(count),
        capacity: Number(capacity), amenities,
      });
      setSuccess('Room added successfully!');
      setRoomType(''); setPrice(''); setCount('1'); setCapacity('2'); setAmenities([]);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message ?? 'Failed to add room');
    } finally { setLoading(false); }
  };

  const inp = 'w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#ff385c] transition-colors bg-white';

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#1a1c1c] mb-1">Add Room</h1>
      <p className="text-gray-500 text-sm mb-7">Add room types with pricing and amenities to your hotel.</p>

      {success && (
        <div className="flex items-center justify-between bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-4 text-sm">
          <span className="flex items-center gap-2"><CheckCircle size={14} />{success}</span>
          <button onClick={() => setSuccess('')}><X size={14} /></button>
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="max-w-xl space-y-5">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Hotel *</label>
          <select value={hotelId} onChange={(e) => setHotelId(Number(e.target.value))} className={inp} required>
            <option value="">Select Hotel</option>
            {hotels.map((h) => <option key={h.id} value={h.id}>{h.name} — {h.city}</option>)}
          </select>
        </div>

        {/* Image upload slots (UI-only) */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-2">Images</label>
          <div className="flex gap-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i}
                className="w-20 h-20 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-[#ff385c] hover:bg-[#ffe4e8]/20 transition-colors">
                <Upload size={15} className="text-gray-400" />
                <span className="text-xs text-gray-400 mt-1">Upload</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Room Type *</label>
            <select value={roomType} onChange={(e) => setRoomType(e.target.value)} className={inp} required>
              <option value="">Select Type</option>
              {ROOM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Price /night *</label>
            <input type="number" min={1} value={price} onChange={(e) => setPrice(e.target.value)}
              placeholder="0" className={inp} required />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Number of Rooms *</label>
            <input type="number" min={1} value={count} onChange={(e) => setCount(e.target.value)}
              className={inp} required />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Capacity (guests)</label>
            <input type="number" min={1} max={20} value={capacity} onChange={(e) => setCapacity(e.target.value)}
              className={inp} />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-2">
            Room Amenities
            {amenities.length > 0 && (
              <span className="ml-2 text-[#ff385c] font-semibold">{amenities.length} selected</span>
            )}
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-4 border border-gray-200 rounded-xl bg-gray-50">
            {ROOM_AMENITY_OPTIONS.map((a) => (
              <label key={a} className={`flex items-center gap-2.5 cursor-pointer px-3 py-2 rounded-lg transition-colors ${
                amenities.includes(a) ? 'bg-[#ffe4e8] border border-[#ff385c]/30' : 'hover:bg-white'
              }`}>
                <input type="checkbox" checked={amenities.includes(a)} onChange={() => toggleAmenity(a)}
                  className="w-4 h-4 rounded border-gray-300 accent-[#ff385c]" />
                <span className={`text-sm font-medium ${amenities.includes(a) ? 'text-[#ff385c]' : 'text-gray-600'}`}>{a}</span>
              </label>
            ))}
          </div>
        </div>

        <button type="submit" disabled={loading}
          className="px-8 py-2.5 bg-[#ff385c] text-white rounded-xl font-semibold text-sm hover:bg-[#e21e4a] disabled:opacity-50 transition-colors">
          {loading ? 'Adding…' : 'Add Room'}
        </button>
      </form>
    </div>
  );
}

// ─── Edit Room Modal ──────────────────────────────────────────────────────────
function EditRoomModal({
  room, hotelId, onClose, onSaved,
}: { room: Room; hotelId: number; onClose: () => void; onSaved: (r: Room) => void }) {
  const [type,      setType]      = useState(room.type);
  const [price,     setPrice]     = useState(String(room.basePrice));
  const [count,     setCount]     = useState(String(room.totalCount));
  const [capacity,  setCapacity]  = useState(String(room.capacity ?? 2));
  const [amenities, setAmenities] = useState<string[]>(room.amenities ?? []);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');

  const toggleAmenity = (a: string) =>
    setAmenities((prev) => prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await api.put(`/admin/hotels/${hotelId}/rooms/${room.id}`, {
        type, basePrice: Number(price), totalCount: Number(count),
        capacity: Number(capacity), amenities,
      });
      onSaved(res.data?.data ?? res.data);
      onClose();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message ?? 'Failed to update room');
    } finally { setLoading(false); }
  };

  const inp = 'w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#ff385c] transition-colors bg-white';

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-[#1a1c1c] text-lg">Edit Room</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors p-1">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-xl text-sm">{error}</div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Room Type</label>
              <select value={type} onChange={(e) => setType(e.target.value)} className={inp} required>
                {ROOM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Price /night (₹)</label>
              <input type="number" min={1} value={price} onChange={(e) => setPrice(e.target.value)}
                className={inp} required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Number of Rooms</label>
              <input type="number" min={1} value={count} onChange={(e) => setCount(e.target.value)}
                className={inp} required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Capacity (guests)</label>
              <input type="number" min={1} max={20} value={capacity} onChange={(e) => setCapacity(e.target.value)}
                className={inp} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2">
              Room Amenities
              {amenities.length > 0 && (
                <span className="ml-2 text-[#ff385c] font-semibold">{amenities.length} selected</span>
              )}
            </label>
            <div className="grid grid-cols-2 gap-2 p-4 border border-gray-200 rounded-xl bg-gray-50">
              {ROOM_AMENITY_OPTIONS.map((a) => (
                <label key={a} className={`flex items-center gap-2.5 cursor-pointer px-3 py-2 rounded-lg transition-colors ${
                  amenities.includes(a) ? 'bg-[#ffe4e8] border border-[#ff385c]/30' : 'hover:bg-white'
                }`}>
                  <input type="checkbox" checked={amenities.includes(a)} onChange={() => toggleAmenity(a)}
                    className="w-4 h-4 rounded border-gray-300 accent-[#ff385c]" />
                  <span className={`text-sm font-medium ${amenities.includes(a) ? 'text-[#ff385c]' : 'text-gray-600'}`}>{a}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={loading}
              className="flex-1 py-2.5 bg-[#ff385c] text-white rounded-xl font-semibold text-sm hover:bg-[#e21e4a] disabled:opacity-50 transition-colors">
              {loading ? 'Saving…' : 'Save Changes'}
            </button>
            <button type="button" onClick={onClose}
              className="px-5 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50 transition-colors">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── List Rooms page ──────────────────────────────────────────────────────────
function ListRoomPage({ hotels }: { hotels: Hotel[] }) {
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(hotels[0] ?? null);
  const [rooms,      setRooms]      = useState<Room[]>([]);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');
  const [editingRoom,setEditingRoom]= useState<Room | null>(null);

  useEffect(() => {
    if (!selectedHotel) return;
    setLoading(true); setError('');
    api.get(`/admin/hotels/${selectedHotel.id}/rooms`)
      .then((r) => setRooms(r.data?.data ?? r.data ?? []))
      .catch(() => setError('Failed to load rooms'))
      .finally(() => setLoading(false));
  }, [selectedHotel]);

  const handleDelete = async (roomId: number) => {
    if (!selectedHotel || !confirm('Delete this room? This cannot be undone.')) return;
    try {
      await api.delete(`/admin/hotels/${selectedHotel.id}/rooms/${roomId}`);
      setRooms((r) => r.filter((x) => x.id !== roomId));
    } catch { setError('Delete failed'); }
  };

  const handleRoomSaved = (updated: Room) => {
    setRooms((prev) => prev.map((r) => r.id === updated.id ? updated : r));
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#1a1c1c] mb-1">List Rooms</h1>
      <p className="text-gray-500 text-sm mb-6">View and manage rooms — edit amenities, pricing, and availability.</p>

      <div className="mb-6 max-w-xs">
        <select value={selectedHotel?.id ?? ''}
          onChange={(e) => setSelectedHotel(hotels.find((x) => x.id === Number(e.target.value)) ?? null)}
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#ff385c] bg-white">
          {hotels.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
        </select>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm flex justify-between">
          {error}
          <button onClick={() => setError('')}><X size={14} /></button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-[#ff385c] border-t-transparent" />
        </div>
      ) : rooms.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <BedDouble size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No rooms in this hotel yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rooms.map((r) => (
            <div key={r.id} className="bg-white border border-gray-100 rounded-2xl p-5 hover:border-gray-200 transition-colors">
              <div className="flex items-start justify-between gap-3">
                {/* Room info */}
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#ffe4e8] flex items-center justify-center shrink-0">
                    <BedDouble size={18} className="text-[#ff385c]" />
                  </div>
                  <div>
                    <p className="font-bold text-[#1a1c1c]">{r.type}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      ₹{r.basePrice?.toLocaleString()} / night · {r.totalCount} room{r.totalCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setEditingRoom(r)}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 hover:border-[#ff385c] hover:text-[#ff385c] hover:bg-[#ffe4e8]/20 transition-colors">
                    <Pencil size={12} /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(r.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold text-gray-400 hover:border-red-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                    <Trash2 size={12} /> Delete
                  </button>
                </div>
              </div>

              {/* Amenities */}
              {r.amenities && r.amenities.length > 0 ? (
                <div className="flex gap-1.5 flex-wrap mt-3">
                  {r.amenities.map((a) => (
                    <span key={a} className="text-xs bg-[#ffe4e8] text-[#ff385c] px-2.5 py-0.5 rounded-full font-medium">{a}</span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 mt-2 italic">No amenities set — click Edit to add.</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Edit Room Modal */}
      {editingRoom && selectedHotel && (
        <EditRoomModal
          room={editingRoom}
          hotelId={selectedHotel.id}
          onClose={() => setEditingRoom(null)}
          onSaved={handleRoomSaved}
        />
      )}
    </div>
  );
}

// ─── Main AdminPanel ──────────────────────────────────────────────────────────
export default function AdminPanel() {
  const { user, isManager, loading: authLoading, logout } = useAuth();
  const navigate = useNavigate();
  const [page,        setPage]        = useState<Page>('dashboard');
  const [hotels,      setHotels]      = useState<Hotel[]>([]);
  const [editingHotel,setEditingHotel]= useState<Hotel | null>(null);

  useEffect(() => {
    if (!authLoading && !isManager) navigate('/');
  }, [isManager, authLoading, navigate]);

  const fetchHotels = useCallback(() => {
    if (!isManager) return;
    api.get('/admin/hotels')
      .then((r) => setHotels(r.data?.data ?? r.data ?? []))
      .catch(() => {});
  }, [isManager]);

  useEffect(() => { fetchHotels(); }, [fetchHotels]);

  if (authLoading || !isManager) return null;

  const navPage = (p: Page) => { setPage(p); setEditingHotel(null); };

  const handleEditHotel = (h: Hotel) => { setEditingHotel(h); setPage('editHotel'); };

  return (
    <div className="flex h-screen bg-[#f9f9f9] overflow-hidden">
      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <aside className="w-56 bg-white border-r border-gray-100 flex flex-col shrink-0">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-gray-100">
          <div className="flex items-center gap-2 font-bold text-lg text-[#1a1c1c]">
            <div className="w-7 h-7 bg-[#ff385c] rounded-lg flex items-center justify-center">
              <BedDouble size={14} className="text-white" />
            </div>
            QuickStay
          </div>
          <p className="text-[10px] text-gray-400 mt-0.5 font-medium uppercase tracking-widest pl-9">Admin</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <div key={item.id}>
              {item.divider && <div className="mx-5 my-2 border-t border-gray-100" />}
              <button
                onClick={() => navPage(item.id)}
                className={`w-full flex items-center gap-3 px-5 py-2.5 text-sm font-medium text-left transition-colors border-l-2 ${
                  page === item.id || (page === 'editHotel' && item.id === 'myHotels')
                    ? 'text-[#ff385c] bg-[#ffe4e8]/30 border-[#ff385c]'
                    : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50 border-transparent'
                }`}>
                {item.icon} {item.label}
              </button>
            </div>
          ))}
        </nav>

        {/* Sign out */}
        <div className="px-5 py-4 border-t border-gray-100">
          <button onClick={() => { logout(); navigate('/'); }}
            className="text-xs text-gray-400 hover:text-gray-700 transition-colors">
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main area ────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between shrink-0">
          <p className="text-sm text-gray-400 font-medium">
            {page === 'dashboard' ? 'Overview'
              : page === 'myHotels'  ? 'My Hotels'
              : page === 'addHotel'  ? 'Add Hotel'
              : page === 'editHotel' ? 'Edit Hotel'
              : page === 'addRoom'   ? 'Add Room'
              : 'List Rooms'}
          </p>
          <button onClick={() => navigate('/profile')}
            className="w-9 h-9 bg-[#ff385c] rounded-full flex items-center justify-center text-white font-bold text-sm hover:bg-[#e21e4a] transition-colors">
            {user?.name?.[0]?.toUpperCase() ?? 'A'}
          </button>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-8">
          {page === 'dashboard' && <DashboardPage hotels={hotels} />}
          {page === 'myHotels'  && (
            <MyHotelsPage hotels={hotels} onEdit={handleEditHotel} onRefresh={fetchHotels} />
          )}
          {page === 'addHotel'  && (
            <HotelForm onSuccess={() => { fetchHotels(); navPage('myHotels'); }} />
          )}
          {page === 'editHotel' && (
            <HotelForm
              initial={editingHotel}
              onSuccess={() => { fetchHotels(); navPage('myHotels'); }}
              onCancel={() => navPage('myHotels')}
            />
          )}
          {page === 'addRoom'   && <AddRoomPage hotels={hotels} />}
          {page === 'listRoom'  && <ListRoomPage hotels={hotels} />}
        </main>
      </div>
    </div>
  );
}
