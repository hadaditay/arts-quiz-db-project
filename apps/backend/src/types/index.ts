export type QuestionTypeId = 'department' | 'culture' | 'era' | 'medium';

export interface Artwork {
  artworkId: number;
  title: string;
  department: string | null;
  culture: string | null;
  classification: string | null;
  medium: string | null;
  objectBeginYear: number | null;
  objectEndYear: number | null;
  eraBucket: string | null;
  isPublicDomain: boolean;
  isHighlight: boolean;
  primaryImage: string | null;
  primaryImageSmall: string | null;
  objectUrl: string | null;
  tags: string[] | null;
}

export interface QuestionOption {
  value: string;
  label: string;
}

export interface RoundPayload {
  roundId: string;
  questionType: QuestionTypeId;
  prompt: string;
  correctValue: string;
  options: QuestionOption[];
  artwork: {
    id: number;
    title: string;
    primaryImageSmall: string | null;
    primaryImage: string | null;
  };
}

export type GeneratedQuestion = Omit<RoundPayload, 'roundId'>;

export interface AuthSession {
  sessionId: string;
  userId: number;
  username: string;
}
