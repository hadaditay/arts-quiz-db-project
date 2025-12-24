import { PoolConnection, RowDataPacket } from 'mysql2/promise';
import { withConnection } from '../db';

export interface LeaderboardEntry {
  username: string;
  score: number;
}

export async function getAllTimeLeaderboard(
  limit = 25,
  existingConnection?: PoolConnection
): Promise<LeaderboardEntry[]> {
  const action = async (connection: PoolConnection) => {
    const [rows] = await connection.query<RowDataPacket[]>(
      `SELECT u.username, l.score
       FROM leaderboard_all_time l
       JOIN game_user u ON u.user_id = l.user_id
       ORDER BY l.score DESC, u.username ASC
       LIMIT ?`,
      [limit]
    );

    return rows.map((row) => ({ username: row.username as string, score: Number(row.score) }));
  };

  if (existingConnection) {
    return action(existingConnection);
  }

  return withConnection(action);
}
