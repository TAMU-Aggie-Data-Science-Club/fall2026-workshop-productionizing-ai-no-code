'use client';
import { useEffect, useState } from 'react';
import { ArrowRight, Check, X, FileText, RotateCcw, Play } from 'lucide-react';
import {
  tokenCost,
  schedule,
  capacityCost,
  cacheRequest,
  type CacheState,
  type RequestSlot,
} from '@/lib/simulation';
import {
  DOCUMENTS,
  QUESTIONS,
  contextAnswer,
  QUALITY_CASES,
} from '@/lib/content';
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

export function TokensCost() {
  const [input, setInput] = useState(240),
    [output, setOutput] = useState(80),
    [volume, setVolume] = useState(1000);
  const [run, setRun] = useState({ input: 240, output: 80, volume: 1000 });
  const p = usePlayback(4);
  const a = Math.min(1, p.elapsed / 1.5),
    b = Math.max(0, Math.min(1, (p.elapsed - 1.5) / 2.5));
  const result = tokenCost(run.input, run.output, run.volume);
  const pending =
    input !== run.input || output !== run.output || volume !== run.volume;
  return (
    <>
      <Intro
        title="Tokens & cost"
        text="You pay for what goes in and what comes out. Then you do it thousands of times."
      />
      <div className="lab-layout">
        <section className="demo-box">
          <DemoTop
            title="Follow the token budget"
            running={p.running}
            started={p.started}
          />
          <div className="token-demo">
            <div className="token-group">
              <div className="token-group-label">
                <span>Input tokens</span>
                <strong>
                  {Math.floor(run.input * a)} <small>/ {run.input}</small>
                </strong>
              </div>
              <p>Your instructions, question, and reference material.</p>
              <div className="token-grid">
                {Array.from({ length: run.input / 20 }, (_, i) => (
                  <span
                    key={i}
                    className={`token-block input ${i < Math.ceil((run.input * a) / 20) ? 'filled' : ''}`}
                  >
                    20
                  </span>
                ))}
              </div>
            </div>
            <div className="token-bridge">
              <span />
              <ArrowRight size={19} />
              <span className="model-chip">LLM</span>
              <ArrowRight size={19} />
              <span />
            </div>
            <div className="token-group">
              <div className="token-group-label">
                <span>Output tokens</span>
                <strong>
                  {Math.floor(run.output * b)} <small>/ {run.output}</small>
                </strong>
              </div>
              <p>The answer the model generates.</p>
              <div className="token-grid">
                {Array.from({ length: run.output / 20 }, (_, i) => (
                  <span
                    key={i}
                    className={`token-block output ${i < Math.ceil((run.output * b) / 20) ? 'filled' : ''}`}
                  >
                    20
                  </span>
                ))}
              </div>
            </div>
            <div className="rate-note">
              Each block represents 20 tokens. Fictional rates: $1 / million
              input tokens · $3 / million output tokens.
            </div>
          </div>
          <div className="metrics">
            <Metric
              label="Input cost"
              value={`$${(result.inputCost * a).toFixed(3)}`}
              note={`Across ${run.volume.toLocaleString()} requests`}
            />
            <Metric
              label="Output cost"
              value={`$${(result.outputCost * b).toFixed(3)}`}
              note="Higher rate per token"
            />
            <Metric
              label="Combined cost"
              value={`$${(result.inputCost * a + result.outputCost * b).toFixed(3)}`}
              note="Model usage only"
            />
          </div>
        </section>
        <aside className="controls">
          <span className="eyebrow">Adjust & observe</span>
          <Range
            label="Prompt length"
            value={input}
            min={40}
            max={800}
            step={40}
            unit=" tok"
            onChange={setInput}
          />
          <Range
            label="Answer length"
            value={output}
            min={20}
            max={240}
            step={20}
            unit=" tok"
            onChange={setOutput}
          />
          <Range
            label="Request volume"
            value={volume}
            min={1000}
            max={100000}
            step={1000}
            onChange={setVolume}
          />
          <RunButton
            run={() => {
              setRun({ input, output, volume });
              p.run();
            }}
            started={p.started}
            running={p.running}
          />
          <p className="control-note">
            {pending
              ? 'Your changes apply on the next run.'
              : 'Double the answer length. Then increase the request volume.'}
          </p>
        </aside>
      </div>
      <Observation>
        An inexpensive request can become a meaningful bill at scale. Shorter
        useful answers and relevant context reduce token usage; removing
        necessary information can hurt the result.
      </Observation>
      <p className="fine-print">
        Token blocks are illustrative. Rates are fictional and intentionally
        fixed for comparison.
      </p>
    </>
  );
}

