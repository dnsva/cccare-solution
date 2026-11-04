import type { Connect, Plugin } from 'vite';

/**
 * Dev-server relay for the Arduino pulse oximeter.
 *
 * The Arduino POSTs a reading to /api/reading about once a second. The relay keeps the latest
 * reading per device in memory and pushes it to every open page over Server-Sent Events
 * (/api/stream). Nothing is saved: restarting `npm run dev` forgets every device.
 *
 * Reading contract (JSON or form-style text):
 *   {"device":"oxi-1","bpm":92,"spo2":97,"finger":true}
 *   device=oxi-1&bpm=92&spo2=97&finger=1
 * `spo2` is optional. With `finger` false (or 0), `bpm` and `spo2` may be left out.
 */

type Req = Parameters<Connect.NextHandleFunction>[0];
type Res = Parameters<Connect.NextHandleFunction>[1];

type RelayReading = { device: string; bpm: number | null; spo2: number | null; finger: boolean; at: number };

const DEVICE_RE = /^[A-Za-z0-9_-]{1,32}$/;
const MAX_BODY_CHARS = 2048;
const KEEP_ALIVE_MS = 15_000;

const toNumber = (v: unknown) => (typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN);
const toBool = (v: unknown) => v === true || v === 1 || v === '1' || v === 'true';

function parseBody(raw: string): Record<string, unknown> {
  const text = raw.trim();
  if (text.startsWith('{')) {
    const parsed: unknown = JSON.parse(text);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as Record<string, unknown>;
    throw new Error('JSON body must be an object');
  }
  return Object.fromEntries(new URLSearchParams(text));
}

/** A valid reading, or the reason it was rejected. */
function validate(input: Record<string, unknown>, now: number): RelayReading | string {
  const device = String(input.device ?? '');
  if (!DEVICE_RE.test(device)) return 'device must be 1-32 letters, digits, - or _';
  const finger = input.finger === undefined ? true : toBool(input.finger);
  if (!finger) return { device, bpm: null, spo2: null, finger, at: now };

  const bpm = toNumber(input.bpm);
  if (!Number.isFinite(bpm) || bpm < 30 || bpm > 230) return 'bpm must be a number from 30 to 230';
  let spo2: number | null = null;
  if (input.spo2 !== undefined && input.spo2 !== '') {
    spo2 = toNumber(input.spo2);
    if (!Number.isFinite(spo2) || spo2 < 50 || spo2 > 100) return 'spo2 must be a number from 50 to 100';
  }
  return { device, bpm: Math.round(bpm), spo2: spo2 == null ? null : Math.round(spo2), finger, at: now };
}

function readBody(req: Req): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.setEncoding('utf8');
    req.on('data', (chunk: string) => {
      body += chunk;
      if (body.length > MAX_BODY_CHARS) reject(new Error('body too large'));
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function sendText(res: Res, status: number, text = '') {
  res.statusCode = status;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.end(text);
}

function attachRelay(middlewares: Connect.Server) {
  const latest = new Map<string, RelayReading>();
  const clients = new Set<Res>();
  const event = (res: Res, name: string, data: unknown) => res.write(`event: ${name}\ndata: ${JSON.stringify(data)}\n\n`);
  /** Readings go out with their age rather than a timestamp, so a phone with a different clock still works. */
  const withAge = (r: RelayReading, now: number) => {
    const { at, ...rest } = r;
    return { ...rest, ageMs: now - at };
  };

  const keepAlive = setInterval(() => clients.forEach((res) => res.write(': ping\n\n')), KEEP_ALIVE_MS);
  // Don't let the timer keep Node running after the server closes.
  (keepAlive as { unref?: () => void }).unref?.();

  // Mounted at /api, so req.url here is the rest of the path.
  middlewares.use('/api', async (req, res, next) => {
    const path = (req.url ?? '').split('?')[0];
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return sendText(res, 204);

    if (path === '/reading' && req.method === 'POST') {
      let reading: RelayReading | string;
      try {
        reading = validate(parseBody(await readBody(req)), Date.now());
      } catch (err) {
        return sendText(res, 400, `Could not read body: ${(err as Error).message}\n`);
      }
      if (typeof reading === 'string') return sendText(res, 400, reading + '\n');
      latest.set(reading.device, reading);
      const payload = withAge(reading, reading.at);
      clients.forEach((client) => event(client, 'reading', payload));
      return sendText(res, 204);
    }

    if (path === '/stream' && req.method === 'GET') {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      const now = Date.now();
      event(res, 'snapshot', [...latest.values()].map((r) => withAge(r, now)));
      clients.add(res);
      req.on('close', () => clients.delete(res));
      return;
    }

    if (path === '/devices' && req.method === 'GET') {
      const now = Date.now();
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify([...latest.values()].map((r) => withAge(r, now)), null, 2) + '\n');
    }

    next();
  });
}

/** Adds the /api relay to `npm run dev` and `npm run preview`. */
export function deviceRelay(): Plugin {
  return {
    name: 'cccare-device-relay',
    configureServer: (server) => attachRelay(server.middlewares),
    configurePreviewServer: (server) => attachRelay(server.middlewares),
  };
}
