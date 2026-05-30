'use client';

import { useState, useEffect } from 'react';

/**
 * Generic debounce hook. Returns a debounced version of the input value
 * that only updates after the specified delay of inactivity.
 */
export function useDebounce<T>(value: T, delay: number = 400): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}
