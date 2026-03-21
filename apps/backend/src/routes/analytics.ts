import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import * as analytics from '../services/analyticsService';

export async function analyticsRoutes(app: FastifyInstance) {
  // Q1: Wine regions sharing homeland with an artwork
  app.get('/api/analytics/wine-region/:artworkId', async (request) => {
    const { artworkId } = z.object({ artworkId: z.coerce.number() }).parse(request.params);
    return analytics.wineRegionFromArtwork(artworkId);
  });

  // Q2: Food pairings from artwork's homeland wines
  app.get('/api/analytics/food-pairing/:artworkId', async (request) => {
    const { artworkId } = z.object({ artworkId: z.coerce.number() }).parse(request.params);
    return analytics.foodPairingFromArtwork(artworkId);
  });

  // Q3: Art periods matching a wine's homeland
  app.get('/api/analytics/art-period-from-wine/:wineId', async (request) => {
    const { wineId } = z.object({ wineId: z.coerce.number() }).parse(request.params);
    return analytics.artPeriodFromWine(wineId);
  });

  // Q4: Sommelier's pick for an artwork's era
  app.get('/api/analytics/sommelier-pick/:artworkId', async (request) => {
    const { artworkId } = z.object({ artworkId: z.coerce.number() }).parse(request.params);
    return analytics.sommelierPick(artworkId);
  });

  // Q5: Continental art period timeline
  app.get('/api/analytics/continental-timeline', async () => {
    return analytics.continentalTimeline();
  });

  // Q6: Department diversity rankings
  app.get('/api/analytics/department-diversity', async () => {
    return analytics.departmentDiversity();
  });

  // Q7: Countries with both great wines and great art
  app.get('/api/analytics/wine-art-country', async () => {
    return analytics.wineArtCountryMatch();
  });

  // Q8: Full sensory experience for an artwork
  app.get('/api/analytics/sensory-experience/:artworkId', async (request) => {
    const { artworkId } = z.object({ artworkId: z.coerce.number() }).parse(request.params);
    return analytics.fullSensoryExperience(artworkId);
  });

  // Q9: Cross-period artists and their homeland wines
  app.get('/api/analytics/cross-period-artists', async () => {
    return analytics.crossPeriodArtistWines();
  });

  // Q10: Period-weighted leaderboard
  app.get('/api/analytics/period-leaderboard', async () => {
    return analytics.periodLeaderboard();
  });

  // Q11: Player session stats (requires auth)
  app.get('/api/analytics/player-stats', async (request, reply) => {
    if (!request.user) {
      return reply.code(401).send({ error: 'Not authenticated' });
    }
    return analytics.playerSessionStats(request.user.userId);
  });

  // Q12: Question difficulty by art period
  app.get('/api/analytics/difficulty-by-period', async () => {
    return analytics.difficultyByPeriod();
  });

  // Q13: Wars/battles matching an artwork's homeland and era
  app.get('/api/analytics/war-from-artwork/:artworkId', async (request) => {
    const { artworkId } = z.object({ artworkId: z.coerce.number() }).parse(request.params);
    return analytics.warFromArtwork(artworkId);
  });

  // Q14: Artworks created during a specific war
  app.get('/api/analytics/artwork-from-war/:warId', async (request) => {
    const { warId } = z.object({ warId: z.coerce.number() }).parse(request.params);
    return analytics.artworkFromWar(warId);
  });

  // Q15: Art Born in Conflict analytics
  app.get('/api/analytics/art-born-in-conflict', async () => {
    return analytics.artBornInConflict();
  });
}
