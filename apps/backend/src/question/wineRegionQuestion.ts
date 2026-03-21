import { RowDataPacket } from 'mysql2/promise';
import { getRandomMappedArtwork } from '../services/artworkService';
import { wineRegionFromArtwork } from '../services/analyticsService';
import { GeneratedQuestion } from '../types';
import { shuffle } from '../utils/random';
import { QuestionContext, QuestionGenerator } from './base';

export const wineRegionQuestion: QuestionGenerator = {
  id: 'wine_region',
  label: 'Wine Region',
  async generate({ connection }: QuestionContext) {
    const artwork = await getRandomMappedArtwork(connection);
    if (!artwork) return null;

    const results = await wineRegionFromArtwork(artwork.artworkId, connection);
    if (!results.length) return null;

    const correct = results[0].province as string;
    let distractors = results.slice(1).map((r) => r.province as string);

    if (distractors.length < 3) {
      const [extra] = await connection.query<RowDataPacket[]>(
        `SELECT DISTINCT province FROM wine
         WHERE province IS NOT NULL AND province != ?
         ORDER BY RAND() LIMIT ?`,
        [correct, 3 - distractors.length]
      );
      distractors.push(...extra.map((r) => r.province as string));
    }

    distractors = distractors.filter((d) => d !== correct).slice(0, 3);
    if (distractors.length < 3) return null;

    const options = shuffle([correct, ...distractors]).map((v) => ({ value: v, label: v }));

    const payload: GeneratedQuestion = {
      questionType: 'wine_region',
      requiresImage: true,
      prompt: 'Which wine region shares a homeland with this artwork?',
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
