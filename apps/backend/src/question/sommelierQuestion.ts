import { RowDataPacket } from 'mysql2/promise';
import { getRandomMappedArtwork } from '../services/artworkService';
import { sommelierPick } from '../services/analyticsService';
import { GeneratedQuestion } from '../types';
import { shuffle } from '../utils/random';
import { QuestionContext, QuestionGenerator } from './base';

export const sommelierQuestion: QuestionGenerator = {
  id: 'sommelier',
  label: 'Sommelier',
  async generate({ connection }: QuestionContext) {
    const artwork = await getRandomMappedArtwork(connection, true);
    if (!artwork) return null;

    const results = await sommelierPick(artwork.artworkId, connection);
    if (!results.length) return null;

    const formatLabel = (r: RowDataPacket) =>
      `${r.variety} by ${r.winery}`;

    const correct = formatLabel(results[0]);
    const seen = new Set([correct]);
    let distractors = results.slice(1).map(formatLabel).filter((d) => {
      if (seen.has(d)) return false;
      seen.add(d);
      return true;
    });

    if (distractors.length < 3) {
      const [extra] = await connection.query<RowDataPacket[]>(
        `SELECT variety, winery
         FROM wine
         WHERE variety IS NOT NULL AND winery IS NOT NULL
         GROUP BY variety, winery
         ORDER BY RAND() LIMIT ?`,
        [6]
      );
      for (const r of extra) {
        const label = `${r.variety} by ${r.winery}`;
        if (!seen.has(label)) {
          seen.add(label);
          distractors.push(label);
        }
      }
    }

    distractors = distractors.slice(0, 3);
    if (distractors.length < 3) return null;

    const options = shuffle([correct, ...distractors]).map((v) => ({ value: v, label: v }));

    const payload: GeneratedQuestion = {
      questionType: 'sommelier',
      requiresImage: true,
      prompt: "The curator suggests pairing this artwork with a wine. Which gets the best reviews?",
      correctValue: correct,
      options,
      artwork: {
        id: artwork.artworkId,
        title: artwork.title,
        primaryImageSmall: artwork.primaryImageSmall,
        primaryImage: artwork.primaryImage
      }
    };

    return payload;
  }
};
