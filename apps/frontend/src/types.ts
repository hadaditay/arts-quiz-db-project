export type QuestionType = 'department' | 'culture';

export interface ArtworkRef {
  id: number;
  title: string;
  primaryImageSmall: string | null;
  primaryImage: string | null;
}

export interface Option {
  value: string;
  label: string;
}

export interface Round {
  roundId: string;
  questionType: QuestionType;
  requiresImage: boolean;
  prompt: string;
  correctValue: string;
  options: Option[];
  artwork: ArtworkRef;
}

export interface AnswerResponse {
  correct: boolean;
  payload: Round;
}

export interface User {
  username: string;
  firstName?: string;
  lastName?: string;
}
