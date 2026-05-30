'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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
  const abortRef = useRef<AbortController | null>(null);

  const refetch = useCallback(() => {
    setFetchKey((k) => k + 1);
  }, []);

  useEffect(() => {
    // Cancel previous in-flight request
    if (abortRef.current) {
      abortRef.current.abort();
    }

    const controller = new AbortController();
    abortRef.current = controller;

    const fetchMovies = async () => {
      setLoading(true);
      setError(null);

      try {
        const url = `/api/movies?source=${source}&page=${page}&search=${encodeURIComponent(search)}`;
        const response = await fetch(url, { signal: controller.signal });
        const data = await response.json();

        if (controller.signal.aborted) return;

        if (data.success) {
          setMovies(data.movies);
          setHasNextPage(data.hasNextPage);
        } else {
          throw new Error(data.message || 'Unknown error occurred.');
        }
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        setError((err as Error).message);
        setMovies([]);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchMovies();

    return () => {
      controller.abort();
    };
  }, [source, page, search, fetchKey]);

  return { movies, loading, error, hasNextPage, refetch };
}
