'use client';
import { useEffect, useRef } from 'react';
import { workshopPath } from '@/lib/paths';
import { useCompletion } from './completion-state';

export function Completion() {
  const { build } = useCompletion();
  const screen = useRef<HTMLElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const curtain = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'Your configuration · Productionizing AI';
    screen.current?.focus({ preventScroll: true });
    return () => {
      document.title = previousTitle;
    };
  }, []);
  useEffect(() => {
    if (
      !build ||
      !card.current ||
      !curtain.current ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      typeof curtain.current.animate !== 'function'
    )
      return;
    const bounds = card.current.getBoundingClientRect();
    const viewport = document.documentElement;
    const inset = `inset(${Math.max(0, bounds.top)}px ${Math.max(0, viewport.clientWidth - bounds.right)}px ${Math.max(0, viewport.clientHeight - bounds.bottom)}px ${Math.max(0, bounds.left)}px round 18px)`;
    const reveal = curtain.current.animate(
      [
        { clipPath: 'inset(0px 0px 0px 0px round 0px)', opacity: 1 },
        { clipPath: inset, opacity: 1, offset: 0.78 },
        { clipPath: inset, opacity: 0 },
      ],
      {
        duration: 880,
        easing: 'cubic-bezier(0.76, 0, 0.24, 1)',
        fill: 'forwards',
      },
    );
    return () => reveal.cancel();
  }, [build]);

  const configs = build
    ? [
        ['Model', build.config.model],
        ['Context', `${build.config.context} documents`],
        ['Answer length', `${build.config.tokens} tokens`],
        ['Workers', String(build.config.workers)],
        ['Delivery', build.config.delivery],
        ['Caching', build.config.cache],
      ]
    : [];

  return (
    <main
      ref={screen}
      id="main"
      className="welcome completion-screen"
      tabIndex={-1}
      aria-labelledby="completion-title"
    >
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
        <div ref={card} className="welcome-card completion-card">
          <div className="welcome-card-content">
            <a
              className="welcome-brand"
              href="https://www.aggiedatascience.org/"
              aria-label="Aggie Data Science Club"
            >
              <img
                src={workshopPath('/adsc-logo.png')}
                width={34}
                height={39}
                alt=""
              />
              <span>ADSC</span>
            </a>
            <h1 id="completion-title">
              {build ? 'Requirements met.' : 'Build your app.'}
            </h1>
            {build ? (
              <>
                <dl
                  className="completion-configs"
                  aria-label="Passing configuration"
                >
                  {configs.map(([label, value]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
                <dl className="completion-stats" aria-label="Final statistics">
                  <div>
                    <dt>Accuracy</dt>
                    <dd>{Math.round(build.result.accuracy * 100)}%</dd>
                    <small>{build.result.correct} / 20 correct</small>
                  </div>
                  <div>
                    <dt>First response</dt>
                    <dd>{build.result.firstToken.toFixed(2)} s</dd>
                    <small>90% of requests</small>
                  </div>
                  <div>
                    <dt>Full answer</dt>
                    <dd>{build.result.completion.toFixed(2)} s</dd>
                    <small>90% of requests</small>
                  </div>
                  <div>
                    <dt>Test cost</dt>
                    <dd>{(build.result.cost * 100).toFixed(3)}¢</dd>
                    <small>0.65¢ budget</small>
                  </div>
                  <div>
                    <dt>Stale answers</dt>
                    <dd>{build.result.stale}</dd>
                    <small>After the update</small>
                  </div>
                </dl>
              </>
            ) : (
              <div className="completion-empty">
                <p>
                  Complete the challenge to see your configuration and results
                  here.
                </p>
                <a className="welcome-start" href={workshopPath('/challenge')}>
                  Open challenge
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
      <div ref={curtain} className="welcome-curtain" aria-hidden="true" />
    </main>
  );
}
