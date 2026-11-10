import type { Connect, Plugin } from 'vite';
import { createChatStore, validateChat } from './chat';

/**
 * Dev-server relay for the class chat.
 *
 * Pages POST chat messages to /api/chat, and the relay pushes each one to every open page over
 * Server-Sent Events (/api/stream). Nothing is saved: restarting `npm run dev` forgets every message.
 * Heart-rate readings don't come through here: pages pull them from ThingSpeak (src/lib/liveDevices.tsx).
 */

type Req = Parameters<Connect.NextHandleFunction>[0];
type Res = Parameters<Connect.NextHandleFunction>[1];

const MAX_BODY_CHARS = 4096;
const KEEP_ALIVE_MS = 15_000;

function parseBody(raw: string): Record<string, unknown> {
  const text = raw.trim();
  if (text.startsWith('{')) {
    const parsed: unknown = JSON.parse(text);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as Record<string, unknown>;
    throw new Error('JSON body must be an object');
  }
  return Object.fromEntries(new URLSearchParams(text));
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
  const chat = createChatStore();
  const clients = new Set<Res>();
  const event = (res: Res, name: string, data: unknown) => res.write(`event: ${name}\ndata: ${JSON.stringify(data)}\n\n`);
  /** Messages go out with their age rather than a timestamp, so a phone with a different clock still works. */
  const withAge = <T extends { at: number }>(r: T, now: number) => {
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

    if (path === '/chat' && req.method === 'POST') {
      let body: Record<string, unknown>;
      try {
        body = parseBody(await readBody(req));
      } catch (err) {
        return sendText(res, 400, `Could not read body: ${(err as Error).message}\n`);
      }
      const message = validateChat(body, Date.now());
      if (typeof message === 'string') return sendText(res, 400, message + '\n');
      // A resend of a stored message (same id) is accepted but not sent out again.
      if (chat.add(message)) clients.forEach((client) => event(client, 'chat', withAge(message, message.at)));
      return sendText(res, 204);
    }

    if (path === '/chat' && req.method === 'GET') {
      const now = Date.now();
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify(chat.all().map((m) => withAge(m, now)), null, 2) + '\n');
    }

    if (path === '/stream' && req.method === 'GET') {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      event(res, 'chat-snapshot', chat.all().map((m) => withAge(m, Date.now())));
      clients.add(res);
      req.on('close', () => clients.delete(res));
      return;
    }

    next();
  });
}

/** Adds the /api chat relay to `npm run dev` and `npm run preview`. */
export function chatRelay(): Plugin {
  return {
    name: 'cccare-chat-relay',
    configureServer: (server) => attachRelay(server.middlewares),
    configurePreviewServer: (server) => attachRelay(server.middlewares),
  };
}
