'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Minus, Play, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CHALLENGE_SOURCES, SOURCE_UPDATE_TIME } from '@/lib/challenge-content';
import {
  DEFAULT_CHALLENGE,
  simulateChallenge,
  type ChallengeConfig,
  type ChallengeResult,
} from '@/lib/challenge';
import { capacityCost, MODELS, tokenCost } from '@/lib/simulation';
import { Choice, Range, Intro, DemoTop, usePlayback } from './shared';
import { useCompletion } from './completion-state';

function configLabel(config: ChallengeConfig) {
  return `${config.model} · ${config.context} docs · ${config.tokens} tokens · ${config.workers} workers · ${config.delivery} · ${config.cache}`;
}

export function Challenge() {
  const [draft, setDraft] = useState<ChallengeConfig>({ ...DEFAULT_CHALLENGE });
  const [config, setConfig] = useState<ChallengeConfig>({
    ...DEFAULT_CHALLENGE,
  });
  const [previous, setPrevious] = useState<{
    config: ChallengeConfig;
    result: ChallengeResult;
  } | null>(null);
  const result = useMemo(() => simulateChallenge(config), [config]);
  const duration = Math.min(16, result.total);
  const playback = usePlayback(duration);
  const time = playback.started
    ? (playback.elapsed / duration) * result.total
    : 0;
  const complete = playback.started && !playback.running;
  const { finish } = useCompletion();
  const curtain = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!complete || !result.passed || !finish) return;
    let active = true;
    let animation: Animation | undefined;
    const next = () => {
      if (active) finish({ config: { ...config }, result });
    };
    if (
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      typeof curtain.current?.animate !== 'function'
    ) {
      next();
      return;
    }
    const timer = window.setTimeout(() => {
      curtain.current?.setAttribute('data-leaving', '');
      animation = curtain.current?.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 500,
        easing: 'ease-in-out',
        fill: 'forwards',
      });
      if (animation) void animation.finished.then(next).catch(() => {});
      else next();
    }, 1100);
    return () => {
      active = false;
      window.clearTimeout(timer);
      animation?.cancel();
      curtain.current?.removeAttribute('data-leaving');
    };
  }, [complete, config, result, finish]);
  const pending = JSON.stringify(draft) !== JSON.stringify(config);
  const set = <K extends keyof ChallengeConfig>(
    key: K,
    value: ChallengeConfig[K],
  ) => setDraft((current) => ({ ...current, [key]: value }));
  const arrived = playback.started
    ? result.requests.filter((r) => r.arrival <= time)
    : [];
  const finished = arrived.filter((r) => r.end <= time);
  const waiting = arrived.filter((r) => r.start > time);
  const working = arrived.filter(
    (r) => !r.hit && r.start <= time && r.end > time,
  );
  const focus =
    arrived.find((r) => r.first <= time && r.end > time) ??
    [...finished].sort((a, b) => b.end - a.end)[0] ??
    arrived[0] ??
    result.requests[0];
  const visible =
    !playback.started || time < focus.first
      ? 0
      : focus.hit || config.delivery === 'Buffered'
        ? 1
        : Math.min(
            1,
            (time - focus.first) / Math.max(0.01, focus.end - focus.first),
          );
  const liveCost = playback.started
    ? result.requests.reduce(
        (sum, r) => {
          if (time < r.start || r.hit) return sum;
          const generated =
            time < r.generatedFirst
              ? 0
              : Math.min(
                  r.output,
                  1 +
                    Math.floor(
                      (time - r.generatedFirst) * MODELS[config.model].speed,
                    ),
                );
          return sum + tokenCost(r.input, generated, 1, config.model).total;
        },
        (capacityCost(config.workers) * time) / 3600,
      )
    : 0;
  const passedCount = result.checks.filter((check) => check.pass).length;
  const run = () => {
    if (complete && pending) setPrevious({ config: { ...config }, result });
    setConfig({ ...draft });
    playback.run();
  };
  const reset = () => {
    playback.reset();
    setDraft({ ...DEFAULT_CHALLENGE });
    setConfig({ ...DEFAULT_CHALLENGE });
    setPrevious(null);
  };

  return (
    <div className="challenge-page">
      <Intro
        title="Build your app"
        text="Configure an LLM to answer 20 campus questions within every requirement."
      />
      <section className="challenge-requirements" aria-label="Requirements">
        {result.checks.map((check) => (
          <div
            key={check.id}
            className={`challenge-requirement ${complete ? (check.pass ? 'requirement-pass' : 'requirement-miss') : ''}`}
          >
            <span className="challenge-check-label">
              {check.label}
              {complete && (
                <>
                  <span className="sr-only">
                    {check.pass ? 'Passed' : 'Needs work'}
                  </span>
                  {check.pass ? (
                    <Check size={15} aria-hidden="true" />
                  ) : (
                    <Minus size={15} aria-hidden="true" />
                  )}
                </>
              )}
            </span>
            <strong>
              {complete
                ? check.value
                : check.id === 'accuracy'
                  ? '90%'
                  : check.id === 'first'
                    ? '2 s'
                    : check.id === 'completion'
                      ? '6 s'
                      : check.id === 'budget'
                        ? '0.65¢'
                        : '0 stale'}
            </strong>
            <small>{check.target}</small>
          </div>
        ))}
      </section>

      <div className="lab-layout challenge-layout">
        <div className="challenge-main">
          <section className="demo-box" aria-label="Challenge simulation">
            <DemoTop
              title="Test workload"
              running={playback.running}
              started={playback.started}
            />
            <div className="challenge-workload-note">
              Ten questions, then ten repeats. Library hours change before the
              repeats.
            </div>
            <div className="challenge-flow">
              <div className="challenge-stages" aria-hidden="true">
                <span>
                  Requests <strong>{20 - arrived.length}</strong>
                </span>
                <span>
                  Queue <strong>{waiting.length}</strong>
                </span>
                <span>
                  Model{' '}
                  <strong>
                    {working.length} / {config.workers}
                  </strong>
                </span>
                <span>
                  Answers <strong>{finished.length}</strong>
                </span>
              </div>
              <div className="challenge-lanes" aria-hidden="true">
                {[0, 1, 2, 3].map((lane) => (
                  <div
                    key={lane}
                    className="challenge-lane-guide"
                    style={{ left: `${lane * 30 + 5}%` }}
                  />
                ))}
                {result.requests.map((request) => {
                  const state =
                    !playback.started || time < request.arrival
                      ? 'scheduled'
                      : time < request.start
                        ? 'queued'
                        : time < request.end
                          ? request.hit
                            ? 'cached'
                            : 'processing'
                          : 'answered';
                  const fraction = Math.max(
                    0,
                    Math.min(1, (time - request.start) / request.service),
                  );
                  const left =
                    state === 'scheduled'
                      ? 5
                      : state === 'queued'
                        ? 35
                        : state === 'answered'
                          ? 95
                          : request.hit
                            ? 35 + fraction * 60
                            : 65 + fraction * 20;
                  return (
                    <span
                      key={request.id}
                      className={`challenge-request ${state}`}
                      style={{
                        left: `${left}%`,
                        top: `${10 + request.id * 9}px`,
                      }}
                    />
                  );
                })}
              </div>
              <div className="challenge-flow-caption">
                <span role="status">
                  {finished.length} / 20 answered · {waiting.length} waiting
                </span>
                <span>
                  {time.toFixed(1)} s · {(result.total / duration).toFixed(1)}×
                  playback
                </span>
              </div>
              <Progress
                value={finished.length * 5}
                aria-label="Requests answered"
              />
              <div className="challenge-source-event" role="status">
                {playback.started && time >= SOURCE_UPDATE_TIME
                  ? 'Hours updated: midnight every day.'
                  : 'Hours: weekdays 10 p.m. · weekends 6 p.m.'}
              </div>
            </div>
            <div className="challenge-response">
              <div className="response-label">
                <span className="eyebrow">
                  {playback.started ? focus.question.question : 'Response'}
                </span>
                {playback.started && focus.hit && (
                  <span className="cache-badge">Cached</span>
                )}
              </div>
              <p>
                {playback.started && time >= focus.first ? (
                  <>
                    {focus.answer.slice(
                      0,
                      Math.max(1, Math.ceil(visible * focus.answer.length)),
                    )}
                    {visible < 1 && playback.running && (
                      <span className="cursor" />
                    )}
                  </>
                ) : (
                  <span className="muted">
                    {playback.running
                      ? 'Waiting for an answer…'
                      : 'No answer yet.'}
                  </span>
                )}
              </p>
            </div>
            <div className="challenge-running-cost">
              <span>Test cost</span>
              <strong>
                {((complete ? result.cost : liveCost) * 100).toFixed(3)}¢{' '}
                <span>/ 0.65¢</span>
              </strong>
            </div>
          </section>

          <Accordion className="challenge-details">
            <AccordionItem value="sources">
              <AccordionTrigger>Reference material</AccordionTrigger>
              <AccordionContent>
                <p>
                  Context is retrieved separately for each question: a main
                  fact, any exception, a worked example, then unrelated
                  material.
                </p>
                <div className="challenge-sources">
                  {CHALLENGE_SOURCES.map((source) => (
                    <div key={source.id}>
                      <strong>
                        {source.title} <span>[{source.id}]</span>
                      </strong>
                      <p>{source.text}</p>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        <aside className="controls challenge-controls">
          <span className="eyebrow">Configs</span>
          <Choice
            label="Model"
            value={draft.model}
            options={['Lightweight', 'Capable']}
            onChange={(value) =>
              set('model', value as ChallengeConfig['model'])
            }
          />
          <Range
            label="Retrieved context"
            value={draft.context}
            min={0}
            max={4}
            unit=" docs"
            onChange={(value) => set('context', value)}
          />
          <Range
            label="Answer length"
            value={draft.tokens}
            min={16}
            max={80}
            step={16}
            unit=" tok"
            onChange={(value) => set('tokens', value)}
          />
          <Range
            label="Workers"
            value={draft.workers}
            min={1}
            max={4}
            onChange={(value) => set('workers', value)}
          />
          <Choice
            label="Delivery"
            value={draft.delivery}
            options={['Streamed', 'Buffered']}
            onChange={(value) =>
              set('delivery', value as ChallengeConfig['delivery'])
            }
          />
          <div className="challenge-cache">
            <Choice
              label="Answer caching"
              value={draft.cache}
              options={['Off', 'Saved answers', 'Refresh on update']}
              onChange={(value) =>
                set('cache', value as ChallengeConfig['cache'])
              }
            />
          </div>
          <Button className="run-button" onClick={run}>
            {playback.started ? (
              <RotateCcw size={16} />
            ) : (
              <Play size={16} fill="currentColor" />
            )}
            {playback.running
              ? 'Restart'
              : playback.started && !pending
                ? 'Replay'
                : 'Test'}
          </Button>
          <Button variant="ghost" className="reset-button" onClick={reset}>
            Reset
          </Button>
          {playback.started && pending && (
            <p className="control-note">Changes apply on the next test.</p>
          )}
        </aside>
      </div>

      {complete && (
        <section className="challenge-results" aria-label="Test results">
          <div className="challenge-results-heading" role="status">
            <h2>{result.passed ? 'Requirements met' : 'Keep adjusting'}</h2>
            <span>
              {passedCount} / {result.checks.length} requirements met
            </span>
          </div>
          {result.passed ? (
            <p className="challenge-success">
              Your configuration meets the requirements for this workload.
            </p>
          ) : (
            <div className="challenge-feedback">
              {result.failures.map((failure) => (
                <div key={failure.title}>
                  <strong>{failure.title}</strong>
                  <p>{failure.detail}</p>
                </div>
              ))}
            </div>
          )}
          {previous && (
            <div className="challenge-comparison">
              <Table aria-label="Test comparison">
                <TableHeader>
                  <TableRow>
                    <TableHead>Requirement</TableHead>
                    <TableHead>Previous</TableHead>
                    <TableHead>Current</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.checks.map((check, index) => (
                    <TableRow key={check.id}>
                      <TableHead scope="row">{check.label}</TableHead>
                      <TableCell>
                        {previous.result.checks[index].value}
                      </TableCell>
                      <TableCell>{check.value}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <p>Previous: {configLabel(previous.config)}</p>
              <p>Current: {configLabel(config)}</p>
            </div>
          )}
          <Accordion className="challenge-details" key={JSON.stringify(config)}>
            <AccordionItem value="answers">
              <AccordionTrigger>Review all 20 answers</AccordionTrigger>
              <AccordionContent>
                <p>
                  Accuracy counts complete answers that match the supplied
                  facts. Timing is measured from each request’s arrival,
                  including queue wait.
                </p>
                <div className="challenge-answer-audit">
                  {result.requests.map((request) => (
                    <article key={request.id}>
                      <div className="challenge-audit-heading">
                        <strong>{request.question.question}</strong>
                        <span>
                          {request.correct ? 'Correct' : request.issue}
                        </span>
                      </div>
                      <small>
                        {request.version === 2
                          ? 'Updated hours'
                          : request.id >= 10
                            ? 'Repeat question'
                            : 'First question'}{' '}
                        · {request.hit ? 'Cached' : 'Generated'} · first
                        response {(request.first - request.arrival).toFixed(2)}{' '}
                        s · full answer{' '}
                        {(request.end - request.arrival).toFixed(2)} s
                      </small>
                      <p>{request.answer}</p>
                      {!request.correct && (
                        <p className="challenge-expected">
                          <strong>Expected:</strong> {request.expected}
                        </p>
                      )}
                    </article>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>
      )}
      <div
        ref={curtain}
        className="welcome-curtain challenge-curtain"
        aria-hidden="true"
      />
    </div>
  );
}
