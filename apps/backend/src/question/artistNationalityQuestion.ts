import {
  getDistinctArtistNationalities,
  getRandomArtworkWithArtistNationality
} from '../services/artworkService';
import { GeneratedQuestion } from '../types';
import { shuffle } from '../utils/random';
import { QuestionContext, QuestionGenerator } from './base';

export const artistNationalityQuestion: QuestionGenerator = {
  id: 'artist_nationality',
  label: 'Artist Nationality',
  async generate({ connection }: QuestionContext) {
    const candidate = await getRandomArtworkWithArtistNationality(connection, true);
    if (!candidate) return null;

    const distractors = await getDistinctArtistNationalities(candidate.nationality, 3, connection);
    if (distractors.length < 3) return null;

    const options = shuffle([candidate.nationality, ...distractors]).map((value) => ({
      value,
      label: value
    }));

    const payload: GeneratedQuestion = {
      questionType: 'artist_nationality',
      requiresImage: true,
      prompt: 'What is the nationality of the artist who created this artwork?',
      correctValue: candidate.nationality,
      options,
      artwork: {
        id: candidate.artwork.artworkId,
        title: candidate.artwork.title,
        primaryImageSmall: candidate.artwork.primaryImageSmall,
        primaryImage: candidate.artwork.primaryImage
      }
    };

    return payload;
  }
};
