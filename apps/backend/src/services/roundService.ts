import { randomUUID } from 'node:crypto';
import { PoolConnection, RowDataPacket } from 'mysql2/promise';
import { withConnection } from '../db';
import { generateQuestion } from '../question/registry';
import { AuthSession, QuestionOption, RoundPayload } from '../types';

const POINTS_PER_CORRECT = 10;

const parseOptions = (value: unknown): QuestionOption[] => {
  if (!value) return [];
  if (typeof value === 'string') {
    return JSON.parse(value) as QuestionOption[];
  }
  return value as QuestionOption[];
};

function questionTypeRequiresImage(questionType: string): boolean {
  return questionType === 'department' || questionType === 'culture';
}

export async function createRound(
  session: AuthSession,
  preferredType?: string,
  existingConnection?: PoolConnection
): Promise<RoundPayload> {
  const action = async (connection: PoolConnection) => {
    let generated = null;

    for (let i = 0; i < 12; i += 1) {
      generated = await generateQuestion(connection, preferredType);
      if (generated) break;
    }

    if (!generated) {
      throw new Error('Unable to generate question');
    }

    const roundId = randomUUID();

    await connection.query(
      `INSERT INTO game_round (round_id, session_id, question_type, artwork_id, prompt, correct_value, options)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        roundId,
        session.sessionId,
        generated.questionType,
        generated.artwork.id,
        generated.prompt,
        generated.correctValue,
        JSON.stringify(generated.options)
      ]
    );

    return { ...generated, roundId };
  };

  if (existingConnection) {
    return action(existingConnection);
  }

  return withConnection(action);
}

export async function answerRound(
  session: AuthSession,
  roundId: string,
  selectedValue: string,
  existingConnection?: PoolConnection
): Promise<{ correct: boolean; payload: RoundPayload }> {
  const action = async (connection: PoolConnection) => {
    const [rows] = await connection.query<RowDataPacket[]>(
      `SELECT r.round_id, r.question_type, r.artwork_id, r.prompt, r.correct_value, r.options,
              r.selected_value, r.result,
              a.title, a.primary_image, a.primary_image_small
       FROM game_round r
       JOIN game_session s ON s.session_id = r.session_id
       JOIN met_artwork a ON a.artwork_id = r.artwork_id
       WHERE r.round_id = ? AND s.session_id = ?
       LIMIT 1`,
      [roundId, session.sessionId]
    );

    if (!rows.length) {
      throw new Error('Round not found for this session');
    }

    const row = rows[0];
    const alreadyAnswered = row.result !== 'pending';

    if (!alreadyAnswered) {
      const correct = row.correct_value === selectedValue;
      const points = correct ? POINTS_PER_CORRECT : 0;

      await connection.query(
        `UPDATE game_round
         SET selected_value = ?, result = ?, points_awarded = ?
         WHERE round_id = ?`,
        [selectedValue, correct ? 'correct' : 'incorrect', points, roundId]
      );
    }

    const finalCorrect = alreadyAnswered ? row.result === 'correct' : row.correct_value === selectedValue;

    const payload: RoundPayload = {
      roundId: row.round_id,
      questionType: row.question_type,
      requiresImage: questionTypeRequiresImage(row.question_type),
      prompt: row.prompt,
      correctValue: row.correct_value,
      options: parseOptions(row.options),
      artwork: {
        id: row.artwork_id,
        title: row.title,
        primaryImageSmall: row.primary_image_small,
        primaryImage: row.primary_image
      }
    };

    return { correct: finalCorrect, payload };
  };

  if (existingConnection) {
    return action(existingConnection);
  }

  return withConnection(action);
}
