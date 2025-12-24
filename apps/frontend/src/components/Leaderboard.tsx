import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import styles from './Leaderboard.module.css';

export function Leaderboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: api.leaderboard,
    staleTime: 30_000
  });

  return (
    <div>
      <h3 className={styles.title}>All-time leaderboard</h3>
      {isLoading ? <p>Loading…</p> : null}
      {error ? <p className={styles.error}>Could not load leaderboard</p> : null}
      <ol className={styles.list}>
        {data?.entries.map((entry, index) => (
          <li key={entry.username} className={styles.row}>
            <span className={styles.rank}>#{index + 1}</span>
            <span className={styles.name}>{entry.username}</span>
            <span className={styles.score}>{entry.score} pts</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
