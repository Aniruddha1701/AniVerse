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
    showToast('Launching VLC Player...', 'info');

    // Construct the absolute streaming proxy URL
    const absoluteStreamUrl = `${window.location.origin}/api/stream?url=${encodeURIComponent(streamUrl)}`;

    const ua = navigator.userAgent.toLowerCase();
    const isAndroid = /android/.test(ua);
    const isIOS = /ipad|iphone|ipod/.test(ua) && !(window as any).MSStream;

    let targetUrl = '';

    if (isAndroid) {
      // 1. Direct VLC Intent launch for Android
      // This is the officially supported Android deep link structure that bypasses browser prompts
      const urlWithoutProtocol = absoluteStreamUrl.replace(/^https?:\/\//, '');
      const protocol = absoluteStreamUrl.startsWith('https') ? 'https' : 'http';
      targetUrl = `intent://${urlWithoutProtocol}#Intent;package=org.videolan.vlc;scheme=${protocol};type=video/*;end;`;
    } else if (isIOS) {
      // 2. iOS VLC Custom scheme using x-callback for safer URL parsing
      targetUrl = `vlc-x-callback://x-callback-url/stream?url=${encodeURIComponent(absoluteStreamUrl)}`;
    } else {
      // 3. Desktop / Others: Attempt standard custom scheme launch
      // Use encoded query parameter to prevent Chromium from corrupting https:// into https//
      targetUrl = `vlc://play?url=${encodeURIComponent(absoluteStreamUrl)}`;
    }

    const start = Date.now();
    let launched = false;

    // Listen for browser window blur (indicates application or OS prompt gained focus)
    const handleBlur = () => {
      launched = true;
    };
    window.addEventListener('blur', handleBlur);

    // Navigate to protocol link
    window.location.href = targetUrl;

    // Fallback safety timeout
    setTimeout(() => {
      window.removeEventListener('blur', handleBlur);

      // A launch is successful if the window blurred or document lost focus
      const succeeded = launched || !document.hasFocus();

      if (!succeeded) {
        showToast('Direct launch failed. Downloading playlist... (Tip: Click Windows Setup inside player fallback for 1-click play)', 'warning');
        
        // Trigger download of generated dynamic .m3u playlist
        const playlistUrl = `/api/play-in-vlc?url=${encodeURIComponent(streamUrl)}&title=${encodeURIComponent(fileName)}`;
        window.location.href = playlistUrl;
      } else {
        showToast('VLC opened successfully!', 'success');
      }
      setIsPlayingInVlc(false);
    }, 1200);
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
                <a 
                  href="/register-vlc-protocol.bat" 
                  download 
                  className={styles.setupLink}
                  title="Download one-click Windows registry patch to enable seamless VLC launching"
                >
                  ⚡ Enable Direct 1-Click Play (Windows Setup)
                </a>
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
