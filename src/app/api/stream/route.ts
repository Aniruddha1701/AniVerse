import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import {
  hashUrl,
  getFileMetadata,
  startBackgroundFullDownload,
  getChunk,
  prefetchChunks,
  updatePlaybackActivity,
  getCacheDir,
} from '@/lib/cache';
import { AXIOS_CONFIG, keepAliveAgent, keepAliveHttpAgent } from '@/lib/scraper';

export const dynamic = 'force-dynamic';

const CHUNK_SIZE = 4 * 1024 * 1024;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const streamUrl = searchParams.get('url');

    if (!streamUrl) {
      return new Response('Stream URL is required.', { status: 400 });
    }

    const cacheKey = searchParams.get('key') || streamUrl;
    const hash = hashUrl(cacheKey);

    // 1. Resolve file metadata
    let metadata;
    try {
      metadata = await getFileMetadata(streamUrl, hash);
    } catch (metaErr) {
      console.error(`[Stream API Error] Metadata resolution failed for ${hash}:`, (metaErr as Error).message);
      return new Response(`Gateway Error: Failed to resolve video metadata: ${(metaErr as Error).message}`, {
        status: 502,
      });
    }

    const { totalSize, contentType, supportsRanges } = metadata;

    // 1.5. Dynamic Bypass Redirect for Huge Files (> 2 GB)
    if (totalSize > 2 * 1024 * 1024 * 1024) {
      console.log(`[Stream API] File size (${(totalSize / 1024 / 1024 / 1024).toFixed(2)} GB) > 2GB. Direct Redirect.`);
      return NextResponse.redirect(streamUrl);
    }

    // 2. Parse browser requested byte ranges
    let start = 0;
    let end = totalSize - 1;
    let isRangeRequest = false;

    const rangeHeader = request.headers.get('range');
    if (rangeHeader) {
      isRangeRequest = true;
      const parts = rangeHeader.replace(/bytes=/, '').split('-');
      start = parseInt(parts[0], 10);
      if (parts[1]) {
        end = parseInt(parts[1], 10);
      }
      console.log(`[Stream API] Range request: start=${start}, end=${end}, totalSize=${totalSize}`);
    } else {
      console.log(`[Stream API] Full stream request: totalSize=${totalSize}`);
    }

    // Ensure range lies within boundaries
    if (start >= totalSize || end >= totalSize || start > end) {
      return new Response(null, {
        status: 416,
        headers: { 'Content-Range': `bytes */${totalSize}` },
      });
    }

    const CACHE_DIR = getCacheDir();

    // A. HYBRID ROUTE: NON-RANGE-SUPPORTING STREAMING
    if (!supportsRanges) {
      startBackgroundFullDownload(streamUrl, hash);

      const completedPath = path.join(CACHE_DIR, `${hash}_full.mp4`);
      const tempPath = path.join(CACHE_DIR, `${hash}_full.mp4.tmp`);

      updatePlaybackActivity(hash, -1);

      // 1. Fully cached
      if (fs.existsSync(completedPath)) {
        const stats = fs.statSync(completedPath);
        const fileStream = fs.createReadStream(completedPath, { start, end });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const stream = new ReadableStream({
          start(controller) {
            fileStream.on('data', (chunk) => controller.enqueue(chunk));
            fileStream.on('end', () => controller.close());
            fileStream.on('error', (err) => controller.error(err));
          },
          cancel() {
            fileStream.destroy();
          },
        });

        const headers = new Headers({
          'Content-Type': contentType,
          'Accept-Ranges': 'bytes',
          'Content-Length': (end - start + 1).toString(),
        });
        if (isRangeRequest) {
          headers.set('Content-Range', `bytes ${start}-${end}/${totalSize}`);
        }

        return new Response(stream, {
          status: isRangeRequest ? 206 : 200,
          headers,
        });
      }

      // 2. Temp cache coverage check
      let tempSize = 0;
      if (fs.existsSync(tempPath)) {
        tempSize = fs.statSync(tempPath).size;
      }

      const safeLimit = Math.max(0, tempSize - 65536);
      if (start < safeLimit) {
        const chunkEnd = end !== -1 && end < safeLimit ? end : safeLimit - 1;
        if (start <= chunkEnd) {
          const contentLength = chunkEnd - start + 1;
          const tempReadStream = fs.createReadStream(tempPath, { start, end: chunkEnd });
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const stream = new ReadableStream({
            start(controller) {
              tempReadStream.on('data', (chunk) => controller.enqueue(chunk));
              tempReadStream.on('end', () => controller.close());
              tempReadStream.on('error', (err) => controller.error(err));
            },
            cancel() {
              tempReadStream.destroy();
            },
          });

          return new Response(stream, {
            status: 206,
            headers: {
              'Content-Type': contentType,
              'Accept-Ranges': 'bytes',
              'Content-Range': `bytes ${start}-${chunkEnd}/${totalSize}`,
              'Content-Length': contentLength.toString(),
            },
          });
        }
      }

      // 3. Fallback: stream from remote
      console.log(`[Stream API] Stream not cached yet. Streaming from remote: ${streamUrl}`);
      const fileRes = await axios.get(streamUrl, {
        headers: { 'User-Agent': AXIOS_CONFIG.headers['User-Agent'] },
        responseType: 'stream',
        timeout: 300000,
        httpAgent: keepAliveHttpAgent,
        httpsAgent: keepAliveAgent,
      });

      let bytesSkipped = 0;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const stream = new ReadableStream({
        start(controller) {
          fileRes.data.on('data', (chunk: Buffer) => {
            if (bytesSkipped < start) {
              const bytesLeftToSkip = start - bytesSkipped;
              if (chunk.length <= bytesLeftToSkip) {
                bytesSkipped += chunk.length;
              } else {
                const sliceStart = bytesLeftToSkip;
                bytesSkipped += sliceStart;
                const slice = chunk.subarray(sliceStart);
                controller.enqueue(slice);
              }
            } else {
              controller.enqueue(chunk);
            }
          });
          fileRes.data.on('end', () => {
            controller.close();
          });
          fileRes.data.on('error', (err: Error) => {
            controller.error(err);
          });
        },
        cancel() {
          fileRes.data.destroy();
        },
      });

      const responseHeaders = new Headers({
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes',
        'Content-Length': (end - start + 1).toString(),
      });
      if (isRangeRequest) {
        responseHeaders.set('Content-Range', `bytes ${start}-${end}/${totalSize}`);
      }

      return new Response(stream, {
        status: isRangeRequest ? 206 : 200,
        headers: responseHeaders,
      });
    }

    // B. CHUNKED ROUTE: SERVER SUPPORTS RANGE REQUESTS NATIVELY
    const startChunk = Math.floor(start / CHUNK_SIZE);
    const endChunk = Math.floor(end / CHUNK_SIZE);

    let currentChunkIndex = startChunk;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stream = new ReadableStream({
      async pull(controller) {
        if (currentChunkIndex > endChunk) {
          controller.close();
          return;
        }

        try {
          updatePlaybackActivity(hash, currentChunkIndex);
          prefetchChunks(streamUrl, hash, currentChunkIndex, totalSize);

          const chunkPath = await getChunk(streamUrl, hash, currentChunkIndex, totalSize);

          const chunkStartByte = currentChunkIndex * CHUNK_SIZE;
          const chunkEndByte = Math.min(totalSize - 1, (currentChunkIndex + 1) * CHUNK_SIZE - 1);

          const readStart = Math.max(0, start - chunkStartByte);
          const readEnd = Math.min(chunkEndByte - chunkStartByte, end - chunkStartByte);

          const chunkReadStream = fs.createReadStream(chunkPath, {
            start: readStart,
            end: readEnd,
          });

          await new Promise<void>((resolve, reject) => {
            chunkReadStream.on('data', (data) => {
              controller.enqueue(data);
            });
            chunkReadStream.on('end', () => {
              chunkReadStream.destroy();
              resolve();
            });
            chunkReadStream.on('error', (err) => {
              chunkReadStream.destroy();
              reject(err);
            });
          });

          currentChunkIndex++;
        } catch (err) {
          controller.error(err);
        }
      },
    });

    const headers = new Headers({
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
      'Content-Length': (end - start + 1).toString(),
    });
    if (isRangeRequest) {
      headers.set('Content-Range', `bytes ${start}-${end}/${totalSize}`);
    }

    return new Response(stream, {
      status: isRangeRequest ? 206 : 200,
      headers,
    });
  } catch (error) {
    console.error('[Stream API Error]:', (error as Error).message);
    return new Response(`Streaming failed: ${(error as Error).message}`, { status: 500 });
  }
}
