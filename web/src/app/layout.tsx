import type { Metadata, Viewport } from 'next';
import { Pwa } from '@/components/pwa';
import './globals.css';

export const metadata: Metadata = {
  title: 'playbattle',
  description: 'multiplayer games in the browser',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'playbattle', statusBarStyle: 'black-translucent' },
  icons: { icon: '/icon.svg', apple: '/icon.svg' },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#faf9f7' },
    { media: '(prefers-color-scheme: dark)', color: '#0f1115' },
  ],
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

const themeScript = `(function(){try{var v=localStorage.getItem('playbattle-theme');if(v!=='light'&&v!=='dark'&&v!=='system')v='system';var d=v==='dark'||(v==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        {children}
        <Pwa />
      </body>
    </html>
  );
}
