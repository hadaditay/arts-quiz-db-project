import { AnswerResponse, Round, User, PlayerStats, LeaderboardEntry, WineArtCountryRow, DifficultyRow, ContinentalTimelineRow, DepartmentDiversityRow, CrossPeriodArtistRow } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  });

  if (!res.ok) {
    let message = 'Request failed';

    try {
      const data = await res.json();
      message = data.error || message;
    } catch {
      const text = await res.text();
      if (text) message = text;
    }

    throw new Error(message);
  }

  return res.json() as Promise<T>;
}

export const api = {
  login(username: string, password: string): Promise<User> {
    return request<User>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
  },

  register(
    username: string,
    password: string,
    firstName: string,
    lastName: string
  ): Promise<User> {
    return request<User>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        username,
        password,
        firstName,
        lastName
      })
    });
  },

  me(): Promise<User> {
    return request<User>('/api/auth/me');
  },

  logout(): Promise<{ ok: true }> {
    return request<{ ok: true }>('/api/auth/logout', {
      method: 'POST'
    });
  },

  nextRound(type?: string): Promise<Round> {
    const query = type ? `?type=${encodeURIComponent(type)}` : '';
    return request<Round>(`/api/rounds/next${query}`);
  },

  answerRound(roundId: string, selected: string): Promise<AnswerResponse> {
    return request<AnswerResponse>(`/api/rounds/${roundId}/answer`, {
      method: 'POST',
      body: JSON.stringify({ selected })
    });
  },

  playerStats(): Promise<PlayerStats[]> {
    return request<PlayerStats[]>('/api/analytics/player-stats');
  },

  leaderboard(): Promise<LeaderboardEntry[]> {
    return request<LeaderboardEntry[]>('/api/analytics/period-leaderboard');
  },

  wineArtCountry(): Promise<WineArtCountryRow[]> {
    return request<WineArtCountryRow[]>('/api/analytics/wine-art-country');
  },

  difficultyByPeriod(): Promise<DifficultyRow[]> {
    return request<DifficultyRow[]>('/api/analytics/difficulty-by-period');
  },

  continentalTimeline(): Promise<ContinentalTimelineRow[]> {
    return request<ContinentalTimelineRow[]>('/api/analytics/continental-timeline');
  },

  departmentDiversity(): Promise<DepartmentDiversityRow[]> {
    return request<DepartmentDiversityRow[]>('/api/analytics/department-diversity');
  },

  crossPeriodArtists(): Promise<CrossPeriodArtistRow[]> {
    return request<CrossPeriodArtistRow[]>('/api/analytics/cross-period-artists');
  }
};