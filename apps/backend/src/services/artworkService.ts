import { PoolConnection, RowDataPacket } from 'mysql2/promise';
import { Artwork, QuestionOption } from '../types';
import { shuffle } from '../utils/random';

const FIELD_MAP = {
  department: 'department',
  culture: 'culture',
  era: 'era_bucket',
  medium: 'medium'
} as const;

export type ArtworkField = keyof typeof FIELD_MAP;

const BASE_SELECT = `SELECT
  artwork_id,
  title,
  department,
  culture,
  classification,
  medium,
  object_begin_year,
  object_end_year,
  era_bucket,
  is_public_domain,
  is_highlight,
  primary_image,
  primary_image_small,
  object_url,
  tags
FROM met_artwork`;

const parseTags = (value: unknown): string[] | null => {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) return value.filter(Boolean) as string[];
  if (typeof value === 'object') {
    // mysql2 can return JSON columns as objects already; stringify then parse for consistency.
    try {
      return parseTags(JSON.stringify(value));
    } catch {
      return null;
    }
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    try {
      return JSON.parse(trimmed) as string[];
    } catch {
      return trimmed
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
    }
  }
  return null;
};

function mapArtworkRow(row: RowDataPacket): Artwork {
  return {
    artworkId: row.artwork_id,
    title: row.title,
    department: row.department,
    culture: row.culture,
    classification: row.classification,
    medium: row.medium,
    objectBeginYear: row.object_begin_year,
    objectEndYear: row.object_end_year,
    eraBucket: row.era_bucket,
    isPublicDomain: Boolean(row.is_public_domain),
    isHighlight: Boolean(row.is_highlight),
    primaryImage: row.primary_image,
    primaryImageSmall: row.primary_image_small,
    objectUrl: row.object_url,
    tags: parseTags(row.tags)
  };
}

export async function getRandomArtworkWithField(
  field: ArtworkField,
  connection: PoolConnection
): Promise<Artwork | null> {
  const column = FIELD_MAP[field];
  const [rows] = await connection.query<RowDataPacket[]>(
    `${BASE_SELECT} WHERE ${column} IS NOT NULL AND ${column} != '' AND primary_image_small IS NOT NULL ORDER BY RAND() LIMIT 1`
  );

  if (!rows.length) return null;
  return mapArtworkRow(rows[0]);
}

export async function getDistinctFieldValues(
  field: ArtworkField,
  exclude: string,
  limit: number,
  connection: PoolConnection
): Promise<string[]> {
  const column = FIELD_MAP[field];
  const [rows] = await connection.query<RowDataPacket[]>(
    `SELECT DISTINCT ${column} as value FROM met_artwork WHERE ${column} IS NOT NULL AND ${column} != '' AND ${column} != ? ORDER BY RAND() LIMIT ?`,
    [exclude, limit]
  );

  return rows.map((row) => row.value as string);
}

export async function buildOptionsForField(
  field: ArtworkField,
  correctValue: string,
  connection: PoolConnection,
  totalOptions = 4
): Promise<QuestionOption[]> {
  const distractorCount = Math.max(totalOptions - 1, 0);
  const distractors = await getDistinctFieldValues(field, correctValue, distractorCount, connection);
  const options = shuffle([correctValue, ...distractors]).map((value) => ({
    value,
    label: value
  }));
  return options;
}
