import { PoolConnection } from 'mysql2/promise';
import { GeneratedQuestion, QuestionTypeId } from '../types';

export interface QuestionContext {
  connection: PoolConnection;
}

export interface QuestionGenerator {
  id: QuestionTypeId;
  label: string;
  generate(context: QuestionContext): Promise<GeneratedQuestion | null>;
}
