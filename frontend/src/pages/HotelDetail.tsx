import { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { getHotelInfo } from '../api/hotels';
import { initBooking } from '../api/bookings';
import { useAuth } from '../context/AuthContext';
import {
  MapPin, Phone, Mail, Wifi, Car, Coffee, Dumbbell,
  BedDouble, ArrowLeft, Shield, Star, Home, CheckCircle,
  BellRing, Mountain, Waves,
} from 'lucide-react';
import { format, addDays } from 'date-fns';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Room {
  id: number;
  type: string;
  basePrice: number;
  capacity: number;
  totalCount: number;
  amenities: string[];
  photos: string[];
}
interface Hotel {
  id: number;
  name: string;
  city: string;
  photos: string[];
  amenities: string[];
  starRating: number;
  contactInfo: { address?: string; phoneNumber?: string; email?: string };
}

// ─── Amenity icon map ─────────────────────────────────────────────────────────
const AMENITY_ICONS: Record<string, React.ReactNode> = {
  WiFi:          <Wifi      size={15} />,
  Parking:       <Car       size={15} />,
  Breakfast:     <Coffee    size={15} />,
  Gym:           <Dumbbell  size={15} />,
  'Room Service': <BellRing  size={15} />,
  'Mountain View': <Mountain  size={15} />,
  Pool:          <Waves     size={15} />,
};

// ─── Static hotel gallery images (Unsplash luxury rooms) ─────────────────────
const GALLERY_IMGS = [
  'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&q=80',
  'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=600&q=80',
  'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=600&q=80',
];

// ─── Feature highlights (static) ─────────────────────────────────────────────
const FEATURES = [
  { icon: <Home      size={18} />, title: 'Clean & Safe Stay',        desc: 'A well-maintained and hygienic space just for you.' },
  { icon: <Shield    size={18} />, title: 'Enhanced Standards',        desc: "This hotel meets QuickStay's enhanced cleanliness standards." },
  { icon: <MapPin    size={18} />, title: 'Excellent Location',        desc: '90% of guests rated the location 5 stars.' },
  { icon: <CheckCircle size={18} />, title: 'Smooth Check-In',         desc: '100% of guests gave check-in a 5-star rating.' },
];

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function HotelDetail() {
  const { hotelId } = useParams<{ hotelId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const roomsRef = useRef<HTMLDivElement>(null);

  const today = new Date();
  const [checkIn,  setCheckIn]  = useState(searchParams.get('checkIn')  || format(addDays(today, 1), 'yyyy-MM-dd'));
  const [checkOut, setCheckOut] = useState(searchParams.get('checkOut') || format(addDays(today, 3), 'yyyy-MM-dd'));
  const [guests,   setGuests]   = useState(Number(searchParams.get('rooms') || 1));

  const [hotel,       setHotel]       = useState<Hotel | null>(null);
  const [roomList,    setRoomList]    = useState<Room[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [bookingLoad, setBookingLoad] = useState(false);
  const [error,       setError]       = useState('');

  const nights = Math.max(1,
    Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000),
  );

  useEffect(() => {
    if (!hotelId) return;
    getHotelInfo(Number(hotelId))
      .then((res) => {
        const d = res.data?.data;
        setHotel(d?.hotel);
        setRoomList(d?.rooms ?? []);
      })
      .catch(() => setError('Failed to load hotel'))
      .finally(() => setLoading(false));
  }, [hotelId]);

  const handleCheckAvailability = (e: React.FormEvent) => {
    e.preventDefault();
    // Scroll to rooms section
    roomsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleBook = async (roomId: number) => {
    if (!user) {
      navigate(`/login?redirect=/hotels/${hotelId}?checkIn=${checkIn}&checkOut=${checkOut}&rooms=${guests}`);
      return;
    }
    setBookingLoad(true); setError('');
    try {
      const res = await initBooking({
        hotelId: Number(hotelId), roomId, checkInDate: checkIn, checkOutDate: checkOut, roomsCount: guests,
      });
      navigate(`/booking/${res.data?.data?.id}`);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || 'Booking failed. Try again.');
    } finally {
      setBookingLoad(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-900 border-t-transparent" />
      </div>
    );
  }

  if (!hotel) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-gray-500">Hotel not found</p>
        <button onClick={() => navigate(-1)} className="text-gray-600 underline text-sm">← Go back</button>
      </div>
    );
  }

  const minPrice = roomList.length > 0 ? Math.min(...roomList.map((r) => r.basePrice)) : 0;
  const allAmenities = [...new Set(roomList.flatMap((r) => r.amenities ?? []))].slice(0, 5);

  return (
    <div className="min-h-screen bg-white">
      {/* Back */}
      <div className="border-b border-gray-100 py-3 px-6 sm:px-12">
        <div className="max-w-7xl mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-800 text-sm transition-colors"
          >
            <ArrowLeft size={16} /> Back to results
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 sm:px-12 py-8">
        {/* ── Image gallery ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-3 mb-8 h-56 sm:h-72 rounded-2xl overflow-hidden">
          {(hotel.photos?.length >= 3 ? hotel.photos : GALLERY_IMGS).slice(0, 3).map((src, i) => (
            <div key={i} className={`overflow-hidden bg-gray-100 ${i === 0 ? 'col-span-1 row-span-1' : ''}`}>
              <img
                src={src}
                alt={`${hotel.name} ${i + 1}`}
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                onError={(e) => { (e.target as HTMLImageElement).src = GALLERY_IMGS[i % 3]; }}
              />
            </div>
          ))}
        </div>

        {/* ── Hotel title + price ─────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 italic mb-2">
              Experience Luxury Like Never Before
            </h1>
            <p className="font-bold text-xl text-gray-900">{hotel.name}</p>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={14}
                    className={i < (hotel.starRating ?? 4) ? 'fill-orange-400 text-orange-400' : 'fill-gray-200 text-gray-200'} />
                ))}
              </div>
              <span className="text-sm text-gray-500">4.5</span>
            </div>
            {hotel.contactInfo?.address && (
              <p className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                <MapPin size={13} /> {hotel.contactInfo.address || hotel.city}
              </p>
            )}
          </div>
          {minPrice > 0 && (
            <div className="text-right shrink-0">
              <p className="text-2xl font-bold text-gray-900">₹{minPrice.toFixed(0)}/night</p>
              <p className="text-xs text-gray-400">Starting price</p>
            </div>
          )}
        </div>

        {/* ── Amenity tags ────────────────────────────────────────────────── */}
        {allAmenities.length > 0 && (
          <div className="flex gap-2 flex-wrap mb-8">
            {allAmenities.map((a) => (
              <span key={a}
                className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-600">
                {AMENITY_ICONS[a] ?? null} {a}
              </span>
            ))}
          </div>
        )}

        {/* ── Booking widget ──────────────────────────────────────────────── */}
        <div className="border border-gray-200 rounded-2xl p-6 sm:p-8 mb-10">
          <form onSubmit={handleCheckAvailability}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
              {/* Check-In */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Check-In</label>
                <input
                  type="date"
                  value={checkIn}
                  min={format(addDays(today, 1), 'yyyy-MM-dd')}
                  onChange={(e) => setCheckIn(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm outline-none focus:border-gray-400"
                />
              </div>
              {/* Check-Out */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Check-Out</label>
                <input
                  type="date"
                  value={checkOut}
                  min={checkIn}
                  onChange={(e) => setCheckOut(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm outline-none focus:border-gray-400"
                />
              </div>
              {/* Rooms */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Rooms</label>
                <input
                  type="number"
                  min={1} max={10}
                  value={guests}
                  onChange={(e) => setGuests(Number(e.target.value))}
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm outline-none focus:border-gray-400"
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full py-4 bg-[#ff385c] text-white rounded-xl font-semibold text-sm hover:bg-[#e21e4a] transition-colors"
            >
              Check Availability
            </button>
          </form>
        </div>

        {/* ── Features ────────────────────────────────────────────────────── */}
        <div className="mb-12 space-y-5">
          {FEATURES.map((f) => (
            <div key={f.title} className="flex items-start gap-4">
              <div className="text-gray-700 mt-0.5 shrink-0">{f.icon}</div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">{f.title}</p>
                <p className="text-gray-500 text-sm">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Contact ─────────────────────────────────────────────────────── */}
        {(hotel.contactInfo?.phoneNumber || hotel.contactInfo?.email) && (
          <div className="border-t border-gray-100 pt-8 mb-12">
            <h3 className="font-semibold text-gray-800 mb-3 text-sm">Contact</h3>
            <div className="flex gap-6 text-sm text-gray-500 flex-wrap">
              {hotel.contactInfo.phoneNumber && (
                <span className="flex items-center gap-2"><Phone size={14} /> {hotel.contactInfo.phoneNumber}</span>
              )}
              {hotel.contactInfo.email && (
                <span className="flex items-center gap-2"><Mail size={14} /> {hotel.contactInfo.email}</span>
              )}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 text-sm">{error}</div>
        )}

        {/* ── Available rooms ─────────────────────────────────────────────── */}
        <div ref={roomsRef}>
          <div className="border-t border-gray-100 pt-10">
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              Available Rooms
              <span className="text-sm font-normal text-gray-400 ml-2">
                {checkIn} → {checkOut} · {nights} night{nights !== 1 ? 's' : ''}
              </span>
            </h2>

            {roomList.length === 0 ? (
              <p className="text-gray-400 text-center py-12">No rooms available for selected dates.</p>
            ) : (
              <div className="space-y-4">
                {roomList.map((room) => (
                  <div
                    key={room.id}
                    className="border border-gray-200 rounded-2xl p-6 hover:border-gray-400 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <BedDouble size={18} className="text-gray-600" />
                          <h3 className="font-semibold text-gray-900">{room.type}</h3>
                          <span className="text-xs text-gray-400">· up to {room.capacity ?? '–'} guests</span>
                        </div>
                        {room.amenities?.length > 0 && (
                          <div className="flex gap-2 flex-wrap">
                            {room.amenities.slice(0, 4).map((a) => (
                              <span key={a}
                                className="flex items-center gap-1 px-3 py-1 border border-gray-200 rounded-lg text-xs text-gray-500">
                                {AMENITY_ICONS[a] ?? null} {a}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-6 shrink-0">
                        <div className="text-right">
                          <p className="text-xl font-bold text-gray-900">₹{room.basePrice?.toFixed(0)}</p>
                          <p className="text-xs text-gray-400">/night</p>
                          <p className="text-sm font-semibold text-gray-700 mt-0.5">
                            ₹{((room.basePrice ?? 0) * nights * guests).toFixed(0)} total
                          </p>
                        </div>
                        <button
                          onClick={() => handleBook(room.id)}
                          disabled={bookingLoad}
                          className="px-6 py-3 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-700 disabled:opacity-50 transition-colors"
                        >
                          {bookingLoad ? 'Booking…' : 'Reserve Now'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
