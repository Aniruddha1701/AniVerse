'use client';

import { useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './VideoPlayer.module.css';
import { useToast } from '@/hooks/useToast';

interface VideoPlayerProps {
  streamUrl: string;
  onClose: () => void;
}

export default function VideoPlayer({ streamUrl, onClose }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { showToast } = useToast();

  // Extract a clean file name from the stream URL
  const getCleanFileName = () => {
    try {
      const urlObj = new URL(streamUrl);
      const pathname = urlObj.pathname;
      const lastPart = pathname.substring(pathname.lastIndexOf('/') + 1);
      if (lastPart) {
        const decoded = decodeURIComponent(lastPart).split('?')[0].split('#')[0];
        if (decoded && decoded !== 'stream') return decoded;
      }
      // If path is generic (like /api/stream), grab the inner bypassed URL
      const innerUrl = urlObj.searchParams.get('url');
      if (innerUrl) {
        const innerUrlObj = new URL(innerUrl);
        const innerPath = innerUrlObj.pathname;
        const innerLastPart = innerPath.substring(innerPath.lastIndexOf('/') + 1);
        if (innerLastPart) {
          return decodeURIComponent(innerLastPart).split('?')[0].split('#')[0];
        }
      }
    } catch {
      // Fallback
    }
    return decodeURIComponent(streamUrl.split('/').pop() || 'Video').split('?')[0].split('#')[0];
  };

  const fileName = getCleanFileName();

  // Handle escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const handleCopyLink = useCallback(() => {
    const absoluteStreamUrl = `${window.location.origin}/api/stream?url=${encodeURIComponent(streamUrl)}`;
    navigator.clipboard.writeText(absoluteStreamUrl).then(() => {
      showToast('Stream link copied to clipboard!', 'success');
    }).catch(() => {
      showToast('Failed to copy stream link', 'error');
    });
  }, [streamUrl, showToast]);

  const handleDownload = useCallback(() => {
    showToast('Starting high-speed proxy download...', 'info');
    const downloadUrl = `/api/stream?url=${encodeURIComponent(streamUrl)}&download=true&title=${encodeURIComponent(fileName)}`;
    
    // Create a temporary anchor element to trigger the download cleanly
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [streamUrl, fileName, showToast]);

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
              <button className={`${styles.playerBtn} ${styles.downloadBtn}`} onClick={handleDownload}>
                📥 Download Movie
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
