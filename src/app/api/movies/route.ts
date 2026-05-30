import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { SOURCES, AXIOS_CONFIG, parseMovieTitle } from '@/lib/scraper';
import type { SourceKey } from '@/types/movie';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sourceKey = (searchParams.get('source') || 'hollywood') as SourceKey;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const search = searchParams.get('search') || '';

    const baseUrl = SOURCES[sourceKey] || SOURCES.hollywood;
    let targetUrl = baseUrl;

    if (search) {
      if (page > 1) {
        targetUrl = `${baseUrl}/page/${page}/?s=${encodeURIComponent(search)}`;
      } else {
        targetUrl = `${baseUrl}/?s=${encodeURIComponent(search)}`;
      }
    } else {
      if (page > 1) {
        targetUrl = `${baseUrl}/page/${page}/`;
      }
    }

    console.log(`[Scraper API] Fetching from: ${targetUrl}`);

    const response = await axios.get(targetUrl, AXIOS_CONFIG);
    const $ = cheerio.load(response.data);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const movies: any[] = [];

    $('article').each((_i, elem) => {
      const article = $(elem);
      const titleAnchor = article.find('h2.title a, h3.title a, .front-view-title a, h1.sanket, .box-inner-p a').first();

      const title = titleAnchor.text().trim() || titleAnchor.attr('title') || article.find('a').first().attr('title') || '';
      const detailUrl = titleAnchor.attr('href') || article.find('a').first().attr('href') || '';

      const imgElem = article.find('img').first();
      let poster = imgElem.attr('src') || imgElem.attr('data-src') || imgElem.attr('data-lazy-src') || '';

      if (poster && poster.startsWith('/')) {
        poster = baseUrl + poster;
      }

      const parsedInfo = parseMovieTitle(title);

      if (title && detailUrl) {
        movies.push({
          title,
          detailUrl,
          poster,
          ...parsedInfo,
        });
      }
    });

    const hasNextPage = $('.pagination .nav-next a, .pagination a.next, .pagination a:contains("Next")').length > 0;

    return NextResponse.json({
      success: true,
      movies,
      page,
      hasNextPage,
      totalResults: movies.length,
    });
  } catch (error) {
    console.error('[API Error] Fetching movies failed:', (error as Error).message);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to retrieve movie listings. Please try again.',
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
