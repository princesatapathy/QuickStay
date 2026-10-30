import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Bed, Buildings, CalendarBlank, ChartBar, CurrencyInr, ListBullets, Pencil, Plus,
  SquaresFour, ToggleLeft, ToggleRight, Trash, TrendDown, TrendUp, Users,
} from '@phosphor-icons/react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import { activateHotel, createHotel, deleteHotel, getHotelReports, updateHotel } from '../api/hotels';
import { fmtDate, inr } from '../lib/dates';
import { Button } from '../components/ui/Button';
import { CheckboxGrid, Input, Select } from '../components/ui/Form';
import { Banner, Card, EmptyState, Logo, Skeleton, StatusPill } from '../components/ui/Display';
import { Dialog } from '../components/ui/Dialog';
import { CountUp } from '../components/motion/Motion';

// ─── Types ────────────────────────────────────────────────────────────────────
interface HotelContactInfo { address?: string; phoneNumber?: string; email?: string; location?: string }
interface Hotel {
  id: number; name: string; city: string; active: boolean;
  contactInfo?: HotelContactInfo;
  amenities?: string[];
}
interface Room { id: number; type: string; basePrice: number; totalCount: number; amenities: string[]; capacity?: number }
interface BookingRow {
  id: number; bookingStatus: string; amount: number;
  checkInDate: string; checkOutDate: string; roomsCount: number;
  user?: { name?: string }; room?: { type?: string }; hotel?: { name?: string };
}
interface ReportData { totalRevenue: number; bookingCount: number; avgRevenue: number }

type Page = 'dashboard' | 'myHotels' | 'addHotel' | 'editHotel' | 'addRoom' | 'listRoom';

const NAV_ITEMS: { id: Page; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: 'Dashboard',  icon: <SquaresFour size={18} /> },
  { id: 'myHotels',  label: 'My hotels',  icon: <Buildings size={18} /> },
  { id: 'addHotel',  label: 'Add hotel',  icon: <Plus size={18} /> },
  { id: 'addRoom',   label: 'Add room',   icon: <Plus size={18} /> },
  { id: 'listRoom',  label: 'Rooms',      icon: <ListBullets size={18} /> },
];
const PAGE_TITLE: Record<Page, string> = {
  dashboard: 'Dashboard', myHotels: 'My hotels', addHotel: 'Add hotel',
  editHotel: 'Edit hotel', addRoom: 'Add room', listRoom: 'Rooms',
};

const HOTEL_AMENITY_OPTIONS = [
  'WiFi', 'Pool', 'Gym', 'Parking', 'Breakfast', 'Spa', 'Restaurant',
  'Room Service', 'Bar', 'Conference Room', 'Laundry', 'Airport Shuttle',
];
const ROOM_AMENITY_OPTIONS = [
  'AC', 'TV', 'WiFi', 'Mini Bar', 'Bathtub', 'Balcony',
  'Sea View', 'City View', 'King Bed', 'Twin Beds', 'Safe', 'Kettle',
];
const ROOM_TYPES = ['SINGLE', 'DOUBLE', 'DELUXE', 'SUITE', 'FAMILY'];

function defaultDates() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);
  return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] };
}

const PageHead = ({ title, sub }: { title: string; sub: string }) => (
  <div className="mb-6">
    <h1 className="t-h2">{title}</h1>
    <p className="mt-1 text-sm text-ink-muted">{sub}</p>
  </div>
);

