import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { mock } from 'node:test';
// @ts-expect-error jsdom is used only in the test environment.
import { JSDOM } from 'jsdom';
const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'http://localhost',
});
Object.defineProperty(globalThis, 'navigator', {
  value: dom.window.navigator,
  configurable: true,
});
Object.assign(globalThis, {
  window: dom.window,
  document: dom.window.document,
  HTMLElement: dom.window.HTMLElement,
  Element: dom.window.Element,
  Node: dom.window.Node,
  DocumentFragment: dom.window.DocumentFragment,
  MutationObserver: dom.window.MutationObserver,
  getComputedStyle: dom.window.getComputedStyle,
  requestAnimationFrame: (cb: FrameRequestCallback) =>
    setTimeout(() => cb(performance.now()), 0),
  cancelAnimationFrame: clearTimeout,
  IS_REACT_ACT_ENVIRONMENT: true,
});
window.matchMedia = () => ({
  matches: true,
  addEventListener() {},
  removeEventListener() {},
  addListener() {},
  removeListener() {},
  dispatchEvent() {
    return true;
  },
  media: '',
  onchange: null,
});
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
const { render, cleanup, fireEvent, act, renderHook } =
  await import('@testing-library/react');
const { PageNavigation, PAGES } =
  await import('../components/lab/page-navigation');
const { Streaming } = await import('../components/lab/streaming');
const { Caching, TokensCost } = await import('../components/lab/lessons');
const { Playground } = await import('../components/lab/playground');
const { usePlayback } = await import('../components/lab/shared');
const { ActivityProgress, useActivityProgress } =
  await import('../components/lab/activity-progress');

function UnlockNavigation() {
  const { markInteracted } = useActivityProgress();
  return <button onClick={markInteracted}>Run activity</button>;
}

