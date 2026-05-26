import { useEffect, useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { searchHotels } from '../api/hotels';
import {
  MapPin, Star, ChevronLeft, ChevronRight,
  Wifi, Coffee, BellRing, Mountain, Waves, BedDouble,
} from 'lucide-react';

interface HotelPrice {
  id: number;
  name: string;
  city: string;
  price: number;
  photos: string[];
  amenities: string[];
}

// Curated hotel image pool — used when backend returns no photos
const HOTEL_IMGS = [
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&q=80',
  'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=600&q=80',
  'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=600&q=80',
  'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=600&q=80',
  'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=600&q=80',
  'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=600&q=80',
];

// ─── Amenity icon map ─────────────────────────────────────────────────────────
const AMENITY_ICONS: Record<string, React.ReactNode> = {
  WiFi:          <Wifi      size={13} />,
  Breakfast:     <Coffee    size={13} />,
  'Room Service': <BellRing  size={13} />,
  'Mountain View': <Mountain  size={13} />,
  Pool:          <Waves     size={13} />,
  AC:            <BedDouble  size={13} />,
};

// ─── Filter constants ─────────────────────────────────────────────────────────
const ROOM_TYPES  = ['Single Bed', 'Double Bed', 'Luxury Room', 'Family Suite'];
const PRICE_RANGES = [
  { label: '₹0 to 500',    min: 0,    max: 500   },
  { label: '₹500 to 1000', min: 500,  max: 1000  },
  { label: '₹1000 to 2000', min: 1000, max: 2000  },
  { label: '₹2000 to 3000', min: 2000, max: 3000  },
];
const SORT_OPTIONS = [
  { value: 'priceLow',  label: 'Price Low to High' },
  { value: 'priceHigh', label: 'Price High to Low' },
  { value: 'newest',    label: 'Newest First'       },
];

export default function Search() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const city    = params.get('city')    || '';
  const checkIn = params.get('checkIn') || '';
  const checkOut= params.get('checkOut')|| '';
  const rooms   = Number(params.get('rooms') || 1);

  const [hotels,     setHotels]     = useState<HotelPrice[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [page,       setPage]       = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // ── Filters (client-side) ──────────────────────────────────────────────────
  const [selectedRoomTypes,  setSelectedRoomTypes]  = useState<string[]>([]);
  const [selectedPriceRange, setSelectedPriceRange] = useState<string[]>([]);
  const [sortBy,             setSortBy]             = useState('');

  useEffect(() => {
    setLoading(true); setError('');
    searchHotels({ city, checkIn, checkOut, roomsCount: rooms, page, size: 20 })
      .then((res) => {
        const data = res.data?.data;
        const raw: unknown[] = data?.content ?? [];
        // Handle both flat HotelPrice and wrapped {hotel, price} shapes
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mapped: HotelPrice[] = raw.map((item: any) => ({
          id:        item.hotel?.id       ?? item.id,
          name:      item.hotel?.name     ?? item.name     ?? 'Hotel',
          city:      item.hotel?.city     ?? item.city     ?? city,
          price:     item.price           ?? item.minPrice ?? 0,
          photos:    item.hotel?.photos   ?? item.photos   ?? [],
          amenities: item.hotel?.amenities?? item.amenities?? [],
        }));
        setHotels(mapped);
        setTotalPages(data?.totalPages ?? 0);
      })
      .catch((err) => setError(err.response?.data?.message || 'Failed to load hotels'))
      .finally(() => setLoading(false));
  }, [city, checkIn, checkOut, rooms, page]);

  // ── Apply client-side filters ──────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = [...hotels];

    if (selectedPriceRange.length > 0) {
      list = list.filter((h) => {
        const range = PRICE_RANGES.find((r) => selectedPriceRange.includes(r.label));
        return range ? h.price >= range.min && h.price <= range.max : true;
      });
    }

    if (sortBy === 'priceLow')  list.sort((a, b) => a.price - b.price);
    if (sortBy === 'priceHigh') list.sort((a, b) => b.price - a.price);

    return list;
  }, [hotels, selectedPriceRange, sortBy]);

  const nights = checkIn && checkOut
    ? Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000)
    : 1;

  const toggleRoomType = (t: string) =>
    setSelectedRoomTypes((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);
  const togglePriceRange = (t: string) =>
    setSelectedPriceRange((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);

  const clearFilters = () => { setSelectedRoomTypes([]); setSelectedPriceRange([]); setSortBy(''); };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-white">
      {/* Page header */}
      <div className="px-6 sm:px-12 py-10 max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {city ? `Hotels in ${city}` : 'All Hotels'}
        </h1>
        <p className="text-gray-500 text-sm">
          {checkIn && checkOut
            ? `${checkIn} → ${checkOut} · ${rooms} room${rooms > 1 ? 's' : ''}`
            : 'Browse our handpicked selection of exceptional hotels worldwide.'}
        </p>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 pb-16 flex gap-6 items-start">
        {/* ── Hotel list ─────────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="space-y-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-6 pb-8 border-b border-gray-100 animate-pulse">
                  <div className="w-72 h-48 bg-gray-200 rounded-xl shrink-0" />
                  <div className="flex-1 space-y-3 pt-2">
                    <div className="h-4 bg-gray-200 rounded w-1/4" />
                    <div className="h-7 bg-gray-200 rounded w-2/3" />
                    <div className="h-4 bg-gray-200 rounded w-1/3" />
                    <div className="h-4 bg-gray-200 rounded w-1/2" />
                    <div className="h-6 bg-gray-200 rounded w-1/4 mt-4" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-20">
              <p className="text-gray-400 mb-4">{error}</p>
              <button onClick={() => navigate('/')} className="text-gray-600 underline text-sm">← Go back</button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <MapPin size={48} className="text-gray-200 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">No hotels found</h3>
              <p className="text-gray-400 mb-6 text-sm">No hotels available in {city} for your dates.</p>
              <button
                onClick={() => navigate('/')}
                className="px-6 py-2 bg-[#ff385c] text-white rounded-lg hover:bg-[#e21e4a] text-sm"
              >
                Change Search
              </button>
            </div>
          ) : (
            <div>
              <p className="text-sm text-gray-400 mb-6">{filtered.length} hotel{filtered.length !== 1 ? 's' : ''} found</p>

              {/* Hotel rows */}
              <div className="divide-y divide-gray-100">
                {filtered.map((hotel) => (
                  <div
                    key={hotel.id}
                    onClick={() =>
                      navigate(`/hotels/${hotel.id}?checkIn=${checkIn}&checkOut=${checkOut}&rooms=${rooms}`)
                    }
                    className="flex gap-6 py-8 cursor-pointer group"
                  >
                    {/* Image */}
                    <div className="w-40 sm:w-52 shrink-0 rounded-xl overflow-hidden bg-gray-100 h-40">
                      <img
                        src={hotel.photos?.[0] ?? HOTEL_IMGS[hotel.id % HOTEL_IMGS.length]}
                        alt={hotel.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-400 mb-1">{hotel.city}</p>
                      <h3 className="text-2xl font-semibold text-gray-900 mb-1 truncate">{hotel.name}</h3>

                      {/* Stars */}
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              size={14}
                              className={i < 4 ? 'fill-orange-400 text-orange-400' : 'fill-gray-200 text-gray-200'}
                            />
                          ))}
                        </div>
                        <span className="text-sm text-gray-500">200+ reviews</span>
                      </div>

                      {/* Address */}
                      <p className="flex items-center gap-1 text-sm text-gray-500 mb-3">
                        <MapPin size={14} className="shrink-0" />
                        <span className="truncate">{hotel.city}</span>
                      </p>

                      {/* Amenity tags */}
                      {hotel.amenities?.length > 0 && (
                        <div className="flex gap-2 flex-wrap mb-4">
                          {hotel.amenities.slice(0, 4).map((a) => (
                            <span
                              key={a}
                              className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600"
                            >
                              {AMENITY_ICONS[a] ?? null} {a}
                            </span>
                          ))}
                        </div>
                      )}

                      <p className="text-xl font-bold text-gray-900">
                        ₹{hotel.price?.toFixed(0)}{' '}
                        <span className="text-sm font-normal text-gray-400">/night</span>
                      </p>
                      {nights > 1 && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          ₹{((hotel.price ?? 0) * nights * rooms).toFixed(0)} total · {nights}n · {rooms}r
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-4 mt-10">
                  <button
                    disabled={page === 0}
                    onClick={() => setPage((p) => p - 1)}
                    className="p-2 rounded-full border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <span className="text-sm text-gray-600">Page {page + 1} of {totalPages}</span>
                  <button
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage((p) => p + 1)}
                    className="p-2 rounded-full border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Filters sidebar ─────────────────────────────────────────────── */}
        <aside className="hidden sm:block w-56 shrink-0 border border-gray-200 rounded-2xl p-6 sticky top-20">
          <div className="flex items-center justify-between mb-6">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-900">Filters</p>
            <button onClick={clearFilters} className="text-xs text-gray-400 hover:text-gray-700 transition-colors">
              CLEAR
            </button>
          </div>

          {/* Popular filters */}
          <div className="mb-6">
            <p className="text-sm font-semibold text-gray-800 mb-3">Popular filters</p>
            <div className="space-y-2.5">
              {ROOM_TYPES.map((t) => (
                <label key={t} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedRoomTypes.includes(t)}
                    onChange={() => toggleRoomType(t)}
                    className="w-4 h-4 rounded border-gray-300 accent-[#ff385c]"
                  />
                  <span className="text-sm text-gray-600">{t}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Price range */}
          <div className="mb-6">
            <p className="text-sm font-semibold text-gray-800 mb-3">Price Range</p>
            <div className="space-y-2.5">
              {PRICE_RANGES.map((r) => (
                <label key={r.label} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedPriceRange.includes(r.label)}
                    onChange={() => togglePriceRange(r.label)}
                    className="w-4 h-4 rounded border-gray-300 accent-[#ff385c]"
                  />
                  <span className="text-sm text-gray-600">{r.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Sort by */}
          <div>
            <p className="text-sm font-semibold text-gray-800 mb-3">Sort By</p>
            <div className="space-y-2.5">
              {SORT_OPTIONS.map((s) => (
                <label key={s.value} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="sort"
                    value={s.value}
                    checked={sortBy === s.value}
                    onChange={() => setSortBy(s.value)}
                    className="w-4 h-4 border-gray-300 accent-[#ff385c]"
                  />
                  <span className="text-sm text-gray-600">{s.label}</span>
                </label>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
