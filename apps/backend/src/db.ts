import mysql, { Pool } from 'mysql2/promise';
import { config } from './config';

let pool: Pool | null = null;

const createPool = (): Pool => {
  if (pool) return pool;

  if (config.mysql.url) {
    pool = mysql.createPool({
      uri: config.mysql.url,
      waitForConnections: true,
      connectionLimit: 10
    });
    return pool;
  }

  pool = mysql.createPool({
    host: config.mysql.host,
    port: config.mysql.port,
    user: config.mysql.user,
    password: config.mysql.password,
    database: config.mysql.database,
    waitForConnections: true,
    connectionLimit: 10
  });

  return pool;
};

export const db = {
  get pool() {
    return createPool();
  }
};

export async function withConnection<T>(fn: (connection: mysql.PoolConnection) => Promise<T>) {
  const connection = await createPool().getConnection();
  try {
    return await fn(connection);
  } finally {
    connection.release();
  }
}
