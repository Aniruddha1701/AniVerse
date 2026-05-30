'use client';

import { useState, useCallback, useTransition } from 'react';
import Header from '@/components/Header/Header';
import FilterBar from '@/components/FilterBar/FilterBar';
import MovieGrid from '@/components/MovieGrid/MovieGrid';
import Footer from '@/components/Footer/Footer';
import type { SourceKey, ViewMode } from '@/types/movie';

export default function Home() {
  const [source, setSource] = useState<SourceKey>('hollywood');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [, startTransition] = useTransition();

  const handleSourceChange = useCallback((newSource: SourceKey) => {
    startTransition(() => {
      setSource(newSource);
      setPage(1);
    });
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    startTransition(() => {
      setPage(newPage);
    });
  }, []);

  const handleSearchChange = useCallback((newSearch: string) => {
    startTransition(() => {
      setSearch(newSearch);
      setPage(1);
    });
  }, []);

  const handleRefresh = useCallback(() => {
    startTransition(() => {
      // Force page/search resets or keep current and rely on useMovies key refresh
      setPage(1);
    });
  }, []);

  return (
    <>
      <Header
        searchValue={search}
        onSearchChange={handleSearchChange}
        onRefresh={handleRefresh}
      />

      <FilterBar
        activeSource={source}
        viewMode={viewMode}
        onSourceChange={handleSourceChange}
        onViewModeChange={setViewMode}
      />

      <main style={{ minHeight: '60vh' }}>
        <MovieGrid
          source={source}
          page={page}
          search={search}
          viewMode={viewMode}
          onPageChange={handlePageChange}
        />
      </main>

      <Footer />
    </>
  );
}
