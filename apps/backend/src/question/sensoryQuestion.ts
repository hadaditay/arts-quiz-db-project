import { RowDataPacket } from 'mysql2/promise';
import { getRandomMappedArtwork } from '../services/artworkService';
import { fullSensoryExperience } from '../services/analyticsService';
import { GeneratedQuestion } from '../types';
import { shuffle } from '../utils/random';
import { QuestionContext, QuestionGenerator } from './base';

export const sensoryQuestion: QuestionGenerator = {
  id: 'sensory',
  label: 'Sensory Experience',
  async generate({ connection }: QuestionContext) {
    const artwork = await getRandomMappedArtwork(connection, true);
    if (!artwork) return null;

    const results = await fullSensoryExperience(artwork.artworkId, connection);
    if (!results.length) return null;

    const formatLabel = (r: RowDataPacket) =>
      `${r.variety} with ${r.food_name} (${r.cuisine_region})`;

    const correct = formatLabel(results[0]);
    const seen = new Set([correct]);
    let distractors = results.slice(1).map(formatLabel).filter((d) => {
      if (seen.has(d)) return false;
      seen.add(d);
      return true;
    });

    if (distractors.length < 3) {
      const [extra] = await connection.query<RowDataPacket[]>(
        `SELECT wfp.variety, wfp.food_name, wfp.cuisine_region
         FROM wine_food_pairing wfp
         ORDER BY RAND() LIMIT ?`,
        [6]
      );
      for (const r of extra) {
        const label = `${r.variety} with ${r.food_name} (${r.cuisine_region})`;
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
      questionType: 'sensory',
      requiresImage: true,
      prompt: 'For a gallery evening with this artwork, the sommelier recommends...',
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
