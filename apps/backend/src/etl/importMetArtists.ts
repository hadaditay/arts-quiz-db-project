import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'csv-parse';
import { db } from '../db';
import { config } from '../config';

interface RawArtistRow {
  full_name: string;
  bio?: string;
  birth_year?: string;
  death_year?: string;
}

const parsedLimit = Number(process.env.MET_ARTISTS_ETL_LIMIT);
const MAX_ROWS = Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : null;

const clamp = (value: string | undefined | null, max: number): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
};

const parseIntOrNull = (value: string | undefined): number | null => {
  if (!value) return null;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : null;
};

async function loadCsv(filePath: string) {
  const pool = db.pool;

  if (!fs.existsSync(filePath)) {
    throw new Error(`Artists CSV not found: ${filePath}`);
  }

  const BATCH_SIZE = 1000;
  let batch: any[][] = [];
  let total = 0;

  const insertSql = `
    INSERT INTO artist_profile (
      full_name, bio, birth_year, death_year
    ) VALUES ?
    ON DUPLICATE KEY UPDATE
      bio = VALUES(bio),
      birth_year = VALUES(birth_year),
      death_year = VALUES(death_year)
  `;

  const flush = async () => {
    if (batch.length === 0) return;
    await pool.query(insertSql, [batch]);
    batch = [];
  };

  const stream = fs
    .createReadStream(filePath)
    .pipe(
      parse({
        columns: true,
        relax_quotes: true,
        relax_column_count: true,
        trim: true,
        bom: true
      })
    );

  for await (const record of stream as any as AsyncIterable<RawArtistRow>) {
    const fullName = clamp(record.full_name, 512);
    if (!fullName) continue;

    const row = [
      fullName,
      record.bio ? record.bio : null,
      parseIntOrNull(record.birth_year),
      parseIntOrNull(record.death_year)
    ];

    batch.push(row);
    total += 1;

    if (MAX_ROWS && total >= MAX_ROWS) break;
    if (batch.length >= BATCH_SIZE) {
      await flush();
      if (total % 5000 === 0) console.log(`Loaded ${total} artist rows...`);
    }
  }

  await flush();
  console.log(`DONE: loaded ${total} artist rows into artist_profile table.`);
}

async function main() {
  const csvPath = config.artistsCsvPath;
  const resolved = path.isAbsolute(csvPath) ? csvPath : path.resolve(process.cwd(), csvPath);
  console.log(`Loading artists from: ${resolved}`);
  await loadCsv(resolved);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
