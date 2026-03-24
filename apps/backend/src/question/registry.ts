import { PoolConnection } from 'mysql2/promise';
import { choice, shuffle } from '../utils/random';
import { QuestionGenerator } from './base';
import { cultureQuestion } from './cultureQuestion';
import { departmentQuestion } from './departmentQuestion';
import { wineRegionQuestion } from './wineRegionQuestion';
import { foodPairingQuestion } from './foodPairingQuestion';
import { artPeriodQuestion } from './artPeriodQuestion';
import { sommelierQuestion } from './sommelierQuestion';
import { sensoryQuestion } from './sensoryQuestion';
import { warConflictQuestion } from './warConflictQuestion';
import { artistNationalityQuestion } from './artistNationalityQuestion';
import { artworkNameQuestion } from './artworkNameQuestion';

const generators: QuestionGenerator[] = [
  departmentQuestion,
  cultureQuestion,
  wineRegionQuestion,
  foodPairingQuestion,
  artPeriodQuestion,
  sommelierQuestion,
  sensoryQuestion,
  warConflictQuestion,
  artistNationalityQuestion,
  artworkNameQuestion
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
    try {
      const result = await generator.generate({ connection });
      if (result) return result;
    } catch (err) {
      console.warn(`Question generator "${generator.id}" failed:`, (err as Error).message);
    }
  }

  return null;
}