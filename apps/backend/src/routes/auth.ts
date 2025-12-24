import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { config } from '../config';
import { createSession, getSession } from '../services/sessionService';
import { findOrCreateUser } from '../services/userService';

export async function authRoutes(app: FastifyInstance) {
  const loginSchema = z.object({
    username: z.string().trim().min(1).max(64)
  });

  app.post('/api/auth/login', async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Username is required' });
    }

    const { username } = parsed.data;
    const user = await findOrCreateUser(username);
    const session = await createSession(user.userId, user.username);

    reply.setCookie(config.sessionCookieName, session.sessionId, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
      secure: process.env.NODE_ENV === 'production',
      signed: true
    });

    return { username: session.username };
  });

  app.get('/api/auth/me', async (request, reply) => {
    const rawCookie = request.cookies[config.sessionCookieName];
    if (!rawCookie) {
      return reply.code(401).send({ error: 'Not authenticated' });
    }

    const unsigned = request.unsignCookie(rawCookie);
    if (!unsigned.valid || !unsigned.value) {
      return reply.code(401).send({ error: 'Not authenticated' });
    }

    const session = await getSession(unsigned.value);
    if (!session) {
      return reply.code(401).send({ error: 'Not authenticated' });
    }

    return { username: session.username };
  });
}
