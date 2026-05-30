'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './VideoPlayer.module.css';
import { useToast } from '@/hooks/useToast';

interface VideoPlayerProps {
  streamUrl: string;
  onClose: () => void;
}

export default function VideoPlayer({ streamUrl, onClose }: VideoPlayerProps) {
  const [useFallback, setUseFallback] = useState(false);
  const [isPlayingInVlc, setIsPlayingInVlc] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { showToast } = useToast();

  const fileName = decodeURIComponent(streamUrl.split('/').pop() || 'Video');
  const ext = fileName.split('.').pop()?.toLowerCase() || '';

  // Standard browsers don't support MKV natively
  useEffect(() => {
    if (ext === 'mkv') {
      setUseFallback(true);
    }
  }, [ext]);

  // Handle escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const handlePlayInVlc = useCallback(() => {
    setIsPlayingInVlc(true);
    showToast('Launching VLC Player…', 'info');
    try {
      // Construct the absolute streaming proxy URL
      const absoluteStreamUrl = `${window.location.origin}/api/stream?url=${encodeURIComponent(streamUrl)}`;

      // Detect mobile OS (Android, iOS, iPadOS)
      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

      if (isMobile) {
        // Mobile: Use direct vlc:// protocol linking
        const vlcDeepLink = `vlc://${absoluteStreamUrl.replace(/^https?:\/\//, '')}`;
        window.location.href = vlcDeepLink;
        showToast('Opening in mobile VLC app…', 'success');
      } else {
        // Desktop: Download dynamic .m3u playlist file to auto-trigger VLC
        const playlistUrl = `/api/play-in-vlc?url=${encodeURIComponent(streamUrl)}&title=${encodeURIComponent(fileName)}`;
        window.location.href = playlistUrl;
        showToast('VLC playlist downloaded! Open it to play.', 'success');
      }
    } catch (err) {
      showToast((err as Error).message, 'error');
    } finally {
      setIsPlayingInVlc(false);
    }
  }, [streamUrl, fileName, showToast]);

  const handleCopyLink = useCallback(() => {
    const absoluteStreamUrl = `${window.location.origin}/api/stream?url=${encodeURIComponent(streamUrl)}`;
    navigator.clipboard.writeText(absoluteStreamUrl).then(() => {
      showToast('Stream link copied to clipboard!', 'success');
    }).catch(() => {
      showToast('Failed to copy stream link', 'error');
    });
  }, [streamUrl, showToast]);

  const handleForceBrowser = useCallback(() => {
    setUseFallback(false);
    showToast('Attempting native playback...', 'info');
  }, [showToast]);

  // Proxied streaming route URL
  const proxiedStreamUrl = `/api/stream?url=${encodeURIComponent(streamUrl)}`;

  return (
    <AnimatePresence>
      <motion.div
        className={styles.overlay}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
      >
        <motion.div
          className={styles.playerContainer}
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        >
          <button className={styles.closeBtn} onClick={onClose} title="Close player">✕</button>

          <div className={styles.videoWrapper}>
            {useFallback ? (
              <div className={styles.vlcFallback}>
                <div className={styles.fallbackIcon}>⚠️</div>
                <h3 className={styles.fallbackTitle}>MKV Container Detected</h3>
                <p className={styles.fallbackText}>
                  Your browser may not support direct MKV playback or its audio/video codec.
                  We recommend playing in <strong>VLC Media Player</strong> or copying the stream URL to an external player.
                </p>
                <div className={styles.fallbackActions}>
                  <button
                    className={`${styles.playerBtn} ${styles.vlcBtn}`}
                    onClick={handlePlayInVlc}
                    disabled={isPlayingInVlc}
                  >
                    {isPlayingInVlc ? 'Launching…' : 'Play in VLC'}
                  </button>
                  <button className={styles.playerBtn} onClick={handleCopyLink}>
                    Copy Stream Link
                  </button>
                  <button className={styles.playerBtn} onClick={handleForceBrowser}>
                    Force Play in Browser
                  </button>
                </div>
              </div>
            ) : (
              <video
                ref={videoRef}
                className={styles.videoElement}
                src={proxiedStreamUrl}
                controls
                autoPlay
                preload="metadata"
              >
                Your browser does not support HTML5 video playback.
              </video>
            )}
          </div>

          <div className={styles.playerFooter}>
            <div className={styles.streamInfo}>
              <h3 className={styles.playerTitle} title={fileName}>{fileName}</h3>
              <p className={styles.playerSubtitle}>Proxied stream via local prefetch cache</p>
            </div>
            <div className={styles.playerActions}>
              <button className={styles.playerBtn} onClick={handleCopyLink}>
                📋 Copy Link
              </button>
              <button className={`${styles.playerBtn} ${styles.vlcBtn}`} onClick={handlePlayInVlc}>
                🍊 VLC Play
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
