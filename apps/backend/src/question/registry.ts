import { PoolConnection } from 'mysql2/promise';
import { choice, shuffle } from '../utils/random';
import { QuestionGenerator } from './base';
import { cultureQuestion } from './cultureQuestion';
import { departmentQuestion } from './departmentQuestion';
import { eraQuestion } from './eraQuestion';
import { mediumQuestion } from './mediumQuestion';

const generators: QuestionGenerator[] = [
  departmentQuestion,
  cultureQuestion,
  eraQuestion,
  mediumQuestion
];

export function listQuestionGenerators() {
  return generators;
}

export function pickGenerator(preferred?: string): QuestionGenerator | null {
  if (preferred) {
    const match = generators.find((g) => g.id === preferred);
    if (match) return match;
  }
  return choice(generators) || null;
}

export async function generateQuestion(
  connection: PoolConnection,
  preferredType?: string
) {
  const ordered = preferredType
    ? [
        ...generators.filter((g) => g.id === preferredType),
        ...generators.filter((g) => g.id !== preferredType)
      ]
    : shuffle([...generators]);

  for (const generator of ordered) {
    const result = await generator.generate({ connection });
    if (result) return result;
  }

  return null;
}
