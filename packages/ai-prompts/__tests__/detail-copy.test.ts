/**
 * Every label the detail view, row menu and public page render comes from a
 * literal `ai.library.*` key — so a translator who edits it in Localization
 * changes the screen. This walks the whole copy object, calls every builder,
 * and checks each lands on an `ai.library.` key with the values it was given.
 */
import { describe, expect, it } from 'vitest';

import { detailCopy, type DetailTranslate } from '../src/detailCopy';

type Call = { key: string; options?: Parameters<DetailTranslate>[1] };

const recorder = () => {
  const calls: Call[] = [];
  const t: DetailTranslate = (key, options) => {
    calls.push({ key, options });
    return `${key}${options ? JSON.stringify(options) : ''}`;
  };
  return { t, calls };
};

/** Every leaf of the copy object: strings as they are, builders called with stand-in values. */
function leaves(node: unknown): string[] {
  if (typeof node === 'string') return [node];
  if (typeof node === 'function') return [String((node as (...args: unknown[]) => string)('VALUE', 'SECOND'))];
  return Object.values(node as Record<string, unknown>).flatMap(leaves);
}

describe('detailCopy', () => {
  it('reads every label from an ai.library key', () => {
    const { t, calls } = recorder();
    const all = leaves(detailCopy(t));

    expect(all.length).toBeGreaterThan(100);
    expect(all.every((text) => text.startsWith('ai.library.'))).toBe(true);
    expect(calls.every((call) => call.key.startsWith('ai.library.'))).toBe(true);
  });

  it('passes builder values through as vars, and counts through the plural switch', () => {
    const { t, calls } = recorder();
    const copy = detailCopy(t);

    copy.actions.menu('Digest');
    copy.detail.hits(1);
    copy.analytics.dayBar('20 Nov', 4);
    copy.send.copyBookmarklet('Grok');

    expect(calls.slice(-4)).toEqual([
      expect.objectContaining({ key: 'ai.library.actions.menu', options: { vars: { name: 'Digest' } } }),
      { key: 'ai.library.detail.hits', options: { count: 1 } },
      { key: 'ai.library.analytics.dayBar', options: { count: 4, vars: { date: '20 Nov' } } },
      expect.objectContaining({ key: 'ai.library.send.copyBookmarklet', options: { vars: { name: 'Grok' } } }),
    ]);
  });
});
