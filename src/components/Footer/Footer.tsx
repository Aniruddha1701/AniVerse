import Image from 'next/image';
import styles from './Footer.module.css';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <div className={styles.footerBrand}>
          <Image
            src="/logo.png"
            alt="AniVerse"
            width={28}
            height={28}
            className={styles.footerLogo}
          />
          <span className={styles.footerBrandName}>
            <span className={styles.footerAni}>Ani</span>
            <span className={styles.footerVerse}>Verse</span>
          </span>
        </div>

        <div className={styles.footerLinks}>
          <span className={styles.footerLink}>Ad-Free Streaming</span>
          <span className={styles.divider} />
          <span className={styles.footerLink}>Instant Bypass</span>
          <span className={styles.divider} />
          <span className={styles.footerLink}>No Tracking</span>
        </div>

        <p className={styles.footerCopyright}>
          © {year} AniVerse — Built with <span className={styles.heartIcon}>♥</span> by Anirudh
          <br />
          For educational purposes only. All content sourced from third-party providers.
        </p>
      </div>
    </footer>
  );
}