export function ContextRetrieval() {
  const [question, setQuestion] = useState('Exam week'),
    [count, setCount] = useState(2);
  const [run, setRun] = useState({ question: 'Exam week', count: 2 });
  const p = usePlayback(4),
    answer = contextAnswer(run.question, run.count);
  const ready = p.started && p.elapsed >= 2.5;
  return (
    <>
      <Intro
        title="Context & retrieval"
        text="Retrieval finds reference material and puts it into the prompt before the model answers."
      />
      <div className="lab-layout">
        <section className="demo-box">
          <DemoTop
            title="From documents to an answer"
            running={p.running}
            started={p.started}
          />
          <div className="prompt-line">
            <span className="eyebrow">Question</span>
            <p>{QUESTIONS[run.question as keyof typeof QUESTIONS]}</p>
          </div>
          <div className="document-grid">
            {DOCUMENTS.map((d, i) => (
              <div
                key={d.id}
                className={`document-card ${p.started && p.elapsed > i * 0.25 + 0.3 && i < run.count ? 'retrieved' : ''}`}
              >
                <div>
                  <FileText size={16} />
                  <span>Source {d.id}</span>
                  {i < run.count && p.started && p.elapsed > i * 0.25 + 0.3 && (
                    <Check size={15} />
                  )}
                </div>
                <h3>{d.title}</h3>
                <p>{d.text}</p>
                <span className="doc-tag">
                  {d.relevant
                    ? 'Relevant to this question'
                    : 'Unrelated information'}
                </span>
              </div>
            ))}
          </div>
          <StagePath
            labels={['Find notes', `${run.count} in prompt`, 'Generate answer']}
            active={
              !p.started ? -1 : p.elapsed < 1.2 ? 0 : p.elapsed < 2.5 ? 1 : 2
            }
          />
          <div className="answer-card">
            <span className="eyebrow">
              {ready ? answer.state : 'Model response'}
            </span>
            <p className={!ready ? 'muted' : ''}>
              {ready
                ? answer.text
                : 'Run the demonstration to see what the selected context supports.'}
            </p>
          </div>
          <div className="context-summary">
            <span>{run.count * 90} reference tokens</span>
            <span>{Math.max(0, run.count - 2)} unrelated documents</span>
          </div>
        </section>
        <aside className="controls">
          <span className="eyebrow">Adjust & observe</span>
          <Choice
            label="Question"
            value={question}
            options={['Regular hours', 'Exam week']}
            onChange={setQuestion}
          />
          <Range
            label="Documents retrieved"
            value={count}
            min={0}
            max={4}
            onChange={setCount}
          />
          <RunButton
            run={() => {
              setRun({ question, count });
              p.run();
            }}
            started={p.started}
            running={p.running}
          />
          <p className="control-note">
            {question !== run.question || count !== run.count
              ? 'Your changes apply on the next run.'
              : 'Try exam week with one document, then with two.'}
          </p>
        </aside>
      </div>
      <Observation>
        The first document gives the usual hours; the second contains the
        exception. A cited answer can still be wrong if retrieval misses the
        information that matters. More unrelated documents add work without
        adding evidence.
      </Observation>
      <p className="fine-print">
        These library notes and responses are fictional teaching examples. Each
        document is modeled as 90 tokens.
      </p>
    </>
  );
}

