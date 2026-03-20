import { buildOptionsForField, getRandomArtworkWithField } from '../services/artworkService';
import { GeneratedQuestion } from '../types';
import { QuestionContext, QuestionGenerator } from './base';

export const cultureQuestion: QuestionGenerator = {
  id: 'culture',
  label: 'Culture',
  async generate({ connection }: QuestionContext) {
    const artwork = await getRandomArtworkWithField('culture', connection, true);
    if (!artwork || !artwork.culture) return null;

    const options = await buildOptionsForField('culture', artwork.culture, connection);

    const payload: GeneratedQuestion = {
      questionType: 'culture',
      requiresImage: true,
      prompt: 'Which culture is this artwork associated with?',
      correctValue: artwork.culture,
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
