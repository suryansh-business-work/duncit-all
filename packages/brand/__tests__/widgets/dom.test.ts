// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { claimRoot, detach, escapeHtml, formText, postGraphql, readJson, showError } from '../../src/widgets/dom';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('claimRoot', () => {
  it('claims a root once and refuses the second mount', () => {
    const root = document.createElement('div');
    expect(claimRoot(root)).toBe(true);
    expect(root.dataset.cmsMounted).toBe('true');
    expect(claimRoot(root)).toBe(false);
  });
});

describe('readJson', () => {
  it('parses the attribute', () => {
    expect(readJson<{ a: number }>('{"a":1}')).toEqual({ a: 1 });
  });
  it('falls back to an empty object when the attribute is absent', () => {
    expect(readJson(undefined)).toEqual({});
  });
  it('throws on malformed JSON rather than hiding it', () => {
    expect(() => readJson('{nope')).toThrow();
  });
});

describe('escapeHtml', () => {
  it('escapes markup characters', () => {
    expect(escapeHtml('<b>"x" & y</b>')).toBe('&lt;b&gt;"x" &amp; y&lt;/b&gt;');
  });
  it('renders null and undefined as empty text', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });
  it('stringifies non-strings', () => {
    expect(escapeHtml(42)).toBe('42');
  });
});

describe('formText', () => {
  it('trims the value and returns empty for a missing field', () => {
    const data = new FormData();
    data.set('name', '  Asha  ');
    expect(formText(data, 'name')).toBe('Asha');
    expect(formText(data, 'missing')).toBe('');
  });

  it('reads a file field as empty rather than as the File object', () => {
    const data = new FormData();
    data.set('name', new File(['x'], 'cv.pdf', { type: 'application/pdf' }));
    expect(formText(data, 'name')).toBe('');
  });
});

describe('postGraphql', () => {
  it('posts the query with variables and returns the parsed body', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ json: async () => ({ data: { ok: true } }) });
    vi.stubGlobal('fetch', fetchMock);
    const res = await postGraphql('https://api.test/graphql', 'query Q { a }', { x: 1 });
    expect(res).toEqual({ data: { ok: true } });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.test/graphql');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ query: 'query Q { a }', variables: { x: 1 } });
  });

  it('omits variables when none are given', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ json: async () => ({}) });
    vi.stubGlobal('fetch', fetchMock);
    await postGraphql('u', 'q');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ query: 'q' });
  });
});

describe('showError', () => {
  it('shows the text and unhides the box', () => {
    const box = document.createElement('p');
    box.className = 'hidden';
    showError(box, 'Boom');
    expect(box.textContent).toBe('Boom');
    expect(box.classList.contains('hidden')).toBe(false);
  });
  it('hides and empties the box on null', () => {
    const box = document.createElement('p');
    box.textContent = 'old';
    showError(box, null);
    expect(box.textContent).toBe('');
    expect(box.classList.contains('hidden')).toBe(true);
  });
  it('is a no-op without a box', () => {
    expect(() => showError(null, 'x')).not.toThrow();
  });
});

describe('detach', () => {
  it('logs a rejection with the widget name instead of dropping it', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const error = new Error('bad');
    detach(Promise.reject(error), 'faq');
    await new Promise((r) => setTimeout(r, 0));
    expect(spy).toHaveBeenCalledWith('cms widget failed', { widget: 'faq', error });
  });
  it('stays quiet when the work resolves', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    detach(Promise.resolve(1), 'faq');
    await new Promise((r) => setTimeout(r, 0));
    expect(spy).not.toHaveBeenCalled();
  });
});