export function Caching() {
  const [enabled, setEnabled] = useState(true),
    [version, setVersion] = useState(1),
    [cache, setCache] = useState<CacheState>(null);
  const [result, setResult] = useState<ReturnType<typeof cacheRequest> | null>(
      null,
    ),
    [runVersion, setRunVersion] = useState(1),
    [runEnabled, setRunEnabled] = useState(true);
  const p = usePlayback(result?.duration ?? 2.6);
  useEffect(() => {
    if (p.started && !p.running && result) setCache(result.nextCache);
  }, [p.started, p.running, result]);
  const send = () => {
    setResult(cacheRequest(enabled, cache, version));
    setRunVersion(version);
    setRunEnabled(enabled);
    p.run();
  };
  const ready = p.started && !p.running,
    hit = result?.hit ?? false;
  return (
    <>
      <Intro
        title="Caching"
        text="An answer cache skips repeat work. It also needs a plan for when the facts change."
      />
      <div className="lab-layout">
        <section className="demo-box">
          <DemoTop
            title="Ask. Save. Ask again."
            running={p.running}
            started={p.started}
          />
          <div className="prompt-line">
            <span className="eyebrow">Question</span>
            <p>When does the library close tonight?</p>
          </div>
          <div className="cache-diagram">
            <div className="cache-source">
              <FileText size={19} />
              <div>
                <span className="eyebrow">
                  Source · version {p.started ? runVersion : version}
                </span>
                <p>
                  Tonight’s closing time:{' '}
                  <strong>
                    {(p.started ? runVersion : version) === 1
                      ? '10 p.m.'
                      : '8 p.m.'}
                  </strong>
                </p>
              </div>
            </div>
            <StagePath
              labels={
                hit
                  ? ['Question', 'Saved answer', 'Response']
                  : ['Question', 'Model', 'Response']
              }
              active={
                !p.started ? -1 : p.elapsed < 0.12 ? 0 : p.running ? 1 : 2
              }
            />
            <div
              className={`cache-pocket ${hit && p.started ? 'cache-hit' : ''}`}
            >
              <span className="eyebrow">Answer cache</span>
              <strong>
                {cache
                  ? `Saved: ${cache.version === 1 ? '10 p.m.' : '8 p.m.'}`
                  : 'Empty'}
              </strong>
              <small>
                {!runEnabled && p.started
                  ? 'Bypassed for this request'
                  : hit && p.started
                    ? 'Hit · model call skipped'
                    : 'Exact-question matching'}
              </small>
            </div>
          </div>
          <div
            className={`answer-card ${ready && result?.stale ? 'warning' : ''}`}
          >
            <span className="eyebrow">
              {ready
                ? result?.stale
                  ? 'Stale answer'
                  : hit
                    ? 'Reused answer'
                    : 'Fresh answer'
                : 'Response'}
            </span>
            <p>
              {ready
                ? `The library closes at ${result?.answerVersion === 1 ? '10 p.m.' : '8 p.m.'} tonight.`
                : 'Send the question to fill the cache, then repeat it.'}
            </p>
            {ready && result?.stale && (
              <small>
                The source changed to 8 p.m., but the saved answer still says 10
                p.m.
              </small>
            )}
          </div>
          <div className="metrics">
            <Metric
              label="Response time"
              value={result ? `${result.duration.toFixed(2)} s` : '—'}
              note={hit ? 'Answer-cache shortcut' : 'Model generation'}
            />
            <Metric
              label="Model calls"
              value={result ? (hit ? '0' : '1') : '—'}
              note="For this request"
            />
            <Metric
              label="Model cost"
              value={result ? `$${result.cost.toFixed(5)}` : '—'}
              note="Storage costs omitted"
            />
          </div>
        </section>
        <aside className="controls">
          <span className="eyebrow">Adjust & observe</span>
          <Toggle
            label="Answer caching"
            checked={enabled}
            onChange={setEnabled}
          />
          <Choice
            label="Current source facts"
            value={version === 1 ? '10 p.m.' : '8 p.m.'}
            options={['10 p.m.', '8 p.m.']}
            onChange={(v) => setVersion(v === '10 p.m.' ? 1 : 2)}
          />
          <button className="run-button" disabled={p.running} onClick={send}>
            <Play size={16} />
            {p.started ? 'Repeat question' : 'Send question'}
          </button>
          <div className="secondary-actions">
            <button disabled={!result} onClick={p.run}>
              <RotateCcw size={14} />
              Replay last
            </button>
            <button
              onClick={() => {
                setCache(null);
                setResult(null);
                p.reset();
              }}
            >
              Clear cache
            </button>
          </div>
          <p className="control-note">
            First send, then repeat. Next, change the source to 8 p.m. and
            repeat again. Clear the cache to refresh the answer.
          </p>
          {p.started && (version !== runVersion || enabled !== runEnabled) && (
            <p className="control-note">
              Changed settings apply to the next question. Replay preserves the
              last request.
            </p>
          )}
        </aside>
      </div>
      <Observation>
        A cache hit avoids a model call. But a quick answer is not necessarily a
        current answer: use expiration or invalidate saved results when their
        source changes.
      </Observation>
      <p className="fine-print">
        This is an exact-answer cache, not a model’s prompt/prefix cache. The
        shortcut is displayed at its simulated 0.25-second speed.
      </p>
    </>
  );
}

