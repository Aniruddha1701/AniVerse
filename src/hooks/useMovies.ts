'use client';

import { useState, useCallback } from 'react';
import type { Movie, SourceKey } from '@/types/movie';

interface UseMoviesParams {
  source: SourceKey;
  page: number;
  search: string;
}

interface UseMoviesReturn {
  movies: Movie[];
  loading: boolean;
  error: string | null;
  hasNextPage: boolean;
  refetch: () => void;
}

/**
 * Custom hook encapsulating movie fetching logic.
 * Fetches movies from the API whenever source, page, or search changes.
 */
export function useMovies({ source, page, search }: UseMoviesParams): UseMoviesReturn {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [fetchKey, setFetchKey] = useState(0);

  const refetch = useCallback(() => {
    setFetchKey((k) => k + 1);
  }, []);

  // Trigger fetch on param changes
  useState(() => {
    // This is intentionally left empty — the actual fetch is below
  });

  // Use fetchKey as a way to force re-fetch
  const fetchMovies = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const url = `/api/movies?source=${source}&page=${page}&search=${encodeURIComponent(search)}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setMovies(data.movies);
        setHasNextPage(data.hasNextPage);
      } else {
        throw new Error(data.message || 'Unknown error occurred.');
      }
    } catch (err) {
      setError((err as Error).message);
      setMovies([]);
    } finally {
      setLoading(false);
    }
  }, [source, page, search]);

  // Auto-fetch on mount and parameter changes
  // Using a ref-based approach to avoid stale closure issues
  useState(() => {
    fetchMovies();
  });

  // Re-fetch whenever fetchKey or params change
  // We use a manual effect pattern
  const [lastParams, setLastParams] = useState({ source, page, search, fetchKey });

  if (lastParams.source !== source || lastParams.page !== page || lastParams.search !== search || lastParams.fetchKey !== fetchKey) {
    setLastParams({ source, page, search, fetchKey });
    fetchMovies();
  }

  return { movies, loading, error, hasNextPage, refetch };
}
