import { describe, expect, it } from 'vitest';
import { buildReturnColumns } from './returns-columns';
import { returnRow } from './__tests__/fixtures';
import type { ReturnRow } from './returns.queries';

const t = (key: string, options?: { vars?: Record<string, string | number> }) =>
  options?.vars ? `${key}|${JSON.stringify(options.vars)}` : key;
const row = (over: Record<string, unknown> = {}) => returnRow(over) as unknown as ReturnRow;
const column = (field: string) => {
  const found = buildReturnColumns(t).find((candidate) => candidate.field === field);
  if (!found?.valueGetter) throw new Error(`${field} has no value getter`);
  return found.valueGetter;
};

describe('the return items column', () => {
  it('names the first line and counts the rest', () => {
    expect(column('items')(row())).toBe(
      'partners.returns.itemsMore|{"first":"partners.returns.itemLine|{\\"name\\":\\"Pet Collar\\",\\"qty\\":2}","more":1}',
    );
  });

  it('names the only line plainly', () => {
    expect(column('items')(row({ items: [returnRow().items[0]] }))).toBe('partners.returns.itemLine|{"name":"Pet Collar","qty":2}');
  });

  it('shows a dash for a return with no items', () => {
    expect(column('items')(row({ items: [] }))).toBe('—');
  });
});

describe('the return created column', () => {
  it('writes the day the return was raised', () => {
    expect(column('created_at')(row())).toMatch(/2026/);
  });

  it('shows a dash for a return with no creation time', () => {
    expect(column('created_at')(row({ created_at: null }))).toBe('—');
  });
});
