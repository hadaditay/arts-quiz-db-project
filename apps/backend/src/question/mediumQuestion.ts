import { buildOptionsForField, getRandomArtworkWithField } from '../services/artworkService';
import { GeneratedQuestion } from '../types';
import { QuestionContext, QuestionGenerator } from './base';

export const mediumQuestion: QuestionGenerator = {
  id: 'medium',
  label: 'Medium',
  async generate({ connection }: QuestionContext) {
    const artwork = await getRandomArtworkWithField('medium', connection);
    if (!artwork || !artwork.medium) return null;

    const options = await buildOptionsForField('medium', artwork.medium, connection);

    const payload: GeneratedQuestion = {
      questionType: 'medium',
      prompt: 'What is the medium of this artwork?',
      correctValue: artwork.medium,
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
