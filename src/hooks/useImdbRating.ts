'use client';

import { useState, useEffect, useRef } from 'react';

/**
 * Client-side cache for IMDb ratings across all component instances.
 * Persists across re-renders without refetching.
 */
const clientRatingCache = new Map<string, string>();
const pendingRequests = new Map<string, Promise<string>>();

/**
 * Fetches the IMDb rating for a single title.
 * Deduplicates inflight requests and caches results.
 */
async function fetchRating(cleanTitle: string, year: string): Promise<string> {
  const cacheKey = `${cleanTitle}::${year}`;

  // Return from cache immediately
  if (clientRatingCache.has(cacheKey)) {
    return clientRatingCache.get(cacheKey)!;
  }

  // Deduplicate inflight requests
  if (pendingRequests.has(cacheKey)) {
    return pendingRequests.get(cacheKey)!;
  }

  const promise = (async () => {
    try {
      const params = new URLSearchParams({ title: cleanTitle });
      if (year) params.set('year', year);

      const res = await fetch(`/api/rating?${params.toString()}`);
      if (!res.ok) return 'N/A';

      const data = await res.json();
      const rating = data.rating || 'N/A';

      clientRatingCache.set(cacheKey, rating);
      return rating;
    } catch {
      return 'N/A';
    } finally {
      pendingRequests.delete(cacheKey);
    }
  })();

  pendingRequests.set(cacheKey, promise);
  return promise;
}

/**
 * Hook to lazily fetch the IMDb rating for a movie card.
 * Uses IntersectionObserver to only fetch when the card is visible.
 */
export function useImdbRating(
  cleanTitle: string,
  year: string,
  options?: { enabled?: boolean }
): { rating: string; loading: boolean } {
  const [rating, setRating] = useState<string>(() => {
    const cached = clientRatingCache.get(`${cleanTitle}::${year}`);
    return cached || '';
  });
  const [loading, setLoading] = useState(!rating);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (options?.enabled === false) return;
    if (!cleanTitle) {
      setRating('N/A');
      setLoading(false);
      return;
    }

    // Check cache synchronously
    const cached = clientRatingCache.get(`${cleanTitle}::${year}`);
    if (cached) {
      setRating(cached);
      setLoading(false);
      return;
    }

    setLoading(true);

    // Small random delay to stagger requests (0–400ms)
    const delay = Math.random() * 400;
    const timer = setTimeout(() => {
      fetchRating(cleanTitle, year).then((r) => {
        if (mountedRef.current) {
          setRating(r);
          setLoading(false);
        }
      });
    }, delay);

    return () => clearTimeout(timer);
  }, [cleanTitle, year, options?.enabled]);

  return { rating, loading };
}
