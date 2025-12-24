import { FastifyInstance } from 'fastify';
import { getAllTimeLeaderboard } from '../services/leaderboardService';

export async function leaderboardRoutes(app: FastifyInstance) {
  app.get('/api/leaderboard/all-time', async () => {
    const entries = await getAllTimeLeaderboard();
    return { entries };
  });
}
