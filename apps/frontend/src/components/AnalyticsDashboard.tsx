import { useEffect, useState } from 'react';
import { api } from '../api/client';
import {
  PlayerStats,
  LeaderboardEntry,
  WineArtCountryRow,
  DifficultyRow,
  ContinentalTimelineRow,
  DepartmentDiversityRow,
  CrossPeriodArtistRow,
  ArtBornInConflictRow
} from '../types';
import styles from './AnalyticsDashboard.module.css';

interface Props {
  username: string;
  onBack: () => void;
}

type Tab = 'overview' | 'timeline' | 'departments' | 'wine_art' | 'artists' | 'wars' | 'difficulty';

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'departments', label: 'Departments' },
  { id: 'wine_art', label: 'Wine & Art' },
  { id: 'artists', label: 'Artists' },
  { id: 'wars', label: 'Wars & Art' },
  { id: 'difficulty', label: 'Difficulty' }
];

function Loading() {
  return <p className={styles.loading}>Loading...</p>;
}

function OverviewTab({ username }: { username: string }) {
  const [playerStats, setPlayerStats] = useState<PlayerStats[] | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[] | null>(null);

  useEffect(() => {
    api.playerStats().then(setPlayerStats).catch(() => setPlayerStats([]));
    api.leaderboard().then(setLeaderboard).catch(() => setLeaderboard([]));
  }, []);

  const allTime = playerStats?.find(s => s.stat_type === 'all_time');
  const bestSession = playerStats?.find(s => s.stat_type === 'best_session');

  return (
    <>
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Your Stats</h3>
        <p className={styles.sectionDesc}>All-time performance across all sessions (Q11)</p>
        {playerStats === null ? <Loading /> : allTime ? (
          <div className={styles.statsRow}>
            <div className={styles.statBox}>
              <span className={styles.statValue}>{allTime.total_points}</span>
              <span className={styles.statLbl}>Total Points</span>
            </div>
            <div className={styles.statBox}>
              <span className={styles.statValue}>{allTime.rounds_played}</span>
              <span className={styles.statLbl}>Rounds</span>
            </div>
            <div className={styles.statBox}>
              <span className={styles.statValue}>{allTime.accuracy_pct}%</span>
              <span className={styles.statLbl}>Accuracy</span>
            </div>
            {bestSession && (
              <div className={styles.statBox}>
                <span className={styles.statValue}>{bestSession.total_points}</span>
                <span className={styles.statLbl}>Best Session</span>
              </div>
            )}
          </div>
        ) : <p className={styles.dim}>Play some rounds to see your stats!</p>}
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Leaderboard</h3>
        <p className={styles.sectionDesc}>Period-weighted scores with breadth bonus (Q10)</p>
        {leaderboard === null ? <Loading /> : leaderboard.length > 0 ? (
          <div className={styles.table}>
            {leaderboard.slice(0, 10).map((entry, i) => (
              <div key={entry.username}
                className={`${styles.tableRow} ${entry.username === username ? styles.tableRowSelf : ''}`}>
                <span className={styles.rank}>{i + 1}</span>
                <span className={styles.name}>{entry.username}</span>
                <span className={styles.score}>{entry.weighted_score} pts</span>
              </div>
            ))}
          </div>
        ) : <p className={styles.dim}>No leaderboard data yet.</p>}
      </section>
    </>
  );
}

