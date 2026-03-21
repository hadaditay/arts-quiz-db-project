import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { PlayerStats, LeaderboardEntry } from '../types';
import { SessionResult } from './GameView';
import styles from './SessionSummary.module.css';

interface Props {
  result: SessionResult;
  username: string;
  onPlayAgain: () => void;
  onHome: () => void;
}

const QUESTION_TYPE_LABELS: Record<string, string> = {
  department: 'Department',
  culture: 'Culture',
  wine_region: 'Wine Region',
  food_pairing: 'Food Pairing',
  art_period: 'Art Period',
  sommelier: 'Sommelier',
  sensory: 'Sensory',
  war_conflict: 'War & Conflict'
};

export function SessionSummary({ result, username, onPlayAgain, onHome }: Props) {
  const [playerStats, setPlayerStats] = useState<PlayerStats[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.playerStats().catch(() => []),
      api.leaderboard().catch(() => [])
    ]).then(([stats, lb]) => {
      setPlayerStats(stats);
      setLeaderboard(lb);
    }).finally(() => setLoading(false));
  }, []);

  const accuracy = Math.round((result.correctCount / result.totalRounds) * 100);
  const allTime = playerStats.find(s => s.stat_type === 'all_time');

  return (
    <div className={styles.container}>
      <p className={styles.eyebrow}>Session Complete</p>
      <h2 className={styles.title}>
        {accuracy >= 80 ? 'Masterful!' : accuracy >= 50 ? 'Well played!' : 'Keep learning!'}
      </h2>

      <div className={styles.scoreRing}>
        <span className={styles.scoreNumber}>{result.correctCount}</span>
        <span className={styles.scoreSlash}>/</span>
        <span className={styles.scoreTotal}>{result.totalRounds}</span>
      </div>
      <p className={styles.accuracyLabel}>{accuracy}% accuracy</p>

      <div className={styles.section}>
        <p className={styles.sectionLabel}>Performance by Category</p>
        <div className={styles.categoryGrid}>
          {Object.entries(result.questionTypes).map(([type, stats]) => {
            const pct = Math.round((stats.correct / stats.total) * 100);
            return (
              <div key={type} className={styles.categoryCard}>
                <p className={styles.categoryName}>{QUESTION_TYPE_LABELS[type] ?? type}</p>
                <p className={styles.categoryStat}>
                  {stats.correct}/{stats.total} <span className={styles.categoryPct}>({pct}%)</span>
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {allTime && (
        <div className={styles.section}>
          <p className={styles.sectionLabel}>All-Time Stats</p>
          <div className={styles.statsRow}>
            <div className={styles.statBox}>
              <span className={styles.statValue}>{allTime.total_points}</span>
              <span className={styles.statLabel}>Total Points</span>
            </div>
            <div className={styles.statBox}>
              <span className={styles.statValue}>{allTime.rounds_played}</span>
              <span className={styles.statLabel}>Rounds Played</span>
            </div>
            <div className={styles.statBox}>
              <span className={styles.statValue}>{allTime.accuracy_pct}%</span>
              <span className={styles.statLabel}>Overall Accuracy</span>
            </div>
          </div>
        </div>
      )}

      {leaderboard.length > 0 && (
        <div className={styles.section}>
          <p className={styles.sectionLabel}>Leaderboard</p>
          <div className={styles.leaderboard}>
            {leaderboard.slice(0, 10).map((entry, i) => (
              <div
                key={entry.username}
                className={`${styles.lbRow} ${entry.username === username ? styles.lbRowSelf : ''}`}
              >
                <span className={styles.lbRank}>{i + 1}</span>
                <span className={styles.lbName}>{entry.username}</span>
                <span className={styles.lbScore}>{entry.weighted_score}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading && <p className={styles.loading}>Loading stats...</p>}

      <div className={styles.actions}>
        <button className={styles.secondary} onClick={onHome}>Home</button>
        <button className={styles.primary} onClick={onPlayAgain}>Play Again</button>
      </div>
    </div>
  );
}
