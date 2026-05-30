import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { AXIOS_CONFIG } from '@/lib/scraper';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const detailUrl = searchParams.get('url');

    if (!detailUrl) {
      return NextResponse.json(
        { success: false, message: 'URL query parameter is required.' },
        { status: 400 }
      );
    }

    console.log(`[Scraper API] Fetching details from: ${detailUrl}`);

    const response = await axios.get(detailUrl, AXIOS_CONFIG);
    const $ = cheerio.load(response.data);

    const title = $('h1.single-title, h1.entry-title').first().text().trim();
    const content = $('.entry-content, .post-single-content, .thecontent').first();

    const poster = content.find('img').first().attr('src') || '';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const screenshots: any[] = [];
    content.find('img').each((_i, elem) => {
      const src = $(elem).attr('src') || $(elem).attr('data-src') || '';
      if (
        src &&
        !src.includes('favicon') &&
        !src.includes('avatar') &&
        !src.includes('logo') &&
        !src.includes('maxbutton') &&
        !src.includes('favicont') &&
        src !== poster
      ) {
        screenshots.push(src);
      }
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const info: any[] = [];
    content.find('ul li').each((_i, elem) => {
      const text = $(elem).text().trim();
      if (text && text.length < 150) {
        info.push(text);
      }
    });

    let plot = '';
    const plotHeading = content.find('h2:contains("Storyline"), h2:contains("Plot"), h3:contains("Storyline"), h3:contains("Plot")');
    if (plotHeading.length > 0) {
      plot = plotHeading.next('p').text().trim();
    }
    if (!plot) {
      plot = content.find('p').first().text().trim();
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const downloadSections: any[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let currentSection: { title: string; links: any[] } = {
      title: 'Direct Download Links',
      links: [],
    };

    content.find('*').each((_i, elem) => {
      const $el = $(elem);

      if ($el.is('h2, h3, h4, hr')) {
        const text = $el.text().trim();
        if (
          text &&
          (text.includes('Season') ||
            text.includes('Episode') ||
            text.includes('Download') ||
            text.includes('Quality') ||
            text.includes('720p') ||
            text.includes('1080p') ||
            text.includes('480p') ||
            text.includes('4k') ||
            text.includes('Batch'))
        ) {
          if (currentSection.links.length > 0) {
            downloadSections.push(currentSection);
          }
          currentSection = { title: text, links: [] };
        }
      }

      if ($el.is('a')) {
        const href = $el.attr('href') || '';
        const linkText = $el.text().trim();

        if (
          href &&
          (href.includes('cloud.unblockedgames.world') ||
            href.includes('episodes.modpro.blog') ||
            href.includes('gdrive') ||
            href.includes('drive.google') ||
            href.includes('modpro') ||
            href.includes('archives') ||
            href.includes('redirect') ||
            href.includes('link') ||
            href.includes('driveseed.org/file/') ||
            $el.hasClass('maxbutton'))
        ) {
          if (
            !href.includes('/category/') &&
            !href.includes('/tag/') &&
            !href.includes('moviesmod.money/movies') &&
            !href.includes('moviesleech.rodeo/movies')
          ) {
            currentSection.links.push({
              name: linkText || 'Download Link',
              url: href,
            });
          }
        }
      }
    });

    if (currentSection.links.length > 0) {
      downloadSections.push(currentSection);
    }

    if (downloadSections.length === 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const allLinks: any[] = [];
      content.find('a').each((_i, elem) => {
        const href = $(elem).attr('href') || '';
        const linkText = $(elem).text().trim() || 'Download Link';
        if (
          href &&
          (href.includes('cloud.unblockedgames.world') ||
            href.includes('episodes.modpro.blog') ||
            href.includes('archives') ||
            href.includes('modpro') ||
            href.includes('driveseed.org/file/'))
        ) {
          allLinks.push({ name: linkText, url: href });
        }
      });
      if (allLinks.length > 0) {
        downloadSections.push({
          title: 'Direct Fast Download Links',
          links: allLinks,
        });
      }
    }

    return NextResponse.json({
      success: true,
      title,
      poster,
      screenshots: screenshots.slice(0, 8),
      info,
      plot,
      downloadSections,
    });
  } catch (error) {
    console.error('[API Error] Fetching details failed:', (error as Error).message);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to retrieve movie details. The link may be down.',
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
