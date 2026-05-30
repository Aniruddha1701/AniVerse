'use client';

import { useCallback } from 'react';
import styles from './FilterBar.module.css';
import type { SourceKey, ViewMode } from '@/types/movie';

const SOURCES: { key: SourceKey; label: string; icon: React.ReactNode }[] = [
  {
    key: 'hollywood',
    label: 'Hollywood',
    icon: (
      <svg className={styles.tabIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" /><line x1="7" y1="2" x2="7" y2="22" /><line x1="17" y1="2" x2="17" y2="22" /><line x1="2" y1="12" x2="22" y2="12" />
      </svg>
    ),
  },
  {
    key: 'bollywood',
    label: 'Bollywood',
    icon: (
      <svg className={styles.tabIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M23 7l-7 5 7 5V7z" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
      </svg>
    ),
  },
  {
    key: 'uhdmovies',
    label: '4K UHD',
    icon: (
      <svg className={styles.tabIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
  },
  {
    key: 'animeflix',
    label: 'Anime',
    icon: (
      <svg className={styles.tabIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    ),
  },
];

interface FilterBarProps {
  activeSource: SourceKey;
  viewMode: ViewMode;
  onSourceChange: (source: SourceKey) => void;
  onViewModeChange: (mode: ViewMode) => void;
}

export default function FilterBar({
  activeSource,
  viewMode,
  onSourceChange,
  onViewModeChange,
}: FilterBarProps) {
  const handleSourceClick = useCallback(
    (source: SourceKey) => {
      if (source !== activeSource) onSourceChange(source);
    },
    [activeSource, onSourceChange]
  );

  return (
    <div className={styles.filterBar}>
      <div className={styles.filterInner}>
        <div className={styles.sourceTabs}>
          {SOURCES.map((s) => (
            <button
              key={s.key}
              className={`${styles.tabBtn} ${activeSource === s.key ? styles.active : ''}`}
              onClick={() => handleSourceClick(s.key)}
            >
              {s.icon}
              {s.label}
            </button>
          ))}
        </div>

        <div className={styles.viewToggle}>
          <button
            className={`${styles.viewBtn} ${viewMode === 'grid' ? styles.active : ''}`}
            onClick={() => onViewModeChange('grid')}
            title="Grid view"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
          </button>
          <button
            className={`${styles.viewBtn} ${viewMode === 'list' ? styles.active : ''}`}
            onClick={() => onViewModeChange('list')}
            title="List view"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" />
              <line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
