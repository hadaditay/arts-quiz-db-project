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
  'Artist Display Name'?: string;
  'Link Resource'?: string;
  'Object URL'?: string;
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

    const isPublicDomain = parseBool(record['Is Public Domain']);
    if (!isPublicDomain) continue;

    const objectUrl = record['Object URL'] || record['Link Resource'] || null;

    await pool.query(
      `INSERT INTO met_artwork (
        artwork_id, title, department, culture, artist_display_name,
        is_public_domain, is_highlight,
        primary_image, primary_image_small, image_checked, object_url, tags
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        title = VALUES(title),
        department = VALUES(department),
        culture = VALUES(culture),
        artist_display_name = VALUES(artist_display_name),
        is_public_domain = VALUES(is_public_domain),
        is_highlight = VALUES(is_highlight),
        object_url = VALUES(object_url),
        tags = VALUES(tags)`,
      [
        artworkId,
        clamp(record.Title, 512),
        clamp(record.Department, 255),
        clamp(record.Culture, 255),
        clamp(record['Artist Display Name'], 2048),
        isPublicDomain ? 1 : 0,
        parseBool(record['Is Highlight']) ? 1 : 0,
        null,
        null,
        0,
        clamp(objectUrl, 2048),
        JSON.stringify([])
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
    console.error(`CSV not found at ${csvPath}. Update MET_CSV_PATH or place the file at data/met/MetObjects_update.csv.`);
    process.exit(1);
  }

  console.log(`Loading artworks from: ${path.resolve(csvPath)}`);
  await loadCsv(csvPath);
  process.exit(0);
}

if (process.env.NODE_ENV !== 'test') {
  main();
}
