import { Platform } from 'react-native';

import { setWebFavicon } from '@/services/web-favicon';

const setPlatform = (os: string) =>
  Object.defineProperty(Platform, 'OS', { value: os, configurable: true });

interface FakeLink {
  attrs: Record<string, string>;
  setAttribute: (k: string, v: string) => void;
}

const makeLink = (): FakeLink => {
  const attrs: Record<string, string> = {};
  return {
    attrs,
    setAttribute: (k: string, v: string) => {
      attrs[k] = v;
    },
  };
};

describe('setWebFavicon', () => {
  const originalOS = Platform.OS;
  afterEach(() => {
    setPlatform(originalOS);
    delete (globalThis as Record<string, unknown>).document;
  });

  it('is a no-op on native platforms and for an empty URL', () => {
    expect(() => setWebFavicon('https://cdn/x.png')).not.toThrow();
    setPlatform('web');
    expect(() => setWebFavicon('')).not.toThrow();
  });

  it('is a no-op on web when no document exists', () => {
    setPlatform('web');
    expect(() => setWebFavicon('https://cdn/x.png')).not.toThrow();
  });

  it('updates existing favicon links and creates missing ones', () => {
    setPlatform('web');
    const existing = makeLink();
    const created: FakeLink[] = [];
    const appended: FakeLink[] = [];
    (globalThis as Record<string, unknown>).document = {
      querySelector: (selector: string) => (selector.includes('"icon"') ? existing : null),
      createElement: () => {
        const link = makeLink();
        created.push(link);
        return link;
      },
      head: { appendChild: (el: FakeLink) => appended.push(el) },
    };

    setWebFavicon('https://cdn/x.png');
    expect(existing.attrs.href).toBe('https://cdn/x.png');
    // 'shortcut icon' + 'apple-touch-icon' were missing → created + appended.
    expect(created).toHaveLength(2);
    expect(appended).toHaveLength(2);
    expect(created.every((l) => l.attrs.href === 'https://cdn/x.png')).toBe(true);
  });
});
