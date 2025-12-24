import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'csv-parse';
import { db } from '../db';
import { config } from '../config';

interface RawMetRow {
  'Object ID': string;
  Title: string;
  Department: string;
  Culture: string;
  Classification: string;
  Medium: string;
  'Object Begin Date': string;
  'Object End Date': string;
  'Primary Image'?: string;
  'Primary Image Small'?: string;
  'Object URL'?: string;
  'Link Resource'?: string;
  Tags?: string;
  'Is Public Domain': string;
  'Is Highlight': string;
}

interface MetApiObject {
  objectID: number;
  primaryImage: string;
  primaryImageSmall: string;
  isPublicDomain: boolean;
  objectURL: string;
  tags?: { term?: string }[];
}

const MET_API_BASE = 'https://collectionapi.metmuseum.org/public/collection/v1/objects';
const parsedLimit = Number(process.env.MET_ETL_LIMIT);
const MAX_ROWS = Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : null;

const parseBool = (value: string | undefined) =>
  value ? value.toLowerCase() === 'true' || value === '1' : false;

const parseIntOrNull = (value: string | undefined) => {
  const num = Number.parseInt(value || '', 10);
  return Number.isNaN(num) ? null : num;
};

const toOrdinal = (n: number) => {
  const suffixes: Record<number, string> = { 1: 'st', 2: 'nd', 3: 'rd' };
  const v = n % 100;
  const suffix = suffixes[v] || suffixes[v % 10] || 'th';
  return `${n}${suffix}`;
};

const bucketEra = (beginYear: number | null, endYear: number | null) => {
  const year = beginYear ?? endYear;
  if (year === null || Number.isNaN(year)) return null;
  const century = Math.floor((year - 1) / 100) + 1;
  return `${toOrdinal(century)} century`;
};

async function fetchMetObject(objectId: number): Promise<MetApiObject | null> {
  try {
    const response = await fetch(`${MET_API_BASE}/${objectId}`);
    if (!response.ok) {
      console.warn(`Met API responded ${response.status} for object ${objectId}`);
      return null;
    }

    return (await response.json()) as MetApiObject;
  } catch (error) {
    console.warn(`Failed to fetch Met object ${objectId}: ${(error as Error).message}`);
    return null;
  }
}

async function loadCsv(filePath: string) {
  const pool = db.pool;
  const stream = fs
    .createReadStream(filePath)
    .pipe(parse({ columns: true, relaxColumnCount: true })) as any;

  let inserted = 0;
  let processed = 0;
  for await (const record of stream as AsyncIterable<RawMetRow>) {
    const artworkId = Number.parseInt(record['Object ID'], 10);
    if (!Number.isFinite(artworkId)) continue;

    processed += 1;
    if (MAX_ROWS !== null && processed > MAX_ROWS) break;

    let primaryImageSmall = record['Primary Image Small'];
    let primaryImage = record['Primary Image'];
    let isPublicDomain = parseBool(record['Is Public Domain']);
    let objectUrl = record['Object URL'] || record['Link Resource'] || null;
    let tags =
      record.Tags && record.Tags.split
        ? record.Tags.split('|')
            .map((t) => t.trim())
            .filter(Boolean)
        : [];

    // Fetch missing image URLs (and tags) from the Met API using the object ID.
    if (isPublicDomain && (!primaryImageSmall || !primaryImage)) {
      const apiObject = await fetchMetObject(artworkId);
      if (apiObject) {
        primaryImageSmall = primaryImageSmall || apiObject.primaryImageSmall || apiObject.primaryImage;
        primaryImage = primaryImage || apiObject.primaryImage;
        objectUrl = objectUrl || apiObject.objectURL || null;
        if (apiObject.tags?.length) {
          const apiTags = apiObject.tags
            .map((t) => t.term)
            .filter((t): t is string => Boolean(t));
          if (apiTags.length && !tags.length) {
            tags = apiTags;
          }
        }
        // Use the API's public-domain flag if the CSV is missing/incorrect.
        if (typeof apiObject.isPublicDomain === 'boolean') {
          isPublicDomain = apiObject.isPublicDomain;
        }
      }
    }

    if (!primaryImageSmall || !isPublicDomain) continue;

    const beginYear = parseIntOrNull(record['Object Begin Date']);
    const endYear = parseIntOrNull(record['Object End Date']);
    const era = bucketEra(beginYear, endYear);

    await pool.query(
      `INSERT INTO met_artwork (
        artwork_id, title, department, culture, classification, medium,
        object_begin_year, object_end_year, era_bucket, is_public_domain, is_highlight,
        primary_image, primary_image_small, object_url, tags
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        title = VALUES(title),
        department = VALUES(department),
        culture = VALUES(culture),
        classification = VALUES(classification),
        medium = VALUES(medium),
        object_begin_year = VALUES(object_begin_year),
        object_end_year = VALUES(object_end_year),
        era_bucket = VALUES(era_bucket),
        is_public_domain = VALUES(is_public_domain),
        is_highlight = VALUES(is_highlight),
        primary_image = VALUES(primary_image),
        primary_image_small = VALUES(primary_image_small),
        object_url = VALUES(object_url),
        tags = VALUES(tags)`,
      [
        artworkId,
        record.Title,
        record.Department || null,
        record.Culture || null,
        record.Classification || null,
        record.Medium || null,
        beginYear,
        endYear,
        era,
        isPublicDomain ? 1 : 0,
        parseBool(record['Is Highlight']) ? 1 : 0,
        primaryImage,
        primaryImageSmall,
        objectUrl,
        JSON.stringify(tags)
      ]
    );

    inserted += 1;
    if (inserted % 1000 === 0) {
      console.log(`Imported ${inserted} rows`);
    }
  }

  const processedSummary =
    typeof MAX_ROWS === 'number' ? ` (processed ${Math.min(processed, MAX_ROWS)} rows)` : '';
  console.log(`Import complete. ${inserted} artworks stored${processedSummary}.`);
}

async function main() {
  const csvPath = config.metCsvPath;
  if (!fs.existsSync(csvPath)) {
    console.error(`CSV not found at ${csvPath}. Update MET_CSV_PATH or place the file at data/met/MetObjects.csv.`);
    process.exit(1);
  }

  console.log(`Loading Met CSV from ${path.resolve(csvPath)}`);
  await loadCsv(csvPath);
  process.exit(0);
}

if (process.env.NODE_ENV !== 'test') {
  main();
}
