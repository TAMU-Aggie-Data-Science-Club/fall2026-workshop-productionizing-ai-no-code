'use client';
import { useState } from 'react';
import { simulateBatching } from '@/lib/batching';
import {
  Intro,
  Range,
  RunButton,
  usePlayback,
  DemoTop,
  Observation,
} from './shared';

function BatchLane({
  title,
  result,
  time,
  started,
  size,
}: {
  title: string;
  result: ReturnType<typeof simulateBatching>;
  time: number;
  started: boolean;
  size: number;
}) {
  const current = started
    ? result.batches.find((b) => b.start <= time && b.end > time)
    : undefined;
  const waiting = started
    ? result.requests.filter((r) => r.arrival <= time && r.start > time)
    : [];
  const done = started ? result.requests.filter((r) => r.end <= time) : [];
  const arrived = started
    ? result.requests.filter((r) => r.arrival <= time).length
    : 0;
  const finished = started && time >= result.total;
  return (
    <div className="batch-lane">
      <div className="batch-lane-heading">
        <h2>{title}</h2>
        <span>{done.length} of 12 complete</span>
      </div>
      <div className="batch-flow">
        <div className="batch-waiting">
          <span className="eyebrow">Waiting</span>
          <div className="batch-dot-tray">
            {waiting.map((r) => (
              <span
                key={r.id}
                className="batch-dot"
                title={`Request ${r.id + 1}`}
              />
            ))}
            {!waiting.length && (
              <span className="batch-empty">{started ? 'Empty' : 'Ready'}</span>
            )}
          </div>
          <small>{12 - arrived} yet to arrive</small>
        </div>
        <div className={`batch-processor ${current ? 'processing' : ''}`}>
          <span className="eyebrow">One processor</span>
          <div className="batch-slots">
            {Array.from({ length: size }, (_, i) => (
              <span
                key={i}
                className={`batch-slot ${current && i < current.ids.length ? 'occupied' : ''}`}
                aria-label={
                  current && i < current.ids.length
                    ? `Processing request ${current.ids[i] + 1}`
                    : 'Available batch slot'
                }
              />
            ))}
          </div>
          <div className="batch-progress">
            <span
              style={{
                width: current
                  ? `${((time - current.start) / (current.end - current.start)) * 100}%`
                  : '0%',
              }}
            />
          </div>
          <small>
            {current
              ? `${current.ids.length} ${current.ids.length === 1 ? 'request' : 'requests'} together`
              : finished
                ? 'Finished'
                : 'Idle'}
          </small>
        </div>
        <div className="batch-completed">
          <span className="eyebrow">Completed</span>
          <div className="batch-dot-tray">
            {done.map((r) => (
              <span
                key={r.id}
                className="batch-dot complete"
                title={`Request ${r.id + 1} completed`}
              />
            ))}
            {!done.length && <span className="batch-empty">None yet</span>}
          </div>
        </div>
      </div>
      <div className="batch-results">
        <div>
          <span>First response</span>
          <strong>
            {finished ? `${result.firstLatency.toFixed(2)} s` : '—'}
          </strong>
        </div>
        <div>
          <span>Average response</span>
          <strong>
            {finished ? `${result.averageLatency.toFixed(2)} s` : '—'}
          </strong>
        </div>
        <div>
          <span>Throughput</span>
          <strong>
            {finished ? `${result.throughput.toFixed(2)} req/s` : '—'}
          </strong>
        </div>
      </div>
    </div>
  );
}

export function Batching() {
  const [draft, setDraft] = useState({ size: 4, window: 0.5, rate: 3 }),
    [config, setConfig] = useState(draft);
  const single = simulateBatching(config.rate, 1, 0),
    batched = simulateBatching(config.rate, config.size, config.window);
  const total = Math.max(single.total, batched.total),
    duration = Math.min(total, 14),
    p = usePlayback(duration),
    time = (p.elapsed / duration) * total;
  const pending = JSON.stringify(draft) !== JSON.stringify(config);
  return (
    <>
      <Intro
        title="Batching"
        text="Grouping requests shares work but can add waiting time."
      />
      <div className="lab-layout">
        <section className="demo-box">
          <DemoTop
            title="12 requests · one processor"
            started={p.started}
            running={p.running}
          />
          <div className="batch-clock">
            <span>One dot per request</span>
            <span>
              {time.toFixed(1)} s
              {total > 14 ? ` · ${(total / 14).toFixed(1)}× playback` : ''}
            </span>
          </div>
          <BatchLane
            title="One at a time"
            result={single}
            time={time}
            started={p.started}
            size={1}
          />
          <BatchLane
            title="With batching"
            result={batched}
            time={time}
            started={p.started}
            size={config.size}
          />
        </section>
        <aside className="controls">
          <span className="eyebrow">Configs</span>
          <Range
            label="Maximum batch size"
            value={draft.size}
            min={1}
            max={6}
            onChange={(size) => setDraft((d) => ({ ...d, size }))}
          />
          <Range
            label="Collection window"
            value={draft.window}
            min={0}
            max={1.5}
            step={0.1}
            unit=" s"
            onChange={(window) => setDraft((d) => ({ ...d, window }))}
          />
          <Range
            label="Incoming requests"
            value={draft.rate}
            min={0.5}
            max={4}
            step={0.5}
            unit=" /s"
            onChange={(rate) => setDraft((d) => ({ ...d, rate }))}
          />
          <RunButton
            pending={pending}
            started={p.started}
            running={p.running}
            run={() => {
              setConfig({ ...draft });
              p.run();
            }}
          />
          {p.started && pending && (
            <p className="control-note">Changes apply on Run.</p>
          )}
        </aside>
      </div>
      <Observation visible={p.started && !p.running}>
        Batching can increase throughput while making the first person wait
        longer.
      </Observation>
    </>
  );
}