function NavigationFixture({ current }: { current: string }) {
  return (
    <ActivityProgress>
      <UnlockNavigation />
      <PageNavigation current={current} />
    </ActivityProgress>
  );
}
afterEach(async () => {
  await act(async () => cleanup());
});
test('lesson navigation offers adjacent pages without a persistent topic list', () => {
  const view = render(<NavigationFixture current="/streaming" />);
  assert.ok(
    view.getByRole('button', { name: 'Next' }).hasAttribute('disabled'),
  );
  fireEvent.click(view.getByRole('button', { name: 'Run activity' }));
  assert.equal(view.getAllByRole('link').length, 1);
  assert.equal(
    view.getByRole('link', { name: 'Next' }).getAttribute('href'),
    '/prod-ai/tokens',
  );
  assert.ok(
    view.getByRole('button', { name: 'Previous' }).hasAttribute('disabled'),
  );
  view.rerender(<NavigationFixture current="/prod-ai/caching" />);
  assert.equal(view.getAllByRole('link').length, 2);
  assert.equal(
    view.getByRole('link', { name: 'Previous' }).getAttribute('href'),
    '/prod-ai/retrieval',
  );
  assert.equal(
    view.getByRole('link', { name: 'Next' }).getAttribute('href'),
    '/prod-ai/queues',
  );
  view.rerender(<NavigationFixture current="/playground" />);
  assert.equal(view.getAllByRole('link').length, 1);
  assert.equal(
    view.getByRole('link', { name: 'Previous' }).getAttribute('href'),
    '/prod-ai/quality',
  );
  assert.ok(
    view.getByRole('button', { name: 'Next' }).hasAttribute('disabled'),
  );
  view.rerender(<NavigationFixture current="/missing" />);
  assert.equal(view.queryByRole('navigation'), null);
});
test('each page entry renders its own heading and working demonstration', async () => {
  for (const page of PAGES) {
    const { default: Page } = await import(`../app${page.href}/page.tsx`);
    const view = render(
      <ActivityProgress key={page.href}>
        <Page />
        <PageNavigation current={page.href} />
      </ActivityProgress>,
    );
    assert.ok(
      view.getByRole('button', { name: 'Next' }).hasAttribute('disabled'),
    );
    assert.equal(view.container.querySelector('a.next-lesson'), null);
    assert.ok(view.getByRole('heading', { level: 1, name: page.label }));
    assert.ok(
      view.getByRole('button', {
        name: page.href === '/caching' ? 'Send question' : 'Run',
      }),
    );
    fireEvent.click(
      view.getByRole('button', {
        name: page.href === '/caching' ? 'Send question' : 'Run',
      }),
    );
    if (page.href !== '/playground') {
      assert.ok(view.getByRole('link', { name: 'Next' }));
      assert.ok(view.container.querySelector('a.next-lesson'));
    }
    await act(async () => view.unmount());
  }
});
test('streaming replays deterministically and stages delivery changes', () => {
  const view = render(<Streaming />);
  assert.equal(view.queryByRole('table', { name: 'Run comparison' }), null);
  assert.equal(
    view.queryByText(/Streaming changes when the answer appears/),
    null,
  );
  fireEvent.click(view.getByRole('button', { name: 'Run' }));
  const answer = view.container.querySelector('.response-text')?.textContent;
  assert.ok(answer?.includes('chlorophyll'));
  fireEvent.click(view.getByRole('button', { name: 'Replay' }));
  assert.equal(
    view.container.querySelector('.response-text')?.textContent,
    answer,
  );
  fireEvent.click(view.getByRole('radio', { name: 'Buffered' }));
  assert.ok(view.getByText('Changes apply on Run.'));
  fireEvent.click(view.getByRole('button', { name: 'Run' }));
  assert.ok(view.getByText('Delivered with the full answer'));
  const comparison = view.getByRole('table', { name: 'Run comparison' });
  assert.ok(comparison.textContent?.includes('Previous · Streamed'));
  assert.ok(comparison.textContent?.includes('Current · Buffered'));
  const rows = comparison.querySelectorAll('tbody tr');
  assert.equal(rows[0].children[1].textContent, '1.20 s');
  assert.equal(rows[1].children[1].textContent, '4.12 s');
  assert.equal(
    rows[0].children[2].textContent,
    rows[1].children[2].textContent,
  );
  fireEvent.click(view.getByRole('button', { name: 'Replay' }));
  assert.ok(
    view
      .getByRole('table', { name: 'Run comparison' })
      .textContent?.includes('Previous · Streamed'),
  );
  assert.ok(view.getByText(/Streaming changes when the answer appears/));
});
test('streaming metrics count during playback and stop at their milestones', () => {
  const originalMedia = window.matchMedia;
  const originalSet = window.setInterval;
  const originalClear = window.clearInterval;
  let now = 0;
  let tick = () => {};
  const clock = mock.method(performance, 'now', () => now);
  window.matchMedia = () => ({ ...originalMedia(''), matches: false });
  window.setInterval = ((callback: () => void) => {
    tick = callback;
    return 1;
  }) as typeof window.setInterval;
  window.clearInterval = () => {};
  try {
    const view = render(<Streaming />);
    const values = () =>
      Array.from(
        view.container.querySelectorAll('.metric strong'),
        (element) => element.textContent,
      );
    assert.deepEqual(values(), ['0.00 s', '0 tok/s', '0.00 s']);
    fireEvent.click(view.getByRole('button', { name: 'Run' }));
    act(() => {
      now = 600;
      tick();
    });
    assert.deepEqual(values(), ['0.60 s', '0 tok/s', '0.60 s']);
    act(() => {
      now = 2000;
      tick();
    });
    assert.deepEqual(values(), ['1.20 s', '12 tok/s', '2.00 s']);
    act(() => {
      now = 5000;
      tick();
    });
    assert.deepEqual(values(), ['1.20 s', '12 tok/s', '4.12 s']);
    fireEvent.click(view.getByRole('button', { name: 'Replay' }));
    assert.deepEqual(values(), ['0.00 s', '0 tok/s', '0.00 s']);
    fireEvent.click(view.getByRole('radio', { name: 'Buffered' }));
    fireEvent.click(view.getByRole('button', { name: 'Restart' }));
    act(() => {
      now = 7000;
      tick();
    });
    assert.deepEqual(values(), ['2.00 s', '12 tok/s', '2.00 s']);
    act(() => {
      now = 10000;
      tick();
    });
    assert.deepEqual(values(), ['4.12 s', '12 tok/s', '4.12 s']);
    view.unmount();
  } finally {
    clock.mock.restore();
    window.matchMedia = originalMedia;
    window.setInterval = originalSet;
    window.clearInterval = originalClear;
  }
});

