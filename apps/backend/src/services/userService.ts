import { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { withConnection } from '../db';

export async function findOrCreateUser(
  username: string,
  existingConnection?: PoolConnection
): Promise<{ userId: number; username: string }> {
  const normalized = username.trim();
  if (!normalized) {
    throw new Error('Username is required');
  }

  const action = async (conn: PoolConnection) => {
    const [existing] = await conn.query<RowDataPacket[]>(
      'SELECT user_id FROM game_user WHERE username = ? LIMIT 1',
      [normalized]
    );

    if (existing.length > 0) {
      return { userId: Number(existing[0].user_id), username: normalized };
    }

    const [result] = await conn.query<ResultSetHeader>(
      'INSERT INTO game_user (username) VALUES (?)',
      [normalized]
    );

    return { userId: result.insertId, username: normalized };
  };

  if (existingConnection) {
    return action(existingConnection);
  }

  return withConnection(action);
}

export async function ensureLeaderboardRow(userId: number, conn: PoolConnection) {
  await conn.query(
    'INSERT INTO leaderboard_all_time (user_id, score) VALUES (?, 0) ON DUPLICATE KEY UPDATE score = score',
    [userId]
  );
}

export async function addScore(userId: number, delta: number, conn?: PoolConnection) {
  const action = async (connection: PoolConnection) => {
    await ensureLeaderboardRow(userId, connection);
    await connection.query(
      'UPDATE leaderboard_all_time SET score = score + ? WHERE user_id = ?',
      [delta, userId]
    );
  };

  if (conn) {
    return action(conn);
  }

  return withConnection(action);
}
