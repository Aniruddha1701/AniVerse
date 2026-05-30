'use client';

import styles from './Pagination.module.css';

interface PaginationProps {
  currentPage: number;
  hasNextPage: boolean;
  totalResults: number;
  onPageChange: (page: number) => void;
}

export function StatsBar({ currentPage, hasNextPage, totalResults, onPageChange }: PaginationProps) {
  return (
    <div className={styles.statsBar}>
      <span className={styles.resultCount}>
        Showing {totalResults} matching entries
      </span>
      <span>Page {currentPage}</span>
      <div className={styles.miniPagination}>
        <button
          className={styles.miniBtn}
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          ◀
        </button>
        <span className={styles.miniPage}>Page {currentPage}</span>
        <button
          className={styles.miniBtn}
          disabled={!hasNextPage}
          onClick={() => onPageChange(currentPage + 1)}
        >
          ▶
        </button>
      </div>
    </div>
  );
}

export function Pagination({ currentPage, hasNextPage, onPageChange }: PaginationProps) {
  return (
    <div className={styles.pagination}>
      <button
        className={styles.pageNavBtn}
        disabled={currentPage === 1}
        onClick={() => { onPageChange(currentPage - 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Prev
      </button>

      <span className={styles.pageInfo}>Page {currentPage}</span>

      <button
        className={styles.pageNavBtn}
        disabled={!hasNextPage}
        onClick={() => { onPageChange(currentPage + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
      >
        Next
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
    </div>
  );
}
