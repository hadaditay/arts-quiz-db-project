import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { AnswerEnrichment, Round, User } from '../types';
import { ArtworkImage } from './ArtworkImage';
import { EnrichmentPanel } from './EnrichmentPanel';
import styles from './GameView.module.css';

const ROUNDS_PER_SESSION = 15;

const QUESTION_TYPE_LABELS: Record<string, string> = {
  department: 'Department',
  culture: 'Culture',
  wine_region: 'Wine Region',
  food_pairing: 'Food Pairing',
  art_period: 'Art Period',
  sommelier: 'Sommelier',
  sensory: 'Sensory',
  war_conflict: 'War & Conflict',
  artist_nationality: 'Artist Nationality',
  artwork_name: 'Artwork Name'
};

export interface SessionResult {
  totalRounds: number;
  correctCount: number;
  questionTypes: Record<string, { correct: number; total: number }>;
}

interface Props {
  user: User;
  onExit: () => void;
  onSessionEnd: (result: SessionResult) => void;
}

interface ResultState {
  correct: boolean;
  selected: string;
}

export function GameView({ user, onExit, onSessionEnd }: Props) {
  const [round, setRound] = useState<Round | null>(null);
  const [prefetched, setPrefetched] = useState<Round | null>(null);
  const [loading, setLoading] = useState(false);
  const [answering, setAnswering] = useState(false);
  const [result, setResult] = useState<ResultState | null>(null);
  const [enrichment, setEnrichment] = useState<AnswerEnrichment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [roundNumber, setRoundNumber] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [typeStats, setTypeStats] = useState<Record<string, { correct: number; total: number }>>({});

  const prefetchNextRound = async () => {
    try {
      const next = await api.nextRound();
      // Preload the image so it's cached when the round is shown
      const imgSrc = next.artwork.primaryImageSmall || next.artwork.primaryImage;
      if (imgSrc) {
        const img = new Image();
        img.src = imgSrc;
      }
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
      setEnrichment(null);
      if (!initial) setRoundNumber(n => n + 1);
      else setRoundNumber(1);
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
      setEnrichment(response.enrichment ?? null);
      if (response.correct) setCorrectCount(c => c + 1);
      setTypeStats(prev => {
        const qt = round.questionType;
        const existing = prev[qt] ?? { correct: 0, total: 0 };
        return { ...prev, [qt]: { correct: existing.correct + (response.correct ? 1 : 0), total: existing.total + 1 } };
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit answer');
    } finally {
      setAnswering(false);
    }
  };

  const handleNext = () => {
    if (result && roundNumber >= ROUNDS_PER_SESSION) {
      onSessionEnd({ totalRounds: roundNumber, correctCount, questionTypes: typeStats });
      return;
    }
    loadRound();
  };

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
          <p className={styles.subtle}>Question type: {QUESTION_TYPE_LABELS[round.questionType] ?? round.questionType}</p>
          <h2 className={styles.prompt}>{round.prompt}</h2>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.roundCounter}>{roundNumber} / {ROUNDS_PER_SESSION}</div>
          <div className={styles.userBadge}>Playing as {user.username}</div>
        </div>
      </div>

      {shouldShowImage ? (
        <ArtworkImage
          smallSrc={round.artwork.primaryImageSmall}
          fullSrc={round.artwork.primaryImage}
          title={round.artwork.title}
          required={round.requiresImage}
          hideTitle={round.questionType === 'artwork_name'}
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

      {result && enrichment ? <EnrichmentPanel enrichment={enrichment} /> : null}

      {error ? <div className={styles.error}>{error}</div> : null}

      <div className={styles.actions}>
        <button className={styles.secondary} onClick={onExit} disabled={loading || answering}>
          Exit
        </button>
        <button className={styles.primary} onClick={handleNext} disabled={loading || answering}>
          {result && roundNumber >= ROUNDS_PER_SESSION ? 'View Results' : 'Next'}
        </button>
      </div>
    </div>
  );
}
