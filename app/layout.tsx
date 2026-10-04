import type { Metadata } from 'next';
import { Archivo_Black, Montserrat } from 'next/font/google';
import './globals.css';

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-montserrat',
});

const archivoBlack = Archivo_Black({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-archivo',
});

export const metadata: Metadata = {
  // Pinned by tests/smoke.spec.js; keep in sync with the prototype.
  title: 'KoreoKorp V2 Mockup',
  description: 'A small corner of the internet.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${montserrat.variable} ${archivoBlack.variable}`}>
      <body>{children}</body>
    </html>
  );
}