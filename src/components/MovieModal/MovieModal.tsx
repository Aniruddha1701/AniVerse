'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './MovieModal.module.css';
import { useToast } from '@/hooks/useToast';
import type { MovieDetail, DownloadSection, BypassResult } from '@/types/movie';

const FALLBACK_POSTER = 'https://images.unsplash.com/photo-1485846234645-a62644f84728?q=80&w=300&auto=format&fit=crop';

interface MovieModalProps {
  detailUrl: string;
  onClose: () => void;
  onStreamPlay: (url: string) => void;
}

export default function MovieModal({ detailUrl, onClose, onStreamPlay }: MovieModalProps) {
  const [detail, setDetail] = useState<MovieDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bypassResults, setBypassResults] = useState<Record<string, BypassResult>>({});
  const [bypassLoading, setBypassLoading] = useState<Record<string, boolean>>({});
  const [fileBypassLoading, setFileBypassLoading] = useState<Record<string, boolean>>({});
  const { showToast } = useToast();

  // Fetch movie detail on mount
  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const res = await fetch(`/api/details?url=${encodeURIComponent(detailUrl)}`);
        const data = await res.json();
        if (data.success) {
          setDetail(data);
        } else {
          throw new Error(data.message || 'Failed to fetch details');
        }
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [detailUrl]);

  // Close on Escape
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const handleBypass = useCallback(async (url: string, linkKey: string) => {
    setBypassLoading((prev) => ({ ...prev, [linkKey]: true }));
    try {
      const res = await fetch(`/api/bypass-source?url=${encodeURIComponent(url)}`);
      const data = await res.json();
      if (data.success) {
        setBypassResults((prev) => ({ ...prev, [linkKey]: data }));
        showToast(`Found ${data.files?.length || data.episodes?.length || 0} download links`, 'success');
      } else {
        console.warn('[Bypass Block]', data.message);
        showToast('Vercel IP blocked by Cloudflare! Please use "Open Manually" button.', 'warning');
      }
    } catch {
      showToast('Cloud hosting block! Please use "Open Manually" button.', 'warning');
    } finally {
      setBypassLoading((prev) => ({ ...prev, [linkKey]: false }));
    }
  }, [showToast]);

  const handleFileBypass = useCallback(async (url: string, fileName: string, action: 'watch' | 'download') => {
    const fileKey = `file_${url}`;
    setFileBypassLoading((prev) => ({ ...prev, [fileKey]: true }));
    try {
      const res = await fetch(`/api/bypass-file?url=${encodeURIComponent(url)}`);
      const data = await res.json();
      if (data.success && data.downloadUrl) {
        if (action === 'watch') {
          onStreamPlay(data.downloadUrl);
          showToast('Starting high-speed stream...', 'info');
        } else {
          // Trigger high-speed proxy-accelerated download directly
          const downloadUrl = `/api/stream?url=${encodeURIComponent(data.downloadUrl)}&download=true&title=${encodeURIComponent(data.fileName || fileName)}`;
          const a = document.createElement('a');
          a.href = downloadUrl;
          a.download = data.fileName || fileName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          showToast('Download started', 'success');
        }
      } else {
        showToast(data.message || 'File bypass failed', 'error');
      }
    } catch (err) {
      showToast((err as Error).message, 'error');
    } finally {
      setFileBypassLoading((prev) => ({ ...prev, [fileKey]: false }));
    }
  }, [showToast, onStreamPlay]);

  const handleDirectStream = useCallback((url: string) => {
    onStreamPlay(url);
    showToast('Starting stream…', 'info');
  }, [onStreamPlay, showToast]);

  const handleCopyLink = useCallback((url: string) => {
    navigator.clipboard.writeText(url).then(() => {
      showToast('Link copied!', 'success');
    }).catch(() => {
      showToast('Failed to copy', 'error');
    });
  }, [showToast]);

  const handleDownload = useCallback((url: string, fileName: string) => {
    window.open(`/api/proxy-download?url=${encodeURIComponent(url)}&fileName=${encodeURIComponent(fileName)}`, '_blank');
    showToast('Download started', 'success');
  }, [showToast]);

  return (
    <AnimatePresence>
      <motion.div
        className={styles.overlay}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        <motion.div
          className={styles.modal}
          initial={{ opacity: 0, y: 40, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.97 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
        >
          <button className={styles.closeBtn} onClick={onClose} title="Close">✕</button>

          {loading && (
            <div className={styles.loadingOverlay}>
              <div className="spinner" />
              <p className={styles.loadingText}>Fetching movie details…</p>
            </div>
          )}

          {error && (
            <div className={styles.errorBox}>
              <p>⚠️ {error}</p>
            </div>
          )}

          {detail && !loading && (
            <>
              {/* Header */}
              <div className={styles.modalHeader}>
                <img
                  className={styles.modalPoster}
                  src={detail.poster || FALLBACK_POSTER}
                  alt={detail.title}
                  onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_POSTER; }}
                />
                <div className={styles.modalInfo}>
                  <h2 className={styles.modalTitle}>{detail.title}</h2>
                  <div className={styles.infoPills}>
                    {detail.info.map((info, i) => (
                      <span key={i} className={styles.infoPill}>{info}</span>
                    ))}
                  </div>
                  {detail.plot && (
                    <p className={styles.plotText}>{detail.plot}</p>
                  )}
                </div>
              </div>

              {/* Screenshots */}
              {detail.screenshots.length > 0 && (
                <div className={styles.screenshots}>
                  <h3 className={styles.screenshotsTitle}>Screenshots</h3>
                  <div className={styles.screenshotsGrid}>
                    {detail.screenshots.map((src, i) => (
                      <img key={i} src={src} alt={`Screenshot ${i + 1}`} className={styles.screenshotImg} loading="lazy" />
                    ))}
                  </div>
                </div>
              )}

              {/* Download Sections */}
              <div className={styles.downloadArea}>
                {detail.downloadSections.map((section: DownloadSection, sIdx: number) => (
                  <div key={sIdx}>
                    <h3 className={styles.sectionTitle}>{section.title || `Download Links ${sIdx + 1}`}</h3>
                    <div className={styles.linkList}>
                      {section.links.map((link, lIdx) => {
                        const linkKey = `${sIdx}_${lIdx}`;
                        return (
                          <div key={lIdx}>
                            <div className={styles.linkItem}>
                              <span className={styles.linkName} title={link.name}>{link.name}</span>
                              <div className={styles.linkActions}>
                                <button
                                  className={`${styles.actionBtn} ${styles.bypassBtn}`}
                                  onClick={() => handleBypass(link.url, linkKey)}
                                  disabled={bypassLoading[linkKey]}
                                >
                                  {bypassLoading[linkKey] ? (
                                    <><span className="spinnerMini" /> Working…</>
                                  ) : (
                                    '🔓 Bypass Links'
                                  )}
                                </button>
                              </div>
                            </div>

                            {/* Bypass Results */}
                            {bypassResults[linkKey] && (
                              <div className={styles.bypassResults}>
                                 {bypassResults[linkKey].files?.map((file, fIdx) => (
                                   <div key={fIdx} className={styles.fileItem}>
                                     <span className={styles.fileName} title={file.name}>{file.name}</span>
                                     <div className={styles.fileActions}>
                                       <button
                                         className={`${styles.fileBtn} ${styles.streamBtn}`}
                                         onClick={() => handleFileBypass(file.url, file.name, 'watch')}
                                         disabled={fileBypassLoading[`file_${file.url}`]}
                                       >
                                         {fileBypassLoading[`file_${file.url}`] ? '⏳' : '📺'} Watch
                                       </button>
                                       <button
                                         className={`${styles.fileBtn} ${styles.downloadBtn}`}
                                         onClick={() => handleFileBypass(file.url, file.name, 'download')}
                                         disabled={fileBypassLoading[`file_${file.url}`]}
                                       >
                                         {fileBypassLoading[`file_${file.url}`] ? '⏳' : '📥'} Download
                                       </button>
                                       <button
                                         className={`${styles.fileBtn} ${styles.copyBtn}`}
                                         onClick={() => handleCopyLink(file.url)}
                                       >
                                         📋 Copy
                                       </button>
                                     </div>
                                   </div>
                                 ))}

                                {bypassResults[linkKey].episodes?.map((ep, eIdx) => {
                                  const epKey = `ep_${linkKey}_${eIdx}`;
                                  return (
                                    <div key={eIdx} style={{ width: '100%' }}>
                                      <div className={styles.fileItem}>
                                        <span className={styles.fileName} title={ep.name}>{ep.name}</span>
                                        <div className={styles.fileActions}>
                                          <button
                                            className={`${styles.fileBtn} ${styles.bypassBtn}`}
                                            onClick={() => handleBypass(ep.url, epKey)}
                                            disabled={bypassLoading[epKey]}
                                          >
                                            {bypassLoading[epKey] ? (
                                              <><span className="spinnerMini" /> Working…</>
                                            ) : (
                                              '🔓 Open'
                                            )}
                                          </button>
                                        </div>
                                      </div>

                                      {/* Episode Files Bypass Results */}
                                      {bypassResults[epKey] && (
                                        <div className={styles.bypassResults} style={{ marginLeft: '16px', marginTop: '6px', marginBottom: '10px' }}>
                                          {bypassResults[epKey].files?.map((file, fIdx) => (
                                              <div key={fIdx} className={styles.fileItem}>
                                                <span className={styles.fileName} title={file.name}>{file.name}</span>
                                                <div className={styles.fileActions}>
                                                  <button
                                                    className={`${styles.fileBtn} ${styles.streamBtn}`}
                                                    onClick={() => handleFileBypass(file.url, file.name, 'watch')}
                                                    disabled={fileBypassLoading[`file_${file.url}`]}
                                                  >
                                                    {fileBypassLoading[`file_${file.url}`] ? '⏳' : '📺'} Watch
                                                  </button>
                                                  <button
                                                    className={`${styles.fileBtn} ${styles.downloadBtn}`}
                                                    onClick={() => handleFileBypass(file.url, file.name, 'download')}
                                                    disabled={fileBypassLoading[`file_${file.url}`]}
                                                  >
                                                    {fileBypassLoading[`file_${file.url}`] ? '⏳' : '📥'} Download
                                                  </button>
                                                  <button
                                                    className={`${styles.fileBtn} ${styles.copyBtn}`}
                                                    onClick={() => handleCopyLink(file.url)}
                                                  >
                                                    📋 Copy
                                                  </button>
                                                </div>
                                              </div>
                                            ))}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
