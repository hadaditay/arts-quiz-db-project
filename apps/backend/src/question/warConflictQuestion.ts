import { RowDataPacket } from 'mysql2/promise';
import { getRandomMappedArtwork } from '../services/artworkService';
import { warFromArtwork } from '../services/analyticsService';
import { GeneratedQuestion } from '../types';
import { shuffle } from '../utils/random';
import { QuestionContext, QuestionGenerator } from './base';

export const warConflictQuestion: QuestionGenerator = {
  id: 'war_conflict',
  label: 'War & Conflict',
  async generate({ connection }: QuestionContext) {
    const artwork = await getRandomMappedArtwork(connection, true);
    if (!artwork) return null;

    const results = await warFromArtwork(artwork.artworkId, connection);
    if (!results.length) return null;

    const correct = results[0].war_name as string;
    let distractors = results.slice(1).map((r) => r.war_name as string);

    if (distractors.length < 3) {
      const [extra] = await connection.query<RowDataPacket[]>(
        `SELECT DISTINCT war_name FROM war_battle
         WHERE war_name != ?
         ORDER BY RAND() LIMIT ?`,
        [correct, 3 - distractors.length]
      );
      distractors.push(...extra.map((r) => r.war_name as string));
    }

    distractors = distractors.filter((d) => d !== correct).slice(0, 3);
    if (distractors.length < 3) return null;

    const options = shuffle([correct, ...distractors]).map((v) => ({ value: v, label: v }));

    const payload: GeneratedQuestion = {
      questionType: 'war_conflict',
      requiresImage: true,
      prompt: 'Which conflict raged near this artwork\'s homeland while it was being created?',
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
