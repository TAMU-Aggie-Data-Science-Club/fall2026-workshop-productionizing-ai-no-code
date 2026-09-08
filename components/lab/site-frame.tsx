'use client';
import { usePathname } from 'next/navigation';

import { PageNavigation } from './page-navigation';
import { ActivityProgress } from './activity-progress';
import { lessonPath, workshopPath } from '@/lib/paths';

export function SiteFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (lessonPath(pathname) === '/') return <>{children}</>;
  return (
    <div className="site-shell lesson-entrance">
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
            src={workshopPath('/adsc-logo.png')}
            alt="Aggie Data Science Club"
            className="club-logo"
            width={48}
            height={54}
          />
          <span>Aggie Data Science Club</span>
        </a>
        <span className="masthead-divider" aria-hidden="true" />
        <span className="site-title">Productionizing AI</span>
      </header>
      <div className="page-layout">
        <main id="main" className="concept-page" key={pathname}>
          <ActivityProgress key={pathname}>
            {children}
            <PageNavigation current={pathname} />
          </ActivityProgress>
        </main>
      </div>
    </div>
  );
}
