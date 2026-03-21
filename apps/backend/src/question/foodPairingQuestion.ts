import { RowDataPacket } from 'mysql2/promise';
import { getRandomMappedArtwork } from '../services/artworkService';
import { foodPairingFromArtwork } from '../services/analyticsService';
import { GeneratedQuestion } from '../types';
import { shuffle } from '../utils/random';
import { QuestionContext, QuestionGenerator } from './base';

export const foodPairingQuestion: QuestionGenerator = {
  id: 'food_pairing',
  label: 'Food Pairing',
  async generate({ connection }: QuestionContext) {
    const artwork = await getRandomMappedArtwork(connection);
    if (!artwork) return null;

    const results = await foodPairingFromArtwork(artwork.artworkId, connection);
    if (!results.length) return null;

    const correct = results[0].food_name as string;
    let distractors = results.slice(1).map((r) => r.food_name as string);

    if (distractors.length < 3) {
      const [extra] = await connection.query<RowDataPacket[]>(
        `SELECT DISTINCT food_name FROM wine_food_pairing
         WHERE food_name != ?
         ORDER BY RAND() LIMIT ?`,
        [correct, 3 - distractors.length]
      );
      distractors.push(...extra.map((r) => r.food_name as string));
    }

    distractors = distractors.filter((d) => d !== correct).slice(0, 3);
    if (distractors.length < 3) return null;

    const options = shuffle([correct, ...distractors]).map((v) => ({ value: v, label: v }));

    const payload: GeneratedQuestion = {
      questionType: 'food_pairing',
      requiresImage: true,
      prompt: 'Which dish pairs with wines from the region of this artwork?',
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
