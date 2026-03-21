import { PoolConnection, RowDataPacket } from 'mysql2/promise';
import { Artwork, QuestionOption } from '../types';
import { shuffle } from '../utils/random';
import { fetchMetArtwork } from '../utils/metApi';

const FIELD_MAP = {
  department: 'department',
  culture: 'culture'
} as const;

export type ArtworkField = keyof typeof FIELD_MAP;

const BASE_SELECT = `SELECT
  artwork_id,
  title,
  department,
  culture,
  artist_display_name,
  is_public_domain,
  is_highlight,
  primary_image,
  primary_image_small,
  image_checked,
  object_url,
  tags
FROM met_artwork`;

const parseTags = (value: unknown): string[] | null => {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) return value.filter(Boolean) as string[];
  if (typeof value === 'object') {
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

export function mapArtworkRow(row: RowDataPacket): Artwork {
  return {
    artworkId: row.artwork_id,
    title: row.title,
    department: row.department,
    culture: row.culture,
    artistDisplayName: row.artist_display_name,
    isPublicDomain: Boolean(row.is_public_domain),
    isHighlight: Boolean(row.is_highlight),
    primaryImage: row.primary_image,
    primaryImageSmall: row.primary_image_small,
    objectUrl: row.object_url,
    tags: parseTags(row.tags)
  };
}

function hasImage(row: RowDataPacket): boolean {
  return Boolean(
    (typeof row.primary_image_small === 'string' && row.primary_image_small.trim() !== '') ||
      (typeof row.primary_image === 'string' && row.primary_image.trim() !== '')
  );
}

export async function hydrateArtworkImage(row: RowDataPacket, connection: PoolConnection): Promise<RowDataPacket> {
  if (hasImage(row) || Boolean(row.image_checked) || !Boolean(row.is_public_domain)) {
    return row;
  }

  const data = await fetchMetArtwork(Number(row.artwork_id));
  if (!data) {
    return row;
  }

  const primaryImage = data.primaryImage?.trim() || null;
  const primaryImageSmall = data.primaryImageSmall?.trim() || null;
  const objectUrl = data.objectURL?.trim() || row.object_url || null;
  const imageChecked = 1;

  await connection.query(
    `UPDATE met_artwork
     SET primary_image = ?,
         primary_image_small = ?,
         object_url = COALESCE(?, object_url),
         image_checked = ?
     WHERE artwork_id = ?`,
    [primaryImage, primaryImageSmall, objectUrl, imageChecked, row.artwork_id]
  );

  row.primary_image = primaryImage;
  row.primary_image_small = primaryImageSmall;
  row.object_url = objectUrl;
  row.image_checked = imageChecked;

  return row;
}

export async function getRandomArtworkWithField(
  field: ArtworkField,
  connection: PoolConnection,
  requireImage = false
): Promise<Artwork | null> {
  const column = FIELD_MAP[field];
  const candidateLimit = requireImage ? 18 : 1;

  const [rows] = await connection.query<RowDataPacket[]>(
    `${BASE_SELECT}
     WHERE ${column} IS NOT NULL
       AND ${column} != ''
       ${requireImage ? 'AND is_public_domain = 1' : ''}
     ORDER BY RAND()
     LIMIT ${candidateLimit}`
  );

  if (!rows.length) return null;

  for (const row of rows) {
    const hydrated = requireImage ? await hydrateArtworkImage(row, connection) : row;
    if (!requireImage || hasImage(hydrated)) {
      return mapArtworkRow(hydrated);
    }
  }

  return null;
}

export async function getDistinctFieldValues(
  field: ArtworkField,
  exclude: string,
  limit: number,
  connection: PoolConnection
): Promise<string[]> {
  const column = FIELD_MAP[field];

  const [rows] = await connection.query<RowDataPacket[]>(
    `SELECT DISTINCT ${column} AS value
     FROM met_artwork
     WHERE ${column} IS NOT NULL
       AND ${column} != ''
       AND ${column} != ?
     ORDER BY RAND()
     LIMIT ?`,
    [exclude, limit]
  );

  return rows.map((row) => row.value as string);
}

export async function getRandomMappedArtwork(
  connection: PoolConnection,
  requirePeriod = false
): Promise<Artwork | null> {
  const periodJoin = requirePeriod
    ? 'JOIN artwork_period awp ON awp.artwork_id = ma.artwork_id'
    : '';

  const [rows] = await connection.query<RowDataPacket[]>(
    `SELECT
       ma.artwork_id, ma.title, ma.department, ma.culture,
       ma.artist_display_name, ma.is_public_domain, ma.is_highlight,
       ma.primary_image, ma.primary_image_small, ma.image_checked,
       ma.object_url, ma.tags
     FROM met_artwork ma
     JOIN culture_country cc ON cc.culture_value = ma.culture
     ${periodJoin}
     WHERE ma.is_public_domain = 1
     ORDER BY RAND()
     LIMIT 18`
  );

  if (!rows.length) return null;

  for (const row of rows) {
    const hydrated = await hydrateArtworkImage(row, connection);
    if (hasImage(hydrated)) {
      return mapArtworkRow(hydrated);
    }
  }

  return null;
}

export async function buildOptionsForField(
  field: ArtworkField,
  correctValue: string,
  connection: PoolConnection,
  totalOptions = 4
): Promise<QuestionOption[]> {
  const distractorCount = Math.max(totalOptions - 1, 0);
  const distractors = await getDistinctFieldValues(field, correctValue, distractorCount, connection);

  return shuffle([correctValue, ...distractors]).map((value) => ({
    value,
    label: value
  }));
}
