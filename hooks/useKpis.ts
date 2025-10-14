'use client';

import useSWR from 'swr';
import type { KpiPayload } from '@/types/kpis';

type Filters = Record<string, string | undefined>;

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) {
    const error = new Error(data?.error || 'Failed to load KPIs');
    throw error;
  }
  return data;
};

export function useKpis(filters: Filters) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) {
      params.set(key, value);
    }
  });

  const { data, error, isLoading, mutate } = useSWR<KpiPayload>(
    `/api/kpis${params.size > 0 ? `?${params.toString()}` : ''}`,
    fetcher,
    { refreshInterval: 60_000 }
  );

  return {
    kpis: data,
    isLoading,
    isError: Boolean(error),
    mutate,
  };
}
