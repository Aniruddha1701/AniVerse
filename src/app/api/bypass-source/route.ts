import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { AXIOS_CONFIG } from '@/lib/scraper';

export const dynamic = 'force-dynamic';

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

    console.log(`[Bypasser API] Starting bypass chain for URL: ${currentUrl}`);

    // Direct driveseed file link check
    if (currentUrl.includes('driveseed.org/file/')) {
      console.log(`[Bypasser API] Direct driveseed file link detected. Fetching page to extract name...`);
      try {
        const filePageRes = await axios.get(currentUrl, AXIOS_CONFIG);
        const $filePage = cheerio.load(filePageRes.data);
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
        console.warn(`[Bypasser API Warning] Failed to fetch direct file details: ${(err as Error).message}.`);
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
      console.log(`[Bypasser API] Fetching modpro page to extract SIDs...`);
      const modproRes = await axios.get(currentUrl, AXIOS_CONFIG);
      const $modpro = cheerio.load(modproRes.data);

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
        console.log(`[Bypasser API] Multi-episode page detected with ${episodeLinks.length} options.`);
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

    // Step 1: POST to unblockedgames
    console.log('[Bypasser API] STEP 1: POSTing SID to unblockedgames...');
    const params1 = new URLSearchParams();
    params1.append('_wp_http', sid);

    const step1Res = await axios.post('https://cloud.unblockedgames.world/', params1, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': AXIOS_CONFIG.headers['User-Agent'],
        Referer: 'https://cloud.unblockedgames.world/',
      },
    });

    const $step1 = cheerio.load(step1Res.data);
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
    console.log('[Bypasser API] STEP 2: POSTing step 2 params immediately...');
    const params2 = new URLSearchParams();
    params2.append('_wp_http2', wp_http2);
    params2.append('token', token);

    const step2Res = await axios.post(actionUrl, params2, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': AXIOS_CONFIG.headers['User-Agent'],
        Referer: 'https://cloud.unblockedgames.world/',
      },
    });

    const bodyText2 = step2Res.data;
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
    console.log('[Bypasser API] STEP 3: Cookie validation GET request...');
    const goUrl = `https://cloud.unblockedgames.world/?go=${cookieName}`;
    const step3Res = await axios.get(goUrl, {
      headers: {
        Cookie: `${cookieName}=${cookieValue}`,
        'User-Agent': AXIOS_CONFIG.headers['User-Agent'],
        Referer: actionUrl,
      },
    });

    const metaRefreshRegex = /url\s*=\s*["']?([^"' >]+)["']?/i;
    const metaMatch = step3Res.data.match(metaRefreshRegex);
    if (!metaMatch) {
      return NextResponse.json(
        { success: false, message: 'Failed to parse step 3 redirect meta.' },
        { status: 500 }
      );
    }
    let refreshUrl = metaMatch[1];
    refreshUrl = refreshUrl.replace(/&amp;/g, '&');

    // Step 4: GET to Driveseed landing redirector
    console.log('[Bypasser API] STEP 4: GETing Driveseed landing page...');
    const step4Res = await axios.get(refreshUrl, {
      headers: {
        'User-Agent': AXIOS_CONFIG.headers['User-Agent'],
        Referer: goUrl,
      },
    });

    const replaceRegex = /replace\s*\(\s*['"]([^'"]+)['"]/i;
    const replaceMatch = step4Res.data.match(replaceRegex);
    if (!replaceMatch) {
      return NextResponse.json(
        { success: false, message: 'Failed to parse relative list link from driveseed.' },
        { status: 500 }
      );
    }
    const relativeReplaceUrl = replaceMatch[1];
    const finalListUrl = `https://driveseed.org${relativeReplaceUrl}`;

    // Step 5: GET to final Driveseed list page
    console.log('[Bypasser API] STEP 5: Loading final driveseed listings page...');
    const step5Res = await axios.get(finalListUrl, {
      headers: {
        'User-Agent': AXIOS_CONFIG.headers['User-Agent'],
        Referer: refreshUrl,
      },
    });

    const $list = cheerio.load(step5Res.data);
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
    console.error('[Bypasser API Error]:', (error as Error).message);
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
