import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Round, User } from '../types';
import { ArtworkImage } from './ArtworkImage';
import styles from './GameView.module.css';

interface Props {
  user: User;
  onExit: () => void;
}

interface ResultState {
  correct: boolean;
  selected: string;
}

export function GameView({ user, onExit }: Props) {
  const [round, setRound] = useState<Round | null>(null);
  const [prefetched, setPrefetched] = useState<Round | null>(null);
  const [loading, setLoading] = useState(false);
  const [answering, setAnswering] = useState(false);
  const [result, setResult] = useState<ResultState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const prefetchNextRound = async () => {
    try {
      const next = await api.nextRound();
      setPrefetched(next);
    } catch (err) {
      console.warn('Next round prefetch failed', err);
    }
  };

  const loadRound = async (initial = false) => {
    setLoading(true);
    setError(null);
    try {
      const next = prefetched || (await api.nextRound());
      setRound(next);
      setPrefetched(null);
      setResult(null);
      if (initial || next) {
        prefetchNextRound();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load round');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRound(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAnswer = async (selected: string) => {
    if (!round) return;
    setAnswering(true);
    setError(null);
    try {
      const response = await api.answerRound(round.roundId, selected);
      setRound(response.payload);
      setResult({ correct: response.correct, selected });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit answer');
    } finally {
      setAnswering(false);
    }
  };

  const handleSkip = () => loadRound();

  if (loading && !round) {
    return <div>Loading your first round…</div>;
  }

  if (!round) {
    return (
      <div>
        <p>No round available yet.</p>
        <div className={styles.actions}>
          <button className={styles.secondary} onClick={onExit}>
            Exit
          </button>
          <button className={styles.primary} onClick={() => loadRound()}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  const shouldShowImage = round.requiresImage || !!round.artwork.primaryImage || !!round.artwork.primaryImageSmall;

  return (
    <div className={styles.container}>
      <div className={styles.promptHeader}>
        <div>
          <p className={styles.subtle}>Question type: {round.questionType}</p>
          <h2 className={styles.prompt}>{round.prompt}</h2>
        </div>
        <div className={styles.userBadge}>Playing as {user.username}</div>
      </div>

      {shouldShowImage ? (
        <ArtworkImage
          smallSrc={round.artwork.primaryImageSmall}
          fullSrc={round.artwork.primaryImage}
          title={round.artwork.title}
          required={round.requiresImage}
        />
      ) : null}

      <div className={styles.options}>
        {round.options.map((option) => {
          const isSelected = result?.selected === option.value;
          const isCorrect = result && option.value === round.correctValue;
          return (
            <button
              key={option.value}
              className={[
                styles.option,
                isSelected ? styles.selected : '',
                isCorrect ? styles.correct : '',
                result && !isCorrect && isSelected ? styles.incorrect : ''
              ].join(' ')}
              onClick={() => handleAnswer(option.value)}
              disabled={!!result || answering}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {result ? (
        <div className={result.correct ? styles.resultOk : styles.resultBad}>
          {result.correct ? 'Correct!' : `Not quite. Correct answer: ${round.correctValue}`}
        </div>
      ) : null}

      {error ? <div className={styles.error}>{error}</div> : null}

      <div className={styles.actions}>
        <button className={styles.secondary} onClick={onExit} disabled={loading || answering}>
          Exit
        </button>
        <button className={styles.primary} onClick={handleSkip} disabled={loading || answering}>
          Skip
        </button>
      </div>
    </div>
  );
}
