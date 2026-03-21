export type QuestionType = 'department' | 'culture' | 'wine_region' | 'food_pairing' | 'art_period' | 'sommelier' | 'sensory' | 'war_conflict';

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

export interface AnswerResponse {
  correct: boolean;
  payload: Round;
  enrichment?: AnswerEnrichment;
}

export interface User {
  username: string;
  firstName?: string;
  lastName?: string;
}

// --- Analytics Types ---

export interface PlayerStats {
  stat_type: 'best_session' | 'all_time';
  context_id: string | null;
  rounds_played: number;
  correct_answers: number;
  total_points: number;
  accuracy_pct: number;
  period_start: string;
  period_end: string;
}

export interface LeaderboardEntry {
  username: string;
  base_score: string;
  periods_mastered: number;
  total_periods: number;
  weighted_score: string;
}

export interface WineArtCountryRow {
  country_name: string;
  artwork_count: number;
  highlight_count: number;
  wine_count: number;
  avg_wine_score: number;
  top_variety: string;
}

export interface DifficultyRow {
  period_name: string;
  region: string;
  question_type: string;
  total_answered: number;
  accuracy_pct: number;
  difficulty_tier: string;
}

export interface ContinentalTimelineRow {
  continent: string;
  period_name: string;
  artwork_count: number;
  source: string;
}

export interface DepartmentDiversityRow {
  department: string;
  total_artworks: number;
  country_count: number;
  top_country: string;
  top_country_dominance_pct: number;
}

export interface CrossPeriodArtistRow {
  full_name: string;
  period_names: string;
  artwork_count: number;
  homeland_wine: string;
  wine_avg_points: number;
}

export interface ArtBornInConflictRow {
  continent: string;
  period_name: string;
  artwork_count: number;
  war_count: number;
  notable_wars: string;
  pct_of_total: number;
}
