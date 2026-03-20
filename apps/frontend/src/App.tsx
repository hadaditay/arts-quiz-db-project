import { useEffect, useState } from 'react';
import { api } from './api/client';
import { GameView } from './components/GameView';
import { LoginForm } from './components/LoginForm';
import styles from './App.module.css';
import { User } from './types';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [inGame, setInGame] = useState(false);

  useEffect(() => {
    api
      .me()
      .then((me) => setUser(me))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const handleLogin = async (username: string, password: string) => {
    const loggedIn = await api.login(username, password);
    setUser(loggedIn);
    setInGame(false);
  };

  const handleRegister = async (
    username: string,
    password: string,
    firstName: string,
    lastName: string
  ) => {
    const registered = await api.register(username, password, firstName, lastName);
    setUser(registered);
    setInGame(false);
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await api.logout();
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setUser(null);
      setInGame(false);
      setLoggingOut(false);
    }
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

        {user ? (
          <div className={styles.userBox}>
            <span className={styles.userText}>Hello, {user.username}</span>
            <button
              type="button"
              onClick={handleLogout}
              className={styles.logoutButton}
              disabled={loggingOut}
            >
              {loggingOut ? 'Logging out…' : 'Logout'}
            </button>
          </div>
        ) : null}
      </header>

      <div className={styles.body}>
        <div className={styles.card}>
          {loading ? (
            <div>Checking session…</div>
          ) : user ? (
            inGame ? (
              <GameView user={user} onExit={() => setInGame(false)} />
            ) : (
              <div className={styles.homeScreen}>
                <p className={styles.homeEyebrow}>Welcome back</p>
                <h1 className={styles.homeTitle}>Ready for a new art challenge?</h1>
                <p className={styles.homeText}>
                  Start a new round of museum trivia and test how sharp your curator&apos;s eye really is.
                </p>
                <button
                  type="button"
                  className={styles.startButton}
                  onClick={() => setInGame(true)}
                >
                  התחל לשחק
                </button>
              </div>
            )
          ) : (
            <LoginForm onLogin={handleLogin} onRegister={handleRegister} />
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
