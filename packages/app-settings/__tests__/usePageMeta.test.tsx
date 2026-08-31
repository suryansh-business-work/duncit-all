// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, renderHook } from '@testing-library/react';

afterEach(() => {
  // `globals: false` means Testing Library registers no cleanup of its own, so
  // a hook left mounted can still have React work queued when jsdom is torn
  // down — which throws `window is not defined` and fails a green run.
  cleanup();
});

const { applyPageMeta, pageTitle, usePageMeta } = await import('../src/usePageMeta');

const descriptionTag = () => globalThis.document.querySelector('meta[name="description"]');

beforeEach(() => {
  globalThis.document.title = '';
  descriptionTag()?.remove();
});

describe('pageTitle', () => {
  it('suffixes the page name with the app name', () => {
    expect(pageTitle('Pod Expenses', 'Duncit Admin')).toBe('Pod Expenses | Duncit Admin');
  });

  it('leaves the bare app name alone so the home tab is not "Duncit | Duncit"', () => {
    expect(pageTitle('Duncit', 'Duncit')).toBe('Duncit');
  });
});

describe('applyPageMeta', () => {
  it('writes the suffixed title and no description tag when none is given', () => {
    applyPageMeta({ title: 'Mark Attendance', appName: 'Duncit Partners' });
    expect(globalThis.document.title).toBe('Mark Attendance | Duncit Partners');
    expect(descriptionTag()).toBeNull();
  });

  it('creates the description meta tag when the document has none', () => {
    applyPageMeta({
      title: 'Pod DUN-POD-4821',
      description: 'Friday football pod in Mumbai',
      appName: 'Duncit',
    });
    expect(globalThis.document.title).toBe('Pod DUN-POD-4821 | Duncit');
    expect(descriptionTag()?.getAttribute('content')).toBe('Friday football pod in Mumbai');
  });

  it('reuses the existing description meta tag instead of stacking a second one', () => {
    applyPageMeta({ title: 'Shop', description: 'First copy', appName: 'Duncit' });
    applyPageMeta({ title: 'Shop', description: 'Curated pod merch', appName: 'Duncit' });
    const tags = globalThis.document.querySelectorAll('meta[name="description"]');
    expect(tags).toHaveLength(1);
    expect(tags[0].getAttribute('content')).toBe('Curated pod merch');
  });
});

describe('usePageMeta', () => {
  it('applies the meta on mount', () => {
    renderHook(() =>
      usePageMeta({ title: 'Earn', description: 'Host pods, earn INR', appName: 'Duncit' }),
    );
    expect(globalThis.document.title).toBe('Earn | Duncit');
    expect(descriptionTag()?.getAttribute('content')).toBe('Host pods, earn INR');
  });

  it('ignores an empty title so an in-flight page name does not blank the tab', () => {
    globalThis.document.title = 'Previous Page | Duncit';
    renderHook(() => usePageMeta({ title: '', appName: 'Duncit' }));
    expect(globalThis.document.title).toBe('Previous Page | Duncit');
  });

  it('ignores a missing app name rather than writing a broken suffix', () => {
    globalThis.document.title = 'Previous Page | Duncit';
    renderHook(() => usePageMeta({ title: 'Wallet', appName: '' }));
    expect(globalThis.document.title).toBe('Previous Page | Duncit');
  });

  it('re-applies when the title changes on a client navigation', () => {
    const { rerender } = renderHook(({ title }) => usePageMeta({ title, appName: 'Duncit' }), {
      initialProps: { title: 'Shop' },
    });
    expect(globalThis.document.title).toBe('Shop | Duncit');
    rerender({ title: 'Cart' });
    expect(globalThis.document.title).toBe('Cart | Duncit');
  });
});
