export type QuestionType = 'department' | 'culture' | 'era' | 'medium';

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
  prompt: string;
  correctValue: string;
  options: Option[];
  artwork: ArtworkRef;
}

export interface AnswerResponse {
  correct: boolean;
  payload: Round;
}

export interface LeaderboardEntry {
  username: string;
  score: number;
}

export interface User {
  username: string;
}
