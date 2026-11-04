import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { DeviceReading } from '../types';

/** A reading older than this means the sensor stopped sending. */
export const LIVE_STALE_MS = 5000;
/** How many bpm values to keep per device for the sparkline. */
const HISTORY = 24;
/** Wait before reconnecting when the relay can't be reached at all. */
const RETRY_MS = 5000;

export type RelayStatus = 'connecting' | 'connected' | 'unavailable';

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
    let source: EventSource | null = null;
    let retry: ReturnType<typeof setTimeout> | undefined;

    const connect = () => {
      source = new EventSource('/api/stream');
      source.onopen = () => setLive((prev) => ({ ...prev, status: 'connected' }));
      source.onerror = () => {
        setLive((prev) => ({ ...prev, status: 'unavailable' }));
        // EventSource retries dropped connections itself, but gives up if the server isn't a relay at all.
        if (source?.readyState === EventSource.CLOSED) {
          source.close();
          retry = setTimeout(connect, RETRY_MS);
        }
      };
      source.addEventListener('snapshot', (e) => {
        const readings = (JSON.parse(e.data) as Incoming[]).map(toReading);
        setLive((prev) => ({ ...prev, devices: Object.fromEntries(readings.map((r) => [r.device, r])) }));
      });
      source.addEventListener('reading', (e) => {
        const r = toReading(JSON.parse(e.data) as Incoming);
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
    };

    connect();
    return () => {
      clearTimeout(retry);
      source?.close();
    };
  }, []);

  return <LiveContext.Provider value={live}>{children}</LiveContext.Provider>;
}

export const useLiveDevices = () => useContext(LiveContext);
