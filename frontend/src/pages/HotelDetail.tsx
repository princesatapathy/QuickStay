import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Bed, Envelope, MapPin, Phone, Users } from '@phosphor-icons/react';
import { format, addDays } from 'date-fns';
import { getHotelInfo } from '../api/hotels';
import { initBooking } from '../api/bookings';
import { useAuth } from '../context/AuthContext';
import { HOTEL_IMGS, hotelImage } from '../lib/images';
import { fmtDate, inr, nights as nightsBetween } from '../lib/dates';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Form';
import { Banner, Card, EmptyState, Skeleton, Stars } from '../components/ui/Display';
import { AmenityChip } from '../components/ui/Amenity';
import { CountUp, Reveal } from '../components/motion/Motion';

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

export default function HotelDetail() {
  const { hotelId } = useParams<{ hotelId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const roomsRef = useRef<HTMLDivElement>(null);

  const today = new Date();
  const [checkIn, setCheckIn] = useState(searchParams.get('checkIn') || format(addDays(today, 1), 'yyyy-MM-dd'));
  const [checkOut, setCheckOut] = useState(searchParams.get('checkOut') || format(addDays(today, 3), 'yyyy-MM-dd'));
  const [guests, setGuests] = useState(Number(searchParams.get('rooms') || 1));

  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [roomList, setRoomList] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingRoomId, setBookingRoomId] = useState<number | null>(null);
  const [error, setError] = useState('');

  const nights = nightsBetween(checkIn, checkOut);

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

  const handleBook = async (roomId: number) => {
    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent(`/hotels/${hotelId}?checkIn=${checkIn}&checkOut=${checkOut}&rooms=${guests}`)}`);
      return;
    }
    setBookingRoomId(roomId);
    setError('');
    try {
      const res = await initBooking({ hotelId: Number(hotelId), roomId, checkInDate: checkIn, checkOutDate: checkOut, roomsCount: guests });
      navigate(`/booking/${res.data?.data?.id}`);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || 'Booking failed. Try again.');
    } finally {
      setBookingRoomId(null);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-6 px-5 sm:px-8">
        <Skeleton className="h-72 w-full rounded-xl sm:h-96" />
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  if (!hotel) {
    return (
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <Card>
          <EmptyState
            icon={<Bed size={26} />}
            title={error || 'Hotel not found'}
            action={<Button variant="ghost" onClick={() => navigate(-1)}>Go back</Button>}
          />
        </Card>
      </div>
    );
  }

  const minPrice = roomList.length ? Math.min(...roomList.map((r) => r.basePrice)) : 0;
  const allAmenities = [...new Set(roomList.flatMap((r) => r.amenities ?? []))].slice(0, 8);
  const photos = (hotel.photos?.length >= 3 ? hotel.photos : HOTEL_IMGS).slice(0, 3);

  return (
    <div className="mx-auto max-w-6xl px-5 pb-16 sm:px-8">
      <button onClick={() => navigate(-1)} className="mb-4 inline-flex items-center gap-2 text-sm text-ink-muted transition-colors hover:text-ink">
        <ArrowLeft size={16} /> Back to results
      </button>

      {/* Mosaic: one hero photo and two supporting */}
      <div className="grid h-64 grid-cols-3 grid-rows-2 gap-2 overflow-hidden rounded-xl sm:h-96 sm:gap-3">
        {photos.map((src, i) => (
          <div key={i} className={`overflow-hidden bg-surface ${i === 0 ? 'col-span-2 row-span-2' : ''}`}>
            <img
              src={src}
              alt={`${hotel.name} photo ${i + 1}`}
              className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
              onError={(e) => { (e.target as HTMLImageElement).src = HOTEL_IMGS[i % HOTEL_IMGS.length]; }}
            />
          </div>
        ))}
      </div>

      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[1fr_21rem]">
        <div className="min-w-0">
          <Stars value={hotel.starRating} />
          <h1 className="t-h2 mt-2">{hotel.name}</h1>
          <p className="mt-2 flex items-center gap-1.5 text-ink-muted">
            <MapPin size={16} /> {hotel.contactInfo?.address || hotel.city}
          </p>

          {allAmenities.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {allAmenities.map((a) => <AmenityChip key={a} name={a} />)}
            </div>
          )}

          {error && <div className="mt-6"><Banner tone="error">{error}</Banner></div>}

          <div ref={roomsRef} className="scroll-mt-28 pt-10">
            <h2 className="t-h3">Available rooms</h2>
            <p className="mt-1 text-sm text-ink-muted">
              {fmtDate(checkIn, false)} to {fmtDate(checkOut)} · {nights} night{nights > 1 ? 's' : ''} · {guests} room{guests > 1 ? 's' : ''}
            </p>

            {roomList.length === 0 ? (
              <Card className="mt-5">
                <EmptyState icon={<Bed size={26} />} title="No rooms for these dates" body="Try different dates from the panel." />
              </Card>
            ) : (
              <div className="mt-8 space-y-12">
                {roomList.map((room, i) => (
                  <Reveal key={room.id} delay={Math.min(i, 3) * 0.05}>
                    {/* Editorial room row: photo left, serif name, small-caps meta, one action. */}
                    <article className="grid items-center gap-6 md:grid-cols-[1.2fr_1fr] md:gap-10">
                      <div className="overflow-hidden rounded-lg bg-surface-2">
                        <img src={hotelImage(room.id, room.photos)} alt={`${room.type} room`} loading="lazy" className="aspect-[4/3] w-full object-cover" />
                      </div>
                      <div>
                        <h3 className="t-h3 text-accent">{room.type}</h3>
                        <p className="t-label mt-3 flex items-center gap-1.5"><Users size={14} /> Sleeps {room.capacity ?? 2}</p>
                        {room.amenities?.length > 0 && (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {room.amenities.slice(0, 4).map((a) => <AmenityChip key={a} name={a} />)}
                          </div>
                        )}
                        <p className="mt-5 text-ink-muted">
                          <span className="text-lg font-medium text-ink tabular-nums">{inr(room.basePrice)}</span> per night
                        </p>
                        <p className="text-sm text-ink-muted"><CountUp value={(room.basePrice ?? 0) * nights * guests} format={(n) => inr(n)} /> for your stay</p>
                        <Button className="mt-5" onClick={() => handleBook(room.id)} loading={bookingRoomId === room.id}>
                          {bookingRoomId === room.id ? 'Reserving' : 'Reserve'}
                        </Button>
                      </div>
                    </article>
                  </Reveal>
                ))}
              </div>
            )}
          </div>

          {(hotel.contactInfo?.phoneNumber || hotel.contactInfo?.email) && (
            <div className="mt-10 border-t border-line pt-6">
              <h2 className="t-h3">Contact</h2>
              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-muted">
                {hotel.contactInfo.phoneNumber && <span className="flex items-center gap-2"><Phone size={16} /> {hotel.contactInfo.phoneNumber}</span>}
                {hotel.contactInfo.email && <span className="flex items-center gap-2"><Envelope size={16} /> {hotel.contactInfo.email}</span>}
              </div>
            </div>
          )}
        </div>

        {/* Dates panel: sticky beside the rooms on desktop, stacked on small screens */}
        <aside className="lg:sticky lg:top-28">
          <Card className="p-5">
            {minPrice > 0 && (
              <p className="text-2xl font-bold tabular-nums">
                {inr(minPrice)} <span className="text-sm font-normal text-ink-muted">per night, from</span>
              </p>
            )}
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Input label="Check in" type="date" value={checkIn} min={format(addDays(today, 1), 'yyyy-MM-dd')} onChange={(e) => setCheckIn(e.target.value)} />
              <Input label="Check out" type="date" value={checkOut} min={checkIn} onChange={(e) => setCheckOut(e.target.value)} />
              <div className="col-span-2">
                <Input label="Rooms" type="number" min={1} max={10} value={guests} onChange={(e) => setGuests(Number(e.target.value))} />
              </div>
            </div>
            <Button className="mt-5 w-full" onClick={() => roomsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
              See rooms
            </Button>
          </Card>
        </aside>
      </div>
    </div>
  );
}