export function QueueVisual({
  requests,
  workers,
  time,
  started,
}: {
  requests: RequestSlot[];
  workers: number;
  time: number;
  started: boolean;
}) {
  const waiting = requests.filter((r) => r.arrival <= time && r.start > time),
    completed = requests.filter((r) => r.end <= time);
  return (
    <div className="queue-visual">
      <div className="queue-column">
        <span className="eyebrow">Arriving</span>
        <div className="arrival-stack">
          {requests
            .filter((r) => !started || r.arrival > time)
            .map((r) => (
              <span className="request-dot future" key={r.id}>
                {r.id + 1}
              </span>
            ))}
        </div>
        <small>
          {started ? requests.filter((r) => r.arrival <= time).length : 0}{' '}
          arrived
        </small>
      </div>
      <ArrowRight className="queue-arrow" size={20} />
      <div className="queue-column">
        <span className="eyebrow">Waiting</span>
        <div className="waiting-stack">
          {started &&
            waiting.map((r) => (
              <span className="request-dot waiting" key={r.id}>
                {r.id + 1}
              </span>
            ))}
          {(!started || waiting.length === 0) && (
            <span className="empty-slot">No queue</span>
          )}
        </div>
        <small>{started ? waiting.length : 0} in line</small>
      </div>
      <ArrowRight className="queue-arrow" size={20} />
      <div className="queue-column workers">
        <span className="eyebrow">Processing</span>
        {Array.from({ length: workers }, (_, i) => {
          const current = started
            ? requests.find(
                (r) => r.worker === i && r.start <= time && r.end > time,
              )
            : undefined;
          return (
            <div className={`worker ${current ? 'busy' : ''}`} key={i}>
              <div>
                <span>Worker {i + 1}</span>
                {current ? (
                  <span className="request-dot">{current.id + 1}</span>
                ) : (
                  <span className="worker-idle">Idle</span>
                )}
              </div>
              <div className="worker-track">
                <span
                  style={{
                    width: current
                      ? `${((time - current.start) / current.service) * 100}%`
                      : '0%',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <ArrowRight className="queue-arrow" size={20} />
      <div className="queue-column">
        <span className="eyebrow">Done</span>
        <div className="done-stack">
          {started &&
            completed.map((r) => (
              <span className="request-dot done" key={r.id}>
                {r.id + 1}
              </span>
            ))}
        </div>
        <small>{started ? completed.length : 0} completed</small>
      </div>
    </div>
  );
}
export function TrafficQueues() {
  const [rate, setRate] = useState(3),
    [workers, setWorkers] = useState(2),
    [run, setRun] = useState({ rate: 3, workers: 2 });
  const requests = schedule(run.rate, run.workers),
    total = Math.max(...requests.map((r) => r.end));
  const p = usePlayback(total),
    average = requests.reduce((s, r) => s + r.wait, 0) / requests.length;
  return (
    <>
      <Intro
        title="Traffic & queues"
        text="When requests arrive faster than workers can finish them, a queue forms."
      />
      <div className="lab-layout">
        <section className="demo-box">
          <DemoTop
            title="Twelve requests, one shared service"
            running={p.running}
            started={p.started}
          />
          <div className="queue-caption">
            <span>Each dot is one request.</span>
            <strong>{p.elapsed.toFixed(1)} s</strong>
          </div>
          <QueueVisual
            requests={requests}
            workers={run.workers}
            time={p.elapsed}
            started={p.started}
          />
          <div className="queue-explanation">
            <span className="legend-wait" />
            Waiting time grows with traffic.
            <span className="legend-generate" />
            Each request still needs 1.8 s of processing.
          </div>
          <div className="metrics">
            <Metric
              label="Average queue wait"
              value={`${average.toFixed(2)} s`}
              note="Across all 12 requests"
            />
            <Metric
              label="Processing time"
              value="1.80 s"
              note="Unchanged by worker count"
            />
            <Metric
              label="Capacity cost"
              value={`$${capacityCost(run.workers).toFixed(2)}/h`}
              note="Fictional worker-hour rate"
            />
          </div>
        </section>
        <aside className="controls">
          <span className="eyebrow">Adjust & observe</span>
          <Range
            label="Incoming requests"
            value={rate}
            min={1}
            max={6}
            unit=" /s"
            onChange={setRate}
          />
          <Range
            label="Workers"
            value={workers}
            min={1}
            max={4}
            onChange={setWorkers}
          />
          <RunButton
            run={() => {
              setRun({ rate, workers });
              p.run();
            }}
            started={p.started}
            running={p.running}
          />
          <p className="control-note">
            {rate !== run.rate || workers !== run.workers
              ? 'Your changes apply on the next run.'
              : 'Add workers and watch the waiting line shrink. Each worker adds actual capacity in this simulation.'}
          </p>
        </aside>
      </div>
      <Observation>
        Queue time is time spent waiting for capacity—not generating an answer.
        More workers can reduce it, but they cost money. Raising a concurrency
        setting alone does not create more compute.
      </Observation>
      <p className="fine-print">
        Deterministic first-come, first-served queue. Requests run to
        completion; no retries, batching, or rejected traffic in this example.
      </p>
    </>
  );
}

export function QualityChecks() {
  const [example, setExample] = useState('Library hours'),
    [config, setConfig] = useState('Grounded'),
    [run, setRun] = useState({ example: 'Library hours', config: 'Grounded' });
  const p = usePlayback(3.6),
    data = QUALITY_CASES[run.example as keyof typeof QUALITY_CASES],
    type = run.config as 'Grounded' | 'Unsupported' | 'Incomplete';
  const revealed = p.started ? Math.min(3, Math.floor(p.elapsed / 1.2)) : 0;
  return (
    <>
      <Intro
        title="Quality checks"
        text="Check the answer against requirements and evidence—not just how convincing it sounds."
      />
      <div className="lab-layout">
        <section className="demo-box">
          <DemoTop
            title="Inspect the answer, then the checks"
            running={p.running}
            started={p.started}
          />
          <div className="prompt-line">
            <span className="eyebrow">Question</span>
            <p>{data.question}</p>
          </div>
          <div className="reference-strip">
            <FileText size={17} />
            <p>
              <strong>Reference</strong>
              {data.reference}
            </p>
          </div>
          <div className="answer-card quality-answer">
            <span className="eyebrow">Prepared answer</span>
            <p>{data.answers[type]}</p>
          </div>
          <div className="check-list">
            {data.checks.map((c, i) => (
              <div className="check-row" key={c}>
                <span>{c}</span>
                {i < revealed ? (
                  <span
                    className={
                      data.results[type][i] ? 'check-pass' : 'check-fail'
                    }
                  >
                    {data.results[type][i] ? (
                      <Check size={17} />
                    ) : (
                      <X size={17} />
                    )}{' '}
                    {data.results[type][i] ? 'Pass' : 'Needs attention'}
                  </span>
                ) : (
                  <span className="check-pending">
                    {p.running && i === revealed ? 'Checking…' : 'Not checked'}
                  </span>
                )}
              </div>
            ))}
          </div>
          <div className="quality-note">
            {revealed === 3
              ? type === 'Grounded'
                ? 'These checks pass. You still need broader examples and human review.'
                : type === 'Unsupported'
                  ? 'A citation is present, but the claim does not match the source.'
                  : 'An answer can contain true facts while leaving part of the question unanswered.'
              : 'Run the checks to reveal what this small test catches.'}
          </div>
        </section>
        <aside className="controls">
          <span className="eyebrow">Adjust & observe</span>
          <Choice
            label="Test example"
            value={example}
            options={['Library hours', 'Study rooms']}
            onChange={setExample}
          />
          <Choice
            label="Answer configuration"
            value={config}
            options={['Grounded', 'Unsupported', 'Incomplete']}
            onChange={setConfig}
          />
          <RunButton
            run={() => {
              setRun({ example, config });
              p.run();
            }}
            started={p.started}
            running={p.running}
          />
          <p className="control-note">
            {example !== run.example || config !== run.config
              ? 'Your changes apply on the next run.'
              : 'Try an unsupported answer. Notice which checks it still passes.'}
          </p>
        </aside>
      </div>
      <Observation>
        Good evaluation uses multiple checks. Citation presence does not prove
        support, and factual correctness does not prove completeness. A few
        passing examples cannot establish reliability for every user.
      </Observation>
      <p className="fine-print">
        Check results are authored for these prepared examples. This
        demonstration does not evaluate free-form text.
      </p>
    </>
  );
}
