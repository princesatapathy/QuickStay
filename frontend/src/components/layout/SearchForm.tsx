import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, addDays } from 'date-fns';
import { MagnifyingGlass } from '@phosphor-icons/react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Form';

// The hero search bar: one row on desktop (destination, dates, rooms, search), stacked on mobile.
export default function SearchForm({ className = '' }: { className?: string }) {
  const navigate = useNavigate();
  const today = new Date();
  const [city, setCity] = useState('');
  const [checkIn, setCheckIn] = useState(format(addDays(today, 1), 'yyyy-MM-dd'));
  const [checkOut, setCheckOut] = useState(format(addDays(today, 3), 'yyyy-MM-dd'));
  const [rooms, setRooms] = useState(1);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/search?city=${encodeURIComponent(city.trim())}&checkIn=${checkIn}&checkOut=${checkOut}&rooms=${rooms}`);
  };

  return (
    <form onSubmit={submit} className={`grid grid-cols-2 gap-3 md:grid-cols-[1.5fr_1fr_1fr_0.55fr_auto] md:items-end ${className}`}>
      <div className="col-span-2 md:col-span-1">
        <Input label="Destination" value={city} onChange={(e) => setCity(e.target.value)} placeholder="City, for example Goa" />
      </div>
      <Input label="Check in" type="date" value={checkIn} min={format(addDays(today, 1), 'yyyy-MM-dd')} onChange={(e) => setCheckIn(e.target.value)} />
      <Input label="Check out" type="date" value={checkOut} min={checkIn} onChange={(e) => setCheckOut(e.target.value)} />
      <div className="col-span-2 md:col-span-1">
        <Input label="Rooms" type="number" min={1} max={10} value={rooms} onChange={(e) => setRooms(Number(e.target.value))} />
      </div>
      <Button type="submit" className="col-span-2 md:col-span-1 md:px-8">
        <MagnifyingGlass size={18} /> Search
      </Button>
    </form>
  );
}
