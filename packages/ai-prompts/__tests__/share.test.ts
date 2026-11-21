/**
 * The framework-free half of sharing: links that open an LLM with the prompt
 * typed in, the copy-ready scripts for when a link cannot carry it, the public
 * form's rules, and the keyless reads and reports the public page makes.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MAX_PREFILL_CHARS, PROMPT_PLATFORMS, platformById, platformLink } from '../src/share/platforms';
import { bookmarklet, injectionScript } from '../src/share/scripts';
import { libraryPromptPath, libraryPromptUrl } from '../src/share/links';
import { MAX_EXTRA_CHARS, MAX_VARIABLE_CHARS, composePrompt, publicPromptDefaults, publicPromptSchema } from '../src/share/publicSchema';
import {
  SharedPromptMissingError,
  campaignSource,
  fetchSharedPrompt,
  publicShareUrl,
  reportPublicEvent,
  visitorId,
} from '../src/share/publicApi';
import type { PromptVariable } from '../src/types';

const claude = platformById('CLAUDE');

describe('platform links', () => {
  it('opens each platform with the prompt in its query string', () => {
    for (const platform of PROMPT_PLATFORMS) {
      const link = platformLink(platform, 'Plan a trip & pack light?');
      expect(link.prefilled).toBe(true);
      expect(new URL(link.url).searchParams.get(platform.param)).toBe('Plan a trip & pack light?');
      expect(link.url.startsWith(platform.home)).toBe(true);
    }
  });

  it('opens an empty chat when the prompt is blank or too long for a URL', () => {
    expect(platformLink(claude, '   ')).toEqual({ url: claude.home, prefilled: false });
    expect(platformLink(claude, 'x'.repeat(MAX_PREFILL_CHARS + 1))).toEqual({ url: claude.home, prefilled: false });
    expect(platformLink(claude, 'x'.repeat(MAX_PREFILL_CHARS)).prefilled).toBe(true);
  });

  it('refuses an id the table does not hold', () => {
    expect(() => platformById('BARD' as never)).toThrow('Unknown prompt platform BARD');
  });
});

describe('injection scripts', () => {
  const messages = { noComposer: 'No chat box', inserted: 'Done' };

  it('embeds the prompt and selectors as JSON, so no text can break out of the string', () => {
    const hostile = 'He said "hi"`; alert(1); //</script>\nline two';
    const script = injectionScript(claude, hostile, messages);
    expect(script).toContain(`const text = ${JSON.stringify(hostile)};`);
    expect(script).toContain(JSON.stringify(claude.composer));
    expect(script).toContain('const missing = "No chat box";');
    // It is valid JavaScript whatever the prompt said.
    expect(() => new Function(script)).not.toThrow();
  });

  it('types into the box and never presses send', () => {
    const script = injectionScript(claude, 'hello', messages);
    expect(script).toContain("dispatchEvent(new Event('input'");
    expect(script).toContain("new ClipboardEvent('paste'");
    expect(script).not.toMatch(/submit|click\(\)|keydown/i);
  });

  it('wraps a script as a one-line bookmarklet', () => {
    const mark = bookmarklet('a();\nb();');
    expect(mark.startsWith('javascript:')).toBe(true);
    expect(decodeURIComponent(mark.slice('javascript:'.length))).toBe('a(); b();');
  });
});

describe('library links', () => {
  it('opens a prompt on its kind, key encoded, relative and absolute', () => {
    expect(libraryPromptPath('a b')).toBe('/library?selectedtab=CODE&prompt=a%20b');
    expect(libraryPromptPath('digest', 'AI')).toBe('/library?selectedtab=AI&prompt=digest');
    expect(libraryPromptUrl('https://ai.duncit.com', 'digest', 'AI')).toBe('https://ai.duncit.com/library?selectedtab=AI&prompt=digest');
    expect(libraryPromptUrl('https://ai.duncit.com', 'nav')).toBe('https://ai.duncit.com/library?selectedtab=CODE&prompt=nav');
  });
});

const VARS: PromptVariable[] = [
  { name: 'city', label: 'City', description: '', required: true, example: 'Pune' },
  { name: 'tone', label: 'Tone', description: '', required: false, example: '' },
];
const messages = { required: 'Needed', tooLong: (max: number) => `Max ${max}` };

describe('public form rules', () => {
  it('requires the required placeholders and caps every field', () => {
    const schema = publicPromptSchema(messages, VARS);
    expect(schema.safeParse({ values: { city: 'Pune', tone: '' }, extra: '' }).success).toBe(true);

    const blank = schema.safeParse({ values: { city: '   ', tone: '' }, extra: '' });
    expect(blank.success).toBe(false);
    expect(blank.error?.issues[0]?.message).toBe('Needed');

    const long = schema.safeParse({ values: { city: 'x', tone: 'y'.repeat(MAX_VARIABLE_CHARS + 1) }, extra: 'z'.repeat(MAX_EXTRA_CHARS + 1) });
    expect(long.error?.issues.map((issue) => issue.message)).toEqual([`Max ${MAX_VARIABLE_CHARS}`, `Max ${MAX_EXTRA_CHARS}`]);
  });

  it('starts every field empty', () => {
    expect(publicPromptDefaults(VARS)).toEqual({ values: { city: '', tone: '' }, extra: '' });
  });

  it('fills what was typed, keeps a blank placeholder visible, and adds the extra input as its own paragraph', () => {
    const content = 'Plan a day in {{city}}, {{tone}}.';
    expect(composePrompt(content, { values: { city: 'Pune', tone: ' ' }, extra: '' })).toBe('Plan a day in Pune, {{tone}}.');
    expect(composePrompt(content, { values: { city: 'Pune', tone: 'calm' }, extra: '  Keep it cheap. ' })).toBe(
      'Plan a day in Pune, calm.\n\nKeep it cheap.',
    );
  });
});

describe('public API', () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    globalThis.localStorage.clear();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it('builds the public link without doubled slashes', () => {
    expect(publicShareUrl('https://ai.duncit.com//', 'a/b')).toBe('https://ai.duncit.com/p/a%2Fb');
  });

  it('reads a shared prompt, and tells a dead link apart from a failure', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ name: 'Trip' }), { status: 200 }));
    await expect(fetchSharedPrompt('https://server.duncit.com/', 'tok')).resolves.toEqual({ name: 'Trip' });
    expect(fetchMock.mock.calls[0][0]).toBe('https://server.duncit.com/ai-prompts/share/tok');

    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 404 }));
    await expect(fetchSharedPrompt('https://server.duncit.com', 'tok')).rejects.toBeInstanceOf(SharedPromptMissingError);

    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 503 }));
    await expect(fetchSharedPrompt('https://server.duncit.com', 'tok')).rejects.toThrow('SHARED_PROMPT_503');
  });

  it('keeps one random visitor id per browser, and copes with blocked storage', () => {
    const first = visitorId();
    expect(first).toMatch(/^[0-9a-f-]{36}$/);
    expect(visitorId()).toBe(first);
    const blocked = { getItem: () => { throw new Error('blocked'); }, setItem: vi.fn() };
    expect(visitorId(blocked)).toBeNull();
  });

  it('reads the campaign from utm_source', () => {
    expect(campaignSource('?utm_source=newsletter&x=1')).toBe('newsletter');
    expect(campaignSource('')).toBeNull();
  });

  it('reports an event with its platform, campaign, referrer and visitor, and says whether it landed', async () => {
    globalThis.window.history.replaceState(null, '', '/p/tok?utm_source=linkedin');
    Object.defineProperty(globalThis.document, 'referrer', { configurable: true, value: 'https://www.linkedin.com/feed' });
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

    await expect(reportPublicEvent('https://server.duncit.com', 'tok', { type: 'OPEN_IN_PLATFORM', platform: 'GROK' })).resolves.toBe(true);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://server.duncit.com/ai-prompts/share/tok/events');
    expect(init).toMatchObject({ method: 'POST', keepalive: true });
    expect(JSON.parse(String(init.body))).toEqual({
      type: 'OPEN_IN_PLATFORM',
      platform: 'GROK',
      source: 'linkedin',
      referrer: 'https://www.linkedin.com/feed',
      visitor: expect.any(String),
    });

    Object.defineProperty(globalThis.document, 'referrer', { configurable: true, value: '' });
    globalThis.window.history.replaceState(null, '', '/');
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 500 }));
    await expect(reportPublicEvent('https://server.duncit.com', 'tok', { type: 'PUBLIC_VIEW' })).resolves.toBe(false);
    expect(JSON.parse(String((fetchMock.mock.calls[1] as [string, RequestInit])[1].body))).toMatchObject({ platform: null, source: null, referrer: null });

    fetchMock.mockRejectedValueOnce(new Error('offline'));
    await expect(reportPublicEvent('https://server.duncit.com', 'tok', { type: 'COPY_PROMPT' })).resolves.toBe(false);
  });
});
