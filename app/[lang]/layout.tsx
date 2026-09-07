import type {Metadata, Viewport} from 'next';
import '../globals.css';
import {dirOf, isLang, DEFAULT_LANG} from '@/lib/i18n';

export const metadata: Metadata = {
  applicationName: 'Your Day Now',
  icons: {
    icon: [
      {url: '/favicon.svg', type: 'image/svg+xml'},
      {url: '/favicon.ico', sizes: '32x32'},
    ],
    apple: '/apple-icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#091412',
  colorScheme: 'dark',
};

export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{lang: string}>;
}) {
  const {lang} = await params;
  const language = isLang(lang) ? lang : DEFAULT_LANG;
  return (
    <html lang={language} dir={dirOf(language)}>
      <body>{children}</body>
    </html>
  );
}
