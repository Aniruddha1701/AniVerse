import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ToastProvider } from '@/hooks/useToast';
import ToastContainer from '@/components/Toast/ToastContainer';

export const metadata: Metadata = {
  title: 'AniVerse — Premium Cinema Experience',
  description:
    'Discover, browse, and stream movies and anime in a clean, ad-free environment. No wait timers, no forced redirects — just cinema.',
  keywords: ['movies', 'stream', 'download', 'cinema', 'ad-free', 'anime', 'aniverse'],
  robots: 'index, follow',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
  openGraph: {
    title: 'AniVerse — Premium Cinema Experience',
    description: 'Your personal cinema universe. Browse and stream without limits.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#06060b',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        {/* Glow backdrop layers */}
        <div className="ambientGlow blob1" />
        <div className="ambientGlow blob2" />
        <div className="ambientGlow blob3" />

        <ToastProvider>
          <ToastContainer />
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
