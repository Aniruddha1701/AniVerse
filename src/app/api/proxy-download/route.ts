import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import axios from 'axios';
import { AXIOS_CONFIG, keepAliveAgent, keepAliveHttpAgent } from '@/lib/scraper';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const downloadUrl = searchParams.get('url');
    const fileName = searchParams.get('fileName') || 'download.mkv';

    if (!downloadUrl) {
      return new Response('Download URL is required.', { status: 400 });
    }

    console.log(`[Proxy Download API] Streaming file: ${fileName}`);

    const fileRes = await axios.get(downloadUrl, {
      headers: {
        'User-Agent': AXIOS_CONFIG.headers['User-Agent'],
      },
      responseType: 'stream',
      timeout: 300000, // 5 min timeout
      maxRedirects: 10,
      httpAgent: keepAliveHttpAgent,
      httpsAgent: keepAliveAgent,
    });

    const contentType = String(fileRes.headers['content-type'] || 'application/octet-stream');
    const contentLength = fileRes.headers['content-length'] ? String(fileRes.headers['content-length']) : undefined;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stream = new ReadableStream({
      start(controller) {
        fileRes.data.on('data', (chunk: Buffer) => {
          controller.enqueue(chunk);
        });
        fileRes.data.on('end', () => {
          controller.close();
        });
        fileRes.data.on('error', (err: Error) => {
          controller.error(err);
        });
      },
      cancel() {
        if (fileRes.data && typeof fileRes.data.destroy === 'function') {
          fileRes.data.destroy();
        }
      }
    });

    const headers = new Headers();
    headers.set('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    headers.set('Content-Type', contentType);
    if (contentLength) {
      headers.set('Content-Length', contentLength);
    }

    return new Response(stream, { headers });
  } catch (error) {
    console.error('[Proxy Download API Error]:', (error as Error).message);
    return new Response(`Download failed: ${(error as Error).message}`, { status: 500 });
  }
}
