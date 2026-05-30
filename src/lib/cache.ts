import fs from 'fs';
import path from 'path';
import axios from 'axios';
import crypto from 'crypto';
import { AXIOS_CONFIG, keepAliveAgent, keepAliveHttpAgent } from './scraper';
import type { FileMetadata } from '@/types/movie';

const CACHE_DIR = path.join(process.cwd(), 'cache');
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

const activePlaybackChunks = new Map<string, { lastActivity: number; activeChunk: number }>();
const activeChunkDownloads = new Map<string, Promise<string>>();
const activeFullDownloads = new Map<string, Promise<void>>();
let lastPruneTime = 0;

/** Generate a hash key from a URL for cache naming */
export function hashUrl(url: string): string {
  return crypto.createHash('md5').update(url).digest('hex');
}

/** Get the cache directory path */
export function getCacheDir(): string {
  return CACHE_DIR;
}

/** Prune old cache files when total exceeds 5GB. Throttled to once per minute. */
export function pruneCache(): void {
  const now = Date.now();
  if (now - lastPruneTime < 60000) return;
  lastPruneTime = now;

  try {
    const files = fs.readdirSync(CACHE_DIR);
    let totalSize = 0;
    const fileList: { path: string; size: number; mtime: number }[] = [];

    const activeHashes = new Set<string>();
    for (const [hash, info] of activePlaybackChunks.entries()) {
      if (now - info.lastActivity < 5 * 60 * 1000) {
        activeHashes.add(hash);
      } else {
        activePlaybackChunks.delete(hash);
      }
    }

    files.forEach((file) => {
      const filePath = path.join(CACHE_DIR, file);
      const isActive = Array.from(activeHashes).some((hash) => file.startsWith(hash));
      if (isActive) return;

      try {
        const stats = fs.statSync(filePath);
        if (stats.isFile()) {
          totalSize += stats.size;
          fileList.push({ path: filePath, size: stats.size, mtime: stats.mtimeMs });
        }
      } catch {
        // Skip files that might have been deleted
      }
    });

    const MAX_CACHE_SIZE = 5 * 1024 * 1024 * 1024; // 5 GB
    if (totalSize > MAX_CACHE_SIZE) {
      console.log(`[Cache] Cache size (${(totalSize / 1024 / 1024).toFixed(2)} MB) exceeds 5GB. Pruning...`);
      fileList.sort((a, b) => a.mtime - b.mtime);

      for (const file of fileList) {
        if (totalSize <= MAX_CACHE_SIZE) break;
        try {
          fs.unlinkSync(file.path);
          totalSize -= file.size;
        } catch {
          // Skip errors
        }
      }
    }
  } catch (err) {
    console.error(`[Cache Error] Failed to prune cache:`, (err as Error).message);
  }
}

/** Fetch and cache file metadata (size, content-type, range support) */
export async function getFileMetadata(streamUrl: string, hash: string): Promise<FileMetadata> {
  const metaPath = path.join(CACHE_DIR, `${hash}_meta.json`);
  if (fs.existsSync(metaPath)) {
    try {
      return JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    } catch {
      // Corrupt meta, re-fetch
    }
  }

  console.log(`[Meta] Fetching metadata for: ${streamUrl}`);
  let totalSize = 0;
  let contentType = 'video/mp4';
  let supportsRanges = false;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let getRes: any;
    try {
      getRes = await axios.head(streamUrl, {
        headers: { 'User-Agent': AXIOS_CONFIG.headers['User-Agent'], Range: 'bytes=0-0' },
        timeout: 8000,
        httpAgent: keepAliveHttpAgent,
        httpsAgent: keepAliveAgent,
        validateStatus: (status: number) => status === 200 || status === 206,
      });
    } catch {
      getRes = await axios.get(streamUrl, {
        headers: { 'User-Agent': AXIOS_CONFIG.headers['User-Agent'], Range: 'bytes=0-0' },
        responseType: 'stream',
        timeout: 10000,
        httpAgent: keepAliveHttpAgent,
        httpsAgent: keepAliveAgent,
        validateStatus: (status: number) => status === 200 || status === 206,
      });
    }

    if (getRes.status === 206 || getRes.headers['content-range']) {
      supportsRanges = true;
      const match = getRes.headers['content-range']?.match(/\/(\d+)/);
      if (match) totalSize = parseInt(match[1], 10);
    }

    if (!totalSize && getRes.headers['content-length']) {
      totalSize = parseInt(getRes.headers['content-length'], 10);
    }
    if (getRes.headers['content-type']) {
      contentType = getRes.headers['content-type'];
    }
    if (getRes.data && typeof getRes.data.destroy === 'function') {
      getRes.data.destroy();
    }
  } catch (err) {
    throw new Error(`Failed to resolve file size and content type: ${(err as Error).message}`);
  }

  if (!totalSize) throw new Error('Could not determine total file size.');
  if (contentType === 'application/octet-stream') contentType = 'video/mp4';

  const meta: FileMetadata = { totalSize, contentType, supportsRanges };
  try {
    fs.writeFileSync(metaPath, JSON.stringify(meta), 'utf8');
  } catch {
    // Non-critical
  }

  return meta;
}

