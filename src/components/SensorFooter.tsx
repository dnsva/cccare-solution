import { useLiveDevices } from '../lib/liveDevices';

/** Bottom-of-page readout of the newest value on the ThingSpeak channel, for checking the Arduino is uploading. */
export function SensorFooter() {
  const { status, latest } = useLiveDevices();
  const value =
    status === 'connecting'
      ? 'loading…'
      : status === 'unavailable'
        ? 'unavailable'
        : latest
          ? latest.value
          : 'no data (is the channel public?)';

  return (
    <footer className="sensor-footer" role="status">
      <span>
        Latest reading: <strong>{value}</strong>
      </span>
      <span>
        Updated: {latest && !Number.isNaN(latest.at) ? new Date(latest.at).toLocaleTimeString() : '–'}
      </span>
    </footer>
  );
}
