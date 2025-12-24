import { FormEvent, useState } from 'react';
import styles from './LoginForm.module.css';

interface Props {
  onLogin: (username: string) => Promise<void>;
}

export function LoginForm({ onLogin }: Props) {
  const [username, setUsername] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!username.trim()) {
      setError('Enter a username to start');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await onLogin(username.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <h2>Sign in to play</h2>
      <p className={styles.helper}>No password needed. Pick a username and jump in.</p>
      <form className={styles.form} onSubmit={handleSubmit}>
        <label className={styles.label} htmlFor="username">
          Username
        </label>
        <input
          id="username"
          name="username"
          autoComplete="off"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className={styles.input}
          placeholder="artlover"
        />
        {error ? <div className={styles.error}>{error}</div> : null}
        <button type="submit" className={styles.button} disabled={submitting}>
          {submitting ? 'Joining…' : 'Start playing'}
        </button>
      </form>
    </div>
  );
}
