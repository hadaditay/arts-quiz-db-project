import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createRound, answerRound } from '../services/roundService';

export async function roundRoutes(app: FastifyInstance) {
  app.get('/api/rounds/next', async (request, reply) => {
    if (!request.user) {
      return reply.code(401).send({ error: 'Not authenticated' });
    }

    const querySchema = z.object({ type: z.string().optional() });
    const parsedQuery = querySchema.safeParse(request.query);
    const preferredType = parsedQuery.success ? parsedQuery.data.type : undefined;

    const round = await createRound(request.user, preferredType);
    return round;
  });

  app.post('/api/rounds/:roundId/answer', async (request, reply) => {
    if (!request.user) {
      return reply.code(401).send({ error: 'Not authenticated' });
    }

    const paramsSchema = z.object({ roundId: z.string().min(1) });
    const bodySchema = z.object({ selected: z.string().min(1) });

    const parsedParams = paramsSchema.parse(request.params);
    const parsedBody = bodySchema.safeParse(request.body);

    if (!parsedBody.success) {
      return reply.code(400).send({ error: 'Missing selection' });
    }

    const result = await answerRound(request.user, parsedParams.roundId, parsedBody.data.selected);
    return result;
  });
}
