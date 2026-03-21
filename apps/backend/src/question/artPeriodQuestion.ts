import { RowDataPacket } from 'mysql2/promise';
import { getRandomMappedArtwork } from '../services/artworkService';
import { artPeriodsFromArtwork } from '../services/analyticsService';
import { GeneratedQuestion } from '../types';
import { shuffle } from '../utils/random';
import { QuestionContext, QuestionGenerator } from './base';

export const artPeriodQuestion: QuestionGenerator = {
  id: 'art_period',
  label: 'Art Period',
  async generate({ connection }: QuestionContext) {
    const artwork = await getRandomMappedArtwork(connection, true);
    if (!artwork) return null;

    const results = await artPeriodsFromArtwork(artwork.artworkId, connection);
    if (!results.length) return null;

    const correct = results[0].period_name as string;
    let distractors = results.slice(1).map((r) => r.period_name as string);

    if (distractors.length < 3) {
      const [extra] = await connection.query<RowDataPacket[]>(
        `SELECT period_name FROM art_period
         WHERE period_name != ?
         ORDER BY RAND() LIMIT ?`,
        [correct, 3 - distractors.length]
      );
      distractors.push(...extra.map((r) => r.period_name as string));
    }

    distractors = distractors.filter((d) => d !== correct).slice(0, 3);
    if (distractors.length < 3) return null;

    const options = shuffle([correct, ...distractors]).map((v) => ({ value: v, label: v }));

    const payload: GeneratedQuestion = {
      questionType: 'art_period',
      requiresImage: true,
      prompt: 'Which art movement flourished in the homeland of this artwork?',
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
