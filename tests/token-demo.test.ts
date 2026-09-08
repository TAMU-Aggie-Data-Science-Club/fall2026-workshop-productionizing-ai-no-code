import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  tokenExample,
  tokenFrame,
  INPUT_SENT_AT,
  OUTPUT_START_AT,
  TOKEN_INTERVAL,
} from '../lib/token-demo';

test('the receipt counts the whole input once, then bills only generated output', () => {
  const example = tokenExample({ reference: false, answer: 'Brief' });
  assert.equal(tokenFrame(example, 0, false).total, 0);
  assert.equal(tokenFrame(example, INPUT_SENT_AT - 0.01, true).total, 0);
  const sent = tokenFrame(example, INPUT_SENT_AT, true);
  assert.equal(
    sent.input,
    example.groups.reduce((sum, group) => sum + group.tokens.length, 0),
  );
  assert.equal(sent.output, 0);
  assert.equal(sent.total, example.input / 1_000_000);
  const first = tokenFrame(example, OUTPUT_START_AT, true);
  assert.equal(first.output, 1);
  assert.equal(first.outputCost, 3 / 1_000_000);
  const second = tokenFrame(
    example,
    OUTPUT_START_AT + TOKEN_INTERVAL + 0.001,
    true,
  );
  assert.equal(second.output, 2);
  assert.equal(second.inputCost, sent.inputCost);
  assert.equal(second.outputCost, 6 / 1_000_000);
  const final = tokenFrame(example, example.duration, true);
  assert.equal(final.output, example.output.length);
  assert.equal(
    final.total,
    (example.input + example.output.length * 3) / 1_000_000,
  );
  assert.equal(final.stage, 'complete');
  assert.deepEqual(tokenFrame(example, example.duration + 100, true), final);
  assert.equal(tokenFrame(example, 0, true).total, 0);
});

test('reference text changes input cost; longer answers change output cost and playback length', () => {
  const brief = tokenExample({ reference: false, answer: 'Brief' });
  const reference = tokenExample({ reference: true, answer: 'Brief' });
  const detailed = tokenExample({ reference: false, answer: 'Detailed' });
  assert.ok(reference.input > brief.input);
  assert.deepEqual(reference.output, brief.output);
  assert.equal(detailed.input, brief.input);
  assert.ok(detailed.output.length > brief.output.length);
  assert.ok(detailed.duration > brief.duration);
  const final = tokenFrame(detailed, detailed.duration, true);
  assert.equal(final.output, detailed.output.length);
  assert.ok(
    final.outputCost > tokenFrame(brief, brief.duration, true).outputCost,
  );
});
