/** Core movie listing item returned from the scraper feed */
export interface Movie {
  title: string;
  cleanTitle: string;
  detailUrl: string;
  poster: string;
  year: string;
  quality: string;
  audio: string;
  size: string;
  imdbRating?: string;
}

/** API response for movie listings */
export interface MoviesResponse {
  success: boolean;
  movies: Movie[];
  page: number;
  hasNextPage: boolean;
  totalResults: number;
}

/** A single download link within a section */
export interface DownloadLink {
  name: string;
  url: string;
}

/** A section of download links grouped by title */
export interface DownloadSection {
  title: string;
  links: DownloadLink[];
}

/** Full movie detail response */
export interface MovieDetail {
  success: boolean;
  title: string;
  poster: string;
  screenshots: string[];
  info: string[];
  plot: string;
  downloadSections: DownloadSection[];
}

/** Episode link for multi-episode bypass results */
export interface EpisodeLink {
  name: string;
  url: string;
}

/** Bypass result — either a file list or multi-episode list */
export interface BypassResult {
  success: boolean;
  title?: string;
  files?: DownloadLink[];
  isMultiEpisode?: boolean;
  episodes?: EpisodeLink[];
  message?: string;
}

/** File bypass result — direct download URL resolution */
export interface FileBypassResult {
  success: boolean;
  downloadUrl?: string;
  fileName?: string;
  message?: string;
}

/** Cached file metadata */
export interface FileMetadata {
  totalSize: number;
  contentType: string;
  supportsRanges: boolean;
}

/** Source key options */
export type SourceKey = 'hollywood' | 'bollywood' | 'uhdmovies' | 'animeflix';

/** Toast notification type */
export type ToastType = 'success' | 'error' | 'warning' | 'info';

/** View mode */
export type ViewMode = 'grid' | 'list';
