import { FormEvent, useState } from 'react';
import styles from './LoginForm.module.css';

interface Props {
  onLogin: (username: string, password: string) => Promise<void>;
  onRegister: (
    username: string,
    password: string,
    firstName: string,
    lastName: string
  ) => Promise<void>;
}

export function LoginForm({ onLogin, onRegister }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!username.trim()) {
      setError('Enter a username');
      return;
    }

    if (!password.trim()) {
      setError('Enter a password');
      return;
    }

    if (mode === 'register' && !firstName.trim()) {
      setError('Enter a first name');
      return;
    }

    if (mode === 'register' && !lastName.trim()) {
      setError('Enter a last name');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      if (mode === 'login') {
        await onLogin(username.trim(), password);
      } else {
        await onRegister(
          username.trim(),
          password,
          firstName.trim(),
          lastName.trim()
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <h2>{mode === 'login' ? 'Sign in to play' : 'Create account'}</h2>
      <p className={styles.helper}>
        {mode === 'login'
          ? 'Enter your username and password'
          : 'Choose your username, password, first name and last name'}
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button
          type="button"
          className={styles.button}
          style={{ opacity: mode === 'login' ? 1 : 0.7 }}
          onClick={() => {
            setMode('login');
            setError(null);
          }}
        >
          Sign in
        </button>
        <button
          type="button"
          className={styles.button}
          style={{ opacity: mode === 'register' ? 1 : 0.7 }}
          onClick={() => {
            setMode('register');
            setError(null);
          }}
        >
          Sign up
        </button>
      </div>

      <form className={styles.form} onSubmit={handleSubmit}>
        <label className={styles.label} htmlFor="username">
          Username
        </label>
        <input
          id="username"
          name="username"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className={styles.input}
          placeholder="artlover"
        />

        <label className={styles.label} htmlFor="password">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={styles.input}
          placeholder="••••••••"
        />

        {mode === 'register' ? (
          <>
            <label className={styles.label} htmlFor="firstName">
              First name
            </label>
            <input
              id="firstName"
              name="firstName"
              autoComplete="given-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className={styles.input}
              placeholder="Yehuda"
            />

            <label className={styles.label} htmlFor="lastName">
              Last name
            </label>
            <input
              id="lastName"
              name="lastName"
              autoComplete="family-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className={styles.input}
              placeholder="Nassar"
            />
          </>
        ) : null}

        {error ? <div className={styles.error}>{error}</div> : null}

        <button type="submit" className={styles.button} disabled={submitting}>
          {submitting
            ? mode === 'login'
              ? 'Signing in…'
              : 'Creating account…'
            : mode === 'login'
            ? 'Sign in'
            : 'Create account'}
        </button>
      </form>
    </div>
  );
}