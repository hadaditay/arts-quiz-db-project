export type QuestionTypeId = 'department' | 'culture' | 'wine_region' | 'food_pairing' | 'art_period' | 'sommelier' | 'sensory' | 'war_conflict';

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

// --- Answer Enrichment Types ---

export interface ArtworkContext {
  title: string | null;
  artistName: string | null;
  culture: string | null;
  department: string | null;
  isHighlight: boolean;
  objectUrl: string | null;
  tags: string[] | null;
}

export interface ArtistContext {
  fullName: string;
  bio: string | null;
  birthYear: number | null;
  deathYear: number | null;
}

export interface PeriodContext {
  periodName: string;
  region: string;
  startYear: number;
  endYear: number;
  artworkCount: number;
}

export interface WineHighlight {
  variety: string;
  winery: string;
  avgPoints: number;
  country: string;
  priceRange: string | null;
}

export interface FoodPairingContext {
  foodName: string;
  cuisineRegion: string;
  variety: string;
  avgWinePoints: number;
}

export interface WarContext {
  warName: string;
  warType: string;
  startYear: number;
  endYear: number;
  region: string;
  countryName: string | null;
  description: string | null;
  notableFigures: string | null;
}

export interface DepartmentEnrichment {
  type: 'department';
  connectionTrail: string[];
  artwork: ArtworkContext;
  artist: ArtistContext | null;
  periods: PeriodContext[];
  departmentStats: { totalArtworks: number; countryCount: number; topCountry: string | null };
}

export interface CultureEnrichment {
  type: 'culture';
  connectionTrail: string[];
  artwork: ArtworkContext;
  artist: ArtistContext | null;
  country: { countryName: string; continent: string } | null;
  cultureArtworkCount: number;
  notableWineVariety: string | null;
}

export interface WineRegionEnrichment {
  type: 'wine_region';
  connectionTrail: string[];
  artwork: ArtworkContext;
  regions: Array<{ province: string; avgPoints: number; wineCount: number; topVariety: string }>;
  countryName: string | null;
}

export interface FoodPairingEnrichment {
  type: 'food_pairing';
  connectionTrail: string[];
  artwork: ArtworkContext;
  pairings: FoodPairingContext[];
  countryName: string | null;
}

export interface ArtPeriodEnrichment {
  type: 'art_period';
  connectionTrail: string[];
  artwork: ArtworkContext;
  artist: ArtistContext | null;
  period: PeriodContext | null;
  siblingPeriods: PeriodContext[];
}

export interface SommelierEnrichment {
  type: 'sommelier';
  connectionTrail: string[];
  artwork: ArtworkContext;
  period: PeriodContext | null;
  topWines: WineHighlight[];
}

export interface SensoryEnrichment {
  type: 'sensory';
  connectionTrail: string[];
  artwork: ArtworkContext;
  period: PeriodContext | null;
  wine: WineHighlight | null;
  foodPairing: FoodPairingContext | null;
  countryName: string | null;
}

export interface WarConflictEnrichment {
  type: 'war_conflict';
  connectionTrail: string[];
  artwork: ArtworkContext;
  artist: ArtistContext | null;
  period: PeriodContext | null;
  war: WarContext;
  siblingConflicts: Array<{ warName: string; warType: string; startYear: number; endYear: number }>;
}

export type AnswerEnrichment =
  | DepartmentEnrichment
  | CultureEnrichment
  | WineRegionEnrichment
  | FoodPairingEnrichment
  | ArtPeriodEnrichment
  | SommelierEnrichment
  | SensoryEnrichment
  | WarConflictEnrichment;
