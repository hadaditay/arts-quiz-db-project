import { getDistinctArtworkTitles, getRandomArtworkWithTitle } from '../services/artworkService';
import { GeneratedQuestion } from '../types';
import { shuffle } from '../utils/random';
import { QuestionContext, QuestionGenerator } from './base';

export const artworkNameQuestion: QuestionGenerator = {
  id: 'artwork_name',
  label: 'Artwork Name',
  async generate({ connection }: QuestionContext) {
    const artwork = await getRandomArtworkWithTitle(connection, true);
    if (!artwork || !artwork.title) return null;

    const distractors = await getDistinctArtworkTitles(artwork.title, 3, connection);
    if (distractors.length < 3) return null;

    const options = shuffle([artwork.title, ...distractors]).map((value) => ({
      value,
      label: value
    }));

    const payload: GeneratedQuestion = {
      questionType: 'artwork_name',
      requiresImage: true,
      prompt: 'What is the name of this artwork?',
      correctValue: artwork.title,
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
