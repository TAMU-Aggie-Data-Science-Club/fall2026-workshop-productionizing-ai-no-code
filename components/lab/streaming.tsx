'use client';
import { useState } from 'react';
import { TOKENS, streaming } from '@/lib/simulation';
import {
  Range,
  Choice,
  usePlayback,
  Metric,
  RunButton,
  Observation,
  DemoTop,
} from './shared';
export function Streaming() {
  const [wait, setWait] = useState(1.2),
    [speed, setSpeed] = useState(12),
    [delivery, setDelivery] = useState('Streamed');
  const [config, setConfig] = useState({
    wait: 1.2,
    speed: 12,
    delivery: 'Streamed',
  });
  const result = streaming(
    config.wait,
    config.speed,
    TOKENS.length,
    config.delivery === 'Streamed',
  );
  const p = usePlayback(result.total);
  const shown = !p.started
    ? 0
    : config.delivery === 'Buffered'
      ? p.elapsed >= result.total
        ? TOKENS.length
        : 0
      : p.elapsed < config.wait
        ? 0
        : Math.min(
            TOKENS.length,
            1 + Math.floor((p.elapsed - config.wait) * config.speed),
          );
  const pending =
    wait !== config.wait ||
    speed !== config.speed ||
    delivery !== config.delivery;
  return (
    <>
      <div className="section-intro">
        <div>
          <h1>Streaming</h1>
          <p>
            An answer can start quickly and finish slowly. Those are two
            different things to optimize.
          </p>
        </div>
      </div>
      <div className="lab-layout">
        <section className="demo-box" aria-label="Streaming demonstration">
          <DemoTop
            title="Response, in real time"
            running={p.running}
            started={p.started}
          />
          <div className="prompt-line">
            <span className="eyebrow">You</span>
            <p>Why do leaves change color in the fall?</p>
          </div>
          <div className="response-area">
            <div className="response-label">
              <span className="eyebrow">Model response</span>
              <span className="token-count">
                {shown} / {TOKENS.length} pieces
              </span>
            </div>
            <div className="response-text">
              {shown ? (
                TOKENS.slice(0, shown).map((t, i) => (
                  <span
                    key={i}
                    className={i === shown - 1 && p.running ? 'new-token' : ''}
                  >
                    {t}
                  </span>
                ))
              ) : (
                <span className="placeholder">
                  {p.running
                    ? config.delivery === 'Buffered' && p.elapsed >= config.wait
                      ? 'The model is generating. Delivery waits for the full answer.'
                      : 'Waiting for the first token…'
                    : 'Run the demonstration to watch the answer unfold.'}
                </span>
              )}
              {p.running && <span className="cursor" />}
            </div>
          </div>
          <div className="timeline">
            <div className="timeline-caption">
              <span>Request timeline</span>
              <strong>{p.elapsed.toFixed(2)} s</strong>
            </div>
            <div className="timeline-track">
              <div
                className="wait-track"
                style={{ width: `${(config.wait / result.total) * 100}%` }}
              />
              <div
                className="elapsed-track"
                style={{ width: `${(p.elapsed / result.total) * 100}%` }}
              />
              <div
                className="time-marker"
                style={{ left: `${(config.wait / result.total) * 100}%` }}
              />
            </div>
            <div className="timeline-legend">
              <span>
                <i className="legend-wait" />
                Waiting to generate
              </span>
              <span>
                <i className="legend-generate" />
                Generating
              </span>
            </div>
          </div>
          <div className="metrics">
            <Metric
              label="First visible token"
              value={`${result.firstVisible.toFixed(2)} s`}
              note={
                config.delivery === 'Buffered'
                  ? 'Delivered with the full answer'
                  : 'Time to first token (TTFT)'
              }
            />
            <Metric
              label="Generation speed"
              value={`${config.speed} tok/s`}
              note="After generation starts"
            />
            <Metric
              label="Full answer"
              value={`${result.total.toFixed(2)} s`}
              note="Total completion time"
            />
          </div>
        </section>
        <aside className="controls">
          <span className="eyebrow">Adjust & observe</span>
          <Range
            label="First generated token"
            value={wait}
            min={0.2}
            max={3}
            step={0.2}
            unit=" s"
            onChange={setWait}
          />
          <Range
            label="Generation speed"
            value={speed}
            min={4}
            max={40}
            step={2}
            unit=" tok/s"
            onChange={setSpeed}
          />
          <Choice
            label="Response delivery"
            value={delivery}
            options={['Streamed', 'Buffered']}
            onChange={setDelivery}
          />
          <RunButton
            run={() => {
              setConfig({ wait, speed, delivery });
              p.run();
            }}
            started={p.started}
            running={p.running}
          />
          <p className="control-note">
            {pending
              ? 'Your changes apply on the next run.'
              : 'Try the same settings with buffered delivery.'}
          </p>
        </aside>
      </div>
      <Observation>
        Streaming changes when you see the answer, not how fast the model
        generates it. Lower first-token time reduces the initial wait; more
        tokens per second finishes the answer sooner.
      </Observation>
      <p className="fine-print">
        Prepared token pieces illustrate streaming; actual tokenization varies
        by model. All timings are simulated.
      </p>
    </>
  );
}
