'use client';

import { motion } from 'framer-motion';
import styles from './MovieCard.module.css';
import type { Movie, ViewMode } from '@/types/movie';
import { useImdbRating } from '@/hooks/useImdbRating';

const FALLBACK_POSTER = 'https://images.unsplash.com/photo-1485846234645-a62644f84728?q=80&w=300&auto=format&fit=crop';

interface MovieCardProps {
  movie: Movie;
  viewMode: ViewMode;
  index: number;
  onClick: () => void;
}

function RatingBadge({ cleanTitle, year }: { cleanTitle: string; year: string }) {
  const { rating, loading } = useImdbRating(cleanTitle, year);

  if (loading) {
    return (
      <span className={styles.ratingBadge}>
        <span className={styles.ratingIcon}>★</span>
        <span className={styles.ratingDot} />
      </span>
    );
  }

  if (!rating || rating === 'N/A') return null;

  const numRating = parseFloat(rating);
  const ratingClass = numRating >= 7.5
    ? styles.ratingHigh
    : numRating >= 5.5
    ? styles.ratingMid
    : styles.ratingLow;

  return (
    <span className={`${styles.ratingBadge} ${ratingClass}`}>
      <span className={styles.ratingIcon}>★</span>
      <span className={styles.ratingValue}>{rating}</span>
    </span>
  );
}

function ListRatingBadge({ cleanTitle, year }: { cleanTitle: string; year: string }) {
  const { rating, loading } = useImdbRating(cleanTitle, year);

  if (loading) {
    return (
      <span className={`${styles.metaBadge} ${styles.metaRating}`}>
        ★ …
      </span>
    );
  }

  if (!rating || rating === 'N/A') return null;

  return (
    <span className={`${styles.metaBadge} ${styles.metaRating}`}>
      ★ {rating}
    </span>
  );
}

export default function MovieCard({ movie, viewMode, index, onClick }: MovieCardProps) {
  const posterSrc = movie.poster || FALLBACK_POSTER;

  if (viewMode === 'list') {
    return (
      <motion.div
        className={styles.listItem}
        onClick={onClick}
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.03, duration: 0.3 }}
      >
        <img
          className={styles.listPoster}
          src={posterSrc}
          alt={movie.cleanTitle}
          loading="lazy"
          onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_POSTER; }}
        />
        <div className={styles.listDetails}>
          <h3 className={styles.listTitle}>{movie.cleanTitle}</h3>
          <p className={styles.listRawTitle}>{movie.title}</p>
          <div className={styles.listMeta}>
            <ListRatingBadge cleanTitle={movie.cleanTitle} year={movie.year} />
            <span className={`${styles.metaBadge} ${styles.metaQuality}`}>{movie.quality}</span>
            <span className={`${styles.metaBadge} ${styles.metaAudio}`}>{movie.audio}</span>
            {movie.year && <span className={`${styles.metaBadge} ${styles.metaYear}`}>{movie.year}</span>}
            {movie.size && <span className={`${styles.metaBadge} ${styles.metaSize}`}>{movie.size}</span>}
          </div>
        </div>
        <button className={styles.listActionBtn} onClick={(e) => { e.stopPropagation(); onClick(); }}>
          Get Details
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div
      className={styles.card}
      onClick={onClick}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -8 }}
    >
      <div className={styles.posterWrap}>
        <img
          className={styles.posterImg}
          src={posterSrc}
          alt={movie.cleanTitle}
          loading="lazy"
          onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_POSTER; }}
        />
        <span className={`${styles.badge} ${styles.qualityBadge}`}>{movie.quality}</span>
        <span className={`${styles.badge} ${styles.audioBadge}`}>{movie.audio}</span>
        <RatingBadge cleanTitle={movie.cleanTitle} year={movie.year} />
      </div>
      <div className={styles.cardDetails}>
        <h3 className={styles.cardTitle} title={movie.title}>{movie.cleanTitle}</h3>
        <div className={styles.cardMeta}>
          <span className={styles.cardYear}>{movie.year || 'N/A'}</span>
          {movie.size && <span className={styles.cardSize}>{movie.size}</span>}
        </div>
      </div>
    </motion.div>
  );
}
