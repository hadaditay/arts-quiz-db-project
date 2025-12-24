import { AnswerResponse, LeaderboardEntry, Round, User } from '../types';

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
    const text = await res.text();
    throw new Error(text || 'Request failed');
  }

  return res.json() as Promise<T>;
}

export const api = {
  login(username: string): Promise<User> {
    return request<User>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username })
    });
  },
  me(): Promise<User> {
    return request<User>('/api/auth/me');
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
  leaderboard(): Promise<{ entries: LeaderboardEntry[] }> {
    return request<{ entries: LeaderboardEntry[] }>('/api/leaderboard/all-time');
  }
};
