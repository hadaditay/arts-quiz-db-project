export type QuestionTypeId = 'department' | 'culture';

export interface Artwork {
  artworkId: number;
  title: string;
  department: string | null;
  culture: string | null;
  artistDisplayName: string | null;
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
  requiresImage: boolean;
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