/** Start a background full-file download (for non-range-supporting servers) */
export function startBackgroundFullDownload(streamUrl: string, hash: string): void {
  if (activeFullDownloads.has(hash)) return;

  const completedPath = path.join(CACHE_DIR, `${hash}_full.mp4`);
  const tempPath = path.join(CACHE_DIR, `${hash}_full.mp4.tmp`);
  if (fs.existsSync(completedPath)) return;

  const downloadPromise = (async () => {
    try {
      pruneCache();
      const writeStream = fs.createWriteStream(tempPath);
      const response = await axios.get(streamUrl, {
        headers: { 'User-Agent': AXIOS_CONFIG.headers['User-Agent'] },
        responseType: 'stream',
        timeout: 900000,
        httpAgent: keepAliveHttpAgent,
        httpsAgent: keepAliveAgent,
      });

      response.data.pipe(writeStream);
      await new Promise<void>((resolve, reject) => {
        writeStream.on('finish', resolve);
        response.data.on('error', reject);
        writeStream.on('error', reject);
      });

      fs.renameSync(tempPath, completedPath);
      console.log(`[Background] Full file cached for ${hash}`);
    } catch (err) {
      if (fs.existsSync(tempPath)) try { fs.unlinkSync(tempPath); } catch { /* */ }
      console.error(`[Background] Full download failed for ${hash}:`, (err as Error).message);
    } finally {
      activeFullDownloads.delete(hash);
    }
  })();

  activeFullDownloads.set(hash, downloadPromise);
}

/** Download and cache a 4MB chunk */
export async function getChunk(streamUrl: string, hash: string, chunkIndex: number, totalSize: number): Promise<string> {
  const CHUNK_SIZE = 4 * 1024 * 1024;
  const chunkStart = chunkIndex * CHUNK_SIZE;
  const chunkEnd = Math.min(totalSize - 1, (chunkIndex + 1) * CHUNK_SIZE - 1);
  const expectedSize = chunkEnd - chunkStart + 1;

  const chunkPath = path.join(CACHE_DIR, `${hash}_chunk_${chunkIndex}.part`);
  const tempPath = path.join(CACHE_DIR, `${hash}_chunk_${chunkIndex}.part.tmp`);

  if (fs.existsSync(chunkPath)) {
    try {
      const stats = fs.statSync(chunkPath);
      if (stats.size === expectedSize) return chunkPath;
      fs.unlinkSync(chunkPath);
    } catch { /* */ }
  }

  const lockKey = `${hash}_chunk_${chunkIndex}`;
  if (activeChunkDownloads.has(lockKey)) {
    return activeChunkDownloads.get(lockKey)!;
  }

  const downloadPromise = (async () => {
    try {
      pruneCache();
      const writeStream = fs.createWriteStream(tempPath);
      const response = await axios.get(streamUrl, {
        headers: {
          'User-Agent': AXIOS_CONFIG.headers['User-Agent'],
          Range: `bytes=${chunkStart}-${chunkEnd}`,
        },
        responseType: 'stream',
        timeout: 60000,
        httpAgent: keepAliveHttpAgent,
        httpsAgent: keepAliveAgent,
        validateStatus: (status: number) => status === 200 || status === 206,
      });

      response.data.pipe(writeStream);
      await new Promise<void>((resolve, reject) => {
        writeStream.on('finish', resolve);
        response.data.on('error', reject);
        writeStream.on('error', reject);
      });

      const stats = fs.statSync(tempPath);
      if (stats.size !== expectedSize) {
        throw new Error(`Size mismatch: expected ${expectedSize}, got ${stats.size}`);
      }

      fs.renameSync(tempPath, chunkPath);
      const now = new Date();
      try { fs.utimesSync(chunkPath, now, now); } catch { /* */ }
      return chunkPath;
    } catch (err) {
      if (fs.existsSync(tempPath)) try { fs.unlinkSync(tempPath); } catch { /* */ }
      throw err;
    } finally {
      activeChunkDownloads.delete(lockKey);
    }
  })();

  activeChunkDownloads.set(lockKey, downloadPromise);
  return downloadPromise;
}

/** Prefetch upcoming chunks in the background */
export function prefetchChunks(streamUrl: string, hash: string, currentChunkIndex: number, totalSize: number): void {
  const PREFETCH_WINDOW = 3;
  const totalChunks = Math.ceil(totalSize / (4 * 1024 * 1024));

  for (let i = 1; i <= PREFETCH_WINDOW; i++) {
    const targetIdx = currentChunkIndex + i;
    if (targetIdx < totalChunks) {
      getChunk(streamUrl, hash, targetIdx, totalSize).catch(() => {
        // Silently fail prefetch errors
      });
    }
  }
}

/** Update active playback tracking for cache preservation */
export function updatePlaybackActivity(hash: string, chunkIndex: number): void {
  activePlaybackChunks.set(hash, {
    lastActivity: Date.now(),
    activeChunk: chunkIndex,
  });
}

/** Check if a fully cached file exists */
export function getFullCachePath(hash: string): string | null {
  const completedPath = path.join(CACHE_DIR, `${hash}_full.mp4`);
  return fs.existsSync(completedPath) ? completedPath : null;
}

/** Get temp file path and size for partial downloads */
export function getTempFileInfo(hash: string): { path: string; size: number } | null {
  const tempPath = path.join(CACHE_DIR, `${hash}_full.mp4.tmp`);
  if (!fs.existsSync(tempPath)) return null;
  return { path: tempPath, size: fs.statSync(tempPath).size };
}
