import {
  ForecastResponse,
  AccuracyResponse,
  ForecastHistoryResponse,
  OverviewResponse,
  HealthResponse,
  MatchingMode
} from '../types';

function getApiBase(): string {
  const envUrl = (import.meta.env.VITE_API_BASE_URL || '').trim();
  if (!envUrl) return '';
  if (envUrl.startsWith('http://') || envUrl.startsWith('https://')) {
    return envUrl.replace(/\/+$/, '');
  }
  return `https://${envUrl.replace(/\/+$/, '')}`;
}

const API_BASE = getApiBase();

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    let errorMsg = `HTTP Error ${res.status}: ${res.statusText}`;
    try {
      const errData = await res.json();
      if (errData.detail) {
        errorMsg = errData.detail;
      }
    } catch {
      // fallback
    }
    throw new Error(errorMsg);
  }
  return res.json();
}

export const api = {
  getHealth: (): Promise<HealthResponse> => {
    return fetchJson<HealthResponse>(`${API_BASE}/api/health`);
  },

  getOverview: (
    selectedDate: string = '2026-01-15',
    cutoffTime: string = '11:00',
    matchingMode: MatchingMode = 'hour_block'
  ): Promise<OverviewResponse> => {
    const params = new URLSearchParams({
      selected_date: selectedDate,
      cutoff_time: cutoffTime,
      matching_mode: matchingMode
    });
    return fetchJson<OverviewResponse>(`${API_BASE}/api/overview?${params.toString()}`);
  },

  getForecasts: (
    date: string = '2026-01-15',
    cutoffTime: string = '11:00',
    matchingMode: MatchingMode = 'hour_block'
  ): Promise<ForecastResponse> => {
    const params = new URLSearchParams({
      date,
      cutoff_time: cutoffTime,
      matching_mode: matchingMode
    });
    return fetchJson<ForecastResponse>(`${API_BASE}/api/forecasts?${params.toString()}`);
  },

  getAccuracy: (
    startDate: string = '2026-01-01',
    endDate: string = '2026-01-31',
    cutoffTime: string = '11:00',
    matchingMode: MatchingMode = 'hour_block'
  ): Promise<AccuracyResponse> => {
    const params = new URLSearchParams({
      start_date: startDate,
      end_date: endDate,
      cutoff_time: cutoffTime,
      matching_mode: matchingMode
    });
    return fetchJson<AccuracyResponse>(`${API_BASE}/api/accuracy?${params.toString()}`);
  },

  getForecastHistory: (
    deliveryTime: string,
    cutoffTime: string = '11:00',
    matchingMode: MatchingMode = 'hour_block'
  ): Promise<ForecastHistoryResponse> => {
    const params = new URLSearchParams({
      delivery_time: deliveryTime,
      cutoff_time: cutoffTime,
      matching_mode: matchingMode
    });
    return fetchJson<ForecastHistoryResponse>(`${API_BASE}/api/forecast-history?${params.toString()}`);
  },

  getAvailableDates: async (): Promise<string[]> => {
    const res = await fetchJson<{ dates: string[] }>(`${API_BASE}/api/available-dates`);
    return res.dates;
  },

  triggerSync: async (): Promise<any> => {
    const res = await fetch(`${API_BASE}/api/sync`, { method: 'POST' });
    if (!res.ok) {
      throw new Error(`Sync failed with status ${res.status}`);
    }
    return res.json();
  }
};
