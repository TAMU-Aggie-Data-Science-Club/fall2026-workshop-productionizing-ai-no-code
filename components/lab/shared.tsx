'use client';
import { useEffect, useId, useState } from 'react';
import { ArrowRight, Play, RotateCcw } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Field } from '@base-ui/react/field';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { useActivityProgress } from './activity-progress';
export function Range({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  formatValue = (n: number) => String(n),
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  formatValue?: (n: number) => string;
  onChange: (n: number) => void;
}) {
  const id = useId();
  return (
    <Field.Root className="control">
      <div className="control-label">
        <Field.Label id={id}>{label}</Field.Label>
        <output>
          {formatValue(value)}
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
          {formatValue(min)}
          {unit}
        </span>
        <span>
          {formatValue(max)}
          {unit}
        </span>
      </div>
    </Field.Root>
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
  const { markInteracted } = useActivityProgress();
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
      markInteracted();
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
  pending = false,
}: {
  run: () => void;
  started: boolean;
  running: boolean;
  pending?: boolean;
}) {
  return (
    <button className="run-button" onClick={run}>
      {started ? (
        <RotateCcw size={16} />
      ) : (
        <Play size={16} fill="currentColor" />
      )}
      {running ? 'Restart' : started && !pending ? 'Replay' : 'Run'}
    </button>
  );
}
export function Observation({
  children,
  visible,
}: {
  children: React.ReactNode;
  visible: boolean;
}) {
  if (!visible) return null;
  return (
    <div className="observation">
      <div>
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
        {running ? 'Running' : started ? 'Complete' : 'Ready'}
      </span>
    </div>
  );
}
