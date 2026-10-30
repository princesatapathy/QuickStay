import type { ReactNode } from 'react';
import { BellRinging, Barbell, Car, Coffee, Mountains, Snowflake, SwimmingPool, WifiHigh } from '@phosphor-icons/react';

const ICONS: Record<string, ReactNode> = {
  WiFi: <WifiHigh size={14} />,
  Breakfast: <Coffee size={14} />,
  'Room Service': <BellRinging size={14} />,
  'Mountain View': <Mountains size={14} />,
  Pool: <SwimmingPool size={14} />,
  AC: <Snowflake size={14} />,
  Parking: <Car size={14} />,
  Gym: <Barbell size={14} />,
};

export function AmenityChip({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-xs text-ink-muted">
      {ICONS[name] ?? null}
      {name}
    </span>
  );
}