test('token receipt matches live text, resets on replay, and scales volume without replay', async () => {
  const originalMedia = window.matchMedia;
  const originalSet = window.setInterval;
  const originalClear = window.clearInterval;
  let now = 0;
  let tick = () => {};
  const clock = mock.method(performance, 'now', () => now);
  window.matchMedia = () => ({ ...originalMedia(''), matches: false });
  window.setInterval = ((callback: () => void) => {
    tick = callback;
    return 1;
  }) as typeof window.setInterval;
  window.clearInterval = () => {};
  try {
    const view = render(
      <ActivityProgress>
        <TokensCost />
        <PageNavigation current="/tokens" />
      </ActivityProgress>,
    );
    await act(async () => {});
    const value = (label: string) => view.getByLabelText(label).textContent;
    assert.equal(value('Request cost'), '$0.000000');
    assert.ok(
      view.getByRole('button', { name: 'Next' }).hasAttribute('disabled'),
    );
    fireEvent.click(view.getByRole('button', { name: 'Run' }));
    assert.ok(view.getByRole('link', { name: 'Next' }));
    act(() => {
      now = 700;
      tick();
    });
    assert.equal(value('Input tokens billed'), '14');
    assert.equal(value('Generated tokens'), '0');
    assert.equal(value('Request cost'), '$0.000014');
    act(() => {
      now = 1550;
      tick();
    });
    assert.equal(value('Generated tokens'), '2');
    assert.equal(value('Output tokens billed'), '2');
    assert.equal(value('Request cost'), '$0.000020');
    assert.equal(
      view.container.querySelectorAll(
        '.billing-output .billing-token:not(.unrevealed)',
      ).length,
      2,
    );
    act(() => {
      now = 5000;
      tick();
    });
    assert.equal(value('Generated tokens'), '19');
    assert.equal(value('Request cost'), '$0.000071');
    assert.equal(value('Projected cost'), '$0.71');
    // JSDOM has no layout, so the slider's measured thumb remains hidden.
    const volume = view.getByLabelText('Request volume', { selector: 'input' });
    fireEvent.keyDown(volume, { key: 'End' });
    assert.equal(value('Projected cost'), '$7.10');
    assert.equal(value('Request cost'), '$0.000071');
    fireEvent.click(view.getByRole('radio', { name: 'Detailed' }));
    assert.equal(value('Request cost'), '$0.000071');
    assert.ok(view.getByText('Changes apply on Run.'));
    fireEvent.click(view.getByRole('button', { name: 'Run' }));
    assert.equal(value('Request cost'), '$0.000000');
    assert.equal(value('Generated tokens'), '0');
    act(() => {
      now = 15000;
      tick();
    });
    assert.ok(Number(value('Generated tokens')) > 19);
    fireEvent.click(view.getByRole('button', { name: 'Replay' }));
    assert.equal(value('Request cost'), '$0.000000');
    assert.equal(value('Generated tokens'), '0');
    view.unmount();
  } finally {
    clock.mock.restore();
    window.matchMedia = originalMedia;
    window.setInterval = originalSet;
    window.clearInterval = originalClear;
  }
});

test('cache repeats expose stale answers and clearing refreshes the source', () => {
  const view = render(<Caching />);
  fireEvent.click(view.getByRole('button', { name: 'Send question' }));
  assert.ok(view.getByText('Fresh answer'));
  fireEvent.click(view.getByRole('button', { name: 'Repeat question' }));
  assert.ok(view.getByText('Reused answer'));
  fireEvent.click(view.getByRole('radio', { name: '8 p.m.' }));
  fireEvent.click(view.getByRole('button', { name: 'Repeat question' }));
  assert.ok(view.getByText('Stale answer'));
  fireEvent.click(view.getByRole('button', { name: 'Clear cache' }));
  fireEvent.click(view.getByRole('button', { name: 'Send question' }));
  assert.ok(view.getByText('The library closes at 8 p.m. tonight.'));
});
test('playground retains completed comparison and reset clears it', () => {
  const view = render(<Playground />);
  fireEvent.click(view.getByRole('button', { name: 'Run' }));
  fireEvent.click(view.getByRole('radio', { name: 'Lightweight' }));
  fireEvent.click(view.getByRole('button', { name: 'Run' }));
  assert.ok(view.getByText('Run comparison'));
  fireEvent.click(view.getByRole('button', { name: 'Reset' }));
  assert.equal(view.queryByText('Run comparison'), null);
  assert.ok(view.getByRole('button', { name: 'Run' }));
});
test('playback restarts, resets, and cancels intervals when unmounted', () => {
  const original = window.matchMedia,
    originalSet = window.setInterval,
    originalClear = window.clearInterval;
  window.matchMedia = () => ({ ...original(''), matches: false });
  const callbacks = new Map<number, () => void>();
  let id = 0;
  window.setInterval = ((fn: () => void) => {
    callbacks.set(++id, fn);
    return id;
  }) as typeof window.setInterval;
  window.clearInterval = ((i?: number) => {
    callbacks.delete(i!);
  }) as typeof window.clearInterval;
  try {
    const hook = renderHook(() => usePlayback(10));
    act(() => hook.result.current.run());
    assert.equal(callbacks.size, 1);
    act(() => hook.result.current.run());
    assert.equal(callbacks.size, 1);
    act(() => hook.result.current.reset());
    assert.equal(callbacks.size, 0);
    assert.equal(hook.result.current.started, false);
    act(() => hook.result.current.run());
    hook.unmount();
    assert.equal(callbacks.size, 0);
  } finally {
    window.matchMedia = original;
    window.setInterval = originalSet;
    window.clearInterval = originalClear;
  }
});
