import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Minus, Plus, X } from '@phosphor-icons/react';
import { format } from 'date-fns';
import { nights } from '../../lib/dates';
import { Button } from '../ui/Button';
import { Input } from '../ui/Form';
import DateRangeCalendar from './DateRangeCalendar';

// "Find a stay" from any page: a panel from the right with a real calendar and a room stepper.
export default function SearchDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const [city, setCity] = useState('');
  const [start, setStart] = useState<string | undefined>();
  const [end, setEnd] = useState<string | undefined>();
  const [rooms, setRooms] = useState(1);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const ready = !!start && !!end;
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready) return;
    onClose();
    navigate(`/search?city=${encodeURIComponent(city.trim())}&checkIn=${start}&checkOut=${end}&rooms=${rooms}`);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[70]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-ink/45" onClick={onClose} />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="Find a stay"
            className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-line bg-night"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 34 }}
          >
            <div className="flex items-center justify-between border-b border-line bg-night-2 px-6 py-4">
              <h2 className="t-h3">Find a stay</h2>
              <button onClick={onClose} aria-label="Close" className="rounded-lg p-2 text-ink-muted hover:bg-surface-2 hover:text-ink"><X size={22} /></button>
            </div>

            <form onSubmit={submit} className="flex flex-1 flex-col gap-6 p-6">
              <Input label="Where to?" value={city} onChange={(e) => setCity(e.target.value)} placeholder="City, for example Goa" />
              <DateRangeCalendar start={start} end={end} onChange={(s, e) => { setStart(s); setEnd(e); }} />

              <div className="flex items-center justify-between border-t border-line pt-5">
                <div>
                  <p className="font-medium">Rooms</p>
                  <p className="text-xs text-ink-muted">How many rooms do you need</p>
                </div>
                <div className="flex items-center gap-4">
                  <button type="button" onClick={() => setRooms((r) => Math.max(1, r - 1))} aria-label="Fewer rooms" className="grid h-9 w-9 place-items-center rounded-lg border border-line hover:bg-surface-2"><Minus size={16} /></button>
                  <span className="w-5 text-center tabular-nums">{rooms}</span>
                  <button type="button" onClick={() => setRooms((r) => Math.min(10, r + 1))} aria-label="More rooms" className="grid h-9 w-9 place-items-center rounded-lg border border-line hover:bg-surface-2"><Plus size={16} /></button>
                </div>
              </div>

              <div className="mt-auto">
                <p className="mb-3 text-center text-sm text-ink-muted">
                  {ready ? `${format(new Date(start!), 'd MMM')} to ${format(new Date(end!), 'd MMM yyyy')} · ${nights(start, end)} night${nights(start, end) > 1 ? 's' : ''}` : 'Select your check-in and check-out dates'}
                </p>
                <Button type="submit" size="lg" className="w-full" disabled={!ready}>Search stays</Button>
              </div>
            </form>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
