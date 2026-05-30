'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import styles from './Header.module.css';

interface HeaderProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  onRefresh: () => void;
}

export default function Header({ searchValue, onSearchChange, onRefresh }: HeaderProps) {
  const [localSearch, setLocalSearch] = useState(searchValue);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setLocalSearch(val);
      onSearchChange(val);
    },
    [onSearchChange]
  );

  const handleClear = useCallback(() => {
    setLocalSearch('');
    onSearchChange('');
  }, [onSearchChange]);

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        onSearchChange(localSearch);
      }
    },
    [localSearch, onSearchChange]
  );

  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        {/* Brand */}
        <div className={styles.brand} onClick={() => window.location.reload()}>
          <Image
            src="/logo.png"
            alt="AniVerse Logo"
            width={40}
            height={40}
            className={styles.logoImage}
            priority
          />
          <div className={styles.brandText}>
            <span className={styles.brandName}>
              <span className={styles.brandAni}>Ani</span>
              <span className={styles.brandVerse}>Verse</span>
            </span>
            <span className={styles.brandTag}>Cinema Universe</span>
          </div>
        </div>

        {/* Search */}
        <div className={styles.searchWrap}>
          <span className={styles.searchIcon}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
          </span>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search movies, series, anime…"
            value={localSearch}
            onChange={handleInputChange}
            onKeyDown={handleKeyPress}
            autoComplete="off"
            spellCheck={false}
          />
          {localSearch && (
            <button
              className={styles.clearBtn}
              onClick={handleClear}
              title="Clear"
            >
              ✕
            </button>
          )}
          <button
            className={styles.searchBtn}
            onClick={() => onSearchChange(localSearch)}
            title="Search"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Actions */}
        <div className={styles.headerRight}>
          <button
            className={styles.iconBtn}
            onClick={onRefresh}
            title="Refresh feed"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 4v6h-6" />
              <path d="M1 20v-6h6" />
              <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
