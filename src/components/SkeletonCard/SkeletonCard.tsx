import styles from './SkeletonCard.module.css';

export default function SkeletonCard() {
  return (
    <div className={styles.skeleton}>
      <div className={styles.skeletonPoster} />
      <div className={styles.skeletonDetails}>
        <div className={styles.skeletonTitle} />
        <div className={styles.skeletonMeta}>
          <div className={`${styles.skeletonText} ${styles.short}`} />
          <div className={`${styles.skeletonText} ${styles.extraShort}`} />
        </div>
      </div>
    </div>
  );
}
