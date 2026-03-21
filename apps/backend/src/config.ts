import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config();

const numberFromEnv = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const hasExplicitMysqlConfig =
  !!process.env.MYSQL_HOST ||
  !!process.env.MYSQL_PORT ||
  !!process.env.MYSQL_USER ||
  !!process.env.MYSQL_PASSWORD ||
  !!process.env.MYSQL_DATABASE;

export const config = {
  port: numberFromEnv(process.env.PORT, 4000),
  sessionSecret: process.env.SESSION_SECRET || 'dev-session-secret',
  sessionCookieName: 'curators-eye-session',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  mysql: {
    url: hasExplicitMysqlConfig ? undefined : process.env.MYSQL_URL,
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: numberFromEnv(process.env.MYSQL_PORT, 3307),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'curators_eye'
  },
  metCsvPath:
    process.env.MET_CSV_PATH ||
    path.resolve(process.cwd(), '../../data/met/MetObjects_update.csv'),
  artistsCsvPath:
    process.env.MET_ARTISTS_CSV_PATH ||
    path.resolve(process.cwd(), '../../data/met/met_artists.csv'),
  usersCsvPath:
    process.env.USERS_CSV_PATH ||
    path.resolve(process.cwd(), '../../data/users/users_data.csv')
};
