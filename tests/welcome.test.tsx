import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
// @ts-expect-error jsdom is used only in the test environment.
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/prod-ai/' });
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });
Object.assign(globalThis, {
  window: dom.window,
  document: dom.window.document,
  HTMLElement: dom.window.HTMLElement,
  IS_REACT_ACT_ENVIRONMENT: true,
});
const originalMatchMedia = () => ({ matches: false }) as MediaQueryList;
window.matchMedia = originalMatchMedia;

const { render, cleanup, fireEvent, act } = await import('@testing-library/react');
const { Welcome } = await import('../components/lab/welcome');
const { lessonPath } = await import('../lib/paths');

afterEach(() => {
  cleanup();
  window.matchMedia = originalMatchMedia;
  Reflect.deleteProperty(HTMLElement.prototype, 'animate');
});

// Observe whether the component handled navigation, then stop jsdom from
// following the real link. This keeps native fallback assertions meaningful.
function clickLink(link: HTMLElement, init: MouseEventInit = {}) {
  let handled = false;
  document.addEventListener('click', (event) => {
    handled = event.defaultPrevented;
    event.preventDefault();
  }, { once: true });
  fireEvent.click(link, { button: 0, ...init });
  return handled;
}

test('start preserves native navigation for reduced motion, unsupported animation, and modified clicks', () => {
  const view = render(<Welcome />);
  const link = view.getByRole('link', { name: 'Start workshop' });
  assert.equal(link.getAttribute('href'), '/prod-ai/streaming');
  assert.equal(clickLink(link), false, 'no animation API falls back to the link');

  HTMLElement.prototype.animate = () => { throw new Error('animation must not run'); };
  window.matchMedia = () => ({ matches: true }) as MediaQueryList;
  assert.equal(clickLink(link), false, 'reduced motion navigates immediately');
  window.matchMedia = originalMatchMedia;
  for (const modifiers of [{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }]) {
    assert.equal(clickLink(link, modifiers), false);
  }
});

test('a repeated start cannot duplicate an exit; Back and unmount cancel pending navigation', async () => {
  let started = 0;
  let cancelled = 0;
  HTMLElement.prototype.animate = () => {
    started++;
    let reject!: (reason: Error) => void;
    const finished = new Promise<Animation>((_resolve, rejectAnimation) => { reject = rejectAnimation; });
    return {
      finished,
      cancel() {
        cancelled++;
        reject(new Error('animation cancelled'));
      },
    } as Animation;
  };
  const view = render(<Welcome />);
  const link = view.getByRole('link', { name: 'Start workshop' });
  const main = view.getByRole('main');
  assert.equal(clickLink(link), true);
  assert.equal(clickLink(link), true);
  assert.equal(started, 1);
  assert.equal(main.getAttribute('aria-busy'), 'true');

  await act(async () => window.dispatchEvent(new dom.window.Event('pageshow')));
  assert.equal(cancelled, 1);
  assert.equal(main.hasAttribute('aria-busy'), false);
  assert.equal(main.hasAttribute('data-leaving'), false);

  assert.equal(clickLink(link), true, 'a restored card can start again');
  assert.equal(started, 2);
  await act(async () => view.unmount());
  assert.equal(cancelled, 2);
});

test('mounted home paths resolve to the welcome screen', () => {
  for (const home of ['/', '/prod-ai', '/prod-ai/']) assert.equal(lessonPath(home), '/');
  assert.equal(lessonPath('/prod-ai/streaming'), '/streaming');
});
