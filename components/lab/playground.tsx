'use client';
import { useEffect, useRef, useState } from 'react';
import { Check, RotateCcw } from 'lucide-react';
import {
  DEFAULT_CONFIG,
  simulateApp,
  type PlaygroundConfig,
  type Model,
  type Workload,
} from '@/lib/simulation';
import { ANSWERS } from '@/lib/content';
import {
  Range,
  Choice,
  Toggle,
  usePlayback,
  Metric,
  RunButton,
  Observation,
  Intro,
  DemoTop,
  StagePath,
} from './shared';

type RunResult = ReturnType<typeof simulateApp>;
type ModelContext = {
  registerTool: (
    tool: {
      name: string;
      description: string;
      inputSchema: object;
      annotations: object;
      execute: (input: unknown) => unknown;
    },
    options: { signal: AbortSignal },
  ) => void | Promise<void>;
};
export function Playground() {
  const [draft, setDraft] = useState<PlaygroundConfig>({ ...DEFAULT_CONFIG }),
    [config, setConfig] = useState<PlaygroundConfig>({ ...DEFAULT_CONFIG });
  const [previous, setPrevious] = useState<{
    config: PlaygroundConfig;
    result: RunResult;
  } | null>(null);
  const result = simulateApp(config),
    duration = Math.min(14, result.total),
    p = usePlayback(duration);
  const time = (p.elapsed / duration) * result.total;
  const pending = JSON.stringify(draft) !== JSON.stringify(config);
  const set = <K extends keyof PlaygroundConfig>(
    key: K,
    value: PlaygroundConfig[K],
  ) => setDraft((d) => ({ ...d, [key]: value }));
  const start = (next: PlaygroundConfig) => {
    if (p.started && !p.running) setPrevious({ config: { ...config }, result });
    setConfig({ ...next });
    p.run();
  };
  const action = useRef(start);
  action.current = start;
  const resolveTool = useRef<((value: unknown) => void) | null>(null);
  useEffect(() => {
    if (p.started && !p.running && resolveTool.current) {
      resolveTool.current({
        firstVisibleSeconds: result.firstVisible,
        totalSeconds: result.total,
        cost: result.cost,
        cacheHits: result.cacheHits,
      });
      resolveTool.current = null;
    }
  }, [p.started, p.running, result]);
  useEffect(() => {
    const context = (document as Document & { modelContext?: ModelContext })
      .modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const registration = context.registerTool(
      {
        name: 'configure_and_run_llm_playground',
        description:
          'Configure and run the visible simulated LLM playground. Returns measurements after playback completes.',
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        inputSchema: {
          type: 'object',
          properties: {
            model: { type: 'string', enum: ['Lightweight', 'Capable'] },
            context: { type: 'integer', minimum: 0, maximum: 4 },
            tokens: { type: 'integer', enum: [16, 32, 48, 64, 80] },
            cache: { type: 'boolean' },
            workers: { type: 'integer', minimum: 1, maximum: 4 },
            workload: {
              type: 'string',
              enum: ['Simple question', 'Needs reference', 'Repeated burst'],
            },
          },
          required: [
            'model',
            'context',
            'tokens',
            'cache',
            'workers',
            'workload',
          ],
          additionalProperties: false,
        },
        execute: (input: unknown) => {
          const c = input as PlaygroundConfig;
          if (
            !c ||
            !['Lightweight', 'Capable'].includes(c.model) ||
            !Number.isInteger(c.context) ||
            c.context < 0 ||
            c.context > 4 ||
            ![16, 32, 48, 64, 80].includes(c.tokens) ||
            typeof c.cache !== 'boolean' ||
            !Number.isInteger(c.workers) ||
            c.workers < 1 ||
            c.workers > 4 ||
            !['Simple question', 'Needs reference', 'Repeated burst'].includes(
              c.workload,
            )
          )
            throw new Error('Invalid playground configuration.');
          if (resolveTool.current)
            throw new Error('A playground run is already in progress.');
          setDraft({ ...c });
          action.current(c);
          return new Promise((resolve) => {
            resolveTool.current = resolve;
          });
        },
      },
      { signal: lifecycle.signal },
    );
    Promise.resolve(registration).catch(() => {});
    return () => {
      lifecycle.abort();
      resolveTool.current?.({ cancelled: true });
      resolveTool.current = null;
    };
  }, []);
  const focus =
    result.requests.find((r) => r.first <= time && r.end >= time) ||
    result.requests.find((r) => r.end > time) ||
    result.requests[result.requests.length - 1];
  const progress =
    !p.started || time < focus.first
      ? 0
      : focus.hit
        ? 1
        : Math.min(
            1,
            (time - focus.first) / Math.max(0.01, focus.end - focus.first),
          );
  const sample = ANSWERS[focus.answer];
  const active = !p.started
    ? -1
    : time < focus.start
      ? 0
      : time < focus.first
        ? 1
        : time < focus.end
          ? 2
          : 3;
  return (
    <>
      <Intro
        title="Playground"
        text="Configure the application, send a workload, and see the tradeoffs play out together."
      />
      <div className="lab-layout playground-layout">
        <section className="demo-box">
          <DemoTop
            title="Your configuration"
            running={p.running}
            started={p.started}
          />
          <div className="playground-config-summary">
            <span>{config.model} model</span>
            <span>{config.context} documents</span>
            <span>{config.tokens} output tokens</span>
            <span>
              {config.workers} {config.workers === 1 ? 'worker' : 'workers'}
            </span>
          </div>
          <StagePath
            labels={[
              'Queue',
              focus.hit ? 'Cache hit' : 'Find notes',
              focus.hit ? 'Reuse answer' : 'Generate',
              'Response',
            ]}
            active={active}
          />
          <div className="request-ledger">
            <div className="ledger-caption">
              <span className="eyebrow">{config.workload}</span>
              <span>
                {time.toFixed(1)} s{' '}
                {result.total > 14
                  ? `· ${(result.total / 14).toFixed(1)}× playback`
                  : ''}
              </span>
            </div>
            {result.requests.map((r) => {
              const state =
                !p.started || time < r.arrival
                  ? 'Scheduled'
                  : time < r.start
                    ? 'Waiting'
                    : time < r.first
                      ? r.hit
                        ? 'Cache lookup'
                        : 'Preparing'
                      : time < r.end
                        ? 'Streaming'
                        : 'Complete';
              return (
                <div className="request-row" key={r.id}>
                  <span className="request-id">{r.id + 1}</span>
                  <span>
                    {r.key === 'reference'
                      ? 'Library hours'
                      : 'What is a cache?'}
                  </span>
                  <div className="request-track">
                    <div
                      className="request-wait"
                      style={{
                        left: `${(r.arrival / result.total) * 100}%`,
                        width: `${(r.wait / result.total) * 100}%`,
                      }}
                    />
                    <div
                      className={`request-work ${r.hit ? 'cached' : ''}`}
                      style={{
                        left: `${(r.start / result.total) * 100}%`,
                        width: `${(r.service / result.total) * 100}%`,
                        opacity: !p.started || time < r.start ? 0.3 : 1,
                      }}
                    />
                    {p.started && (
                      <div
                        className="request-playhead"
                        style={{ left: `${(time / result.total) * 100}%` }}
                      />
                    )}
                  </div>
                  <span
                    className={
                      state === 'Complete'
                        ? 'request-state finished'
                        : 'request-state'
                    }
                  >
                    {state === 'Complete' && <Check size={12} />} {state}
                  </span>
                </div>
              );
            })}
            <div className="ledger-legend">
              <span>
                <i className="legend-wait" />
                Queue wait
              </span>
              <span>
                <i className="legend-generate" />
                Model work
              </span>
              <span>
                <i className="legend-cache" />
                Cache lookup
              </span>
            </div>
          </div>
          <div className="answer-card playground-answer">
            <div className="response-label">
              <span className="eyebrow">
                Example response · request {focus.id + 1}
              </span>
              {p.started && focus.hit && (
                <span className="cache-badge">Cached</span>
              )}
            </div>
            <p>
              {p.started && progress > 0 ? (
                <>
                  {sample.slice(
                    0,
                    Math.max(1, Math.floor(progress * sample.length)),
                  )}
                  {p.running && progress < 1 && <span className="cursor" />}
                </>
              ) : (
                <span className="muted">
                  Run your configuration to see an example answer.
                </span>
              )}
            </p>
            {p.started && !p.running && (
              <small>
                {focus.answer === 'grounded'
                  ? 'The answer uses the exam-week exception.'
                  : focus.answer === 'partial'
                    ? config.context < 2
                      ? 'The exam-week exception was not included in the retrieved context.'
                      : 'This prepared lightweight response misses the exception, even though it was retrieved.'
                    : focus.answer === 'missing'
                      ? 'Without reference material, the model cannot establish the current hours.'
                      : focus.answer === 'incomplete'
                        ? 'The short output budget leaves this answer unfinished.'
                        : 'Inspect whether this answer gives the user what they need.'}
              </small>
            )}
          </div>
          <div className="metrics playground-metrics">
            <Metric
              label="First visible token"
              value={`${result.firstVisible.toFixed(2)} s`}
              note="First request"
            />
            <Metric
              label="Workload complete"
              value={`${result.total.toFixed(2)} s`}
              note={`${result.requests.length} requests · ${result.cacheHits} cache hits`}
            />
            <Metric
              label="Workload cost"
              value={`$${result.cost.toFixed(5)}`}
              note="Model usage + worker time"
            />
          </div>
        </section>
        <aside className="controls">
          <span className="eyebrow">Build a configuration</span>
          <Choice
            label="Model"
            value={draft.model}
            options={['Lightweight', 'Capable']}
            onChange={(v) => set('model', v as Model)}
          />
          <Range
            label="Retrieved context"
            value={draft.context}
            min={0}
            max={4}
            unit=" docs"
            onChange={(v) => set('context', v)}
          />
          <Range
            label="Answer length"
            value={draft.tokens}
            min={16}
            max={80}
            step={16}
            unit=" tok"
            onChange={(v) => set('tokens', v)}
          />
          <Toggle
            label="Answer caching"
            checked={draft.cache}
            onChange={(v) => set('cache', v)}
          />
          <Range
            label="Workers"
            value={draft.workers}
            min={1}
            max={4}
            onChange={(v) => set('workers', v)}
          />
          <Choice
            label="Workload"
            value={draft.workload}
            options={['Simple question', 'Needs reference', 'Repeated burst']}
            onChange={(v) => set('workload', v as Workload)}
          />
          <RunButton
            run={() => start(draft)}
            started={p.started}
            running={p.running}
          />
          <button
            className="reset-button"
            onClick={() => {
              p.reset();
              setDraft({ ...DEFAULT_CONFIG });
              setConfig({ ...DEFAULT_CONFIG });
              setPrevious(null);
              resolveTool.current?.({ cancelled: true });
              resolveTool.current = null;
            }}
          >
            <RotateCcw size={14} />
            Reset playground
          </button>
          <p className="control-note">
            {pending
              ? 'Your changes apply on the next run.'
              : 'Each run starts with an empty cache. Repeats can reuse answers completed earlier in that run.'}
          </p>
        </aside>
      </div>
      {previous && (
        <div className="comparison">
          <span className="eyebrow">Previous → current configuration</span>
          <div className="comparison-heading">
            <span>
              {previous.config.model} · {previous.config.context} docs ·{' '}
              {previous.config.tokens} tokens · {previous.config.workers}{' '}
              workers · cache {previous.config.cache ? 'on' : 'off'}
            </span>
            <span className="comparison-separator">vs.</span>
            <span>
              {config.model} · {config.context} docs · {config.tokens} tokens ·{' '}
              {config.workers} workers · cache {config.cache ? 'on' : 'off'}
            </span>
          </div>
          {previous.config.workload !== config.workload && (
            <p className="comparison-warning">
              Different workloads: these runs are not directly comparable.
            </p>
          )}
          <div className="comparison-values">
            <span>
              First token{' '}
              <strong>
                {previous.result.firstVisible.toFixed(2)} →{' '}
                {result.firstVisible.toFixed(2)} s
              </strong>
            </span>
            <span>
              Completion{' '}
              <strong>
                {previous.result.total.toFixed(2)} → {result.total.toFixed(2)} s
              </strong>
            </span>
            <span>
              Cost{' '}
              <strong>
                ${previous.result.cost.toFixed(5)} → ${result.cost.toFixed(5)}
              </strong>
            </span>
          </div>
        </div>
      )}
      <Observation>
        Change one setting and replay the same workload. Look at both the
        response and the measurements. A smaller model can suit an easy
        question; references, answer length, reuse, and capacity change
        different parts of the result.
      </Observation>
      <p className="fine-print">
        All results are illustrative. Prepared responses are excerpts, not live
        generated text or exact tokenizations. Model rates match Tokens & cost;
        worker costs match Traffic & queues. A cache hit requires an earlier
        matching request to have finished.
      </p>
    </>
  );
}
