'use client';

import { useEffect, useRef, type MouseEvent } from 'react';
import { ArrowRight } from 'lucide-react';
import { workshopPath } from '@/lib/paths';
import { PAGES } from './page-navigation';

export function Welcome() {
  const scene = useRef<HTMLElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const curtain = useRef<HTMLDivElement>(null);
  const leaving = useRef(false);
  const animations = useRef<Animation[]>([]);

  useEffect(() => {
    // A browser Back navigation may restore this page from the page cache.
    // Always restore the original card, including after an interrupted exit.
    const restore = () => {
      leaving.current = false;
      animations.current.forEach((animation) => animation.cancel());
      animations.current = [];
      scene.current?.removeAttribute('data-leaving');
      scene.current?.removeAttribute('aria-busy');
    };
    window.addEventListener('pageshow', restore);
    return () => {
      window.removeEventListener('pageshow', restore);
      restore();
    };
  }, []);

  function startWorkshop(event: MouseEvent<HTMLAnchorElement>) {
    // Keep native link behavior for new tabs and reduced-motion navigation.
    if (
      event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey
    ) return;
    if (leaving.current) {
      event.preventDefault();
      return;
    }
    if (
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      typeof curtain.current?.animate !== 'function' ||
      !card.current || !scene.current
    ) return;

    event.preventDefault();
    const destination = event.currentTarget.href;
    const bounds = card.current.getBoundingClientRect();
    const viewport = document.documentElement;
    leaving.current = true;
    scene.current.setAttribute('data-leaving', 'true');
    scene.current.setAttribute('aria-busy', 'true');

    // Expand a single paper surface instead of scaling/distorting the text.
    // The final color is identical to the lesson background, so native page
    // navigation can happen behind it without flashing a different surface.
    const expansion = curtain.current.animate(
      [
        {
          clipPath: `inset(${Math.max(0, bounds.top)}px ${Math.max(0, viewport.clientWidth - bounds.right)}px ${Math.max(0, viewport.clientHeight - bounds.bottom)}px ${Math.max(0, bounds.left)}px round 18px)`,
          opacity: 0,
          offset: 0,
        },
        { opacity: 1, offset: 0.12 },
        { clipPath: 'inset(0px 0px 0px 0px round 0px)', opacity: 1, offset: 1 },
      ],
      { duration: 880, easing: 'cubic-bezier(0.76, 0, 0.24, 1)', fill: 'forwards' },
    );
    animations.current.push(expansion);
    // Cancellation on unmount/Back must never send the visitor forward again.
    void expansion.finished.then(() => {
      if (leaving.current) window.location.assign(destination);
    }).catch(() => {});
  }

  return (
    <main ref={scene} id="main" className="welcome">
      <div className="welcome-landscape" aria-hidden="true">
        <img
          className="welcome-landscape-image"
          src={workshopPath('/images/workshop-sky.webp')}
          alt=""
          width={1672}
          height={941}
          fetchPriority="high"
        />
      </div>
      <div className="welcome-atmosphere" aria-hidden="true" />
      <div className="welcome-grain" aria-hidden="true" />
      <div className="welcome-center">
        <div ref={card} className="welcome-card" aria-labelledby="welcome-title">
          <div className="welcome-card-content">
            <a
              href="https://www.aggiedatascience.org/"
              className="welcome-brand"
              aria-label="ADSC — Aggie Data Science Club"
            >
              <img src={workshopPath('/adsc-logo.png')} width={38} height={43} alt="" />
              <span>ADSC</span>
            </a>
            <h1 id="welcome-title">
              Productionizing
              <em>An LLM.</em>
            </h1>
            <ol className="welcome-topics" aria-label="Workshop topics" role="list">
              {PAGES.map((page, index) => (
                <li key={page.href}>
                  <span className="welcome-topic-number" aria-hidden="true">[{index + 1}]</span>
                  <span className="welcome-topic-leader" aria-hidden="true" />
                  <span>{page.label}</span>
                </li>
              ))}
            </ol>
            <div className="welcome-action">
              <a
                className="welcome-start"
                href={workshopPath('/streaming')}
                onClick={startWorkshop}
              >
                <span>Start workshop</span>
                <ArrowRight aria-hidden="true" size={19} strokeWidth={1.5} />
              </a>
            </div>
          </div>
        </div>
      </div>

      <div ref={curtain} className="welcome-curtain" aria-hidden="true" />
    </main>
  );
}
