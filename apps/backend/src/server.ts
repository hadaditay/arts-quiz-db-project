import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import { config } from './config';
import { authRoutes } from './routes/auth';
import { roundRoutes } from './routes/rounds';
import { analyticsRoutes } from './routes/analytics';
import { getSession, touchSession } from './services/sessionService';

const app = Fastify({ logger: true });

app.register(cors, {
  origin: config.corsOrigin,
  credentials: true
});

app.register(cookie, {
  secret: config.sessionSecret,
  hook: 'onRequest'
});

app.addHook('preHandler', async (request) => {
  const rawCookie = request.cookies[config.sessionCookieName];
  if (!rawCookie) return;

  const unsigned = request.unsignCookie(rawCookie);
  if (!unsigned.valid || !unsigned.value) return;

  const session = await getSession(unsigned.value);
  if (session) {
    request.user = session;
    await touchSession(session.sessionId);
  }
});

app.register(authRoutes);
app.register(roundRoutes);
app.register(analyticsRoutes);

app.get('/health', async () => ({ status: 'ok' }));

export async function start() {
  try {
    await app.listen({ port: config.port, host: '0.0.0.0' });
    app.log.info(`Server listening on ${config.port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== 'test') {
  start();
}