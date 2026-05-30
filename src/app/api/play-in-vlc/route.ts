import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/play-in-vlc?url=...&title=...
 * Generates a dynamic .m3u playlist file on the fly and returns it as a downloadable attachment.
 * When the user opens this file on desktop, the OS automatically launches VLC or their default
 * media player to stream the video directly through our proxy.
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const streamUrl = searchParams.get('url') || '';
    const title = searchParams.get('title') || 'AniVerse Stream';

    if (!streamUrl) {
      return new Response('Stream URL is required', { status: 400 });
    }

    const requestUrl = new URL(request.url);
    let absoluteStreamUrl = streamUrl;

    if (streamUrl.startsWith('/')) {
      absoluteStreamUrl = `${requestUrl.origin}${streamUrl}`;
    } else {
      // Stream through our high-performance chunked proxy endpoint to support range headers and cache
      absoluteStreamUrl = `${requestUrl.origin}/api/stream?url=${encodeURIComponent(streamUrl)}`;
    }

    // Generate the standard M3U playlist content
    const m3uContent = `#EXTM3U\n#EXTINF:-1,${title}\n${absoluteStreamUrl}\n`;

    // Return the .m3u file as a direct attachment
    return new Response(m3uContent, {
      status: 200,
      headers: {
        'Content-Type': 'audio/x-mpegurl',
        'Content-Disposition': `attachment; filename="play_in_vlc.m3u"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (err) {
    console.error(`[VLC Playlist Generation Error]:`, (err as Error).message);
    return new Response(`Failed to generate VLC playlist: ${(err as Error).message}`, { status: 500 });
  }
}
