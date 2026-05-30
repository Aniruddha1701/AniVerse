import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { AXIOS_CONFIG, keepAliveAgent, keepAliveHttpAgent } from '@/lib/scraper';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const fileUrl = searchParams.get('url');

    if (!fileUrl) {
      return NextResponse.json(
        { success: false, message: 'File URL is required.' },
        { status: 400 }
      );
    }

    console.log(`[File Bypasser API] Loading Driveseed file: ${fileUrl}`);

    const response = await axios.get(fileUrl, AXIOS_CONFIG);
    const $ = cheerio.load(response.data);

    const pageTitle = $('title').text().replace('Download', '').replace('DriveSeed', '').trim();
    let fileName = pageTitle || 'download';
    fileName = fileName.replace(/[^a-zA-Z0-9._\-\s()\[\]]/g, '').trim();
    if (!fileName.match(/\.[a-zA-Z0-9]{2,5}$/)) {
      fileName += '.mkv';
    }

    let directDownloadLink = '';
    $('a').each((_i, el) => {
      const href = $(el).attr('href') || '';
      if (
        href.includes('video-gen.xyz') ||
        href.includes('driveseed') ||
        href.includes('drive.google') ||
        href.includes('pixeldrain') ||
        href.includes('tgseed.link')
      ) {
        if (href.includes('instant') || href.includes('cdn')) {
          directDownloadLink = href;
          return false;
        }
      }
    });

    if (!directDownloadLink) {
      $('a').each((_i, el) => {
        const text = $(el).text().trim();
        const href = $(el).attr('href') || '';
        if (href && (text.includes('Instant') || text.includes('Download') || text.includes('V2'))) {
          if (!href.startsWith('/') && href.startsWith('http')) {
            directDownloadLink = href;
            return false;
          }
        }
      });
    }

    if (!directDownloadLink) {
      directDownloadLink =
        $('a:contains("Download")').first().attr('href') ||
        $('a:contains("Instant")').first().attr('href') ||
        fileUrl;
    }

    if (directDownloadLink.startsWith('/')) {
      directDownloadLink = 'https://driveseed.org' + directDownloadLink;
    }

    console.log(`[File Bypasser API] Found initial direct link: ${directDownloadLink}`);

    let finalDownloadUrl = directDownloadLink;
    try {
      console.log(`[File Bypasser API] Following backend redirects for ${directDownloadLink}...`);
      const redirectRes = await axios.get(directDownloadLink, {
        headers: AXIOS_CONFIG.headers,
        maxRedirects: 10,
        httpAgent: keepAliveHttpAgent,
        httpsAgent: keepAliveAgent,
        validateStatus: () => true,
      });

      const resolvedUrl =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (redirectRes.request as any).res?.responseUrl ||
        redirectRes.config.url ||
        directDownloadLink;
      console.log(`[File Bypasser API] Resolved final redirect URL: ${resolvedUrl}`);

      const parsedUrl = new URL(resolvedUrl);
      const rawUrlParam = parsedUrl.searchParams.get('url');
      if (rawUrlParam) {
        finalDownloadUrl = rawUrlParam;
        console.log(
          `[File Bypasser API] Successfully bypassed video-seed.pro! Raw download URL: ${finalDownloadUrl}`
        );
      } else {
        finalDownloadUrl = resolvedUrl;
      }
    } catch (err) {
      console.warn(
        `[File Bypasser API Warning] Failed to trace final direct redirect: ${(err as Error).message}.`
      );
    }

    console.log(`[File Bypasser API] Success! Direct download URL resolved: ${finalDownloadUrl}`);

    return NextResponse.json({
      success: true,
      downloadUrl: finalDownloadUrl,
      fileName: fileName,
    });
  } catch (error) {
    console.error('[File Bypasser API Error]:', (error as Error).message);
    return NextResponse.json(
      { success: false, message: `File bypassing failed: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}
