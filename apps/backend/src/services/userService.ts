import { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { withConnection } from '../db';

function normalize(value: string) {
  return value.trim();
}

export async function findUserByUsername(
  username: string,
  existingConnection?: PoolConnection
): Promise<
  | {
      userId: number;
      username: string;
      firstName: string;
      lastName: string;
      password: string;
    }
  | null
> {
  const normalized = normalize(username);

  const action = async (conn: PoolConnection) => {
    const [rows] = await conn.query<RowDataPacket[]>(
      `SELECT user_id, username, first_name, last_name, \`password\`
       FROM game_user
       WHERE username = ?
       LIMIT 1`,
      [normalized]
    );

    if (!rows.length) return null;

    return {
      userId: Number(rows[0].user_id),
      username: String(rows[0].username),
      firstName: String(rows[0].first_name),
      lastName: String(rows[0].last_name),
      password: String(rows[0].password)
    };
  };

  if (existingConnection) {
    return action(existingConnection);
  }

  return withConnection(action);
}

export async function authenticateUser(
  username: string,
  password: string,
  existingConnection?: PoolConnection
): Promise<
  | {
      userId: number;
      username: string;
      firstName: string;
      lastName: string;
    }
  | null
> {
  const normalizedUsername = normalize(username);
  const normalizedPassword = password;

  if (!normalizedUsername || !normalizedPassword) {
    return null;
  }

  const action = async (conn: PoolConnection) => {
    const [rows] = await conn.query<RowDataPacket[]>(
      `SELECT user_id, username, first_name, last_name
       FROM game_user
       WHERE username = ? AND \`password\` = ?
       LIMIT 1`,
      [normalizedUsername, normalizedPassword]
    );

    if (!rows.length) return null;

    return {
      userId: Number(rows[0].user_id),
      username: String(rows[0].username),
      firstName: String(rows[0].first_name),
      lastName: String(rows[0].last_name)
    };
  };

  if (existingConnection) {
    return action(existingConnection);
  }

  return withConnection(action);
}

export async function createUser(
  username: string,
  password: string,
  firstName: string,
  lastName: string,
  existingConnection?: PoolConnection
): Promise<{
  userId: number;
  username: string;
  firstName: string;
  lastName: string;
}> {
  const normalizedUsername = normalize(username);
  const normalizedPassword = password.trim();
  const normalizedFirstName = normalize(firstName);
  const normalizedLastName = normalize(lastName);

  if (!normalizedUsername || !normalizedPassword || !normalizedFirstName || !normalizedLastName) {
    throw new Error('All fields are required');
  }

  const action = async (conn: PoolConnection) => {
    const [existing] = await conn.query<RowDataPacket[]>(
      'SELECT user_id FROM game_user WHERE username = ? LIMIT 1',
      [normalizedUsername]
    );

    if (existing.length > 0) {
      throw new Error('Username already exists');
    }

    const [result] = await conn.query<ResultSetHeader>(
      `INSERT INTO game_user (username, first_name, last_name, \`password\`)
       VALUES (?, ?, ?, ?)`,
      [normalizedUsername, normalizedFirstName, normalizedLastName, normalizedPassword]
    );

    return {
      userId: result.insertId,
      username: normalizedUsername,
      firstName: normalizedFirstName,
      lastName: normalizedLastName
    };
  };

  if (existingConnection) {
    return action(existingConnection);
  }

  return withConnection(action);
}