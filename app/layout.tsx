import type { Metadata } from 'next';
import '@fontsource-variable/lora';
import '@fontsource-variable/inter';
import './globals.css';
import { SiteFrame } from '@/components/lab/site-frame';
export const metadata: Metadata = {
  title: 'Productionizing an LLM · Aggie Data Science Club',
  description:
    'An interactive visual lab exploring streaming, tokens, retrieval, caching, queues, and quality.',
  icons: { icon: '/adsc-logo.png' },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <SiteFrame>{children}</SiteFrame>
      </body>
    </html>
  );
}
