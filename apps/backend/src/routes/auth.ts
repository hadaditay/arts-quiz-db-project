import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { config } from '../config';
import { createSession, getSession, revokeSession } from '../services/sessionService';
import { authenticateUser, createUser } from '../services/userService';

export async function authRoutes(app: FastifyInstance) {
  const loginSchema = z.object({
    username: z.string().trim().min(1).max(64),
    password: z.string().min(1).max(128)
  });

  const registerSchema = z.object({
    username: z.string().trim().min(1).max(64),
    password: z.string().min(1).max(128),
    firstName: z.string().trim().min(1).max(64),
    lastName: z.string().trim().min(1).max(64)
  });

  app.post('/api/auth/login', async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({ error: 'Username and password are required' });
    }

    const { username, password } = parsed.data;
    const user = await authenticateUser(username, password);

    if (!user) {
      return reply.code(401).send({
        error: 'Username and/or password are incorrect'
      });
    }

    const session = await createSession(user.userId, user.username);

    reply.setCookie(config.sessionCookieName, session.sessionId, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
      secure: process.env.NODE_ENV === 'production',
      signed: true
    });

    return {
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName
    };
  });

  app.post('/api/auth/register', async (request, reply) => {
    const parsed = registerSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({
        error: 'Username, password, first name and last name are required'
      });
    }

    const { username, password, firstName, lastName } = parsed.data;

    try {
      const user = await createUser(username, password, firstName, lastName);
      const session = await createSession(user.userId, user.username);

      reply.setCookie(config.sessionCookieName, session.sessionId, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 30,
        secure: process.env.NODE_ENV === 'production',
        signed: true
      });

      return {
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed';

      if (message === 'Username already exists') {
        return reply.code(409).send({ error: message });
      }

      return reply.code(400).send({ error: message });
    }
  });

  app.post('/api/auth/logout', async (request, reply) => {
    const rawCookie = request.cookies[config.sessionCookieName];

    if (rawCookie) {
      const unsigned = request.unsignCookie(rawCookie);
      if (unsigned.valid && unsigned.value) {
        await revokeSession(unsigned.value);
      }
    }

    reply.clearCookie(config.sessionCookieName, {
      path: '/'
    });

    return { ok: true };
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

    return {
      username: session.username
    };
  });
}