// ─── Dashboard ────────────────────────────────────────────────────────────────
function Trend({ cur, prev }: { cur: number; prev: number }) {
  if (prev === 0) return null;
  const pct = ((cur - prev) / prev) * 100;
  const up = pct >= 0;
  return (
    <span className={`flex items-center gap-1 text-xs font-bold ${up ? 'text-ok' : 'text-bad'}`}>
      {up ? <TrendUp size={14} /> : <TrendDown size={14} />} {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

function DashboardPage({ hotels }: { hotels: Hotel[] }) {
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [report, setReport] = useState<ReportData>({ totalRevenue: 0, bookingCount: 0, avgRevenue: 0 });
  const [prevReport, setPrevReport] = useState<ReportData>({ totalRevenue: 0, bookingCount: 0, avgRevenue: 0 });
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState(defaultDates());
  const [pendingRange, setPendingRange] = useState(defaultDates());

  const fetchData = useCallback(async (range: { start: string; end: string }) => {
    if (hotels.length === 0) { setLoading(false); return; }
    setLoading(true);

    // Previous period: same duration, immediately before.
    const durationMs = new Date(range.end).getTime() - new Date(range.start).getTime();
    const prevEnd = new Date(new Date(range.start).getTime() - 86400000).toISOString().split('T')[0];
    const prevStart = new Date(new Date(range.start).getTime() - durationMs - 86400000).toISOString().split('T')[0];

    try {
      const [bookingResults, reportResults, prevResults] = await Promise.all([
        Promise.all(hotels.map((h) => api.get(`/admin/hotels/${h.id}/bookings`).then((r) => r.data?.data ?? []).catch(() => []))),
        Promise.all(hotels.map((h) => getHotelReports(h.id, range.start, range.end).then((r) => r.data?.data ?? null).catch(() => null))),
        Promise.all(hotels.map((h) => getHotelReports(h.id, prevStart, prevEnd).then((r) => r.data?.data ?? null).catch(() => null))),
      ]);

      setBookings(bookingResults.flat() as BookingRow[]);

      const agg = (results: (ReportData | null)[]) =>
        results.reduce<ReportData>((acc, r) => (r ? {
          totalRevenue: acc.totalRevenue + (r.totalRevenue ?? 0),
          bookingCount: acc.bookingCount + (r.bookingCount ?? 0),
          avgRevenue: 0,
        } : acc), { totalRevenue: 0, bookingCount: 0, avgRevenue: 0 });

      const cur = agg(reportResults);
      const prev = agg(prevResults);
      cur.avgRevenue = cur.bookingCount > 0 ? cur.totalRevenue / cur.bookingCount : 0;
      prev.avgRevenue = prev.bookingCount > 0 ? prev.totalRevenue / prev.bookingCount : 0;
      setReport(cur);
      setPrevReport(prev);
    } finally { setLoading(false); }
  }, [hotels]);

  useEffect(() => { fetchData(dateRange); }, [fetchData]); // eslint-disable-line react-hooks/exhaustive-deps

  const STATS = [
    { label: 'Bookings', icon: <Users size={18} />, value: report.bookingCount, prev: prevReport.bookingCount, format: (n: number) => String(Math.round(n)) },
    { label: 'Revenue', icon: <CurrencyInr size={18} />, value: report.totalRevenue, prev: prevReport.totalRevenue, format: (n: number) => inr(n) },
    { label: 'Average per booking', icon: <ChartBar size={18} />, value: report.avgRevenue, prev: prevReport.avgRevenue, format: (n: number) => inr(n) },
  ];

  return (
    <div>
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <PageHead title="Dashboard" sub="Revenue and bookings across all your hotels." />
        <div className="mb-6 flex flex-wrap items-end gap-2 sm:mb-6">
          <div className="flex items-end gap-2">
            <Input label="From" type="date" value={pendingRange.start} max={pendingRange.end} onChange={(e) => setPendingRange((p) => ({ ...p, start: e.target.value }))} />
            <Input label="To" type="date" value={pendingRange.end} min={pendingRange.start} onChange={(e) => setPendingRange((p) => ({ ...p, end: e.target.value }))} />
          </div>
          <Button onClick={() => { setDateRange(pendingRange); fetchData(pendingRange); }}>
            <CalendarBlank size={16} /> Apply
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-28" />)}</div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            {STATS.map((s) => (
              <Card key={s.label} className="p-5">
                <div className="flex items-center justify-between text-ink-muted">
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-surface-2 text-accent">{s.icon}</span>
                  <Trend cur={s.value} prev={s.prev} />
                </div>
                <p className="mt-4 text-2xl font-bold"><CountUp value={s.value} format={s.format} /></p>
                <p className="text-sm text-ink-muted">{s.label}</p>
              </Card>
            ))}
          </div>

          <h2 className="t-h3 mb-3 mt-10">Recent bookings</h2>
          <div className="overflow-hidden border border-line bg-surface">
            {bookings.length === 0 ? (
              <EmptyState icon={<ListBullets size={24} />} title="No bookings yet" body="They will appear here as guests book your rooms." />
            ) : (
              <div className="max-h-96 overflow-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead className="sticky top-0 bg-surface-2 text-left text-xs text-ink-muted">
                    <tr>{['Hotel', 'Guest', 'Room', 'Dates', 'Amount', 'Status'].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {bookings.slice(0, 30).map((b) => (
                      <tr key={b.id} className="transition-colors hover:bg-surface-2/60">
                        <td className="px-4 py-3 font-medium">{b.hotel?.name ?? '-'}</td>
                        <td className="px-4 py-3 text-ink-muted">{b.user?.name ?? '-'}</td>
                        <td className="px-4 py-3 text-ink-muted">{b.room?.type ?? '-'}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-ink-muted">{fmtDate(b.checkInDate, false)} to {fmtDate(b.checkOutDate, false)}</td>
                        <td className="px-4 py-3 font-bold tabular-nums">{inr(b.amount ?? 0)}</td>
                        <td className="px-4 py-3"><StatusPill status={b.bookingStatus} /></td>
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

// ─── Hotel form (add + edit) ──────────────────────────────────────────────────
function HotelForm({ initial, onSuccess, onCancel }: { initial?: Hotel | null; onSuccess: () => void; onCancel?: () => void }) {
  const isEdit = !!initial;
  const [name, setName] = useState(initial?.name ?? '');
  const [city, setCity] = useState(initial?.city ?? '');
  const [address, setAddress] = useState(initial?.contactInfo?.address ?? '');
  const [phone, setPhone] = useState(initial?.contactInfo?.phoneNumber ?? '');
  const [email, setEmail] = useState(initial?.contactInfo?.email ?? '');
  const [location, setLocation] = useState(initial?.contactInfo?.location ?? '');
  const [amenities, setAmenities] = useState<string[]>(initial?.amenities ?? []);
  const [active, setActive] = useState(initial?.active ?? false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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
        setSuccess('Hotel updated.');
      } else {
        await createHotel(payload);
        setSuccess('Hotel created.');
        setName(''); setCity(''); setAddress(''); setPhone('');
        setEmail(''); setLocation(''); setAmenities([]); setActive(false);
      }
      setTimeout(onSuccess, 800);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message ?? `Failed to ${isEdit ? 'update' : 'create'} hotel`);
    } finally { setLoading(false); }
  };

  return (
    <div>
      <PageHead title={isEdit ? 'Edit hotel' : 'Add hotel'} sub={isEdit ? 'Update the hotel details.' : 'Fill in the details to list a new hotel.'} />
      <form onSubmit={handleSubmit} className="max-w-2xl space-y-4">
        {success && <Banner tone="success">{success}</Banner>}
        {error && <Banner tone="error">{error}</Banner>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Hotel name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Grand Palace Hotel" />
          <Input label="City" required value={city} onChange={(e) => setCity(e.target.value)} placeholder="Mumbai" />
        </div>
        <Input label="Address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Marine Drive" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" />
          <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="hotel@example.com" />
        </div>
        <Input label="Map link" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="https://maps.google.com/..." />

        <div>
          <p className="mb-2 text-sm font-medium text-ink-muted">Amenities{amenities.length > 0 && <span className="ml-2 text-accent">{amenities.length} selected</span>}</p>
          <CheckboxGrid options={HOTEL_AMENITY_OPTIONS} value={amenities} onChange={setAmenities} />
        </div>

        <div className="flex items-center justify-between rounded-lg border border-line bg-surface px-4 py-3">
          <div>
            <p className="font-medium">Active</p>
            <p className="text-sm text-ink-muted">Guests can see and book this hotel when active.</p>
          </div>
          <button type="button" role="switch" aria-checked={active} aria-label="Active" onClick={() => setActive((v) => !v)} className={active ? 'text-accent' : 'text-ink-faint'}>
            {active ? <ToggleRight size={36} weight="fill" /> : <ToggleLeft size={36} />}
          </button>
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" loading={loading}>{loading ? (isEdit ? 'Saving' : 'Creating') : isEdit ? 'Save changes' : 'Create hotel'}</Button>
          {onCancel && <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>}
        </div>
      </form>
    </div>
  );
}

// ─── My hotels ────────────────────────────────────────────────────────────────
function MyHotelsPage({ hotels, onEdit, onRefresh }: { hotels: Hotel[]; onEdit: (h: Hotel) => void; onRefresh: () => void }) {
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState('');

  const handleToggle = async (h: Hotel) => {
    setTogglingId(h.id);
    try { await activateHotel(h.id); onRefresh(); }
    catch { setError('Toggle failed'); }
    finally { setTogglingId(null); }
  };

  const handleDelete = async (h: Hotel) => {
    if (!confirm(`Delete "${h.name}"? This cannot be undone.`)) return;
    setDeletingId(h.id);
    try { await deleteHotel(h.id); onRefresh(); }
    catch { setError('Delete failed'); }
    finally { setDeletingId(null); }
  };

  return (
    <div>
      <PageHead title="My hotels" sub="Activate, edit or remove your listings." />
      {error && <div className="mb-4"><Banner tone="error">{error}</Banner></div>}

      {hotels.length === 0 ? (
        <Card><EmptyState icon={<Buildings size={26} />} title="No hotels yet" body="Add your first hotel to start taking bookings." /></Card>
      ) : (
        <ul className="space-y-3">
          {hotels.map((h) => (
            <li key={h.id}>
              <Card className="flex flex-wrap items-center gap-4 p-4 sm:p-5">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-surface-2 text-accent"><Buildings size={22} /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold">{h.name}</h3>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${h.active ? 'bg-ok/15 text-ok' : 'bg-ink-faint/20 text-ink-muted'}`}>{h.active ? 'Active' : 'Inactive'}</span>
                  </div>
                  <p className="text-sm text-ink-muted">{h.city}{h.contactInfo?.address ? ` · ${h.contactInfo.address}` : ''}</p>
                  {h.amenities && h.amenities.length > 0 && (
                    <p className="mt-1 text-xs text-ink-faint">{h.amenities.slice(0, 4).join(', ')}{h.amenities.length > 4 ? ` +${h.amenities.length - 4} more` : ''}</p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => handleToggle(h)} disabled={togglingId === h.id} aria-label={h.active ? 'Deactivate' : 'Activate'} title={h.active ? 'Deactivate' : 'Activate'}
                    className={`rounded-full p-2 transition-colors hover:bg-surface-2 disabled:opacity-50 ${h.active ? 'text-ok' : 'text-ink-faint'}`}>
                    {h.active ? <ToggleRight size={24} weight="fill" /> : <ToggleLeft size={24} />}
                  </button>
                  <button onClick={() => onEdit(h)} aria-label={`Edit ${h.name}`} className="rounded-full p-2 text-ink-muted transition-colors hover:bg-surface-2 hover:text-accent"><Pencil size={18} /></button>
                  <button onClick={() => handleDelete(h)} disabled={deletingId === h.id} aria-label={`Delete ${h.name}`} className="rounded-full p-2 text-ink-muted transition-colors hover:bg-bad/10 hover:text-bad disabled:opacity-50"><Trash size={18} /></button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Room fields shared by Add and Edit ───────────────────────────────────────
interface RoomFields { type: string; price: string; count: string; capacity: string; amenities: string[] }
function RoomFieldset({ v, set, withPlaceholder }: { v: RoomFields; set: (p: Partial<RoomFields>) => void; withPlaceholder?: boolean }) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Select label="Room type" required value={v.type} onChange={(e) => set({ type: e.target.value })}>
          {withPlaceholder && <option value="">Select type</option>}
          {ROOM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </Select>
        <Input label="Price per night (₹)" type="number" min={1} required value={v.price} onChange={(e) => set({ price: e.target.value })} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Number of rooms" type="number" min={1} required value={v.count} onChange={(e) => set({ count: e.target.value })} />
        <Input label="Capacity (guests)" type="number" min={1} max={20} value={v.capacity} onChange={(e) => set({ capacity: e.target.value })} />
      </div>
      <div>
        <p className="mb-2 text-sm font-medium text-ink-muted">Room amenities{v.amenities.length > 0 && <span className="ml-2 text-accent">{v.amenities.length} selected</span>}</p>
        <CheckboxGrid options={ROOM_AMENITY_OPTIONS} value={v.amenities} onChange={(amenities) => set({ amenities })} />
      </div>
    </>
  );
}

// ─── Add room ─────────────────────────────────────────────────────────────────
function AddRoomPage({ hotels }: { hotels: Hotel[] }) {
  const [hotelId, setHotelId] = useState<number | ''>(hotels[0]?.id ?? '');
  const [f, setF] = useState<RoomFields>({ type: '', price: '', count: '1', capacity: '2', amenities: [] });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hotelId) { setError('Select a hotel first'); return; }
    setLoading(true); setError(''); setSuccess('');
    try {
      await api.post(`/admin/hotels/${hotelId}/rooms`, {
        type: f.type, basePrice: Number(f.price), totalCount: Number(f.count),
        capacity: Number(f.capacity), amenities: f.amenities,
      });
      setSuccess('Room added.');
      setF({ type: '', price: '', count: '1', capacity: '2', amenities: [] });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message ?? 'Failed to add room');
    } finally { setLoading(false); }
  };

  return (
    <div>
      <PageHead title="Add room" sub="Add a room type with pricing and amenities." />
      <form onSubmit={handleSubmit} className="max-w-2xl space-y-4">
        {success && <Banner tone="success">{success}</Banner>}
        {error && <Banner tone="error">{error}</Banner>}
        <Select label="Hotel" required value={hotelId} onChange={(e) => setHotelId(Number(e.target.value))}>
          <option value="">Select hotel</option>
          {hotels.map((h) => <option key={h.id} value={h.id}>{h.name}, {h.city}</option>)}
        </Select>
        <RoomFieldset v={f} set={(p) => setF((prev) => ({ ...prev, ...p }))} withPlaceholder />
        <Button type="submit" loading={loading}>{loading ? 'Adding' : 'Add room'}</Button>
      </form>
    </div>
  );
}

// ─── Edit room dialog ─────────────────────────────────────────────────────────
function EditRoomDialog({ room, hotelId, onClose, onSaved }: { room: Room; hotelId: number; onClose: () => void; onSaved: (r: Room) => void }) {
  const [f, setF] = useState<RoomFields>({
    type: room.type, price: String(room.basePrice), count: String(room.totalCount),
    capacity: String(room.capacity ?? 2), amenities: room.amenities ?? [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await api.put(`/admin/hotels/${hotelId}/rooms/${room.id}`, {
        type: f.type, basePrice: Number(f.price), totalCount: Number(f.count),
        capacity: Number(f.capacity), amenities: f.amenities,
      });
      onSaved(res.data?.data ?? res.data);
      onClose();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message ?? 'Failed to update room');
    } finally { setLoading(false); }
  };

  return (
    <Dialog open onClose={onClose} title="Edit room">
      <form onSubmit={handleSave} className="space-y-4">
        {error && <Banner tone="error">{error}</Banner>}
        <RoomFieldset v={f} set={(p) => setF((prev) => ({ ...prev, ...p }))} />
        <div className="flex gap-3 pt-1">
          <Button type="submit" loading={loading} className="flex-1">{loading ? 'Saving' : 'Save changes'}</Button>
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
        </div>
      </form>
    </Dialog>
  );
}

// ─── Rooms list ───────────────────────────────────────────────────────────────
function ListRoomPage({ hotels }: { hotels: Hotel[] }) {
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(hotels[0] ?? null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);

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

  return (
    <div>
      <PageHead title="Rooms" sub="Edit pricing, availability and amenities." />
      <div className="mb-6 max-w-xs">
        <Select label="Hotel" value={selectedHotel?.id ?? ''} onChange={(e) => setSelectedHotel(hotels.find((x) => x.id === Number(e.target.value)) ?? null)}>
          {hotels.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
        </Select>
      </div>

      {error && <div className="mb-4"><Banner tone="error">{error}</Banner></div>}

      {loading ? (
        <div className="space-y-3">{[0, 1].map((i) => <Skeleton key={i} className="h-24" />)}</div>
      ) : rooms.length === 0 ? (
        <Card><EmptyState icon={<Bed size={26} />} title="No rooms in this hotel yet" /></Card>
      ) : (
        <ul className="space-y-3">
          {rooms.map((r) => (
            <li key={r.id}>
              <Card className="p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-4">
                    <span className="grid h-10 w-10 place-items-center rounded-lg bg-surface-2 text-accent"><Bed size={20} /></span>
                    <div>
                      <p className="font-bold">{r.type}</p>
                      <p className="text-sm text-ink-muted tabular-nums">{inr(r.basePrice ?? 0)} per night · {r.totalCount} room{r.totalCount !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setEditingRoom(r)}><Pencil size={14} /> Edit</Button>
                    <Button size="sm" variant="danger" onClick={() => handleDelete(r.id)}><Trash size={14} /> Delete</Button>
                  </div>
                </div>
                <p className="mt-3 text-xs text-ink-faint">{r.amenities?.length ? r.amenities.join(', ') : 'No amenities set. Use Edit to add some.'}</p>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {editingRoom && selectedHotel && (
        <EditRoomDialog room={editingRoom} hotelId={selectedHotel.id} onClose={() => setEditingRoom(null)} onSaved={(u) => setRooms((prev) => prev.map((r) => (r.id === u.id ? u : r)))} />
      )}
    </div>
  );
}

// ─── Shell ────────────────────────────────────────────────────────────────────
export default function AdminPanel() {
  const { user, isManager, loading: authLoading, logout } = useAuth();
  const navigate = useNavigate();
  const [page, setPage] = useState<Page>('dashboard');
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [editingHotel, setEditingHotel] = useState<Hotel | null>(null);

  useEffect(() => {
    if (!authLoading && !isManager) navigate('/');
  }, [isManager, authLoading, navigate]);

  const fetchHotels = useCallback(() => {
    if (!isManager) return;
    api.get('/admin/hotels').then((r) => setHotels(r.data?.data ?? r.data ?? [])).catch(() => {});
  }, [isManager]);

  useEffect(() => { fetchHotels(); }, [fetchHotels]);

  if (authLoading || !isManager) return null;

  const navPage = (p: Page) => { setPage(p); setEditingHotel(null); };
  const handleEditHotel = (h: Hotel) => { setEditingHotel(h); setPage('editHotel'); };
  const isActive = (id: Page) => page === id || (page === 'editHotel' && id === 'myHotels');

  const NavButton = ({ item, layoutId, className }: { item: (typeof NAV_ITEMS)[number]; layoutId: string; className: string }) => (
    <button onClick={() => navPage(item.id)} aria-current={isActive(item.id) ? 'page' : undefined} className={`relative ${className}`}>
      {isActive(item.id) && <motion.span layoutId={layoutId} className="absolute inset-0 rounded-lg bg-accent/12" transition={{ type: 'spring', stiffness: 400, damping: 34 }} />}
      <span className={`relative flex items-center gap-3 ${isActive(item.id) ? 'text-accent' : 'text-ink-muted hover:text-ink'}`}>{item.icon} {item.label}</span>
    </button>
  );

  return (
    <div className="flex h-dvh overflow-hidden bg-night">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-night-2 md:flex">
        <div className="border-b border-line px-5 py-5"><Logo /><p className="mt-1 pl-10 text-xs text-ink-faint">Admin</p></div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {NAV_ITEMS.map((item) => <NavButton key={item.id} item={item} layoutId="nav-desktop" className="w-full rounded-lg px-4 py-2.5 text-left text-sm font-medium" />)}
        </nav>
        <div className="border-t border-line p-4">
          <Button variant="quiet" size="sm" onClick={() => { logout(); navigate('/'); }}>Sign out</Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center justify-between border-b border-line bg-night-2 px-4 py-3 sm:px-8">
          <div className="flex items-center gap-3"><span className="md:hidden"><Logo /></span><p className="hidden text-sm text-ink-muted md:block">{PAGE_TITLE[page]}</p></div>
          <button onClick={() => navigate('/profile')} aria-label="Your profile" className="grid h-9 w-9 place-items-center rounded-full bg-accent text-sm font-bold text-on-accent hover:bg-accent-hover">
            {user?.name?.[0]?.toUpperCase() ?? 'A'}
          </button>
        </header>

        <nav className="no-scrollbar flex shrink-0 gap-1 overflow-x-auto border-b border-line bg-night-2 px-3 py-2 md:hidden">
          {NAV_ITEMS.map((item) => <NavButton key={item.id} item={item} layoutId="nav-mobile" className="shrink-0 rounded-lg px-4 py-2 text-sm font-medium" />)}
        </nav>

        <main className="flex-1 overflow-y-auto p-4 sm:p-8">
          {page === 'dashboard' && <DashboardPage hotels={hotels} />}
          {page === 'myHotels' && <MyHotelsPage hotels={hotels} onEdit={handleEditHotel} onRefresh={fetchHotels} />}
          {page === 'addHotel' && <HotelForm onSuccess={() => { fetchHotels(); navPage('myHotels'); }} />}
          {page === 'editHotel' && <HotelForm initial={editingHotel} onSuccess={() => { fetchHotels(); navPage('myHotels'); }} onCancel={() => navPage('myHotels')} />}
          {page === 'addRoom' && <AddRoomPage hotels={hotels} />}
          {page === 'listRoom' && <ListRoomPage hotels={hotels} />}
        </main>
      </div>
    </div>
  );
}
