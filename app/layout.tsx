import type { Metadata } from 'next';
import '@fontsource-variable/lora';
import '@fontsource-variable/inter';
import './globals.css';
import '@/components/lab/welcome.css';
import '@/components/lab/tokens-cost.css';
import '@/components/lab/challenge.css';
import '@/components/lab/completion.css';
import { CompletionProvider } from '@/components/lab/completion-provider';
import { SiteFrame } from '@/components/lab/site-frame';
import { workshopPath } from '@/lib/paths';
export const metadata: Metadata = {
  title: 'Productionizing an LLM · Aggie Data Science Club',
  description:
    'An interactive visual lab exploring streaming, tokens, retrieval, caching, queues, and quality.',
  icons: { icon: workshopPath('/adsc-logo.png') },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <CompletionProvider>
          <SiteFrame>{children}</SiteFrame>
        </CompletionProvider>
      </body>
    </html>
  );
}
