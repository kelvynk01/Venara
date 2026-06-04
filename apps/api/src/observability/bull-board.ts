/**
 * bull-board.ts — admin-only queue monitoring (Brief §4/§13).
 *
 * Mounted at /admin/queues behind HTTP basic auth (credentials from env). Shows every
 * producer queue, including the Phase 1 no-op queue used to verify the BullMQ path.
 */
import { timingSafeEqual } from 'node:crypto';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { FastifyAdapter } from '@bull-board/fastify';
import { BRAND } from '@venara/shared';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { env } from '../env';
import { producerQueues } from '../queue/queues';

const BASE_PATH = '/admin/queues';

/** Length-checked constant-time string comparison (avoids credential timing leaks). */
function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

function requireBasicAuth(req: FastifyRequest, reply: FastifyReply, done: () => void): void {
  const header = req.headers.authorization ?? '';
  const [scheme, encoded] = header.split(' ');
  if (scheme === 'Basic' && encoded) {
    const decoded = Buffer.from(encoded, 'base64').toString();
    // RFC 7617: only the first colon separates user from password; the password
    // itself may contain colons, so split on the first index — not String.split(':').
    const colon = decoded.indexOf(':');
    const user = colon >= 0 ? decoded.slice(0, colon) : decoded;
    const pass = colon >= 0 ? decoded.slice(colon + 1) : '';
    if (safeEqual(user, env.BULL_BOARD_USER) && safeEqual(pass, env.BULL_BOARD_PASSWORD)) {
      done();
      return;
    }
  }
  void reply
    .header('WWW-Authenticate', `Basic realm="${BRAND.name} queues"`)
    .code(401)
    .send({ error: { code: 'unauthorized', message: 'Authentication required' } });
}

export async function registerBullBoard(app: FastifyInstance): Promise<void> {
  const serverAdapter = new FastifyAdapter();
  createBullBoard({
    queues: producerQueues.map((q) => new BullMQAdapter(q)),
    serverAdapter,
  });
  serverAdapter.setBasePath(BASE_PATH);

  await app.register(
    async (instance) => {
      instance.addHook('onRequest', requireBasicAuth);
      await instance.register(serverAdapter.registerPlugin(), { prefix: BASE_PATH });
    },
    { prefix: '/' },
  );
}
