import 'fastify';
import { AuthSession } from './index';

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthSession;
  }
}
