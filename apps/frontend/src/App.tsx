import { useEffect, useState } from 'react';
import { api } from './api/client';
import { GameView } from './components/GameView';
import { Leaderboard } from './components/Leaderboard';
import { LoginForm } from './components/LoginForm';
import styles from './App.module.css';
import { User } from './types';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .me()
      .then((me) => setUser(me))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const handleLogin = async (username: string) => {
    const loggedIn = await api.login(username);
    setUser(loggedIn);
  };

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <div className={styles.logo}>
          <span role="img" aria-label="sparkle">
            ✨
          </span>
          <span>Curator&apos;s Eye</span>
          <span className={styles.badge}>Beta</span>
        </div>
        {user ? <div>Hello, {user.username}</div> : null}
      </header>

      <div className={styles.body}>
        <div className={styles.card}>
          {loading ? (
            <div>Checking session…</div>
          ) : user ? (
            <GameView user={user} />
          ) : (
            <LoginForm onLogin={handleLogin} />
          )}
        </div>

        <div className={styles.card}>
          <Leaderboard />
        </div>
      </div>
    </div>
  );
}

export default App;
