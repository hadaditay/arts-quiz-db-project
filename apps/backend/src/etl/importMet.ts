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

const parsedLimit = Number(process.env.MET_ETL_LIMIT);
const MAX_ROWS = Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : null;

const parseBool = (value: string | undefined) =>
  value ? value.toLowerCase() === 'true' || value === '1' : false;

const clamp = (value: string | undefined | null, max: number): string | null => {
  if (!value) return null;
  return value.slice(0, max);
};

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

    // Only import rows that are public domain; image URLs can be fetched on-demand later.
    if (!isPublicDomain) continue;

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
        clamp(record.Title, 512),
        clamp(record.Department, 255),
        clamp(record.Culture, 255),
        clamp(record.Classification, 255),
        clamp(record.Medium, 255),
        beginYear,
        endYear,
        clamp(era || undefined, 64),
        isPublicDomain ? 1 : 0,
        parseBool(record['Is Highlight']) ? 1 : 0,
        primaryImage,
        primaryImageSmall,
        clamp(objectUrl, 2048),
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
