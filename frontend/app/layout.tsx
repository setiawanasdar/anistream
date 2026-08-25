import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: {
    default: 'AniStream - Nonton Anime Sub Indo',
    template: '%s | AniStream',
  },
  description: 'Nonton anime subtitle Indonesia terlengkap dan terbaru secara gratis. Streaming anime sub indo berkualitas HD.',
  keywords: ['anime', 'streaming', 'sub indo', 'subtitle indonesia', 'nonton anime', 'anime gratis'],
  manifest: '/manifest.json',
  themeColor: '#0a0a0a',
  appleWebApp: {
    capable: true,
    title: 'AniStream',
    statusBarStyle: 'black-translucent',
  },
  openGraph: {
    type: 'website',
    locale: 'id_ID',
    siteName: 'AniStream',
    title: 'AniStream - Nonton Anime Sub Indo',
    description: 'Streaming anime subtitle Indonesia terlengkap. Gratis, tanpa iklan berlebihan.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AniStream - Nonton Anime Sub Indo',
    description: 'Streaming anime subtitle Indonesia terlengkap.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className="dark">
      <head>
        <meta name="theme-color" content="#0a0a0a" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="AniStream" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className={`${inter.className} bg-[#0a0a0a] text-white min-h-screen flex flex-col`}>
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .then(function(reg) { console.log('SW registered'); })
                    .catch(function(err) { console.log('SW registration failed', err); });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
