import { buildOptionsForField, getRandomArtworkWithField } from '../services/artworkService';
import { GeneratedQuestion } from '../types';
import { QuestionContext, QuestionGenerator } from './base';

export const eraQuestion: QuestionGenerator = {
  id: 'era',
  label: 'Era',
  async generate({ connection }: QuestionContext) {
    const artwork = await getRandomArtworkWithField('era', connection);
    if (!artwork || !artwork.eraBucket) return null;

    const options = await buildOptionsForField('era', artwork.eraBucket, connection);

    const payload: GeneratedQuestion = {
      questionType: 'era',
      prompt: 'Which era best matches this artwork?',
      correctValue: artwork.eraBucket,
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
