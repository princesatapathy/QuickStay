import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, Star, ArrowRight, Globe, AtSign, Rss, MessageCircle, BedDouble } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { searchHotels } from '../api/hotels';

// ─── Types ────────────────────────────────────────────────────────────────────
interface FeaturedHotel {
  id: number;
  name: string;
  city: string;
  starRating: number;
  price: number;
  isBestSeller?: boolean;
}

// ─── Curated hotel image pool ─────────────────────────────────────────────────
const HOTEL_IMGS = [
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&q=80',
  'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=600&q=80',
  'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=600&q=80',
  'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=600&q=80',
  'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=600&q=80',
  'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=600&q=80',
];

// ─── Static data ──────────────────────────────────────────────────────────────
const OFFERS = [
  {
    id: 1,
    discount: '25% OFF',
    title: 'Summer Escape Package',
    desc: 'Enjoy a complimentary night and daily breakfast',
    expires: 'Expires Aug 31',
    img: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80',
  },
  {
    id: 2,
    discount: '20% OFF',
    title: 'Romantic Getaway',
    desc: 'Special couples package including spa treatment',
    expires: 'Expires Sep 20',
    img: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80',
  },
  {
    id: 3,
    discount: '30% OFF',
    title: 'Luxury Retreat',
    desc: 'Book 60 days in advance and save on your stay at any of our luxury properties worldwide.',
    expires: 'Expires Sep 25',
    img: 'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=800&q=80',
  },
];

const TESTIMONIALS = [
  {
    id: 1,
    name: 'Emma Rodriguez',
    rating: 4,
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&q=80',
    text: "I've used many booking platforms before, but none compare to the personalized experience and attention to detail that QuickStay provides. Their service is truly world-class.",
  },
  {
    id: 2,
    name: 'Liam Johnson',
    rating: 4,
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&q=80',
    text: "I've used many booking platforms before, but none compare to the personalized experience and attention to detail that QuickStay provides. Their service is truly world-class.",
  },
  {
    id: 3,
    name: 'Sophia Lee',
    rating: 4,
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=80&q=80',
    text: "I've used many booking platforms before, but none compare to the personalized experience and attention to detail that QuickStay provides. Their service is truly world-class.",
  },
];

// ─── Hero search bar ──────────────────────────────────────────────────────────
function HeroSearch() {
  const navigate = useNavigate();
  const today = new Date();
  const [city, setCity] = useState('');
  const [checkIn, setCheckIn] = useState(format(addDays(today, 1), 'yyyy-MM-dd'));
  const [checkOut, setCheckOut] = useState(format(addDays(today, 3), 'yyyy-MM-dd'));
  const [guests, setGuests] = useState(1);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(
      `/search?city=${encodeURIComponent(city.trim())}&checkIn=${checkIn}&checkOut=${checkOut}&rooms=${guests}`,
    );
  };

  return (
    <form
      onSubmit={handleSearch}
      className="bg-white rounded-full shadow-2xl w-full flex flex-col sm:flex-row items-stretch sm:items-center overflow-hidden p-2 gap-1"
    >
      {/* Destination */}
      <div className="flex-[1.5] flex flex-col px-6 py-3 min-w-0 border-b sm:border-b-0 sm:border-r border-gray-200">
        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Where</label>
        <input
          type="text"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="Search destinations"
          className="text-sm font-medium text-gray-700 outline-none placeholder-gray-400 bg-transparent mt-0.5"
        />
      </div>

      {/* Check-in */}
      <div className="flex flex-col px-6 py-3 border-b sm:border-b-0 sm:border-r border-gray-200 min-w-0">
        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Check In</label>
        <input
          type="date"
          value={checkIn}
          min={format(addDays(today, 1), 'yyyy-MM-dd')}
          onChange={(e) => setCheckIn(e.target.value)}
          className="text-sm font-medium text-gray-700 outline-none bg-transparent mt-0.5"
        />
      </div>

      {/* Check-out */}
      <div className="flex flex-col px-6 py-3 border-b sm:border-b-0 sm:border-r border-gray-200 min-w-0">
        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Check Out</label>
        <input
          type="date"
          value={checkOut}
          min={checkIn}
          onChange={(e) => setCheckOut(e.target.value)}
          className="text-sm font-medium text-gray-700 outline-none bg-transparent mt-0.5"
        />
      </div>

      {/* Rooms */}
      <div className="flex flex-col px-6 py-3 min-w-0">
        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Rooms</label>
        <input
          type="number"
          min={1}
          max={10}
          value={guests}
          onChange={(e) => setGuests(Number(e.target.value))}
          className="text-sm font-medium text-gray-700 outline-none w-10 bg-transparent mt-0.5"
        />
      </div>

      {/* Search button — circular */}
      <button
        type="submit"
        className="shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#ff385c] text-white flex items-center justify-center hover:bg-[#e21e4a] transition-colors shadow-lg ml-auto sm:ml-0"
      >
        <Search size={20} />
      </button>
    </form>
  );
}

