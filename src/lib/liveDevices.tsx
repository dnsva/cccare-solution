import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { DeviceReading } from '../types';
import { subscribe, type RelayStatus } from './relayStream';

/** A reading older than this means the sensor stopped sending. */
export const LIVE_STALE_MS = 5000;
/** How many bpm values to keep per device for the sparkline. */
const HISTORY = 24;

export type LiveDevices = {
  status: RelayStatus;
  devices: Record<string, DeviceReading>;
  /** Device → recent bpm values, oldest first. */
  history: Record<string, number[]>;
};

/** What the relay sends: the reading with its age instead of a timestamp. */
type Incoming = Omit<DeviceReading, 'at'> & { ageMs: number };

export const isFresh = (r: DeviceReading | undefined, now: number): r is DeviceReading =>
  !!r && now - r.at < LIVE_STALE_MS;

const toReading = ({ ageMs, ...rest }: Incoming): DeviceReading => ({ ...rest, at: Date.now() - ageMs });

const EMPTY: LiveDevices = { status: 'connecting', devices: {}, history: {} };
const LiveContext = createContext<LiveDevices>(EMPTY);

/** Listens to the dev server's /api/stream for real pulse-oximeter readings. */
export function LiveDevicesProvider({ children }: { children: ReactNode }) {
  const [live, setLive] = useState<LiveDevices>(EMPTY);

  useEffect(() => {
    const onStatus = (status: RelayStatus) => setLive((prev) => (prev.status === status ? prev : { ...prev, status }));
    const stopSnapshot = subscribe(
      'snapshot',
      (data) => {
        const readings = (data as Incoming[]).map(toReading);
        setLive((prev) => ({ ...prev, devices: Object.fromEntries(readings.map((r) => [r.device, r])) }));
      },
      onStatus,
    );
    const stopReading = subscribe('reading', (data) => {
      const r = toReading(data as Incoming);
      setLive((prev) => {
        const past = prev.history[r.device] ?? [];
        const history = r.bpm == null ? past : [...past, r.bpm].slice(-HISTORY);
        return {
          ...prev,
          devices: { ...prev.devices, [r.device]: r },
          history: { ...prev.history, [r.device]: history },
        };
      });
    });
    return () => {
      stopSnapshot();
      stopReading();
    };
  }, []);

  return <LiveContext.Provider value={live}>{children}</LiveContext.Provider>;
}

export const useLiveDevices = () => useContext(LiveContext);
