'use client';
import { usePathname } from 'next/navigation';
import { SidebarContent } from '@/components/ui/sidebar';

import { PageNavigation } from './page-navigation';

export function SiteFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="site-shell">
      <a href="#main" className="skip-link">
        Skip to demonstration
      </a>
      <header className="masthead">
        <a
          className="club-brand"
          href="https://www.aggiedatascience.org/"
          aria-label="Aggie Data Science Club website"
        >
          <img
            src="/adsc-logo.png"
            alt="Aggie Data Science Club"
            className="club-logo"
            width={48}
            height={54}
          />
          <span>Aggie Data Science Club</span>
        </a>
        <a href="/streaming" className="site-title">
          Productionizing an LLM
        </a>
      </header>
      <div className="page-layout">
        <aside className="desktop-navigation">
          <SidebarContent>
            <PageNavigation current={pathname} />
          </SidebarContent>
        </aside>
        <details className="mobile-navigation">
          <summary>Pages</summary>
          <PageNavigation current={pathname} />
        </details>
        <main id="main" className="concept-page" key={pathname}>
          {children}
        </main>
      </div>
    </div>
  );
}
