import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import axios from 'axios';
import { AXIOS_CONFIG } from '@/lib/scraper';

export const dynamic = 'force-dynamic';

/**
 * In-memory rating cache to avoid repeated lookups for the same title.
 * Key: "title::year" → value: rating string or "N/A"
 */
const ratingCache = new Map<string, { rating: string; cachedAt: number }>();
const CACHE_TTL = 1000 * 60 * 60 * 4; // 4 hours

/** Free OMDb API key (1,000 requests/day limit) */
const OMDB_API_KEY = 'trilogy';

/**
 * GET /api/rating?title=...&year=...
 * Returns IMDb rating for a given movie title.
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const title = searchParams.get('title') || '';
    const year = searchParams.get('year') || '';

    if (!title) {
      return NextResponse.json({ rating: 'N/A' });
    }

    // Clean the title for better OMDb matching
    const cleanedTitle = title
      .replace(/\s*\(Season\s*\d+[^)]*\)/gi, '')   // Remove "(Season 1-2)"
      .replace(/\s*Season\s*\d+.*/gi, '')           // Remove "Season 1..."
      .replace(/\s*S\d+.*/gi, '')                   // Remove "S01..."
      .replace(/\s*\d{3,4}p.*/gi, '')               // Remove quality strings
      .replace(/\s*4K.*/gi, '')
      .replace(/\s*UHD.*/gi, '')
      .replace(/[–—:].*/g, '')                      // Remove subtitle after dash/colon
      .replace(/\([^)]*\)/g, '')                     // Remove parentheticals
      .trim();

    // Check cache
    const cacheKey = `${cleanedTitle.toLowerCase()}::${year}`;
    const cached = ratingCache.get(cacheKey);
    if (cached && Date.now() - cached.cachedAt < CACHE_TTL) {
      return NextResponse.json({ rating: cached.rating });
    }

    // Query OMDb
    const params: Record<string, string> = {
      apikey: OMDB_API_KEY,
      t: cleanedTitle,
    };
    if (year) params.y = year;

    const omdbResponse = await axios.get('https://www.omdbapi.com/', {
      params,
      timeout: 5000,
      httpsAgent: AXIOS_CONFIG.httpsAgent,
    });

    const data = omdbResponse.data;
    let rating = 'N/A';

    if (data.Response === 'True' && data.imdbRating && data.imdbRating !== 'N/A') {
      rating = data.imdbRating;
    } else if (!year && data.Response !== 'True') {
      // Retry with search mode if exact match fails
      const searchResponse = await axios.get('https://www.omdbapi.com/', {
        params: { apikey: OMDB_API_KEY, s: cleanedTitle, type: 'movie' },
        timeout: 5000,
        httpsAgent: AXIOS_CONFIG.httpsAgent,
      });

      if (searchResponse.data.Search && searchResponse.data.Search.length > 0) {
        const firstResult = searchResponse.data.Search[0];
        const detailResponse = await axios.get('https://www.omdbapi.com/', {
          params: { apikey: OMDB_API_KEY, i: firstResult.imdbID },
          timeout: 5000,
          httpsAgent: AXIOS_CONFIG.httpsAgent,
        });
        if (detailResponse.data.imdbRating && detailResponse.data.imdbRating !== 'N/A') {
          rating = detailResponse.data.imdbRating;
        }
      }
    }

    // Cache result
    ratingCache.set(cacheKey, { rating, cachedAt: Date.now() });

    // Prune cache if too large
    if (ratingCache.size > 500) {
      const now = Date.now();
      for (const [key, val] of ratingCache.entries()) {
        if (now - val.cachedAt > CACHE_TTL) ratingCache.delete(key);
      }
    }

    return NextResponse.json({ rating });
  } catch (error) {
    console.error('[Rating API Error]', (error as Error).message);
    return NextResponse.json({ rating: 'N/A' });
  }
}
