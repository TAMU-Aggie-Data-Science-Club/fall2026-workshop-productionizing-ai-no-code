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
// jsdom has no layout; give the slider track and thumb measurable geometry.
const nativeBounds = HTMLElement.prototype.getBoundingClientRect;
HTMLElement.prototype.getBoundingClientRect = function () {
  if (this.hasAttribute('data-base-ui-slider-control'))
    return new dom.window.DOMRect(0, 0, 240, 16);
  if (this.getAttribute('data-slot') === 'slider-thumb')
    return new dom.window.DOMRect(0, 0, 12, 12);
  return nativeBounds.call(this);
};
const { render, cleanup, fireEvent, act, renderHook } =
  await import('@testing-library/react');
const { PageNavigation, PAGES } =
  await import('../components/lab/page-navigation');
const { Streaming } = await import('../components/lab/streaming');
const { Caching, TokensCost } = await import('../components/lab/lessons');
const { Playground } = await import('../components/lab/playground');
const { Challenge } = await import('../components/lab/challenge');
const { Completion } = await import('../components/lab/completion');
const { CompletionContext } =
  await import('../components/lab/completion-state');
const { CompletionProvider } =
  await import('../components/lab/completion-provider');
const { simulateChallenge } = await import('../lib/challenge');
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
  assert.equal(view.getAllByRole('link').length, 2);
  assert.equal(
    view.getByRole('link', { name: 'Previous' }).getAttribute('href'),
    '/prod-ai/quality',
  );
  assert.equal(
    view.getByRole('link', { name: 'Next' }).getAttribute('href'),
    '/prod-ai/challenge',
  );
  view.rerender(<NavigationFixture current="/prod-ai/challenge" />);
  assert.equal(view.getAllByRole('link').length, 1);
  assert.equal(
    view.getByRole('link', { name: 'Previous' }).getAttribute('href'),
    '/prod-ai/playground',
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
        name:
          page.href === '/caching'
            ? 'Send question'
            : page.href === '/challenge'
              ? 'Test'
              : 'Run',
      }),
    );
    fireEvent.click(
      view.getByRole('button', {
        name:
          page.href === '/caching'
            ? 'Send question'
            : page.href === '/challenge'
              ? 'Test'
              : 'Run',
      }),
    );
    if (page.href !== '/challenge') {
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
async function choosePassingChallenge(view: ReturnType<typeof render>) {
  await act(async () => {});
  fireEvent.click(view.getByRole('radio', { name: 'Capable' }));
  const context = view.getByRole('slider', { name: 'Retrieved context' });
  fireEvent.keyDown(context, { key: 'Home' });
  fireEvent.keyDown(context, { key: 'ArrowRight' });
  fireEvent.keyDown(context, { key: 'ArrowRight' });
  const length = view.getByRole('slider', { name: 'Answer length' });
  fireEvent.keyDown(length, { key: 'Home' });
  fireEvent.keyDown(length, { key: 'ArrowRight' });
  fireEvent.keyDown(view.getByRole('slider', { name: 'Workers' }), {
    key: 'End',
  });
  fireEvent.click(view.getByRole('radio', { name: 'Streamed' }));
  fireEvent.click(view.getByRole('radio', { name: 'Refresh on update' }));
}

test('challenge tests changed configs, retains comparisons, replays and resets', async () => {
  const view = render(<Challenge />);
  assert.equal(view.queryByRole('region', { name: 'Test results' }), null);
  fireEvent.click(view.getByRole('button', { name: 'Test' }));
  assert.ok(view.getByRole('heading', { name: 'Keep adjusting' }));
  assert.ok(view.getByText('The prompt had no source material.'));
  await choosePassingChallenge(view);
  assert.ok(view.getByText('Changes apply on the next test.'));
  assert.ok(
    view.getByRole('heading', { name: 'Keep adjusting' }),
    'draft edits do not change the last result',
  );
  fireEvent.click(view.getByRole('button', { name: 'Test' }));
  assert.ok(view.getByRole('heading', { name: 'Requirements met' }));
  assert.ok(
    view
      .getByRole('table', { name: 'Test comparison' })
      .textContent?.includes('0 / 20'),
  );
  const comparison = view.getByRole('table', {
    name: 'Test comparison',
  }).textContent;
  fireEvent.click(view.getByRole('button', { name: 'Replay' }));
  assert.equal(
    view.getByRole('table', { name: 'Test comparison' }).textContent,
    comparison,
  );
  fireEvent.click(view.getByRole('button', { name: 'Review all 20 answers' }));
  assert.equal(
    view.container.querySelectorAll('.challenge-answer-audit article').length,
    20,
  );
  fireEvent.click(view.getByRole('button', { name: 'Reset' }));
  assert.equal(view.queryByRole('region', { name: 'Test results' }), null);
  assert.equal(view.queryByRole('table', { name: 'Test comparison' }), null);
  assert.equal(
    view
      .getByRole('slider', { name: 'Retrieved context' })
      .getAttribute('aria-valuenow'),
    '0',
  );
  assert.ok(view.getByRole('button', { name: 'Test' }));
});

test('only a passing run hands its exact configuration and statistics to the ending screen', async () => {
  const completed: import('../components/lab/completion-state').CompletedBuild[] =
    [];
  const finish = (
    build: import('../components/lab/completion-state').CompletedBuild,
  ) => completed.push(build);
  const view = render(
    <CompletionContext.Provider value={{ build: null, finish }}>
      <Challenge />
    </CompletionContext.Provider>,
  );
  fireEvent.click(view.getByRole('button', { name: 'Test' }));
  assert.equal(completed.length, 0);
  await choosePassingChallenge(view);
  fireEvent.click(view.getByRole('button', { name: 'Test' }));
  assert.equal(completed.length, 1);
  assert.equal(completed[0].result.passed, true);
  assert.deepEqual(completed[0].result, simulateChallenge(completed[0].config));
  view.rerender(
    <CompletionContext.Provider value={{ build: completed[0], finish }}>
      <Completion />
    </CompletionContext.Provider>,
  );
  assert.ok(view.getByRole('heading', { name: 'Requirements met.' }));
  assert.ok(view.getByText('Capable'));
  assert.ok(view.getByText('Refresh on update'));
  assert.ok(view.getByText('20 / 20 correct'));
  assert.ok(view.getByText(`${(completed[0].result.cost * 100).toFixed(3)}¢`));
  assert.equal(
    view.container
      .querySelector('.welcome-landscape-image')
      ?.getAttribute('src'),
    '/prod-ai/images/workshop-sky.webp',
  );
});

test('the ending screen has a useful fallback without inventing a passing result', () => {
  const view = render(<Completion />);
  assert.equal(view.queryByText('Requirements met.'), null);
  assert.equal(
    view.getByRole('link', { name: 'Open challenge' }).getAttribute('href'),
    '/prod-ai/challenge',
  );
});

test('the actual completion provider replaces the challenge with its passing result', async () => {
  const view = render(
    <CompletionProvider>
      <Challenge />
    </CompletionProvider>,
  );
  await choosePassingChallenge(view);
  fireEvent.click(view.getByRole('button', { name: 'Test' }));
  assert.equal(view.queryByRole('button', { name: 'Test' }), null);
  assert.ok(view.getByRole('main', { name: 'Requirements met.' }));
  assert.ok(view.getByText('Capable'));
  assert.ok(view.getByText('20 / 20 correct'));
  assert.equal(document.activeElement, view.getByRole('main'));
  view.unmount();
  const fresh = render(
    <CompletionProvider>
      <Challenge />
    </CompletionProvider>,
  );
  assert.ok(fresh.getByRole('button', { name: 'Test' }));
  assert.equal(fresh.queryByText('Requirements met.'), null);
});

test('reset and unmount cancel a pending transition to the ending screen', async () => {
  const originalMedia = window.matchMedia;
  const originalInterval = window.setInterval;
  const originalClearInterval = window.clearInterval;
  const originalTimeout = window.setTimeout;
  const originalClearTimeout = window.clearTimeout;
  const originalAnimate = HTMLElement.prototype.animate;
  let now = 0;
  let tick = () => {};
  const timers = new Map<number, () => void>();
  let cancelled = 0;
  let finished = 0;
  let timerId = 0;
  const clock = mock.method(performance, 'now', () => now);
  window.matchMedia = () => ({ ...originalMedia(''), matches: false });
  window.setInterval = ((callback: () => void) => {
    tick = callback;
    return 1;
  }) as typeof window.setInterval;
  window.clearInterval = () => {};
  window.setTimeout = ((callback: () => void) => {
    timers.set(++timerId, callback);
    return timerId;
  }) as typeof window.setTimeout;
  window.clearTimeout = ((id: number) => {
    timers.delete(id);
  }) as typeof window.clearTimeout;
  HTMLElement.prototype.animate = () => {
    let reject!: (error: Error) => void;
    return {
      finished: new Promise<Animation>((_resolve, fail) => {
        reject = fail;
      }),
      cancel() {
        cancelled++;
        reject(new Error('Cancelled'));
      },
    } as Animation;
  };
  try {
    const view = render(
      <CompletionContext.Provider
        value={{
          build: null,
          finish: () => {
            finished++;
          },
        }}
      >
        <Challenge />
      </CompletionContext.Provider>,
    );
    await choosePassingChallenge(view);
    fireEvent.click(view.getByRole('button', { name: 'Test' }));
    assert.equal(view.queryByRole('region', { name: 'Test results' }), null);
    act(() => {
      now = 20000;
      tick();
    });
    assert.ok(view.getByRole('heading', { name: 'Requirements met' }));
    fireEvent.click(view.getByRole('button', { name: 'Reset' }));
    assert.equal(timers.size, 0);
    assert.equal(finished, 0);
    await choosePassingChallenge(view);
    fireEvent.click(view.getByRole('button', { name: 'Test' }));
    act(() => {
      now = 40000;
      tick();
    });
    act(() => {
      for (const callback of timers.values()) callback();
      timers.clear();
    });
    await act(async () => view.unmount());
    assert.equal(cancelled, 1);
    assert.equal(finished, 0);
  } finally {
    clock.mock.restore();
    window.matchMedia = originalMedia;
    window.setInterval = originalInterval;
    window.clearInterval = originalClearInterval;
    window.setTimeout = originalTimeout;
    window.clearTimeout = originalClearTimeout;
    if (originalAnimate) HTMLElement.prototype.animate = originalAnimate;
    else Reflect.deleteProperty(HTMLElement.prototype, 'animate');
  }
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
