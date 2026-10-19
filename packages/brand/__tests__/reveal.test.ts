// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  MAX_STAGGER_STEPS,
  REVEALED_CLASS,
  REVEAL_MS,
  REVEAL_READY_CLASS,
  STAGGER_MS,
  prefersReducedMotion,
  revealElement,
  staggerDelay,
  startReveal,
} from '../src/reveal';

type Entry = { isIntersecting: boolean; target: Element };
let observed: (entries: Entry[]) => void;
let watched: Element[];
let unobserved: Element[];
let disconnect: ReturnType<typeof vi.fn>;

const stubObserver = () => {
  watched = [];
  unobserved = [];
  disconnect = vi.fn();
  class FakeObserver {
    constructor(cb: typeof observed) {
      observed = cb;
    }
    observe(el: Element) {
      watched.push(el);
    }
    unobserve(el: Element) {
      unobserved.push(el);
    }
    disconnect = disconnect;
  }
  vi.stubGlobal('IntersectionObserver', FakeObserver);
};

const stubMotion = (reduce: boolean) => vi.stubGlobal('matchMedia', () => ({ matches: reduce }));

beforeEach(() => {
  document.documentElement.className = '';
  document.body.innerHTML = `
    <h2 id="title" data-reveal></h2>
    <ul data-reveal-group>
      <li data-reveal="up"></li><li data-reveal="fade"></li><li data-reveal="scale"></li>
    </ul>`;
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('staggerDelay', () => {
  it('spaces siblings evenly and caps long lists', () => {
    expect(staggerDelay(0)).toBe(0);
    expect(staggerDelay(2)).toBe(2 * STAGGER_MS);
    expect(staggerDelay(50)).toBe(MAX_STAGGER_STEPS * STAGGER_MS);
  });
});

describe('revealElement', () => {
  it('eases in after its stagger delay, then clears the inline transition', () => {
    vi.useFakeTimers();
    const el = document.createElement('div');
    el.style.setProperty('--reveal-delay', '160ms');
    revealElement(el);
    expect(el.classList.contains(REVEALED_CLASS)).toBe(true);
    expect(el.style.transitionDelay).toBe('160ms');
    vi.advanceTimersByTime(REVEAL_MS + 160 + 50);
    expect(el.style.transition).toBe('');
    expect(el.style.transitionDelay).toBe('');
  });

  it('starts at once without a delay, or with one it cannot read', () => {
    const plain = document.createElement('div');
    revealElement(plain);
    expect(plain.style.transitionDelay).toBe('0ms');
    const junk = document.createElement('div');
    junk.style.setProperty('--reveal-delay', 'soon');
    revealElement(junk);
    expect(junk.style.transitionDelay).toBe('0ms');
  });
});

describe('prefersReducedMotion', () => {
  it('follows the media query, and is off where the browser has none', () => {
    stubMotion(true);
    expect(prefersReducedMotion()).toBe(true);
    stubMotion(false);
    expect(prefersReducedMotion()).toBe(false);
    vi.stubGlobal('matchMedia', undefined);
    expect(prefersReducedMotion()).toBe(false);
  });
});

describe('startReveal', () => {
  it('hides nothing for a visitor who asked for less motion', () => {
    stubMotion(true);
    stubObserver();
    startReveal()();
    expect(watched).toEqual([]);
    expect(document.documentElement.classList.contains(REVEAL_READY_CLASS)).toBe(false);
  });

  it('hides nothing where IntersectionObserver is missing', () => {
    stubMotion(false);
    vi.stubGlobal('IntersectionObserver', undefined);
    expect(() => startReveal(document)()).not.toThrow();
    expect(document.documentElement.classList.contains(REVEAL_READY_CLASS)).toBe(false);
  });

  it('staggers a group, observes every target and arms the CSS', () => {
    stubMotion(false);
    stubObserver();
    startReveal(document);
    const items = [...document.querySelectorAll<HTMLElement>('li')];
    expect(items.map((li) => li.style.getPropertyValue('--reveal-delay'))).toEqual(['0ms', '80ms', '160ms']);
    expect(watched).toHaveLength(4);
    expect(document.documentElement.classList.contains(REVEAL_READY_CLASS)).toBe(true);
  });

  it('reveals a target the first time it scrolls in, ignores ones still out of view, and disconnects', () => {
    stubMotion(false);
    stubObserver();
    const stop = startReveal(document);
    const title = document.getElementById('title') as HTMLElement;
    const first = document.querySelector('li') as HTMLElement;
    observed([
      { isIntersecting: true, target: title },
      { isIntersecting: false, target: first },
    ]);
    expect(title.classList.contains(REVEALED_CLASS)).toBe(true);
    expect(first.classList.contains(REVEALED_CLASS)).toBe(false);
    expect(unobserved).toEqual([title]);
    stop();
    expect(disconnect).toHaveBeenCalledTimes(1);
  });
});
