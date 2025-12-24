import { buildOptionsForField, getRandomArtworkWithField } from '../services/artworkService';
import { GeneratedQuestion } from '../types';
import { QuestionContext, QuestionGenerator } from './base';

export const departmentQuestion: QuestionGenerator = {
  id: 'department',
  label: 'Department',
  async generate({ connection }: QuestionContext) {
    const artwork = await getRandomArtworkWithField('department', connection);
    if (!artwork || !artwork.department) return null;

    const options = await buildOptionsForField('department', artwork.department, connection);

    const payload: GeneratedQuestion = {
      questionType: 'department',
      prompt: 'Which department holds this artwork?',
      correctValue: artwork.department,
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
