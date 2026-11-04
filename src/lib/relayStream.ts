/**
 * One connection per page to the dev server's /api/stream, shared by everything that needs live data
 * (pulse-oximeter readings, class chat). Browsers allow only about six open connections per site over
 * plain http, so a stream per feature would soon stall a few open tabs.
 */

export type RelayStatus = 'connecting' | 'connected' | 'unavailable';

type Handler = (data: unknown) => void;

/** Wait before reconnecting when the relay can't be reached at all. */
const RETRY_MS = 5000;

const handlers = new Map<string, Set<Handler>>();
const statusHandlers = new Set<(status: RelayStatus) => void>();
let source: EventSource | null = null;
let retry: ReturnType<typeof setTimeout> | undefined;
let status: RelayStatus = 'connecting';
let users = 0;

function setStatus(next: RelayStatus) {
  status = next;
  statusHandlers.forEach((fn) => fn(next));
}

function listen(es: EventSource, event: string) {
  es.addEventListener(event, (e) => {
    const data: unknown = JSON.parse((e as MessageEvent<string>).data);
    handlers.get(event)?.forEach((fn) => fn(data));
  });
}

function connect() {
  const es = new EventSource('/api/stream');
  source = es;
  handlers.forEach((_, event) => listen(es, event));
  es.onopen = () => setStatus('connected');
  es.onerror = () => {
    setStatus('unavailable');
    // EventSource retries dropped connections itself, but gives up if the server isn't a relay at all.
    if (es.readyState === EventSource.CLOSED) {
      es.close();
      if (source === es) source = null;
      retry = setTimeout(connect, RETRY_MS);
    }
  };
}

/** Keeps the stream open while at least one caller holds it. Returns the release function. */
function hold(): () => void {
  if (users++ === 0) connect();
  return () => {
    if (--users > 0) return;
    clearTimeout(retry);
    source?.close();
    source = null;
    setStatus('connecting');
  };
}

/**
 * Calls `handler` with each `event` the relay sends, and with the connection status as it changes.
 * Returns a function that stops listening.
 */
export function subscribe(event: string, handler: Handler, onStatus?: (status: RelayStatus) => void): () => void {
  let set = handlers.get(event);
  if (!set) {
    set = new Set();
    handlers.set(event, set);
    if (source) listen(source, event);
  }
  set.add(handler);
  if (onStatus) {
    statusHandlers.add(onStatus);
    onStatus(status);
  }
  const release = hold();
  return () => {
    set.delete(handler);
    if (onStatus) statusHandlers.delete(onStatus);
    release();
  };
}
