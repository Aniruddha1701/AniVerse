'use client';

import { useState } from 'react';
import styles from './MovieGrid.module.css';
import MovieCard from '../MovieCard/MovieCard';
import SkeletonCard from '../SkeletonCard/SkeletonCard';
import { StatsBar, Pagination } from '../Pagination/Pagination';
import MovieModal from '../MovieModal/MovieModal';
import VideoPlayer from '../VideoPlayer/VideoPlayer';
import { useMovies } from '@/hooks/useMovies';
import type { SourceKey, ViewMode } from '@/types/movie';

interface MovieGridProps {
  source: SourceKey;
  page: number;
  search: string;
  viewMode: ViewMode;
  onPageChange: (page: number) => void;
}

export default function MovieGrid({
  source,
  page,
  search,
  viewMode,
  onPageChange,
}: MovieGridProps) {
  const { movies, loading, error, hasNextPage, refetch } = useMovies({
    source,
    page,
    search,
  });

  const [selectedDetailUrl, setSelectedDetailUrl] = useState<string | null>(null);
  const [activeStreamUrl, setActiveStreamUrl] = useState<string | null>(null);

  const handleOpenModal = (url: string) => {
    setSelectedDetailUrl(url);
  };

  const handleCloseModal = () => {
    setSelectedDetailUrl(null);
  };

  const handleStartStream = (url: string) => {
    setActiveStreamUrl(url);
  };

  const handleCloseStream = () => {
    setActiveStreamUrl(null);
  };

  if (loading) {
    return (
      <div className={styles.gridContainer}>
        <div className={viewMode === 'grid' ? styles.grid : styles.list}>
          {Array.from({ length: 12 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.feedbackContainer}>
        <div className={styles.feedbackIcon}>⚠️</div>
        <h3 className={styles.feedbackTitle}>Failed to load movies</h3>
        <p className={styles.feedbackText}>{error}</p>
        <button className={styles.retryBtn} onClick={refetch}>
          Retry Connection
        </button>
      </div>
    );
  }

  if (movies.length === 0) {
    return (
      <div className={styles.feedbackContainer}>
        <div className={styles.feedbackIcon}>🍿</div>
        <h3 className={styles.feedbackTitle}>No movies found</h3>
        <p className={styles.feedbackText}>
          Try adjusting your filter or search query to find what you're looking for.
        </p>
        {search && (
          <button className={styles.retryBtn} onClick={refetch}>
            Refresh Feed
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={styles.gridContainer}>
      <StatsBar
        currentPage={page}
        hasNextPage={hasNextPage}
        totalResults={movies.length}
        onPageChange={onPageChange}
      />

      <div className={viewMode === 'grid' ? styles.grid : styles.list}>
        {movies.map((movie, idx) => (
          <MovieCard
            key={`${movie.detailUrl}_${idx}`}
            movie={movie}
            viewMode={viewMode}
            index={idx}
            onClick={() => handleOpenModal(movie.detailUrl)}
          />
        ))}
      </div>

      <Pagination
        currentPage={page}
        hasNextPage={hasNextPage}
        totalResults={movies.length}
        onPageChange={onPageChange}
      />

      {selectedDetailUrl && (
        <MovieModal
          detailUrl={selectedDetailUrl}
          onClose={handleCloseModal}
          onStreamPlay={handleStartStream}
        />
      )}

      {activeStreamUrl && (
        <VideoPlayer
          streamUrl={activeStreamUrl}
          onClose={handleCloseStream}
        />
      )}
    </div>
  );
}
