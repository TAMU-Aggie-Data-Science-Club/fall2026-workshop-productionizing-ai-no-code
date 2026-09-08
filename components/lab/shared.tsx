'use client';
import { useEffect, useId, useState } from 'react';
import { ArrowRight, Play, RotateCcw } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
export function Range({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (n: number) => void;
}) {
  const id = useId();
  return (
    <div className="control">
      <div className="control-label">
        <label id={id}>{label}</label>
        <output>
          {value}
          {unit}
        </output>
      </div>
      <Slider
        aria-labelledby={id}
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(v) =>
          onChange(Number((Array.isArray(v) ? v[0] : v).toFixed(2)))
        }
      />
      <div className="range-ends">
        <span>
          {min}
          {unit}
        </span>
        <span>
          {max}
          {unit}
        </span>
      </div>
    </div>
  );
}
export function Choice({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (s: string) => void;
}) {
  return (
    <fieldset className="control">
      <legend>{label}</legend>
      <RadioGroup
        className="choices"
        value={value}
        onValueChange={(v) => onChange(String(v))}
        aria-label={label}
      >
        {options.map((o) => (
          <label key={o} className={value === o ? 'choice selected' : 'choice'}>
            <RadioGroupItem value={o} />
            <span>{o}</span>
          </label>
        ))}
      </RadioGroup>
    </fieldset>
  );
}
export function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (b: boolean) => void;
}) {
  const id = useId();
  return (
    <div className="control toggle">
      <label htmlFor={id}>{label}</label>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
export function usePlayback(duration: number) {
  const [elapsed, setElapsed] = useState(0),
    [running, setRunning] = useState(false),
    [runId, setRunId] = useState(0),
    [started, setStarted] = useState(false);
  useEffect(() => {
    if (!running) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setElapsed(duration);
      setRunning(false);
      return;
    }
    const start = performance.now();
    const timer = window.setInterval(() => {
      const t = Math.min((performance.now() - start) / 1000, duration);
      setElapsed(t);
      if (t >= duration) setRunning(false);
    }, 30);
    return () => window.clearInterval(timer);
  }, [running, runId, duration]);
  return {
    elapsed,
    running,
    started,
    run: () => {
      setElapsed(0);
      setStarted(true);
      setRunId((n) => n + 1);
      setRunning(true);
    },
    reset: () => {
      setRunning(false);
      setElapsed(0);
      setStarted(false);
    },
  };
}
export function Metric({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
      {note && <small>{note}</small>}
    </div>
  );
}
export function RunButton({
  run,
  started,
  running,
}: {
  run: () => void;
  started: boolean;
  running: boolean;
}) {
  return (
    <button className="run-button" onClick={run}>
      {started ? (
        <RotateCcw size={16} />
      ) : (
        <Play size={16} fill="currentColor" />
      )}
      {running
        ? 'Restart demonstration'
        : started
          ? 'Replay demonstration'
          : 'Run demonstration'}
    </button>
  );
}
export function Observation({ children }: { children: React.ReactNode }) {
  return (
    <div className="observation">
      <div>
        <span className="eyebrow">What to notice</span>
        <p>{children}</p>
      </div>
    </div>
  );
}
export function StagePath({
  labels,
  active = -1,
}: {
  labels: string[];
  active?: number;
}) {
  return (
    <div className="stage-path">
      {labels.map((s, i) => (
        <div className="stage-pair" key={s}>
          <div
            className={`stage ${i === active ? 'active' : ''} ${i < active ? 'complete' : ''}`}
          >
            <span className="stage-dot" />
            {s}
          </div>
          {i < labels.length - 1 && (
            <ArrowRight className="path-arrow" size={20} />
          )}
        </div>
      ))}
    </div>
  );
}
export function Intro({ title, text }: { title: string; text: string }) {
  return (
    <div className="section-intro">
      <div>
        <h1>{title}</h1>
        <p>{text}</p>
      </div>
    </div>
  );
}
export function DemoTop({
  title,
  running,
  started,
}: {
  title: string;
  running: boolean;
  started: boolean;
}) {
  return (
    <div className="demo-top">
      <span className="eyebrow">{title}</span>
      <span className={`status ${running ? 'live' : ''}`}>
        <i />
        {running ? 'Running' : started ? 'Complete' : 'Ready to run'}
      </span>
    </div>
  );
}
