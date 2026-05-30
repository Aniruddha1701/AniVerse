import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import * as cheerio from 'cheerio';

export const dynamic = 'force-dynamic';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
  'sec-ch-ua': '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Windows"',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1'
};

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sourceUrl = searchParams.get('url');

    if (!sourceUrl) {
      return NextResponse.json(
        { success: false, message: 'URL query parameter is required.' },
        { status: 400 }
      );
    }

    let currentUrl: string = sourceUrl;

    console.log(`[Bypasser Edge API] Starting bypass chain for URL: ${currentUrl}`);

    // Direct driveseed file link check
    if (currentUrl.includes('driveseed.org/file/')) {
      console.log(`[Bypasser Edge API] Direct driveseed file link detected. Fetching page...`);
      try {
        const filePageRes = await fetch(currentUrl, { headers: HEADERS });
        const filePageHtml = await filePageRes.text();
        const $filePage = cheerio.load(filePageHtml);
        const pageTitle =
          $filePage('title').text().replace('Download', '').replace('DriveSeed', '').trim() ||
          currentUrl.split('/').pop() ||
          'Download File';

        return NextResponse.json({
          success: true,
          title: pageTitle,
          files: [
            {
              name: pageTitle,
              url: currentUrl,
            },
          ],
        });
      } catch (err) {
        console.warn(`[Bypasser Edge API Warning] Failed to fetch direct file details: ${(err as Error).message}.`);
        return NextResponse.json({
          success: true,
          title: 'Direct File Download',
          files: [
            {
              name: currentUrl.split('/').pop() || 'Download File',
              url: currentUrl,
            },
          ],
        });
      }
    }

    // Modpro pages check
    if (currentUrl.includes('modpro.blog') || currentUrl.includes('archives')) {
      console.log(`[Bypasser Edge API] Fetching modpro page to extract SIDs...`);
      const modproRes = await fetch(currentUrl, { headers: HEADERS });
      const modproHtml = await modproRes.text();
      const $modpro = cheerio.load(modproHtml);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const episodeLinks: any[] = [];
      $modpro('a').each((_i, el) => {
        const href = $modpro(el).attr('href') || '';
        const text = $modpro(el).text().trim();

        if (href.includes('cloud.unblockedgames.world/?sid=') || href.includes('driveseed.org/file/')) {
          if (!href.includes('comment')) {
            episodeLinks.push({
              name: text || `Episode ${episodeLinks.length + 1}`,
              url: href,
            });
          }
        }
      });

      if (episodeLinks.length === 0) {
        return NextResponse.json(
          { success: false, message: 'Could not find download links on modpro page.' },
          { status: 404 }
        );
      }

      if (episodeLinks.length > 1) {
        console.log(`[Bypasser Edge API] Multi-episode page detected with ${episodeLinks.length} options.`);
        return NextResponse.json({
          success: true,
          isMultiEpisode: true,
          title: $modpro('title').text().replace('Modpro.blog', '').trim() || 'Select Episode',
          episodes: episodeLinks,
        });
      }

      currentUrl = episodeLinks[0].url;

      if (currentUrl && currentUrl.includes('driveseed.org/file/')) {
        return NextResponse.json({
          success: true,
          title: 'Direct File Download',
          files: [
            {
              name: currentUrl.split('/').pop() || 'Download File',
              url: currentUrl,
            },
          ],
        });
      }
    }

    const sidMatch = currentUrl.match(/sid=([^&]+)/);
    if (!sidMatch) {
      return NextResponse.json(
        { success: false, message: 'Invalid URL. SID parameter is missing.' },
        { status: 400 }
      );
    }
    const sid = decodeURIComponent(sidMatch[1]);

    // Check if the SID itself is a base64 encoded destination URL
    let decodedUrl = '';
    try {
      const decoded = atob(sid);
      if (decoded.startsWith('http://') || decoded.startsWith('https://')) {
        decodedUrl = decoded;
        console.log(`[Bypasser Edge API] Successfully decoded base64 SID directly to URL: ${decodedUrl}`);
      }
    } catch {}

    if (decodedUrl) {
      currentUrl = decodedUrl;
      console.log(`[Bypasser Edge API] Bypassed Step 1-3. Direct target URL is: ${currentUrl}`);

      // Direct driveseed file link check
      if (currentUrl.includes('driveseed.org/file/')) {
        console.log(`[Bypasser Edge API] Direct driveseed file link detected after decoding. Fetching page...`);
        try {
          const filePageRes = await fetch(currentUrl, { headers: HEADERS });
          const filePageHtml = await filePageRes.text();
          const $filePage = cheerio.load(filePageHtml);
          const pageTitle =
            $filePage('title').text().replace('Download', '').replace('DriveSeed', '').trim() ||
            currentUrl.split('/').pop() ||
            'Download File';

          return NextResponse.json({
            success: true,
            title: pageTitle,
            files: [
              {
                name: pageTitle,
                url: currentUrl,
              },
            ],
          });
        } catch (err) {
          console.warn(`[Bypasser Edge API Warning] Failed to fetch direct file page details: ${(err as Error).message}. Returning fallback...`);
          return NextResponse.json({
            success: true,
            title: 'Direct File Download',
            files: [
              {
                name: 'Direct DriveSeed Download Page (Browser)',
                url: currentUrl,
              },
            ],
          });
        }
      } else {
        // Return other decoded URLs directly as fallback
        return NextResponse.json({
          success: true,
          title: 'Direct Download Link',
          files: [
            {
              name: 'Direct Download Link (Browser)',
              url: currentUrl,
            },
          ],
        });
      }
    }

    // Step 1: POST to unblockedgames
    console.log('[Bypasser Edge API] STEP 1: POSTing SID to unblockedgames...');
    const params1 = new URLSearchParams();
    params1.append('_wp_http', sid);

    const step1Res = await fetch('https://cloud.unblockedgames.world/', {
      method: 'POST',
      headers: {
        ...HEADERS,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': 'https://cloud.unblockedgames.world/',
      },
      body: params1.toString()
    });

    const step1Html = await step1Res.text();
    const $step1 = cheerio.load(step1Html);
    const form = $step1('#landing');
    const actionUrl = form.attr('action');
    const wp_http2 = form.find('input[name="_wp_http2"]').val() as string;
    const token = form.find('input[name="token"]').val() as string;

    if (!actionUrl || !wp_http2) {
      return NextResponse.json(
        { success: false, message: 'Failed to bypass Step 1. Rate limited or Cloudflare block.' },
        { status: 500 }
      );
    }

    // Step 2: POST to actionUrl
    console.log('[Bypasser Edge API] STEP 2: POSTing step 2 params immediately...');
    const params2 = new URLSearchParams();
    params2.append('_wp_http2', wp_http2);
    params2.append('token', token);

    const step2Res = await fetch(actionUrl, {
      method: 'POST',
      headers: {
        ...HEADERS,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': 'https://cloud.unblockedgames.world/',
      },
      body: params2.toString()
    });

    const bodyText2 = await step2Res.text();
    const cookieRegex = /s_343\s*\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]/i;
    const cookieMatch = bodyText2.match(cookieRegex);

    if (!cookieMatch) {
      return NextResponse.json(
        { success: false, message: 'Failed to bypass Step 2. Redirection cookie not found.' },
        { status: 500 }
      );
    }

    let cookieName = cookieMatch[1];
    const cookieValue = cookieMatch[2];

    const targetUrlRegex = /go=Pepe-([^'"]+)/i;
    const targetUrlMatch = bodyText2.match(targetUrlRegex);
    if (targetUrlMatch) {
      cookieName = 'Pepe-' + targetUrlMatch[1];
    } else {
      const targetUrlRegex2 = /go=([^'"]+)/i;
      const targetUrlMatch2 = bodyText2.match(targetUrlRegex2);
      if (targetUrlMatch2) {
        cookieName = targetUrlMatch2[1];
      }
    }

    // Step 3: GET to unblockedgames
    console.log('[Bypasser Edge API] STEP 3: Cookie validation GET request...');
    const goUrl = `https://cloud.unblockedgames.world/?go=${cookieName}`;
    
    const step3Res = await fetch(goUrl, {
      headers: {
        ...HEADERS,
        'Cookie': `${cookieName}=${cookieValue}`,
        'Referer': actionUrl,
      }
    });

    const step3Html = await step3Res.text();
    const metaRefreshRegex = /url\s*=\s*["']?([^"' >]+)["']?/i;
    const metaMatch = step3Html.match(metaRefreshRegex);
    if (!metaMatch) {
      return NextResponse.json(
        { success: false, message: 'Failed to parse step 3 redirect meta.' },
        { status: 500 }
      );
    }
    let refreshUrl = metaMatch[1];
    refreshUrl = refreshUrl.replace(/&amp;/g, '&');

    // Step 4: GET to Driveseed landing redirector
    console.log('[Bypasser Edge API] STEP 4: GETing Driveseed landing page...');
    const step4Res = await fetch(refreshUrl, {
      headers: {
        ...HEADERS,
        'Referer': goUrl,
      }
    });

    const step4Html = await step4Res.text();
    const replaceRegex = /replace\s*\(\s*['"]([^'"]+)['"]/i;
    const replaceMatch = step4Html.match(replaceRegex);
    if (!replaceMatch) {
      return NextResponse.json(
        { success: false, message: 'Failed to parse relative list link from driveseed.' },
        { status: 500 }
      );
    }
    const relativeReplaceUrl = replaceMatch[1];
    const finalListUrl = `https://driveseed.org${relativeReplaceUrl}`;

    // Step 5: GET to final Driveseed list page
    console.log('[Bypasser Edge API] STEP 5: Loading final driveseed listings page...');
    const step5Res = await fetch(finalListUrl, {
      headers: {
        ...HEADERS,
        'Referer': refreshUrl,
      }
    });

    const step5Html = await step5Res.text();
    const $list = cheerio.load(step5Html);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const files: any[] = [];

    $list('li.list-group-item').each((_i, el) => {
      const anchor = $list(el).find('a').first();
      const relativeFileUrl = anchor.attr('href') || '';
      const name = anchor.text().trim() || 'Download File';

      if (relativeFileUrl && relativeFileUrl.startsWith('/file/')) {
        files.push({
          name,
          url: `https://driveseed.org${relativeFileUrl}`,
        });
      }
    });

    if (files.length === 0 && finalListUrl.includes('/file/')) {
      const pageTitle =
        $list('title').text().replace('Download', '').replace('DriveSeed', '').trim() ||
        finalListUrl.split('/').pop() ||
        'Download File';
      files.push({
        name: pageTitle,
        url: finalListUrl,
      });
    }

    return NextResponse.json({
      success: true,
      title:
        $list('h3').first().text().trim() ||
        $list('title').text().replace('Download', '').replace('DriveSeed', '').trim() ||
        'Movie Files List',
      files,
    });
  } catch (error) {
    console.error('[Bypasser Edge API Error]:', (error as Error).message);
    return NextResponse.json(
      {
        success: false,
        message: 'Redirection bypass failed. The session may have expired.',
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