function TimelineTab() {
  const [data, setData] = useState<ContinentalTimelineRow[] | null>(null);

  useEffect(() => {
    api.continentalTimeline().then(setData).catch(() => setData([]));
  }, []);

  if (data === null) return <Loading />;

  const grouped = data.reduce<Record<string, ContinentalTimelineRow[]>>((acc, row) => {
    (acc[row.continent] ??= []).push(row);
    return acc;
  }, {});

  return (
    <section className={styles.section}>
      <h3 className={styles.sectionTitle}>Continental Art Period Timeline</h3>
      <p className={styles.sectionDesc}>Art movements by continent, using UNION ALL across country mapping and period region sources (Q5)</p>
      {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([continent, rows]) => (
        <div key={continent} className={styles.groupBlock}>
          <p className={styles.groupLabel}>{continent}</p>
          <div className={styles.cardGrid}>
            {rows.sort((a, b) => b.artwork_count - a.artwork_count).map(r => (
              <div key={`${r.period_name}-${r.source}`} className={styles.card}>
                <p className={styles.cardTitle}>{r.period_name}</p>
                <p className={styles.cardDetail}>
                  {r.artwork_count.toLocaleString()} artworks
                  <span className={styles.badge}>{r.source === 'country_mapping' ? 'country' : 'period'}</span>
                </p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

function DepartmentsTab() {
  const [data, setData] = useState<DepartmentDiversityRow[] | null>(null);

  useEffect(() => {
    api.departmentDiversity().then(setData).catch(() => setData([]));
  }, []);

  if (data === null) return <Loading />;

  return (
    <section className={styles.section}>
      <h3 className={styles.sectionTitle}>Department Diversity</h3>
      <p className={styles.sectionDesc}>Which Met departments have the most globally diverse collections, with correlated subqueries for top country (Q6)</p>
      <div className={styles.cardGrid}>
        {data.map(d => (
          <div key={d.department} className={styles.card}>
            <p className={styles.cardTitle}>{d.department}</p>
            <div className={styles.miniStats}>
              <div>
                <span className={styles.miniValue}>{d.total_artworks.toLocaleString()}</span>
                <span className={styles.miniLabel}>artworks</span>
              </div>
              <div>
                <span className={styles.miniValue}>{d.country_count}</span>
                <span className={styles.miniLabel}>countries</span>
              </div>
            </div>
            <p className={styles.cardDetail}>
              Top country: <strong>{d.top_country}</strong> ({d.top_country_dominance_pct}%)
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function WineArtTab() {
  const [data, setData] = useState<WineArtCountryRow[] | null>(null);

  useEffect(() => {
    api.wineArtCountry().then(setData).catch(() => setData([]));
  }, []);

  if (data === null) return <Loading />;

  return (
    <section className={styles.section}>
      <h3 className={styles.sectionTitle}>Wine & Art Country Match</h3>
      <p className={styles.sectionDesc}>Countries with both highly-rated wines (avg 85+) and significant Met collections (50+ artworks), joined via two independent derived tables (Q7)</p>
      <div className={styles.cardGrid}>
        {data.map(w => (
          <div key={w.country_name} className={styles.cardWide}>
            <p className={styles.cardTitle}>{w.country_name}</p>
            <div className={styles.miniStats}>
              <div>
                <span className={styles.miniValue}>{w.artwork_count.toLocaleString()}</span>
                <span className={styles.miniLabel}>artworks</span>
              </div>
              <div>
                <span className={styles.miniValue}>{Number(w.highlight_count)}</span>
                <span className={styles.miniLabel}>highlights</span>
              </div>
              <div>
                <span className={styles.miniValue}>{w.wine_count.toLocaleString()}</span>
                <span className={styles.miniLabel}>wines</span>
              </div>
              <div>
                <span className={styles.miniValue}>{w.avg_wine_score}</span>
                <span className={styles.miniLabel}>avg score</span>
              </div>
            </div>
            <p className={styles.cardDetail}>Top grape: <strong>{w.top_variety}</strong></p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ArtistsTab() {
  const [data, setData] = useState<CrossPeriodArtistRow[] | null>(null);

  useEffect(() => {
    api.crossPeriodArtists().then(setData).catch(() => setData([]));
  }, []);

  if (data === null) return <Loading />;

  return (
    <section className={styles.section}>
      <h3 className={styles.sectionTitle}>Cross-Period Artists</h3>
      <p className={styles.sectionDesc}>Artists spanning 2+ art periods, with GROUP_CONCAT for period names and LEFT JOIN to homeland wines (Q9)</p>
      <div className={styles.cardGrid}>
        {data.map(a => (
          <div key={a.full_name} className={styles.cardWide}>
            <p className={styles.cardTitle}>{a.full_name}</p>
            <p className={styles.cardPeriods}>{a.period_names}</p>
            <div className={styles.miniStats}>
              <div>
                <span className={styles.miniValue}>{a.artwork_count}</span>
                <span className={styles.miniLabel}>artworks</span>
              </div>
              <div>
                <span className={styles.miniValue}>{a.homeland_wine}</span>
                <span className={styles.miniLabel}>homeland wine</span>
              </div>
              {a.wine_avg_points > 0 && (
                <div>
                  <span className={styles.miniValue}>{a.wine_avg_points}</span>
                  <span className={styles.miniLabel}>avg pts</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function WarsTab() {
  const [data, setData] = useState<ArtBornInConflictRow[] | null>(null);

  useEffect(() => {
    api.artBornInConflict().then(setData).catch(() => setData([]));
  }, []);

  if (data === null) return <Loading />;

  const grouped = data.reduce<Record<string, ArtBornInConflictRow[]>>((acc, row) => {
    (acc[row.continent] ??= []).push(row);
    return acc;
  }, {});

  return (
    <section className={styles.section}>
      <h3 className={styles.sectionTitle}>Art Born in Conflict</h3>
      <p className={styles.sectionDesc}>Regions where the most art was created during active wars, with temporal overlap joins across 4 data sources (Q15)</p>
      {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([continent, rows]) => (
        <div key={continent} className={styles.groupBlock}>
          <p className={styles.groupLabel}>{continent}</p>
          <div className={styles.cardGrid}>
            {rows.sort((a, b) => b.artwork_count - a.artwork_count).map(r => (
              <div key={`${r.period_name}-${r.continent}`} className={styles.cardWide}>
                <p className={styles.cardTitle}>{r.period_name}</p>
                <div className={styles.miniStats}>
                  <div>
                    <span className={styles.miniValue}>{r.artwork_count.toLocaleString()}</span>
                    <span className={styles.miniLabel}>artworks</span>
                  </div>
                  <div>
                    <span className={styles.miniValue}>{r.war_count}</span>
                    <span className={styles.miniLabel}>conflicts</span>
                  </div>
                  <div>
                    <span className={styles.miniValue}>{r.pct_of_total}%</span>
                    <span className={styles.miniLabel}>of period</span>
                  </div>
                </div>
                <p className={styles.cardDetail}>{r.notable_wars}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

function DifficultyTab() {
  const [data, setData] = useState<DifficultyRow[] | null>(null);

  useEffect(() => {
    api.difficultyByPeriod().then(setData).catch(() => setData([]));
  }, []);

  if (data === null) return <Loading />;

  if (data.length === 0) {
    return (
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Question Difficulty by Period</h3>
        <p className={styles.sectionDesc}>Accuracy by period and question type with CASE-based tier classification (Q12)</p>
        <p className={styles.dim}>Need at least 10 answers per period/type combo to calculate difficulty.</p>
      </section>
    );
  }

  return (
    <section className={styles.section}>
      <h3 className={styles.sectionTitle}>Question Difficulty by Period</h3>
      <p className={styles.sectionDesc}>Accuracy by period and question type with CASE-based tier classification (Q12)</p>
      <div className={styles.table}>
        <div className={styles.tableHeader}>
          <span>Period</span>
          <span>Type</span>
          <span>Accuracy</span>
          <span>Tier</span>
        </div>
        {data.map((d, i) => (
          <div key={i} className={styles.tableRow}>
            <span className={styles.name}>{d.period_name}</span>
            <span className={styles.dim}>{d.question_type}</span>
            <span className={styles.dim}>{d.accuracy_pct}%</span>
            <span className={`${styles.tier} ${styles[`tier${d.difficulty_tier}`]}`}>{d.difficulty_tier}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export function AnalyticsDashboard({ username, onBack }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  return (
    <div className={styles.container}>
      <div className={styles.titleRow}>
        <div>
          <p className={styles.eyebrow}>Analytics</p>
          <h2 className={styles.title}>Your Gallery</h2>
        </div>
        <button className={styles.backBtn} onClick={onBack}>Back</button>
      </div>

      <nav className={styles.tabs}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div className={styles.tabContent}>
        {activeTab === 'overview' && <OverviewTab username={username} />}
        {activeTab === 'timeline' && <TimelineTab />}
        {activeTab === 'departments' && <DepartmentsTab />}
        {activeTab === 'wine_art' && <WineArtTab />}
        {activeTab === 'artists' && <ArtistsTab />}
        {activeTab === 'wars' && <WarsTab />}
        {activeTab === 'difficulty' && <DifficultyTab />}
      </div>
    </div>
  );
}
