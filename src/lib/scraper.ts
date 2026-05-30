import axios from 'axios';
import http from 'http';
import https from 'https';
import type { SourceKey } from '@/types/movie';

/** Keep-alive connection pooling agents for performance */
export const keepAliveAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 100,
  keepAliveMsecs: 10000,
});

export const keepAliveHttpAgent = new http.Agent({
  keepAlive: true,
  maxSockets: 100,
  keepAliveMsecs: 10000,
});

/** Source domain mapping */
export const SOURCES: Record<SourceKey, string> = {
  hollywood: 'https://moviesmod.money',
  bollywood: 'https://moviesleech.rodeo',
  uhdmovies: 'https://uhdmovies.rodeo',
  animeflix: 'https://animeflix.dad',
};

/** Shared Axios config for scraping requests */
export const AXIOS_CONFIG = {
  headers: {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    Accept:
      'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    Connection: 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
  },
  timeout: 15000,
  httpAgent: keepAliveHttpAgent,
  httpsAgent: keepAliveAgent,
};

/**
 * Parse quality, year, audio, size, and a cleaned title from raw movie title strings.
 */
export function parseMovieTitle(title: string): {
  year: string;
  quality: string;
  audio: string;
  size: string;
  cleanTitle: string;
} {
  const result = {
    year: '',
    quality: 'HD',
    audio: 'Dual Audio',
    size: '',
    cleanTitle: '',
  };

  const yearMatch = title.match(/\b(19\d\d|20\d\d)\b/);
  if (yearMatch) {
    result.year = yearMatch[1];
  }

  if (title.includes('2160p') || title.includes('4K') || title.includes('UHD')) {
    result.quality = '4K UHD';
  } else if (title.includes('1080p')) {
    result.quality = '1080p Full HD';
  } else if (title.includes('720p')) {
    result.quality = '720p HD';
  } else if (title.includes('480p')) {
    result.quality = '480p';
  }

  if (title.includes('Multi Audio') || title.includes('Multi')) {
    result.audio = 'Multi Audio';
  } else if (title.includes('Dual Audio') || title.includes('Dual')) {
    result.audio = 'Dual Audio';
  } else if (title.includes('Hindi') && title.includes('English')) {
    result.audio = 'Hindi / English';
  } else if (title.includes('Hindi')) {
    result.audio = 'Hindi Dubbed';
  } else if (title.includes('English')) {
    result.audio = 'English (Org)';
  } else if (title.includes('Punjabi')) {
    result.audio = 'Punjabi';
  }

  const sizeMatch = title.match(/\[([0-9.]+\s*(?:MB|GB|mb|gb))\]/);
  if (sizeMatch) {
    result.size = sizeMatch[1];
  } else {
    const sizeMatch2 = title.match(/\{([0-9.]+\s*(?:MB|GB|mb|gb))\}/);
    if (sizeMatch2) {
      result.size = sizeMatch2[1];
    }
  }

  let cleanTitle = title
    .replace(/Download/gi, '')
    .replace(/Movie/gi, '')
    .replace(/WEB-DL/gi, '')
    .replace(/BluRay/gi, '')
    .replace(/Dual Audio/gi, '')
    .replace(/Multi Audio/gi, '')
    .replace(/Multi/gi, '')
    .replace(/Hindi-English/gi, '')
    .replace(/Hindi/gi, '')
    .replace(/Esubs/gi, '')
    .replace(/Msubs/gi, '')
    .replace(/ORG/gi, '')
    .replace(/\|\|.*/gi, '')
    .replace(/\[.*/gi, '')
    .replace(/\{.*/gi, '')
    .trim();

  result.cleanTitle = cleanTitle || title;
  return result;
}
