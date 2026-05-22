import type { Metadata } from 'next';
import { Unbounded, IBM_Plex_Sans, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';

const unbounded = Unbounded({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-display',
  weight: ['400', '700', '900'],
  display: 'swap',
});

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-body',
  weight: ['300', '400', '500', '600'],
  display: 'swap',
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '500', '600'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Review Analytics — Tai Huynh',
  description:
    'Paste a batch of customer reviews — get sentiment, recurring themes, and an exportable report. Powered by Gemini 2.5 Flash.',
  openGraph: {
    title: 'Review Analytics',
    description: 'Sentiment classification and theme extraction for customer reviews.',
    siteName: 'Tai Huynh',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${unbounded.variable} ${ibmPlexSans.variable} ${ibmPlexMono.variable}`}
    >
      <body>
        {children}
      </body>
    </html>
  );
}
