import { randomUUID } from 'node:crypto';
import { PoolConnection, RowDataPacket } from 'mysql2/promise';
import { withConnection } from '../db';
import { AuthSession } from '../types';

export async function createSession(
  userId: number,
  username: string,
  conn?: PoolConnection
): Promise<AuthSession> {
  const sessionId = randomUUID();

  const action = async (connection: PoolConnection) => {
    await connection.query('INSERT INTO game_session (session_id, user_id) VALUES (?, ?)', [
      sessionId,
      userId
    ]);

    return { sessionId, userId, username };
  };

  if (conn) {
    return action(conn);
  }

  return withConnection(action);
}

export async function getSession(
  sessionId: string,
  conn?: PoolConnection
): Promise<AuthSession | null> {
  const action = async (connection: PoolConnection) => {
    const [rows] = await connection.query<RowDataPacket[]>(
      `SELECT s.session_id, s.user_id, u.username
       FROM game_session s
       JOIN game_user u ON u.user_id = s.user_id
       WHERE s.session_id = ? AND s.revoked = 0
       LIMIT 1`,
      [sessionId]
    );

    if (!rows.length) return null;

    return {
      sessionId: rows[0].session_id,
      userId: rows[0].user_id,
      username: rows[0].username
    } satisfies AuthSession;
  };

  if (conn) {
    return action(conn);
  }

  return withConnection(action);
}

export async function touchSession(sessionId: string, conn?: PoolConnection) {
  const action = async (connection: PoolConnection) => {
    await connection.query('UPDATE game_session SET last_seen_at = CURRENT_TIMESTAMP WHERE session_id = ?', [
      sessionId
    ]);
  };

  if (conn) {
    return action(conn);
  }

  return withConnection(action);
}