// ─── Hotel card (Featured Destinations) ──────────────────────────────────────
function HotelCard({
  hotel,
  checkIn,
  checkOut,
  index,
}: {
  hotel: FeaturedHotel;
  checkIn: string;
  checkOut: string;
  index: number;
}) {
  const navigate = useNavigate();
  const isBestSeller = index % 3 !== 1; // 1st and 3rd get the badge, matching screenshot

  return (
    <div
      className="bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-lg transition-shadow border border-gray-100 cursor-pointer group"
      onClick={() =>
        navigate(`/hotels/${hotel.id}?checkIn=${checkIn}&checkOut=${checkOut}&rooms=1`)
      }
    >
      {/* Image area */}
      <div className="relative h-56 bg-gray-100 overflow-hidden">
        <img
          src={HOTEL_IMGS[index % HOTEL_IMGS.length]}
          alt={hotel.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {/* Rating badge — top right */}
        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
          <Star size={11} className="fill-[#ff385c] text-[#ff385c]" />
          <span className="text-xs font-bold text-gray-800">4.9</span>
        </div>
        {isBestSeller && (
          <span className="absolute top-3 left-3 bg-white text-gray-700 text-xs font-semibold px-2.5 py-1 rounded-full shadow-sm">
            Best Seller
          </span>
        )}
      </div>

      {/* Card body */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-bold text-gray-900 text-base leading-tight">{hotel.name}</h3>
          <div className="text-right shrink-0">
            <span className="font-bold text-[#ff385c] text-base">₹{hotel.price?.toFixed(0)}</span>
            <span className="text-xs text-gray-400">/night</span>
          </div>
        </div>

        <div className="flex items-center gap-1 text-xs text-gray-400 mb-4">
          <MapPin size={11} />
          <span className="truncate">{hotel.city}</span>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/hotels/${hotel.id}?checkIn=${checkIn}&checkOut=${checkOut}&rooms=1`);
          }}
          className="w-full py-3 bg-[#ff385c] text-white rounded-xl text-sm font-semibold hover:bg-[#e21e4a] transition-colors"
        >
          Book Now
        </button>
      </div>
    </div>
  );
}

// ─── Skeleton card for loading state ─────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-md border border-gray-100 animate-pulse">
      <div className="h-44 bg-gray-200" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-gray-200 rounded-full w-3/4" />
        <div className="h-3 bg-gray-200 rounded-full w-1/2" />
        <div className="flex items-center justify-between">
          <div className="h-5 bg-gray-200 rounded-full w-1/4" />
          <div className="h-7 bg-gray-200 rounded-lg w-1/4" />
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Home() {
  const navigate = useNavigate();
  const today = new Date();
  const checkIn = format(addDays(today, 1), 'yyyy-MM-dd');
  const checkOut = format(addDays(today, 3), 'yyyy-MM-dd');

  const [hotels, setHotels] = useState<FeaturedHotel[]>([]);
  const [loadingHotels, setLoadingHotels] = useState(true);

  // Try to load featured hotels from a popular city
  useEffect(() => {
    const cities = ['Mumbai', 'Delhi', 'Goa', 'Bangalore'];
    const tryNext = (idx: number) => {
      if (idx >= cities.length) {
        setLoadingHotels(false);
        return;
      }
      searchHotels({ city: cities[idx], checkIn, checkOut, roomsCount: 1, size: 4 })
        .then((res) => {
          const content: unknown[] = res.data?.data?.content ?? [];
          if (content.length > 0) {
            setHotels(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              content.map((item: any) => ({
                id: item.hotel?.id ?? item.id,
                name: item.hotel?.name ?? item.name ?? 'Hotel',
                city: item.hotel?.city ?? item.city ?? cities[idx],
                starRating: item.hotel?.starRating ?? 4,
                price: item.price ?? item.minPrice ?? 0,
              })),
            );
            setLoadingHotels(false);
          } else {
            tryNext(idx + 1);
          }
        })
        .catch(() => tryNext(idx + 1));
    };
    tryNext(0);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="bg-white">
      {/* ──────────────────────────────────────────────────────
          HERO — full viewport height, photo background
      ─────────────────────────────────────────────────────── */}
      <section className="relative min-h-[820px] flex flex-col items-center justify-center overflow-hidden pt-16">
        {/* Background photo */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=1920&q=80')",
          }}
        />
        {/* Gradient overlay (lighter at top, darker at bottom) */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(rgba(0,0,0,0.20), rgba(0,0,0,0.42))' }} />

        {/* Content — centered */}
        <div className="relative z-10 w-full max-w-5xl mx-auto px-5 sm:px-10 text-center mb-10">
          <h1 className="text-4xl sm:text-5xl lg:text-[56px] font-extrabold text-white mb-5 leading-tight drop-shadow-lg" style={{ letterSpacing: '-0.02em' }}>
            Find your next serene getaway
          </h1>
          <p className="text-white/90 text-base sm:text-lg max-w-2xl mx-auto drop-shadow">
            Curated stays for the modern traveler. Experience effortless booking and high-end hospitality.
          </p>
        </div>

        {/* Pill search bar */}
        <div className="relative z-20 w-full max-w-4xl px-5">
          <HeroSearch />
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────
          FEATURED DESTINATIONS
      ─────────────────────────────────────────────────────── */}
      <section className="py-20 px-6 sm:px-12 max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
            Featured Destination
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto text-sm sm:text-base leading-relaxed">
            Discover our handpicked selection of exceptional properties around the world, offering
            unparalleled luxury and unforgettable experiences.
          </p>
        </div>

        {/* Hotel grid */}
        {loadingHotels ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : hotels.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {hotels.map((hotel, idx) => (
              <HotelCard key={hotel.id} hotel={hotel} checkIn={checkIn} checkOut={checkOut} index={idx} />
            ))}
          </div>
        ) : (
          /* No hotels in DB yet — show placeholder cards */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {['Urbanza Suites', 'Palm Grand', 'Azure Palace'].map((name, idx) => (
              <div
                key={name}
                className="bg-white rounded-2xl overflow-hidden shadow-md border border-gray-100 group"
              >
                <div className="relative h-44 bg-gray-100 overflow-hidden">
                  <img
                    src={HOTEL_IMGS[idx % HOTEL_IMGS.length]}
                    alt={name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {idx !== 1 && (
                    <span className="absolute top-3 left-3 bg-white text-gray-700 text-xs font-semibold px-2.5 py-1 rounded-full shadow-sm">
                      Best Seller
                    </span>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between mb-1">
                    <h3 className="font-semibold text-gray-900 text-sm">{name}</h3>
                    <div className="flex items-center gap-1">
                      <Star size={12} className="fill-orange-400 text-orange-400" />
                      <span className="text-xs text-gray-600 font-medium">4.5</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 flex items-center gap-1 mb-3">
                    <MapPin size={11} /> Main Road 123 Street, 23 Colony
                  </p>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-gray-900">${[399, 299, 249][idx]}</span>
                      <span className="text-xs text-gray-400">/night</span>
                    </div>
                    <button
                      onClick={() => navigate('/search?city=Mumbai&checkIn=' + checkIn + '&checkOut=' + checkOut + '&rooms=1')}
                      className="px-4 py-1.5 border border-gray-300 rounded-lg text-xs text-gray-700 hover:bg-[#ff385c] hover:text-white hover:border-[#ff385c] transition-colors font-medium"
                    >
                      Book Now
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* View all button */}
        <div className="text-center mt-10">
          <button
            onClick={() =>
              navigate(
                `/search?city=Mumbai&checkIn=${checkIn}&checkOut=${checkOut}&rooms=1`,
              )
            }
            className="inline-flex items-center gap-2 px-7 py-3 border-2 border-[#ff385c] text-[#ff385c] rounded-lg text-sm font-semibold hover:bg-[#ff385c] hover:text-white transition-colors"
          >
            View All Destinations
          </button>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────
          EXCLUSIVE OFFERS
      ─────────────────────────────────────────────────────── */}
      <section className="py-20 bg-gray-50 px-6 sm:px-12">
        <div className="max-w-7xl mx-auto">
          {/* Section header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
                Exclusive Offers
              </h2>
              <p className="text-gray-500 text-sm sm:text-base max-w-lg leading-relaxed">
                Take advantage of our limited-time offers and special packages to enhance your stay
                and create unforgettable memories.
              </p>
            </div>
            <button className="flex items-center gap-1 text-sm font-semibold text-gray-700 hover:text-black transition-colors whitespace-nowrap">
              View All Offers <ArrowRight size={16} />
            </button>
          </div>

          {/* Offer cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {OFFERS.map((offer) => (
              <div
                key={offer.id}
                className="relative rounded-2xl overflow-hidden h-64 cursor-pointer group"
              >
                <img
                  src={offer.img}
                  alt={offer.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                {/* gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />

                <div className="absolute inset-0 p-5 flex flex-col justify-between">
                  {/* Discount badge */}
                  <span className="bg-white/20 backdrop-blur-sm border border-white/30 text-white text-xs font-bold px-3 py-1 rounded-full w-fit">
                    {offer.discount}
                  </span>

                  {/* Offer info */}
                  <div>
                    <h3 className="text-white font-bold text-lg mb-1 leading-tight">
                      {offer.title}
                    </h3>
                    <p className="text-white/75 text-xs mb-1 leading-relaxed">{offer.desc}</p>
                    <p className="text-white/50 text-xs mb-3">{offer.expires}</p>
                    <button className="text-white text-xs font-semibold flex items-center gap-1.5 hover:gap-2.5 transition-all">
                      View Offers <ArrowRight size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────
          TESTIMONIALS
      ─────────────────────────────────────────────────────── */}
      <section id="experience" className="py-20 px-6 sm:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
              What Our Guests Say
            </h2>
            <p className="text-gray-500 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
              Discover why discerning travelers consistently choose QuickStay for their exclusive
              and luxurious accommodations around the world.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <div
                key={t.id}
                className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3 mb-4">
                  <img
                    src={t.avatar}
                    alt={t.name}
                    className="w-10 h-10 rounded-full object-cover ring-2 ring-gray-100"
                  />
                  <p className="font-semibold text-gray-900 text-sm">{t.name}</p>
                </div>
                <div className="flex gap-0.5 mb-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      size={14}
                      className={
                        i < t.rating
                          ? 'fill-orange-400 text-orange-400'
                          : 'fill-gray-200 text-gray-200'
                      }
                    />
                  ))}
                </div>
                <p className="text-gray-500 text-sm leading-relaxed">"{t.text}"</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────
          NEWSLETTER — Stay Inspired
      ─────────────────────────────────────────────────────── */}
      <section className="py-16 px-6 sm:px-12">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gray-900 rounded-3xl px-8 sm:px-16 py-14 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">Stay Inspired</h2>
            <p className="text-gray-400 text-sm sm:text-base mb-8 max-w-md mx-auto leading-relaxed">
              Join our newsletter and be the first to discover new destinations, exclusive offers, and travel
              inspiration.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 bg-transparent border border-gray-600 text-white rounded-xl px-5 py-3 text-sm outline-none focus:border-gray-400 placeholder-gray-500"
              />
              <button className="flex items-center justify-center gap-2 px-7 py-3 bg-[#ff385c] text-white rounded-xl font-semibold text-sm hover:bg-[#e21e4a] transition-colors whitespace-nowrap border border-gray-700">
                Subscribe <ArrowRight size={15} />
              </button>
            </div>
            <p className="text-gray-600 text-xs mt-4">
              By subscribing, you agree to our Privacy Policy and consent to receive updates.
            </p>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────
          FOOTER — 4-column
      ─────────────────────────────────────────────────────── */}
      <footer id="about" className="bg-gray-50 border-t border-gray-200 px-6 sm:px-12 pt-16 pb-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
            {/* Col 1 — Logo + tagline + social */}
            <div>
              <div className="flex items-center gap-2 font-extrabold text-xl text-gray-900 mb-3">
                <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
                  <BedDouble size={16} className="text-white" />
                </div>
                QuickStay
              </div>
              <p className="text-gray-500 text-sm leading-relaxed mb-5">
                Discover the world's most extraordinary places to stay, from boutique hotels to luxury villas and private
                islands.
              </p>
              <div className="flex gap-4">
                {[Globe, MessageCircle, AtSign, Rss].map((Icon, i) => (
                  <a key={i} href="#" className="text-gray-400 hover:text-gray-700 transition-colors">
                    <Icon size={18} />
                  </a>
                ))}
              </div>
            </div>

            {/* Col 2 — Company */}
            <div>
              <p className="text-xs font-bold text-gray-900 uppercase tracking-widest mb-5">Company</p>
              <ul className="space-y-3 text-sm text-gray-500">
                {['About', 'Careers', 'Press', 'Blog', 'Partners'].map((item) => (
                  <li key={item}><a href="#" className="hover:text-gray-800 transition-colors">{item}</a></li>
                ))}
              </ul>
            </div>

            {/* Col 3 — Support */}
            <div>
              <p className="text-xs font-bold text-gray-900 uppercase tracking-widest mb-5">Support</p>
              <ul className="space-y-3 text-sm text-gray-500">
                {['Help Center', 'Safety Information', 'Cancellation Options', 'Contact Us', 'Accessibility'].map((item) => (
                  <li key={item}><a href="#" className="hover:text-gray-800 transition-colors">{item}</a></li>
                ))}
              </ul>
            </div>

            {/* Col 4 — Stay Updated */}
            <div>
              <p className="text-xs font-bold text-gray-900 uppercase tracking-widest mb-5">Stay Updated</p>
              <p className="text-sm text-gray-500 mb-4 leading-relaxed">
                Subscribe to our newsletter for travel inspiration and special offers.
              </p>
              <div className="flex">
                <input
                  type="email"
                  placeholder="Your email"
                  className="flex-1 border border-gray-200 rounded-l-lg px-4 py-2.5 text-sm outline-none focus:border-gray-400"
                />
                <button className="px-4 py-2.5 bg-gray-900 text-white rounded-r-lg hover:bg-gray-700 transition-colors">
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-gray-200 pt-6 flex flex-col sm:flex-row justify-between items-center gap-3">
            <p className="text-sm text-gray-400">© 2026 QuickStay. All rights reserved.</p>
            <div className="flex gap-6 text-sm text-gray-400">
              <a href="#" className="hover:text-gray-700 transition-colors">Privacy</a>
              <a href="#" className="hover:text-gray-700 transition-colors">Terms</a>
              <a href="#" className="hover:text-gray-700 transition-colors">Sitemap</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
