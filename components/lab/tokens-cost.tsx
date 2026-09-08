'use client';
import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import {
  tokenExample,
  tokenFrame,
  type TokenExampleConfig,
} from '@/lib/token-demo';
import {
  Choice,
  DemoTop,
  Intro,
  Range,
  RunButton,
  Toggle,
  usePlayback,
} from './shared';

const money = (value: number) => `$${value.toFixed(6)}`;
const formatVolume = (value: number) => `${value / 1000}K`;
const INITIAL: TokenExampleConfig = { reference: false, answer: 'Brief' };
// A fixed, shared scale keeps the two cost bars comparable across every preset.
const longest = tokenExample({ reference: true, answer: 'Detailed' });
const maxCost = Math.max(longest.input, longest.output.length * 3) / 1_000_000;

function TokenText({
  tokens,
  visible = tokens.length,
  active = false,
}: {
  tokens: string[];
  visible?: number;
  active?: boolean;
}) {
  return (
    <>
      <p className="sr-only">{tokens.slice(0, visible).join('')}</p>
      <div className="billing-token-text" aria-hidden="true">
        {tokens.map((token, index) => (
          <span
            key={index}
            className={`billing-token ${index >= visible ? 'unrevealed' : ''} ${active && index === visible - 1 ? 'just-generated' : ''}`}
          >
            {token}
          </span>
        ))}
      </div>
    </>
  );
}

export function TokensCost() {
  const [draft, setDraft] = useState<TokenExampleConfig>(INITIAL);
  const [config, setConfig] = useState<TokenExampleConfig>(INITIAL);
  const [volume, setVolume] = useState(10000);
  const playbackExample = tokenExample(config);
  const p = usePlayback(playbackExample.duration);
  const example = p.started ? playbackExample : tokenExample(draft);
  const frame = tokenFrame(example, p.elapsed, p.started);
  const pending =
    draft.reference !== config.reference || draft.answer !== config.answer;

  return (
    <>
      <Intro
        title="Tokens & cost"
        text="More tokens and requests add to the bill."
      />
      <div className="lab-layout billing-layout">
        <section
          className="demo-box billing-demo"
          aria-label="Tokens and cost demonstration"
        >
          <DemoTop
            title="Token usage"
            running={p.running}
            started={p.started}
          />
          <div className="billing-messages">
            <section
              className={`billing-input ${frame.input ? 'is-counted' : ''}`}
              aria-label="Input message"
            >
              <div className="billing-message-heading">
                <span className="eyebrow">Input</span>
                <span>
                  {frame.input} / {example.input} tokens
                </span>
              </div>
              {example.groups.map((group) => (
                <div className="billing-input-group" key={group.label}>
                  {group.label === 'Reference' && (
                    <span className="billing-reference-label">Reference</span>
                  )}
                  <TokenText tokens={group.tokens} />
                </div>
              ))}
            </section>
            <ArrowRight
              className="billing-flow-arrow"
              size={20}
              aria-hidden="true"
            />
            <section className="billing-output" aria-label="Generated answer">
              <div className="billing-message-heading">
                <span className="eyebrow">Output</span>
                <span>
                  <output aria-label="Generated tokens" aria-live="off">
                    {frame.output}
                  </output>{' '}
                  / {example.output.length} tokens
                </span>
              </div>
              <div
                className="billing-answer"
                key={`${config.answer}-${config.reference}`}
              >
                <TokenText
                  tokens={example.output}
                  visible={frame.output}
                  active={p.running}
                />
                {frame.output === 0 && (
                  <p className="billing-answer-placeholder">
                    {p.started ? 'Generating…' : 'No answer yet.'}
                  </p>
                )}
              </div>
            </section>
          </div>
          <div className="metrics billing-metrics">
            <div className="metric">
              <span>Input cost</span>
              <strong>
                <output aria-label="Input cost" aria-live="off">
                  {money(frame.inputCost)}
                </output>
              </strong>
              <small>
                <output aria-label="Input tokens billed" aria-live="off">
                  {frame.input}
                </output>{' '}
                × $1 / 1M
              </small>
              <div className="billing-cost-track" aria-hidden="true">
                <span
                  style={{ width: `${(frame.inputCost / maxCost) * 100}%` }}
                />
              </div>
            </div>
            <div className="metric">
              <span>Output cost</span>
              <strong>
                <output aria-label="Output cost" aria-live="off">
                  {money(frame.outputCost)}
                </output>
              </strong>
              <small>
                <output aria-label="Output tokens billed" aria-live="off">
                  {frame.output}
                </output>{' '}
                × $3 / 1M
              </small>
              <div className="billing-cost-track" aria-hidden="true">
                <span
                  style={{ width: `${(frame.outputCost / maxCost) * 100}%` }}
                />
              </div>
            </div>
            <div className="metric">
              <span>Per request</span>
              <strong>
                <output aria-label="Request cost" aria-live="off">
                  {money(frame.total)}
                </output>
              </strong>
            </div>
          </div>
          <div className="billing-volume">
            <span>{formatVolume(volume)} requests</span>
            <div className="billing-volume-equation">
              <span>
                {money(frame.total)} × {formatVolume(volume)}
              </span>
              <span aria-hidden="true">=</span>
              <output aria-label="Projected cost" aria-live="off">
                ${(frame.total * volume).toFixed(2)}
              </output>
            </div>
          </div>
        </section>
        <aside className="controls billing-controls">
          <span className="eyebrow">Configs</span>
          <Choice
            label="Answer length"
            value={draft.answer}
            options={['Brief', 'Detailed']}
            onChange={(answer) =>
              setDraft((current) => ({
                ...current,
                answer: answer as TokenExampleConfig['answer'],
              }))
            }
          />
          <Toggle
            label="Reference text"
            checked={draft.reference}
            onChange={(reference) =>
              setDraft((current) => ({ ...current, reference }))
            }
          />
          <RunButton
            run={() => {
              setConfig({ ...draft });
              p.run();
            }}
            started={p.started}
            running={p.running}
            pending={pending}
          />
          {p.started && pending && (
            <p className="control-note">Changes apply on Run.</p>
          )}
          <div className="billing-volume-control">
            <Range
              label="Request volume"
              value={volume}
              min={1000}
              max={100000}
              step={1000}
              formatValue={formatVolume}
              onChange={setVolume}
            />
          </div>
        </aside>
      </div>
    </>
  );
}
